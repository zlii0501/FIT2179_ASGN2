/* ========================================================
   VIZ 1 — Dot Map
   ======================================================== */
/* VIZ 1 — Flame Parliament Chart (loaded from file) */
embedChart('#viz-waffle', 'vega/01_waffle.json', embedOpts);

/* VIZ 2 — State Streamgraph (loaded from file) */
embedChart('#viz-state-bar', 'vega/02_state_streamgraph.json?v=card-fit-20260521', embedOpts);

/* VIZ 3B - State radar profile (loaded from file) */
embedChart('#viz-state-radar', 'vega/03_state_radar.json?v=card-fit-20260521', embedOpts);

/* VIZ 15 — Fire Causes Icon Waffle (loaded from file) */
embedChart('#viz-causes-waffle', 'vega/15_fire_causes_waffle.json?v=card-fit-20260521', embedOpts);

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
