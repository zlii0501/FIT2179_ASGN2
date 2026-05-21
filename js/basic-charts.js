/* ========================================================
   VIZ 1 — Dot Map
   ======================================================== */
/* VIZ 1 — Flame Parliament Chart (loaded from file) */
embedChart('#viz-waffle', 'vega/01_waffle.json?v=state-safe-20260521', embedOpts);

/* VIZ 2 — State Streamgraph (loaded from file) */
embedChart('#viz-state-bar', 'vega/02_state_streamgraph.json?v=state-safe-20260521', embedOpts);

/* VIZ 3B - State radar profile (loaded from file) */
embedChart('#viz-state-radar', 'vega/03_state_radar.json?v=state-safe-20260521', embedOpts);

/* VIZ 15 — Fire Causes Icon Waffle with interactive legend */
const causesAnnotations = {
  '': 'Three years of drought, record heat, and an El Niño-like climate signal primed the landscape. When lightning struck tinder-dry forests under extreme fire weather, the result was inevitable. Click a driver above to explore each factor.',
  'Prolonged drought': '22 in every 100 fire-season icons trace back to drought. Three consecutive years of below-average rainfall left soil moisture at historic lows — forests entered Black Summer without any recovery between seasons.',
  'Record heat': 'Australia recorded its hottest year in 2019, peaking at a national record of 41.9 °C in December. Extreme heat desiccated fuels overnight and pushed fire behaviour beyond any previously documented scale.',
  'Dry fuels': 'Drought left millions of hectares loaded with cured and dead vegetation. Fuel moisture dropped below critical fire thresholds, enabling fires to spread at speeds and intensities never before recorded in Australia.',
  'Extreme fire weather': 'Simultaneous extreme fire danger ratings across multiple states overwhelmed suppression resources. Wind, low humidity, and heat combined in ways that made containment functionally impossible on the most critical days.',
  'Dry lightning': 'Lightning strikes seeded hundreds of fires in remote areas before crews could respond. Under these fuel loads, even single ignitions rapidly escalated into megafires.',
  'Climate change signal': 'Attribution science found climate change made these conditions at least 30 % more likely. Black Summer is not an anomaly — it is a preview of what regular fire seasons will increasingly look like.'
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
    annotationEl.textContent = causesAnnotations[driver] ?? causesAnnotations[''];
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
    }
  ]
};

embedChart('#viz-timeseries', timeseriesSpec, embedOpts);
