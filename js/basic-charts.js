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
  '': `<p class="fig01-ann-intro">Six interlocking conditions converged to produce the most destructive fire season in Australia's recorded history. No single driver explains Black Summer — it was their simultaneous presence that overwhelmed every natural and human defence.</p>
       <p class="fig01-ann-analysis">Click any driver in the legend to explore its role and share. The icon grid shows each factor's relative weight — larger shares reflect greater contribution to the conditions that made Black Summer possible.</p>`,

  'Prolonged drought': `<p class="fig01-ann-intro">Extended rainfall deficits depleted soil moisture and dried river systems across eastern Australia over three consecutive years before a single fire was lit.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">22 %</span><span>of the icon grid — the largest single share of any driver</span></div>
       <p class="fig01-ann-analysis">Without this moisture deficit, the other five drivers would have produced a far more typical fire season. Drought is the foundation: it removed the landscape's capacity to resist fire before any extreme weather arrived.</p>`,

  'Record heat': `<p class="fig01-ann-intro">Australia recorded its hottest year ever in 2019. On 18 December, a new national daily temperature record of 41.9 °C was set — part of a 48-hour period that was among the most dangerous in the country's history.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">18 %</span><span>of the grid — second only to drought in its contribution</span></div>
       <p class="fig01-ann-analysis">Heat accelerated evapotranspiration, desiccated fuels in hours rather than days, and pushed fire behaviour indices into ranges suppression models had never been designed to handle. It was the amplifier that turned a drought into a crisis.</p>`,

  'Dry fuels': `<p class="fig01-ann-intro">Years of drought loaded forests and grasslands with cured and dead vegetation well above any historical average. Fuel moisture in some areas reached levels not seen since records began.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">17 %</span><span>of the grid — the landscape's accumulated, season-long vulnerability</span></div>
       <p class="fig01-ann-analysis">Fuel loads determined how intensely fires burned once ignited. With moisture below critical thresholds, fires spread faster and generated more energy than crews were equipped to counter. Dry fuels acted as a force multiplier on every other driver.</p>`,

  'Extreme fire weather': `<p class="fig01-ann-intro">Hot temperatures, low relative humidity, and strong winds combined to produce simultaneous extreme and catastrophic fire danger ratings across multiple states — an occurrence with no historical precedent.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">16 %</span><span>of the grid — conditions that broke all existing response frameworks</span></div>
       <p class="fig01-ann-analysis">Suppression resources designed for one or two simultaneous state-level emergencies faced eight or nine. On several days, containment was functionally impossible. Extreme fire weather transformed individual fires into megafires within hours.</p>`,

  'Dry lightning': `<p class="fig01-ann-intro">Lightning storms with little or no accompanying rain ignited fires across remote terrain before ground or aerial crews could reach them — seeding the season's largest and most destructive fires.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">14 %</span><span>of the grid — the ignition trigger that activated every other driver</span></div>
       <p class="fig01-ann-analysis">Remote ignitions are the hardest to suppress in their early, manageable phase. In a season where every uncontrolled fire rapidly became a megafire, each dry-lightning strike effectively seeded a major disaster.</p>`,

  'Climate change signal': `<p class="fig01-ann-intro">Attribution science links human-caused climate change to the heightened probability of the fire-weather conditions experienced during Black Summer — the only driver with a clear future trajectory.</p>
       <div class="fig01-ann-stat"><span class="fig01-ann-pct">13 %</span><span>of the grid — smallest share, but most consequential for the future</span></div>
       <p class="fig01-ann-analysis">Research found these extreme conditions were at least 30 % more likely due to climate change. Every other driver in the grid is being amplified by the same long-term warming trend. Black Summer is not an anomaly — it is a preview of what a warmer baseline makes increasingly ordinary.</p>`
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
