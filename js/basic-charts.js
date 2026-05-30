/* ========================================================
   VIZ 1/2/3 — Shared state-hover broadcast across Fig 02, 03A, 03B
   ======================================================== */
let ch1WaffleView = null;
let ch1StreamView = null;
let ch1RadarView = null;

function broadcastStateHover(state) {
  [ch1WaffleView, ch1StreamView, ch1RadarView].forEach(v => {
    if (v) v.signal('hoveredState', state).runAsync();
  });
}

function initCh1LegendHover() {
  // fig03a / fig03b: normal box elements — mouseenter/mouseleave work directly
  document.querySelectorAll(
    '.fig03a-state-legend [data-state], .fig03b-state-legend [data-state]'
  ).forEach(el => {
    el.addEventListener('mouseenter', () => broadcastStateHover(el.dataset.state));
    el.addEventListener('mouseleave', () => broadcastStateHover(''));
  });

  // waffle rows: display:contents has no box so the row can't be a hit target.
  // Listen on the child spans; relatedTarget check prevents clearing when
  // the mouse slides from one span to another within the same row.
  document.querySelectorAll('.waffle-legend-row[data-state]').forEach(row => {
    const state = row.dataset.state;
    row.querySelectorAll('span').forEach(span => {
      span.addEventListener('mouseenter', () => broadcastStateHover(state));
      span.addEventListener('mouseleave', e => {
        if (!row.contains(e.relatedTarget)) broadcastStateHover('');
      });
    });
  });
}

/* VIZ 1 — Isotype waffle: 200 flames, each ≈1,000 detections */
embedChart('#viz-waffle', 'vega/01_waffle.json?v=isotype-1k-20260530', embedOpts)
  .then(r => { ch1WaffleView = r.view; });

/* VIZ 2 — State Streamgraph (loaded from file) */
embedChart('#viz-state-bar', 'vega/02_state_streamgraph.json?v=state-hover-20260522', embedOpts)
  .then(r => { ch1StreamView = r.view; });

/* VIZ 3B - State radar profile (loaded from file) */
embedChart('#viz-state-radar', 'vega/03_state_radar.json?v=fig03b-tight-20260523', embedOpts)
  .then(r => { ch1RadarView = r.view; });

initCh1LegendHover();

/* VIZ 15 — Fire Causes Icon Waffle with interactive legend */
const causesAnnotations = {
  '': `<p class="fig01-ann-cta">↑ Click a driver in the legend to explore its role. Larger icon shares reflect greater contribution to the conditions that made Black Summer possible.</p>            
              <p class="fig01-ann-intro">Six conditions made Black Summer Australia’s worst fire season, burning 18.6 million hectares.</p>
`,

  'Prolonged drought': `<p class="fig01-ann-intro">Three consecutive years of rainfall deficits dried soils and river systems across eastern Australia before a single fire was lit.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">22 %</span><span>of the icon grid — the largest single share</span></div>`,

  'Record heat': `<p class="fig01-ann-intro">Australia's hottest year on record peaked at a national daily temperature of 41.9 °C on 18 December 2019 — desiccating fuels and breaking every prior benchmark.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">18 %</span><span>of the grid — second only to drought</span></div>`,

  'Dry fuels': `<p class="fig01-ann-intro">Years of drought loaded forests and grasslands with cured, dead vegetation — fuel moisture reached levels not seen since records began.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">17 %</span><span>of the grid — season-long vulnerability</span></div>`,

  'Extreme fire weather': `<p class="fig01-ann-intro">Simultaneous catastrophic fire danger ratings across multiple states were unprecedented — extreme heat, low humidity, and strong winds struck everywhere at once.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">16 %</span><span>of the grid — broke all response frameworks</span></div>`,

  'Dry lightning': `<p class="fig01-ann-intro">Lightning with little or no rain ignited fires across remote terrain before crews could reach them, seeding the season's most destructive blazes.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">14 %</span><span>of the grid — the ignition trigger</span></div>`,

  'Climate change signal': `<p class="fig01-ann-intro">Attribution science links human-caused warming to the heightened probability of these fire conditions — the only driver that keeps intensifying with each passing year.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">13 %</span><span>of the grid — smallest share, biggest future risk</span></div>`
};

embedChart('#viz-causes-waffle', 'vega/15_fire_causes_waffle.json?v=png-icons-20260522', embedOpts).then(result => {
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
  labelAngle: 0,
  labelPadding: 3,
  labelOverlap: "greedy",
  titlePadding: 16
};

const dailyCountAxis = {
  title: "Daily detections",
  labelPadding: 4,
  titlePadding: 8,
  labelFontSize: 10,
  titleFontSize: 10,
  titleLimit: 120
};

const dailyDateScale = { domain: ["2019-08-01", "2020-01-31"] };

const timeseriesSpec = {
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 180,
  "padding": 0,
  "data": { "url": "data/fire_daily.csv" },
  "layer": [
    {
      "mark": { "type": "area", "line": true, "color": "#e74c3c", "fillOpacity": 0.15 },
      "encoding": {
        "x": {
          "field": "date",
          "type": "temporal",
          "title": "Date",
          "axis": dailyDateAxis,
          "scale": dailyDateScale
        },
        "y": { "field": "count", "type": "quantitative", "axis": dailyCountAxis },
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
          "axis": dailyDateAxis,
          "scale": dailyDateScale
        },
        "y": { "field": "avg_count", "type": "quantitative", "axis": dailyCountAxis },
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
    }
  ]
};

embedChart('#viz-timeseries', timeseriesSpec, embedOpts);
