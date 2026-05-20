function mergePanelSpec(baseSpec, overrides = {}) {
  const spec = { ...baseSpec, ...overrides };
  if (baseSpec.encoding && overrides.encoding) {
    spec.encoding = { ...baseSpec.encoding };
    Object.entries(overrides.encoding).forEach(([channel, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        spec.encoding[channel] = {
          ...(baseSpec.encoding[channel] || {}),
          ...value
        };
      } else {
        spec.encoding[channel] = value;
      }
    });
  }
  return spec;
}

async function embedComposedPanel(selector, specUrl, composeKey, panelIndex, overrides = {}) {
  const response = await fetch(specUrl);
  const baseSpec = await response.json();
  const panelSpec = baseSpec[composeKey]?.[panelIndex];
  if (!panelSpec) return null;

  const { [composeKey]: _unused, transform: baseTransform, ...baseRest } = baseSpec;
  const { transform: panelTransform, ...panelRest } = panelSpec;
  const spec = mergePanelSpec({ ...baseRest, ...panelRest }, overrides);

  if (baseTransform || panelTransform) {
    spec.transform = [
      ...(baseTransform || []),
      ...(panelTransform || [])
    ];
  }

  return embedChart(selector, spec, embedOpts);
}

/* VIZ 14/15 — Combined comparison card */
const comparisonTimelineEl = document.getElementById('calendar-timeline');
const comparisonMarkersEl = document.getElementById('calendar-timeline-markers');
const comparisonEventsEl = document.getElementById('calendar-timeline-events');
const comparisonLabelsEl = document.getElementById('calendar-timeline-labels');
const comparisonHandleA = document.getElementById('calendar-handle-a');
const comparisonHandleB = document.getElementById('calendar-handle-b');
const comparisonChipA = document.getElementById('calendar-chip-a-label');
const comparisonChipB = document.getElementById('calendar-chip-b-label');
const comparisonViews = {
  calendarA: null,
  calendarB: null,
  overlayA: null,
  overlayB: null
};

const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const comparisonBaseDate = Date.UTC(2005, 0, 1);
const comparisonRangeStart = Date.UTC(2005, 0, 1);
const comparisonRangeEnd = Date.UTC(2020, 9, 31);
const comparisonLatestStart = Date.UTC(2020, 4, 1);
const comparisonMonthlyFire = new Map();
let comparisonMonthlyFireMax = 0;

function dayIndexForMonth(year, monthIndex) {
  return Math.round((Date.UTC(year, monthIndex, 1) - comparisonBaseDate) / 86400000);
}

function monthIndexForDate(year, monthIndex) {
  return (year - 2005) * 12 + monthIndex;
}

function makeComparisonOption(year, monthIndex) {
  const startDate = Date.UTC(year, monthIndex, 1);
  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    year,
    monthIndex,
    startDate,
    dayStart: dayIndexForMonth(year, monthIndex),
    monthStart: monthIndexForDate(year, monthIndex)
  };
}

function makeComparisonOptions() {
  const options = [];
  for (let i = 0; ; i += 1) {
    const date = new Date(Date.UTC(2005, i, 1));
    if (date.getTime() > comparisonLatestStart) break;
    options.push(makeComparisonOption(date.getUTCFullYear(), date.getUTCMonth()));
  }
  return options;
}

const comparisonOptions = makeComparisonOptions();
const comparisonState = {
  a: comparisonOptions.find(option => option.key === '2019-08') || comparisonOptions[comparisonOptions.length - 1],
  b: comparisonOptions.find(option => option.key === '2018-08') || comparisonOptions[0]
};

function addMonths(year, monthIndex, delta) {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
}

function gridStartForMonth(year, monthIndex) {
  const dow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  return dayIndexForMonth(year, monthIndex) - dow;
}

function labelWeeksForGrid(year, monthIndex) {
  const gridStart = gridStartForMonth(year, monthIndex);
  return Array.from({ length: 4 }, (_, i) => {
    const m = addMonths(year, monthIndex, i);
    return Math.floor((dayIndexForMonth(m.year, m.monthIndex) - gridStart) / 7);
  });
}

function comparisonAxisLabels(option) {
  return Array.from({ length: 4 }, (_, i) => {
    const date = addMonths(option.year, option.monthIndex, i);
    const label = monthShortNames[date.monthIndex];
    return i === 0 || date.monthIndex === 0 ? `${label} ${date.year}` : label;
  });
}

function comparisonWindowLabel(option) {
  const start = addMonths(option.year, option.monthIndex, 0);
  const end = addMonths(option.year, option.monthIndex, 3);
  return `${monthShortNames[start.monthIndex]} ${start.year}-` +
    `${monthShortNames[end.monthIndex]} ${end.year}`;
}

function comparisonPct(dateValue) {
  const pct = ((dateValue - comparisonRangeStart) / (comparisonRangeEnd - comparisonRangeStart)) * 100;
  return Math.max(0, Math.min(100, pct));
}

async function loadComparisonMonthlyFireData() {
  if (comparisonMonthlyFire.size) return;
  const response = await fetch('data/hist_daily_continuous.csv');
  const text = await response.text();
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',');
  const dateIndex = headers.indexOf('date');
  const countIndex = headers.indexOf('count');

  lines.forEach(line => {
    const columns = line.split(',');
    const monthKey = columns[dateIndex]?.slice(0, 7);
    const count = Number(columns[countIndex]);
    if (!monthKey || !Number.isFinite(count)) return;
    comparisonMonthlyFire.set(monthKey, (comparisonMonthlyFire.get(monthKey) || 0) + count);
  });

  comparisonMonthlyFireMax = Math.max(...comparisonMonthlyFire.values(), 0);
}

function timelineFireHeight(monthKey) {
  const count = comparisonMonthlyFire.get(monthKey) || 0;
  if (!comparisonMonthlyFireMax) return 10;
  const normalized = Math.sqrt(count) / Math.sqrt(comparisonMonthlyFireMax);
  return Math.round(6 + normalized * 34);
}

function timelineFireLevel(monthKey) {
  const count = comparisonMonthlyFire.get(monthKey) || 0;
  if (!comparisonMonthlyFireMax || count <= 0) return 'low';
  const ratio = count / comparisonMonthlyFireMax;
  if (ratio >= 0.55) return 'extreme';
  if (ratio >= 0.25) return 'high';
  if (ratio >= 0.1) return 'moderate';
  return 'low';
}

function nearestComparisonOption(clientX) {
  if (!comparisonTimelineEl) return comparisonOptions[0];
  const rect = comparisonTimelineEl.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const targetDate = comparisonRangeStart + ratio * (comparisonRangeEnd - comparisonRangeStart);
  return comparisonOptions.reduce((nearest, option) => {
    return Math.abs(option.startDate - targetDate) < Math.abs(nearest.startDate - targetDate) ? option : nearest;
  }, comparisonOptions[0]);
}

function updateComparisonCharts(target) {
  const suffix = target === 'a' ? 'A' : 'B';
  const option = comparisonState[target];
  const labels = comparisonAxisLabels(option);
  const calendarView = target === 'a' ? comparisonViews.calendarA : comparisonViews.calendarB;
  const overlayView = target === 'a' ? comparisonViews.overlayA : comparisonViews.overlayB;
  const chip = target === 'a' ? comparisonChipA : comparisonChipB;
  const handle = target === 'a' ? comparisonHandleA : comparisonHandleB;
  const windowLabel = comparisonWindowLabel(option);

  if (chip) chip.textContent = windowLabel;
  if (handle) {
    handle.style.left = `${comparisonPct(option.startDate)}%`;
    handle.setAttribute('aria-valuetext', windowLabel);
  }
  if (comparisonTimelineEl && comparisonState.a.key === comparisonState.b.key) {
    comparisonTimelineEl.classList.add('handles-overlap');
  } else if (comparisonTimelineEl) {
    comparisonTimelineEl.classList.remove('handles-overlap');
  }
  if (comparisonMarkersEl) {
    comparisonMarkersEl.querySelectorAll(`.selected-${target}`).forEach(marker => {
      marker.classList.remove(`selected-${target}`);
    });
    comparisonMarkersEl.querySelector(`[data-start="${option.key}"]`)?.classList.add(`selected-${target}`);
  }

  if (calendarView) {
    const gridStart = gridStartForMonth(option.year, option.monthIndex);
    const labelWeeks = labelWeeksForGrid(option.year, option.monthIndex);
    calendarView.signal(`selectedStart${suffix}`, option.dayStart);
    calendarView.signal(`gridStart${suffix}`, gridStart);
    labels.forEach((label, index) => {
      calendarView.signal(`label${suffix}${index}`, label);
      calendarView.signal(`labelWeek${suffix}${index}`, labelWeeks[index]);
    });
    calendarView.runAsync();
  }
  if (overlayView) {
    overlayView.signal(`selectedMonth${suffix}`, option.monthStart);
    overlayView.signal(`rhythmTitle${suffix}`, windowLabel);
    overlayView.runAsync();
  }
}

function setComparisonWindow(target, option) {
  comparisonState[target] = option;
  updateComparisonCharts(target);
}

function bindComparisonHandle(handle, target) {
  if (!handle || !comparisonTimelineEl) return;
  let dragging = false;

  handle.addEventListener('pointerdown', event => {
    dragging = true;
    handle.classList.add('dragging');
    handle.setPointerCapture(event.pointerId);
    setComparisonWindow(target, nearestComparisonOption(event.clientX));
  });

  handle.addEventListener('pointermove', event => {
    if (!dragging) return;
    setComparisonWindow(target, nearestComparisonOption(event.clientX));
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  }

  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
  handle.addEventListener('keydown', event => {
    const currentIndex = comparisonOptions.findIndex(option => option.key === comparisonState[target].key);
    if (event.key === 'ArrowLeft' && currentIndex > 0) {
      event.preventDefault();
      setComparisonWindow(target, comparisonOptions[currentIndex - 1]);
    }
    if (event.key === 'ArrowRight' && currentIndex < comparisonOptions.length - 1) {
      event.preventDefault();
      setComparisonWindow(target, comparisonOptions[currentIndex + 1]);
    }
  });
}

async function buildComparisonTimeline() {
  if (!comparisonTimelineEl) return;
  await loadComparisonMonthlyFireData();

  if (comparisonMarkersEl) {
    comparisonMarkersEl.innerHTML = '';
    for (let i = 0; ; i += 1) {
      const date = new Date(Date.UTC(2005, i, 1));
      if (date.getTime() > comparisonRangeEnd) break;
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      const isBlackSummer = date.getTime() >= Date.UTC(2019, 7, 1) && date.getTime() <= Date.UTC(2020, 0, 1);
      const fireCount = comparisonMonthlyFire.get(key) || 0;
      const fireLevel = timelineFireLevel(key);
      const height = timelineFireHeight(key);
      const marker = document.createElement('span');
      marker.className = 'calendar-marker';
      marker.dataset.start = key;
      marker.dataset.count = String(fireCount);
      marker.title = `${monthShortNames[month]} ${year}: ${fireCount.toLocaleString()} detections`;
      if (month === 0) marker.classList.add('year-start');
      marker.classList.add(`fire-${fireLevel}`);
      if (isBlackSummer) marker.classList.add('black-summer');
      marker.style.left = `${comparisonPct(date.getTime())}%`;
      marker.style.setProperty('--marker-height', `${height}px`);
      comparisonMarkersEl.appendChild(marker);
    }
  }

  if (comparisonEventsEl) {
    comparisonEventsEl.innerHTML = '';
    [
      { date: Date.UTC(2019, 7, 1), label: 'Black Summer window', top: '0px', stem: '42px', className: 'black-summer' }
    ].forEach(event => {
      const label = document.createElement('span');
      label.className = `calendar-event-label ${event.className || ''} ${event.edge || ''}`.trim();
      label.textContent = event.label;
      label.style.left = `${comparisonPct(event.date)}%`;
      label.style.setProperty('--event-top', event.top);
      label.style.setProperty('--event-stem', event.stem);
      comparisonEventsEl.appendChild(label);
    });
  }

  if (comparisonLabelsEl) {
    comparisonLabelsEl.innerHTML = '';
    [
      { date: Date.UTC(2005, 0, 1), label: 'Jan 2005', edge: 'edge-start' },
      { date: Date.UTC(2008, 0, 1), label: '2008' },
      { date: Date.UTC(2011, 0, 1), label: '2011' },
      { date: Date.UTC(2014, 0, 1), label: '2014' },
      { date: Date.UTC(2017, 0, 1), label: '2017' },
      { date: Date.UTC(2020, 0, 1), label: '2020' },
      { date: Date.UTC(2020, 9, 31), label: 'Oct 2020', edge: 'edge-end' }
    ].forEach(tick => {
      const label = document.createElement('span');
      label.className = `calendar-timeline-label ${tick.edge || ''}`.trim();
      label.textContent = tick.label;
      label.style.left = `${comparisonPct(tick.date)}%`;
      comparisonLabelsEl.appendChild(label);
    });
  }

  bindComparisonHandle(comparisonHandleA, 'a');
  bindComparisonHandle(comparisonHandleB, 'b');
  updateComparisonCharts('a');
  updateComparisonCharts('b');
}

buildComparisonTimeline();

embedComposedPanel('#viz-calendar-a', 'vega/12_calendar.json', 'vconcat', 0, { width: 'container', height: 62 }).then(result => {
  comparisonViews.calendarA = result?.view || null;
  updateComparisonCharts('a');
});
embedComposedPanel('#viz-overlay-a', 'vega/10_wa_overlay.json', 'hconcat', 0, { width: 'container', height: 96 }).then(result => {
  comparisonViews.overlayA = result?.view || null;
  updateComparisonCharts('a');
});
embedComposedPanel('#viz-calendar-b', 'vega/12_calendar.json', 'vconcat', 1, {
  width: 'container',
  height: 62,
  encoding: { y: { axis: null } }
}).then(result => {
  comparisonViews.calendarB = result?.view || null;
  updateComparisonCharts('b');
});
embedComposedPanel('#viz-overlay-b', 'vega/10_wa_overlay.json', 'hconcat', 1, { width: 'container', height: 96 }).then(result => {
  comparisonViews.overlayB = result?.view || null;
  updateComparisonCharts('b');
});
