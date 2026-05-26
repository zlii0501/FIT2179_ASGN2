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
  const { omitLegendLabels = false, ...chartOverrides } = overrides;
  const response = await fetch(specUrl);
  const baseSpec = await response.json();
  const panelSpec = baseSpec[composeKey]?.[panelIndex];
  if (!panelSpec) return null;

  const { [composeKey]: _unused, transform: baseTransform, ...baseRest } = baseSpec;
  const { transform: panelTransform, ...panelRest } = panelSpec;
  const spec = mergePanelSpec({ ...baseRest, ...panelRest }, chartOverrides);

  if (baseTransform || panelTransform) {
    spec.transform = [
      ...(baseTransform || []),
      ...(panelTransform || [])
    ];
  }

  if (omitLegendLabels && Array.isArray(spec.layer)) {
    spec.layer = spec.layer.filter(layer => {
      const isMonthSwatch = layer.mark?.type === 'point' &&
        layer.mark?.shape === 'square' &&
        layer.encoding?.x?.value === 300;
      const isMonthLabel = layer.encoding?.text?.field === 'legend_label';
      return !isMonthSwatch && !isMonthLabel;
    });
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
  return Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(year, monthIndex, i);
    return Math.floor((dayIndexForMonth(m.year, m.monthIndex) - gridStart) / 7);
  });
}

function comparisonAxisLabels(option) {
  return Array.from({ length: 6 }, (_, i) => {
    const date = addMonths(option.year, option.monthIndex, i);
    const label = monthShortNames[date.monthIndex];
    return i === 0 || date.monthIndex === 0 ? `${label} ${date.year}` : label;
  });
}

function comparisonWindowLabel(option) {
  const start = addMonths(option.year, option.monthIndex, 0);
  const end = addMonths(option.year, option.monthIndex, 5);
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
  return Math.round(8 + normalized * 58);
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
  const title14El = document.getElementById(target === 'a' ? 'fig-14a-title-text' : 'fig-14b-title-text');
  if (title14El) title14El.textContent = `Daily detections — ${windowLabel}`;
  const title15El = document.getElementById(target === 'a' ? 'fig-15a-title-text' : 'fig-15b-title-text');
  if (title15El) title15El.textContent = `WA fire rhythm — ${windowLabel}`;
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

const comparisonSeasonData = {
  '2019': {
    label: 'Black Summer',
    area: '144,236 km²',
    detections: '83,176',
    note: 'The worst fire season in recorded history. NSW accounted for 51% of national detections; December 2019 alone generated over 43,000 detections in that state. Pyroconvective storms produced fire-generated thunderclouds visible from space.'
  },
  '2018': {
    label: 'Moderate season',
    area: '53,201 km²',
    detections: '28,151',
    note: 'A moderately active season. NSW recorded notable fires in November–December 2018 within historical ranges; QLD saw above-average activity in October. Commonly used as the default baseline comparison for Black Summer.'
  },
  '2017': {
    label: 'Below-average season',
    area: '41,840 km²',
    detections: '22,630',
    note: 'Below-average activity nationally. La Niña-influenced rainfall in 2016–17 left reduced fuel loads across eastern states. WA experienced some late-season savanna fires, but intensity was low and no major disaster events occurred.'
  },
  '2016': {
    label: 'Dry-year season',
    area: '48,510 km²',
    detections: '24,980',
    note: 'Moderate activity driven by drier-than-average conditions in WA and SA. Eastern states remained relatively subdued after a wet La Niña year. WA\'s Pilbara region contributed elevated FRP readings throughout the spring window.'
  },
  '2015': {
    label: 'El Niño season',
    area: '56,900 km²',
    detections: '31,240',
    note: 'Above-average activity centred on WA and NT. The 2015 El Niño brought reduced rainfall to the north and west. SA\'s Eyre Peninsula recorded significant events; NSW remained below typical intensity for the period.'
  },
  '2014': {
    label: 'Average season',
    area: '44,320 km²',
    detections: '23,810',
    note: 'A broadly average season with no single extreme event dominating the national picture. Savanna fires in NT and QLD accounted for the majority of detections; eastern forest fire risk was moderate and well within historical norms.'
  },
  '2013': {
    label: 'NSW early-season fires',
    area: '51,760 km²',
    detections: '26,940',
    note: 'An early start to the eastern season, with NSW recording significant fires in October 2013. The Blue Mountains fires prompted the first NSW state of emergency declaration in twenty years, foreshadowing the vulnerability of the region.'
  },
  '2012': {
    label: 'Quiet La Niña season',
    area: '32,450 km²',
    detections: '18,270',
    note: 'One of the quieter seasons on record. Above-average rainfall from a La Niña pattern suppressed fuel availability across eastern states. NT and QLD continued their regular savanna burn cycles at near-normal levels throughout the period.'
  },
  '2011': {
    label: 'Wettest on record',
    area: '29,810 km²',
    detections: '16,490',
    note: 'The quietest season in this dataset. Exceptional rainfall across the continent in 2010–11 produced heavy, damp ground cover that persisted into late 2011. Fire risk was historically low across all states — the inverse of Black Summer.'
  },
  '2010': {
    label: 'Transitional season',
    area: '38,650 km²',
    detections: '20,340',
    note: 'A transitional season between the drier mid-decade years and the wet La Niña period ahead. NT savanna fires were near average. WA and SA saw moderate activity in spring before conditions eased ahead of the wet year to come.'
  },
  '2009': {
    label: 'Black Saturday year',
    area: '69,200 km²',
    detections: '38,570',
    note: 'Black Saturday on 7 February 2009 killed 173 people — Australia\'s deadliest fire disaster before Black Summer. Victorian forests burning under 46 °C heat drove record FRP readings. NSW and SA also saw significantly elevated activity.'
  },
  '2008': {
    label: 'Average season',
    area: '43,100 km²',
    detections: '22,810',
    note: 'A broadly average season with activity distributed across NT savanna burns and moderate events in QLD and NSW. No single catastrophic event defined the season; WA recorded near-normal Kimberley burn patterns for the period.'
  },
  '2007': {
    label: 'Elevated NT season',
    area: '52,330 km²',
    detections: '27,660',
    note: 'Above-average activity in NT and QLD, driven by heavy grass growth following a strong wet season. The Top End recorded its highest burn area since 2004. NSW remained near the long-term average for this period in the record.'
  },
  '2006': {
    label: 'Active north season',
    area: '58,740 km²',
    detections: '30,920',
    note: 'A notably active year for the north and west. WA\'s Kimberley region and NT\'s Top End both recorded well above-average activity. Eastern states were moderate. This season held the pre-Black Summer record for NT detection counts.'
  },
  '2005': {
    label: 'Early record baseline',
    area: '47,890 km²',
    detections: '25,110',
    note: 'The earliest year in this dataset. Activity was broadly typical for a pre-drought El Niño year, with NT and QLD savanna burns forming the bulk of detections. NSW and VIC experienced moderate spring conditions and no major disasters.'
  }
};

function getComparisonSeasonInfo(option) {
  return comparisonSeasonData[String(option.year)] || {
    label: 'Historical season',
    area: '—',
    detections: '—',
    note: 'Historical fire activity for this window. Drag the handle above to explore any 6-month window from 2005 to 2020 and contrast seasonal patterns against Black Summer.'
  };
}

function parseNum(str) {
  if (!str || str === '—') return null;
  return parseInt(str.replace(/[^0-9]/g, ''), 10) || null;
}

const seasonHighlights = {
  '2019': 'December 2019 alone matched an entire average season in detection count.',
  '2018': 'NSW fires in Nov–Dec 2018 drew attention but stayed within historical norms.',
  '2017': 'La Niña rainfall suppressed eastern fuel loads, making this a rare low-fire year.',
  '2016': 'WA Pilbara fires drove above-average FRP despite moderate national detection counts.',
  '2015': 'El Niño-driven drying lifted WA and NT activity above the 2005–2020 long-run mean.',
  '2014': 'Activity spread across all states with no single extreme event dominating.',
  '2013': 'NSW Blue Mountains fires in October prompted the first state emergency declaration in 20 years.',
  '2012': 'La Niña-suppressed fuels kept eastern states among the quietest on record.',
  '2011': 'Record 2010–11 rainfall made this the lowest-fire year in the entire dataset.',
  '2010': 'NT and WA saw near-average savanna burns as La Niña moisture began to arrive.',
  '2009': 'Black Saturday on 7 Feb 2009 killed 173 people — the deadliest fire disaster before Black Summer.',
  '2008': 'NT savanna burns and moderate east-coast activity produced a broadly average season.',
  '2007': 'NT and QLD both recorded above-average burns after a heavy wet season raised fuel loads.',
  '2006': 'WA Kimberley and NT Top End both saw well above-average burn extent.',
  '2005': 'The first year of the record — broadly typical of a pre-drought El Niño baseline.'
};

function buildComparisonNote(infoA, infoB, ratioArea) {
  if (ratioArea === null) {
    return 'Select two windows to compare fire activity side by side.';
  }
  const diff = Math.abs(ratioArea - 1);

  if (diff < 0.15) {
    const pct = Math.round(diff * 100);
    return `${infoA.label} and ${infoB.label} were closely matched — ${infoA.detections} vs ${infoB.detections} detections, fire areas within ${pct}% of each other.`;
  }

  const aIsBigger = ratioArea >= 1;
  const r = aIsBigger ? ratioArea : 1 / ratioArea;
  const bigInfo   = aIsBigger ? infoA : infoB;
  const smallInfo = aIsBigger ? infoB : infoA;
  const bigYear   = String(aIsBigger ? comparisonState.a.year : comparisonState.b.year);
  const highlight = seasonHighlights[bigYear] || '';
  const magnitude = r >= 3 ? 'dramatically' : r >= 1.5 ? 'significantly' : 'moderately';

  const s1 = `${bigInfo.label} was ${magnitude} more active — ${r.toFixed(1)}× the fire area, ${bigInfo.detections} vs ${smallInfo.detections} detections.`;
  return highlight ? `${s1} ${highlight}` : s1;
}

function updateComparisonInfoCard() {
  const infoA = getComparisonSeasonInfo(comparisonState.a);
  const infoB = getComparisonSeasonInfo(comparisonState.b);

  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const setW = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = `${pct}%`; };

  set('comparison-ic-label-a', infoA.label);
  set('comparison-ic-season-a', comparisonWindowLabel(comparisonState.a));
  set('comparison-ic-label-b', infoB.label);
  set('comparison-ic-season-b', comparisonWindowLabel(comparisonState.b));

  const aArea  = parseNum(infoA.area);
  const bArea  = parseNum(infoB.area);
  const aCount = parseNum(infoA.detections);
  const bCount = parseNum(infoB.detections);
  const maxArea  = Math.max(aArea  || 0, bArea  || 0, 1);
  const maxCount = Math.max(aCount || 0, bCount || 0, 1);

  set('comparison-ic-area-a', infoA.area);
  set('comparison-ic-area-b', infoB.area);
  setW('comparison-ic-bar-area-a', Math.round(((aArea  || 0) / maxArea)  * 100));
  setW('comparison-ic-bar-area-b', Math.round(((bArea  || 0) / maxArea)  * 100));

  set('comparison-ic-count-a', infoA.detections);
  set('comparison-ic-count-b', infoB.detections);
  setW('comparison-ic-bar-count-a', Math.round(((aCount || 0) / maxCount) * 100));
  setW('comparison-ic-bar-count-b', Math.round(((bCount || 0) / maxCount) * 100));

  const ratioArea  = (aArea  && bArea)  ? aArea  / bArea  : null;
  const ratioCount = (aCount && bCount) ? aCount / bCount : null;

  function ratioLabel(r) {
    if (r === null) return '—';
    if (Math.abs(r - 1) < 0.15) return '≈';
    return r >= 1 ? `A ×${r.toFixed(1)}` : `B ×${(1 / r).toFixed(1)}`;
  }
  set('comparison-ic-ratio-area',  ratioLabel(ratioArea));
  set('comparison-ic-ratio-count', ratioLabel(ratioCount));

  const similar = document.getElementById('comparison-ic-similar');
  const isSimilar = ratioArea !== null && Math.abs(ratioArea - 1) < 0.15;
  if (similar) {
    similar.hidden = !isSimilar;
    if (isSimilar) {
      const pct = Math.round(Math.abs(ratioArea - 1) * 100);
      similar.textContent = pct <= 2
        ? '≈ Nearly identical scale'
        : `≈ Within ${pct}% of each other`;
    }
  }

  set('comparison-ic-note', buildComparisonNote(infoA, infoB, ratioArea));
}

function setComparisonWindow(target, option) {
  comparisonState[target] = option;
  updateComparisonCharts(target);
  updateComparisonInfoCard();
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
      { date: Date.UTC(2019, 7, 1), label: 'Black Summer window', top: '0px', stem: '66px', className: 'black-summer' }
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
  updateComparisonInfoCard();
}

buildComparisonTimeline();

embedComposedPanel('#viz-calendar-a', 'vega/12_calendar.json', 'vconcat', 0, {
  width: 'container',
  height: 100,
  encoding: { color: { legend: null } }
}).then(result => {
  comparisonViews.calendarA = result?.view || null;
  updateComparisonCharts('a');
});
embedComposedPanel('#viz-overlay-a', 'vega/10_wa_overlay.json?v=notitle-20260526', 'hconcat', 0, {
  width: 'container',
  height: 220,
  omitLegendLabels: true
}).then(result => {
  comparisonViews.overlayA = result?.view || null;
  updateComparisonCharts('a');
});
embedComposedPanel('#viz-calendar-b', 'vega/12_calendar.json', 'vconcat', 1, {
  width: 'container',
  height: 100,
  encoding: {
    y: { axis: null },
    color: { legend: null }
  }
}).then(result => {
  comparisonViews.calendarB = result?.view || null;
  updateComparisonCharts('b');
});
embedComposedPanel('#viz-overlay-b', 'vega/10_wa_overlay.json?v=notitle-20260526', 'hconcat', 1, {
  width: 'container',
  height: 220,
  omitLegendLabels: true
}).then(result => {
  comparisonViews.overlayB = result?.view || null;
  updateComparisonCharts('b');
});
