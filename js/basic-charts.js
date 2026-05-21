/* ========================================================
   VIZ 1 — Dot Map
   ======================================================== */
/* VIZ 1 — Flame Parliament Chart (loaded from file) */
embedChart('#viz-waffle', 'vega/01_waffle.json?v=state-safe-20260521', embedOpts);

/* VIZ 2 — State Streamgraph (loaded from file) */
embedChart('#viz-state-bar', 'vega/02_state_streamgraph.json?v=state-safe-20260521', embedOpts);

/* VIZ 3B - State radar profile (loaded from file) */
embedChart('#viz-state-radar', 'vega/03_state_radar.json?v=multi-fig-polish-20260522', embedOpts);

/* VIZ 15 — Fire Causes Icon Waffle with interactive legend */
const causesAnnotations = {
  '': `<p class="fig01-ann-intro">Six conditions converged to produce Australia's most destructive fire season. No single driver explains Black Summer — their simultaneous presence overwhelmed every natural and human defence.</p>
       <p class="fig01-ann-analysis">Click a driver in the legend to explore its role. Larger icon shares reflect greater contribution to the conditions that made Black Summer possible.</p>`,

  'Prolonged drought': `<p class="fig01-ann-intro">Three consecutive years of rainfall deficits dried soils and river systems across eastern Australia before a single fire was lit.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">22 %</span><span>of the icon grid — the largest single share</span></div>
       <p class="fig01-ann-analysis">Drought removed the landscape's capacity to resist fire. Without it, the other five drivers would have produced a far more typical season.</p>`,

  'Record heat': `<p class="fig01-ann-intro">Australia recorded its hottest year ever in 2019, peaking at a national daily record of 41.9 °C on 18 December.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">18 %</span><span>of the grid — second only to drought</span></div>
       <p class="fig01-ann-analysis">Heat desiccated fuels in hours and pushed fire behaviour indices beyond what suppression models were designed to handle.</p>`,

  'Dry fuels': `<p class="fig01-ann-intro">Years of drought loaded forests and grasslands with cured, dead vegetation — fuel moisture reached levels not seen since records began.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">17 %</span><span>of the grid — season-long vulnerability</span></div>
       <p class="fig01-ann-analysis">Once ignited, fires burned with intensity that outpaced suppression capacity. Dry fuels acted as a force multiplier on every other driver.</p>`,

  'Extreme fire weather': `<p class="fig01-ann-intro">Heat, low humidity, and strong winds combined to produce simultaneous catastrophic fire danger ratings across multiple states — unprecedented in the historical record.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">16 %</span><span>of the grid — broke all response frameworks</span></div>
       <p class="fig01-ann-analysis">Resources built for one or two state emergencies faced eight or nine at once. Containment was functionally impossible on the worst days.</p>`,

  'Dry lightning': `<p class="fig01-ann-intro">Lightning with little or no rain ignited fires across remote terrain before crews could reach them, seeding the season's largest fires.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">14 %</span><span>of the grid — the ignition trigger</span></div>
       <p class="fig01-ann-analysis">Remote ignitions are the hardest to suppress early. In a season where every escaped fire became a megafire, each strike seeded a major disaster.</p>`,

  'Climate change signal': `<p class="fig01-ann-intro">Attribution science links human-caused warming to the heightened probability of these fire-weather conditions — the only driver with a clear future trajectory.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">13 %</span><span>of the grid — smallest share, biggest future risk</span></div>
       <p class="fig01-ann-analysis">Conditions were at least 30 % more likely due to climate change. Every other driver is being amplified by the same warming trend.</p>`
};

embedChart('#viz-causes-waffle', 'vega/15_fire_causes_waffle.json?v=causes-interact-20260520', embedOpts).then(result => {
  const waffleView = result.view;
  const legend = document.getElementById('fig01-driver-legend');
  const annotationEl = document.getElementById('fig01-annotation');
  if (!legend || !annotationEl) return;

  let activeDriver = '';

  function setDriver(driver) {
    activeDriver = driver;
    waffleView.signal('selectedDriver', driver).runAsync();
    annotationEl.innerHTML = causesAnnotations[driver] ?? causesAnnotations[''];
    annotationEl.dataset.driver = driver || 'all';
    legend.querySelectorAll('[data-driver]').forEach(el => {
      el.classList.toggle('active', el.dataset.driver === driver && driver !== '');
    });
  }

  legend.addEventListener('click', e => {
    const item = e.target.closest('[data-driver]');
    if (!item) return;
    setDriver(item.dataset.driver === activeDriver ? '' : item.dataset.driver);
  });

  legend.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('[data-driver]');
    if (!item) return;
    e.preventDefault();
    setDriver(item.dataset.driver === activeDriver ? '' : item.dataset.driver);
  });
});

/* ========================================================
   VIZ 8 — Time Series (daily counts)
   ======================================================== */
const dailyDateAxis = {
  title: "Date",
  format: "%d %b",
  tickCount: { "interval": "week", "step": 2 },
  labelAngle: -35,
  labelPadding: 8,
  labelOverlap: "greedy",
  titlePadding: 30
};

const timeseriesSpec = {
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 212,
  "data": { "url": "data/fire_daily.csv" },
  "params": [
    { "name": "selectedDay", "value": "2020-01-04" }
  ],
  "layer": [
    {
      "mark": { "type": "area", "line": true, "color": "#e74c3c", "fillOpacity": 0.15 },
      "encoding": {
        "x": {
          "field": "date",
          "type": "temporal",
          "title": "Date",
          "axis": dailyDateAxis
        },
        "y": { "field": "count", "type": "quantitative", "title": "Daily detections" },
        "color": { "value": "#e74c3c" },
        "tooltip": [
          { "field": "date", "type": "temporal", "title": "Date", "format": "%d %b %Y" },
          { "field": "count", "title": "Detections", "format": "," }
        ]
      }
    },
    {
      "data": { "url": "data/hist_seasonal_avg.csv" },
      "mark": { "type": "line", "strokeDash": [6,4], "color": "rgba(232,201,160,0.52)", "strokeWidth": 2 },
      "encoding": {
        "x": {
          "field": "baseline_date",
          "type": "temporal",
          "title": "Date",
          "axis": dailyDateAxis
        },
        "y": { "field": "avg_count", "type": "quantitative", "title": "Daily detections" },
        "tooltip": [
          { "field": "month_day", "title": "Calendar day" },
          { "field": "avg_count", "title": "2005-2018 avg detections", "format": ".1f" }
        ]
      }
    },
    {
      "mark": { "type": "rule", "strokeDash": [4,4], "color": "rgba(255,200,100,0.4)" },
      "data": {
        "values": [
          { "date": "2019-12-01" },
          { "date": "2020-01-04" }
        ]
      },
      "encoding": {
        "x": { "field": "date", "type": "temporal" }
      }
    },
    {
      "mark": { "type": "text", "align": "left", "dx": 5, "dy": -8, "fontSize": 10, "fill": "rgba(255,200,100,0.7)", "font": "sans-serif" },
      "data": {
        "values": [
          { "date": "2019-12-01", "label": "Dec explosion" },
          { "date": "2020-01-04", "label": "Catastrophic rating" }
        ]
      },
      "encoding": {
        "x": { "field": "date", "type": "temporal" },
        "y": { "value": 20 },
        "text": { "field": "label" }
      }
    },
    {
      "transform": [
        { "filter": "timeFormat(datum.date, '%Y-%m-%d') === selectedDay" }
      ],
      "mark": {
        "type": "rule",
        "color": "#f0dcc0",
        "strokeWidth": 1.4,
        "strokeDash": [3, 3]
      },
      "encoding": {
        "x": { "field": "date", "type": "temporal" }
      }
    },
    {
      "transform": [
        { "filter": "timeFormat(datum.date, '%Y-%m-%d') === selectedDay" }
      ],
      "mark": {
        "type": "point",
        "filled": true,
        "size": 92,
        "color": "#f0dcc0",
        "stroke": "#0d1117",
        "strokeWidth": 1
      },
      "encoding": {
        "x": { "field": "date", "type": "temporal" },
        "y": { "field": "count", "type": "quantitative" },
        "tooltip": [
          { "field": "date", "type": "temporal", "title": "Selected day", "format": "%d %b %Y" },
          { "field": "count", "title": "Detections", "format": "," }
        ]
      }
    }
  ]
};

let fig04TimeseriesView = null;
embedChart('#viz-timeseries', timeseriesSpec, embedOpts).then(result => {
  fig04TimeseriesView = result.view;
});

const fig04Slider = document.getElementById('fig04-day-slider');
const fig04DayLabel = document.getElementById('fig04-day-label');
const fig04DayCount = document.getElementById('fig04-day-count');

if (fig04Slider && fig04DayLabel && fig04DayCount) {
  fetch('data/fire_daily.csv')
    .then(response => response.text())
    .then(text => {
      const rows = text.trim().split(/\r?\n/).slice(1)
        .map(line => {
          const [date, count] = line.split(',');
          return { date, count: Number(count) };
        })
        .filter(row => row.date && Number.isFinite(row.count));

      if (!rows.length) return;
      const peakIndex = rows.reduce((best, row, index) => row.count > rows[best].count ? index : best, 0);

      function formatDay(dateText) {
        const date = new Date(`${dateText}T00:00:00Z`);
        return new Intl.DateTimeFormat('en-AU', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC'
        }).format(date);
      }

      function updateDay(index) {
        const row = rows[Math.max(0, Math.min(rows.length - 1, Number(index)))];
        fig04DayLabel.textContent = formatDay(row.date);
        fig04DayCount.textContent = row.count.toLocaleString('en-AU');
        if (fig04TimeseriesView) {
          fig04TimeseriesView.signal('selectedDay', row.date).runAsync();
        }
      }

      fig04Slider.max = String(rows.length - 1);
      fig04Slider.value = String(peakIndex);
      updateDay(peakIndex);
      fig04Slider.addEventListener('input', event => updateDay(event.target.value));
    })
    .catch(() => {
      fig04DayLabel.textContent = 'Unavailable';
      fig04DayCount.textContent = '0';
    });
}
