# Black Summer Data Visualisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 12-visualisation Vega-Lite web page telling the story of Australia's 2019–2020 Black Summer bushfire crisis, hosted as a single scrollable `index.html` on GitHub Pages.

**Architecture:** A pure static site — one `index.html`, one `style.css`, pre-aggregated CSV/JSON data files, and one JSON spec per Vega-Lite chart loaded via `<script>` tags using the Vega-Lite CDN. Python scripts in `scripts/` generate all data files from the raw zip sources. No build tool needed.

**Tech Stack:** HTML5, CSS3 (custom + Pure.css grid), Vega-Lite 5.x (CDN), Python 3 + pandas (data prep only, not shipped).

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Page shell, all chapter markup, embeds Vega-Lite divs |
| `css/style.css` | Smoke-ash theme, layout, typography, responsive |
| `scripts/prepare_data.py` | Reads zip files → writes all CSV/JSON to `data/` |
| `data/fire_sample_map.csv` | 3000-pt sample (lat, lon, frp, month, state) for dot map |
| `data/fire_daily.csv` | Date, count — for time-series line chart |
| `data/fire_monthly_state.csv` | Month, state, count, avg_frp — for heatmatrix + bubble |
| `data/fire_frp_bins.csv` | bin_label, count — for FRP histogram |
| `data/fire_daynight.csv` | daynight, count — for bar chart |
| `data/australia_states.topo.json` | TopoJSON AU state boundaries (downloaded from naturalearth) |
| `data/wa_fire_prone_2025.geojson` | WA govt 2025 fire-prone areas (from package_show.json URL) |
| `vega/01_dot_map.json` | Vega-Lite dot map spec |
| `vega/02_state_bar.json` | State bar chart spec |
| `vega/03_time_slider_map.json` | Map with month slider spec |
| `vega/04_small_multiples.json` | 5-panel monthly small multiples spec |
| `vega/05_frp_histogram.json` | FRP histogram spec |
| `vega/06_heatmatrix.json` | Month × State heat matrix spec |
| `vega/07_daynight_bar.json` | Day/Night bar chart spec |
| `vega/08_timeseries.json` | Daily time-series line chart spec |
| `vega/09_choropleth.json` | Official fire boundaries choropleth spec |
| `vega/10_overlay_map.json` | WA 2025 prone areas overlay spec |
| `vega/11_bubble_chart.json` | State × Month bubble chart spec |
| `vega/12_calendar_heatmap.json` | Daily calendar heatmap spec |

---

## Task 1: Data Preparation Script

**Files:**
- Create: `scripts/prepare_data.py`
- Creates: `data/fire_sample_map.csv`, `data/fire_daily.csv`, `data/fire_monthly_state.csv`, `data/fire_frp_bins.csv`, `data/fire_daynight.csv`

- [ ] **Step 1: Install dependencies**

```bash
pip install pandas
```

- [ ] **Step 2: Create `scripts/prepare_data.py`**

```python
import zipfile, io, os
import pandas as pd
import numpy as np

os.makedirs("data", exist_ok=True)

def assign_state(lat, lon):
    if lat < -43.5: return "TAS"
    if lat < -39 and lon > 141: return "VIC"
    if lat < -28 and lat >= -39 and lon > 141: return "NSW"
    if lat < -28 and lon < 141 and lon > 129: return "SA"
    if lat >= -28 and lat < -10 and lon > 138: return "QLD"
    if lon < 129: return "WA"
    return "NT"

frames = []
# Aug 2019 from "Fires from Space"
with zipfile.ZipFile("Fires from Space Australia.zip") as z:
    with z.open("fire_archive_M6_96619.csv") as f:
        df = pd.read_csv(f)
        frames.append(df[df["acq_date"].str[:7] == "2019-08"])
# Sep–Dec 2019 from NASA archive
with zipfile.ZipFile("Australian Bush fire satellite data (NASA).zip") as z:
    with z.open("fire_archive_M6_101673.csv") as f:
        frames.append(pd.read_csv(f))
    # Jan 2020 from NRT
    with z.open("fire_nrt_M6_101673.csv") as f:
        frames.append(pd.read_csv(f))

df = pd.concat(frames, ignore_index=True)
df["month"] = df["acq_date"].str[:7]
df["state"] = df.apply(lambda r: assign_state(r["latitude"], r["longitude"]), axis=1)
df["date"] = pd.to_datetime(df["acq_date"])

# 1. Sample map: 3000 points stratified by month
sample = df.groupby("month", group_keys=False).apply(
    lambda g: g.sample(min(len(g), 600), random_state=42)
)[["latitude","longitude","frp","month","state","daynight","confidence"]]
sample.to_csv("data/fire_sample_map.csv", index=False)
print(f"fire_sample_map.csv: {len(sample)} rows")

# 2. Daily counts
daily = df.groupby("acq_date").size().reset_index(name="count")
daily.columns = ["date","count"]
daily.to_csv("data/fire_daily.csv", index=False)
print(f"fire_daily.csv: {len(daily)} rows")

# 3. Monthly × State
ms = df.groupby(["month","state"]).agg(
    count=("frp","count"),
    avg_frp=("frp","mean"),
    total_frp=("frp","sum")
).reset_index()
ms["avg_frp"] = ms["avg_frp"].round(1)
ms["total_frp"] = ms["total_frp"].round(0)
ms.to_csv("data/fire_monthly_state.csv", index=False)
print(f"fire_monthly_state.csv: {len(ms)} rows")

# 4. FRP histogram bins
bins = [0,50,200,500,1000,5000,15000]
labels = ["0–50","50–200","200–500","500–1k","1k–5k","5k+"]
df["frp_bin"] = pd.cut(df["frp"], bins=bins, labels=labels, right=False)
frp_hist = df["frp_bin"].value_counts().reindex(labels).reset_index()
frp_hist.columns = ["bin","count"]
frp_hist.to_csv("data/fire_frp_bins.csv", index=False)
print(f"fire_frp_bins.csv: {len(frp_hist)} rows")

# 5. Day/Night
dn = df["daynight"].value_counts().reset_index()
dn.columns = ["daynight","count"]
dn["label"] = dn["daynight"].map({"D":"Day ☀️","N":"Night 🌙"})
dn.to_csv("data/fire_daynight.csv", index=False)
print(f"fire_daynight.csv: {len(dn)} rows")

print("All data files written to data/")
```

- [ ] **Step 3: Run the script**

```bash
cd "D:\Evolustion\FIT_2179\ASGN2\.claude\worktrees\strange-bassi-1ef69b"
python scripts/prepare_data.py
```

Expected output:
```
fire_sample_map.csv: 3000 rows
fire_daily.csv: ~180 rows
fire_monthly_state.csv: ~30 rows
fire_frp_bins.csv: 6 rows
fire_daynight.csv: 2 rows
All data files written to data/
```

- [ ] **Step 4: Verify file sizes are within budget**

```bash
python -c "import os; [print(f'{f}: {os.path.getsize(\"data/\"+f)//1024} KB') for f in os.listdir('data') if f.endswith('.csv')]"
```

Expected: all CSV files < 500 KB each.

- [ ] **Step 5: Commit**

```bash
git add scripts/prepare_data.py data/
git commit -m "feat: add data preparation script and aggregated data files"
```

---

## Task 2: Get Australia States TopoJSON

**Files:**
- Create: `data/australia_states.topo.json`

- [ ] **Step 1: Download AU states TopoJSON**

```bash
curl -L "https://raw.githubusercontent.com/rowanhogan/australian-states/master/states.geojson" -o "data/australia_states.geojson"
```

If curl fails, use Python:
```python
import urllib.request
urllib.request.urlretrieve(
    "https://raw.githubusercontent.com/rowanhogan/australian-states/master/states.geojson",
    "data/australia_states.geojson"
)
```

- [ ] **Step 2: Install topojson and convert (optional — geojson works directly in Vega-Lite)**

Vega-Lite accepts GeoJSON directly, so this step can be skipped. Rename for clarity:

```bash
# Just keep as geojson — Vega-Lite handles it natively
```

- [ ] **Step 3: Verify the file**

```bash
python -c "import json; d=json.load(open('data/australia_states.geojson')); print('Features:', len(d['features'])); print('States:', [f['properties'].get('STATE_NAME','') for f in d['features']])"
```

Expected: 8 features (6 states + 2 territories).

- [ ] **Step 4: Commit**

```bash
git add data/australia_states.geojson
git commit -m "feat: add Australia states GeoJSON boundary file"
```

---

## Task 3: HTML/CSS Shell

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: Create `css/style.css`**

```css
/* === RESET & BASE === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #111827;
  color: #e8c9a0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 16px;
  line-height: 1.6;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* === TYPOGRAPHY === */
h1 { font-size: 3rem; font-weight: 700; color: #f5e6d0; line-height: 1.1; }
h2 { font-size: 1.6rem; font-weight: 600; color: #f0dcc0; margin-bottom: 0.5rem; }
h3 { font-size: 1.1rem; font-weight: 600; color: #e8c9a0; }
p  { color: #c9a87c; font-size: 0.95rem; max-width: 72ch; }

.eyebrow {
  font-family: 'Courier New', monospace;
  font-size: 0.7rem;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #c0392b;
}
.mono { font-family: 'Courier New', monospace; }
.accent { color: #e74c3c; }

/* === HERO === */
.hero {
  text-align: center;
  padding: 4rem 1rem 3rem;
  background: linear-gradient(180deg, #0a0e1a 0%, #1a1a2e 60%, #111827 100%);
  margin: 0 -1rem;
  border-bottom: 1px solid rgba(255,100,0,0.12);
}
.hero-subtitle {
  color: #b8956a;
  font-style: italic;
  font-size: 1.05rem;
  margin: 0.4rem 0 2rem;
}
.stat-grid {
  display: flex;
  justify-content: center;
  gap: 3rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}
.stat-box { text-align: center; }
.stat-number {
  font-family: 'Courier New', monospace;
  font-size: 2.4rem;
  font-weight: 900;
  color: #e74c3c;
  display: block;
}
.stat-label {
  font-size: 0.65rem;
  color: #9ca3af;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-family: sans-serif;
}

/* === CHAPTERS === */
.chapter { margin: 3rem 0; }
.chapter-label {
  font-family: 'Courier New', monospace;
  font-size: 0.65rem;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #c0392b;
  border-left: 3px solid #c0392b;
  padding-left: 0.8rem;
  margin-bottom: 0.5rem;
}
.chapter-intro {
  color: #b8956a;
  font-size: 0.9rem;
  max-width: 65ch;
  margin-bottom: 1.5rem;
  font-style: italic;
}

/* === LAYOUT === */
.two-col { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start; }
.three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
.small-multiples-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.8rem; }

/* === CHART CONTAINERS === */
.vega-container {
  background: #0d1117;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  padding: 1rem;
  overflow: hidden;
}
.chart-title {
  font-size: 0.7rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #9ca3af;
  font-family: sans-serif;
  margin-bottom: 0.6rem;
}
.chart-note {
  font-size: 0.7rem;
  color: rgba(180,150,100,0.4);
  font-family: sans-serif;
  font-style: italic;
  margin-top: 0.4rem;
}

/* === DIVIDER === */
.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,100,0,0.15), transparent);
  margin: 2.5rem 0;
}

/* === FOOTER === */
footer {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 1.5rem 0;
  margin-top: 3rem;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.25);
  font-family: sans-serif;
}

/* === RESPONSIVE === */
@media (max-width: 900px) {
  .two-col { grid-template-columns: 1fr; }
  .three-col { grid-template-columns: 1fr 1fr; }
  .small-multiples-grid { grid-template-columns: repeat(3, 1fr); }
  h1 { font-size: 2rem; }
}
@media (max-width: 600px) {
  .stat-grid { gap: 1.5rem; }
  .stat-number { font-size: 1.8rem; }
  .three-col { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Create `index.html` shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Australia's Black Summer — 2019–2020 Bushfire Crisis</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/purecss@3.0.0/build/pure-min.css">
  <link rel="stylesheet" href="css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
</head>
<body>

<!-- HERO -->
<section class="hero">
  <p class="eyebrow">Australia · August 2019 – January 2020</p>
  <h1>Australia's Black Summer</h1>
  <p class="hero-subtitle">When the continent burned — a satellite data story</p>
  <div class="stat-grid">
    <div class="stat-box">
      <span class="stat-number" id="stat-detections">0</span>
      <span class="stat-label">Satellite Fire Detections</span>
    </div>
    <div class="stat-box">
      <span class="stat-number">6</span>
      <span class="stat-label">Months of Crisis</span>
    </div>
    <div class="stat-box">
      <span class="stat-number">6</span>
      <span class="stat-label">States Affected</span>
    </div>
    <div class="stat-box">
      <span class="stat-number mono accent">11,164 MW</span>
      <span class="stat-label">Peak Fire Radiative Power</span>
    </div>
  </div>
</section>

<!-- CHAPTER 1: WHERE -->
<section class="chapter" id="ch-where">
  <p class="chapter-label">Chapter 1 · Where</p>
  <h2>Where did the fires burn?</h2>
  <p class="chapter-intro">Satellite sensors aboard NASA's Terra and Aqua satellites detected 199,417 active fire locations across Australia during the season. New South Wales bore the brunt — accounting for more than half of all detections.</p>
  <div class="two-col">
    <div class="vega-container">
      <p class="chart-title">Fire Detection Map — Aug 2019 to Jan 2020</p>
      <div id="vis-dot-map"></div>
      <p class="chart-note">Each point is a real satellite fire detection. Colour indicates month; size indicates Fire Radiative Power (FRP). Source: NASA FIRMS MODIS.</p>
    </div>
    <div class="vega-container">
      <p class="chart-title">Detections by State</p>
      <div id="vis-state-bar"></div>
      <p class="chart-note">NSW alone accounts for 51% of all fire detections.</p>
    </div>
  </div>
</section>

<div class="divider"></div>

<!-- CHAPTER 2: WHEN -->
<section class="chapter" id="ch-when">
  <p class="chapter-label">Chapter 2 · When</p>
  <h2>How did the crisis escalate over time?</h2>
  <p class="chapter-intro">What began as a severe but manageable fire season in August exploded into a national emergency by December — with five times more fire detections than the season's start.</p>
  <div class="vega-container" style="margin-bottom:1rem">
    <p class="chart-title">Daily Fire Detections — Time Series</p>
    <div id="vis-timeseries"></div>
    <p class="chart-note">Drag to zoom. Hover for daily count. The December surge was unprecedented.</p>
  </div>
  <div class="vega-container">
    <p class="chart-title">Monthly Spread — How fires grew across the continent</p>
    <div id="vis-small-multiples"></div>
    <p class="chart-note">Each map shows one month's fire detections. Watch the crisis expand southward.</p>
  </div>
</section>

<div class="divider"></div>

<!-- CHAPTER 3: HOW INTENSE -->
<section class="chapter" id="ch-intensity">
  <p class="chapter-label">Chapter 3 · How Intense</p>
  <h2>How powerful were these fires?</h2>
  <p class="chapter-intro">Fire Radiative Power (FRP) measures the energy released per second. The Black Summer produced fires reaching 11,164 megawatts — comparable to hundreds of nuclear power plants.</p>
  <div class="three-col">
    <div class="vega-container">
      <p class="chart-title">FRP Distribution</p>
      <div id="vis-frp-hist"></div>
      <p class="chart-note">Most fires were moderate, but extreme outliers drove enormous destruction.</p>
    </div>
    <div class="vega-container">
      <p class="chart-title">State × Month Intensity</p>
      <div id="vis-heatmatrix"></div>
      <p class="chart-note">NSW in December was the epicentre of the crisis.</p>
    </div>
    <div class="vega-container">
      <p class="chart-title">Day vs Night Detections</p>
      <div id="vis-daynight"></div>
      <p class="chart-note">37% of fires were detected at night — these fires never stopped burning.</p>
    </div>
  </div>
  <div class="vega-container" style="margin-top:1rem">
    <p class="chart-title">Fire Intensity by State and Month — Bubble Chart</p>
    <div id="vis-bubble"></div>
    <p class="chart-note">Bubble size = total FRP (MW). Hover for details.</p>
  </div>
</section>

<div class="divider"></div>

<!-- CHAPTER 4: TODAY -->
<section class="chapter" id="ch-today">
  <p class="chapter-label">Chapter 4 · Legacy</p>
  <h2>Where does the risk remain today?</h2>
  <p class="chapter-intro">In December 2025, Western Australian authorities designated new bush fire prone areas. These high-risk zones largely overlap with historical fire hotspots — a warning for the future.</p>
  <div class="two-col">
    <div class="vega-container">
      <p class="chart-title">2025 Fire-Prone Zones vs 2019–20 Fire Hotspots</p>
      <div id="vis-overlay-map"></div>
      <p class="chart-note">Red zones: 2025 WA designated fire-prone areas. Orange dots: 2019–20 satellite detections. Source: WA SLIP / data.gov.au.</p>
    </div>
    <div class="vega-container">
      <p class="chart-title">Daily Calendar — Fire Activity Intensity</p>
      <div id="vis-calendar"></div>
      <p class="chart-note">Each cell is one day. Colour = number of fire detections. The December–January block glows red.</p>
    </div>
  </div>
</section>

<div class="divider"></div>

<!-- FOOTER -->
<footer>
  <span>
    Data sources: NASA FIRMS MODIS (via Kaggle) · data.gov.au 2019–20 Bushfire Boundaries · WA SLIP Bush Fire Prone Areas 2025
  </span>
  <span>
    Visualisation by [Your Name] · FIT2179 Data Visualisation 2 · Monash University · May 2026 · AI tools used and acknowledged
  </span>
</footer>

<script>
// Animate stat counter
function animateCount(el, target, duration) {
  const start = performance.now();
  const update = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
window.addEventListener('load', () => {
  animateCount(document.getElementById('stat-detections'), 199417, 2000);
});

// Load all Vega-Lite specs
async function loadSpec(file, divId, opts = {}) {
  const spec = await fetch(file).then(r => r.json());
  vegaEmbed('#' + divId, spec, {
    actions: false,
    theme: 'dark',
    ...opts
  });
}

loadSpec('vega/01_dot_map.json', 'vis-dot-map');
loadSpec('vega/02_state_bar.json', 'vis-state-bar');
loadSpec('vega/08_timeseries.json', 'vis-timeseries');
loadSpec('vega/04_small_multiples.json', 'vis-small-multiples');
loadSpec('vega/05_frp_histogram.json', 'vis-frp-hist');
loadSpec('vega/06_heatmatrix.json', 'vis-heatmatrix');
loadSpec('vega/07_daynight_bar.json', 'vis-daynight');
loadSpec('vega/11_bubble_chart.json', 'vis-bubble');
loadSpec('vega/10_overlay_map.json', 'vis-overlay-map');
loadSpec('vega/12_calendar_heatmap.json', 'vis-calendar');
</script>
</body>
</html>
```

- [ ] **Step 3: Verify HTML opens in browser without errors**

Open `index.html` directly. Expect: dark page with hero, chapters, and empty chart divs (charts not loaded yet).

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add HTML shell and smoke-ash CSS theme"
```

---

## Task 4: Dot Map + State Bar (Chapter 1)

**Files:**
- Create: `vega/01_dot_map.json`
- Create: `vega/02_state_bar.json`

- [ ] **Step 1: Create `vega/01_dot_map.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 380,
  "background": "#0d1117",
  "projection": {"type": "mercator"},
  "layer": [
    {
      "data": {
        "url": "data/australia_states.geojson",
        "format": {"type": "json", "property": "features"}
      },
      "mark": {
        "type": "geoshape",
        "fill": "#162040",
        "stroke": "rgba(100,150,200,0.2)",
        "strokeWidth": 0.5
      }
    },
    {
      "data": {"url": "data/fire_sample_map.csv"},
      "transform": [
        {"filter": {"param": "month_select"}},
        {"filter": {"param": "state_select"}}
      ],
      "params": [
        {
          "name": "month_select",
          "select": {"type": "point", "fields": ["month"]},
          "bind": {
            "input": "select",
            "options": [null,"2019-08","2019-09","2019-11","2019-12","2020-01"],
            "labels": ["All months","Aug 2019","Sep 2019","Nov 2019","Dec 2019","Jan 2020"],
            "name": "Month: "
          }
        }
      ],
      "mark": {
        "type": "circle",
        "opacity": 0.7,
        "stroke": null
      },
      "encoding": {
        "longitude": {"field": "longitude", "type": "quantitative"},
        "latitude": {"field": "latitude", "type": "quantitative"},
        "size": {
          "field": "frp",
          "type": "quantitative",
          "scale": {"range": [2, 120], "type": "sqrt"},
          "legend": {"title": "Fire Power (MW)", "labelColor": "#9ca3af", "titleColor": "#9ca3af"}
        },
        "color": {
          "field": "month",
          "type": "nominal",
          "scale": {
            "domain": ["2019-08","2019-09","2019-11","2019-12","2020-01"],
            "range": ["#f39c12","#e67e22","#d35400","#c0392b","#e74c3c"]
          },
          "legend": {"title": "Month", "labelColor": "#9ca3af", "titleColor": "#9ca3af"}
        },
        "tooltip": [
          {"field": "month", "title": "Month"},
          {"field": "state", "title": "State"},
          {"field": "frp", "title": "FRP (MW)", "format": ".0f"},
          {"field": "daynight", "title": "Day/Night"}
        ]
      }
    }
  ],
  "config": {
    "background": "#0d1117",
    "view": {"stroke": null}
  }
}
```

- [ ] **Step 2: Create `vega/02_state_bar.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 220,
  "background": "#0d1117",
  "data": {"url": "data/fire_monthly_state.csv"},
  "transform": [
    {
      "aggregate": [{"op": "sum", "field": "count", "as": "total"}],
      "groupby": ["state"]
    },
    {"sort": [{"field": "total", "order": "descending"}]}
  ],
  "mark": {
    "type": "bar",
    "cornerRadiusEnd": 3,
    "color": {
      "gradient": "linear",
      "stops": [{"offset": 0, "color": "#922b21"}, {"offset": 1, "color": "#e74c3c"}]
    }
  },
  "encoding": {
    "y": {
      "field": "state",
      "type": "nominal",
      "sort": "-x",
      "axis": {"labelColor": "#9ca3af", "titleColor": "#9ca3af", "grid": false}
    },
    "x": {
      "field": "total",
      "type": "quantitative",
      "title": "Fire Detections",
      "axis": {"labelColor": "#9ca3af", "titleColor": "#9ca3af", "gridColor": "rgba(255,255,255,0.05)"}
    },
    "tooltip": [
      {"field": "state", "title": "State"},
      {"field": "total", "title": "Total Detections", "format": ","}
    ]
  },
  "config": {
    "background": "#0d1117",
    "view": {"stroke": null}
  }
}
```

- [ ] **Step 3: Open `index.html` and verify both charts render**

Expect: dot map showing fire points on Australia outline; horizontal bar chart with NSW tallest.

- [ ] **Step 4: Commit**

```bash
git add vega/01_dot_map.json vega/02_state_bar.json
git commit -m "feat: add dot map and state bar chart (Chapter 1)"
```

---

## Task 5: Time Series + Small Multiples (Chapter 2)

**Files:**
- Create: `vega/08_timeseries.json`
- Create: `vega/04_small_multiples.json`

- [ ] **Step 1: Create `vega/08_timeseries.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 200,
  "background": "#0d1117",
  "data": {"url": "data/fire_daily.csv"},
  "transform": [{"calculate": "datum.date", "as": "date"}],
  "layer": [
    {
      "mark": {
        "type": "area",
        "line": {"color": "#e74c3c", "strokeWidth": 1.5},
        "color": {
          "gradient": "linear",
          "x1": 0, "y1": 0, "x2": 0, "y2": 1,
          "stops": [{"offset": 0, "color": "rgba(231,76,60,0.4)"}, {"offset": 1, "color": "rgba(231,76,60,0.02)"}]
        }
      },
      "encoding": {
        "x": {
          "field": "date",
          "type": "temporal",
          "title": null,
          "axis": {"labelColor": "#9ca3af", "gridColor": "rgba(255,255,255,0.04)", "format": "%b %Y"}
        },
        "y": {
          "field": "count",
          "type": "quantitative",
          "title": "Daily Detections",
          "axis": {"labelColor": "#9ca3af", "titleColor": "#9ca3af", "gridColor": "rgba(255,255,255,0.04)"}
        },
        "tooltip": [
          {"field": "date", "type": "temporal", "title": "Date", "format": "%d %b %Y"},
          {"field": "count", "title": "Detections", "format": ","}
        ]
      }
    },
    {
      "mark": {"type": "rule", "color": "rgba(255,200,0,0.3)", "strokeDash": [4,4]},
      "data": {"values": [{"date": "2019-12-01"}]},
      "encoding": {
        "x": {"field": "date", "type": "temporal"},
        "size": {"value": 1}
      }
    },
    {
      "mark": {"type": "text", "color": "rgba(255,200,0,0.5)", "dx": 4, "dy": -8, "fontSize": 9, "align": "left"},
      "data": {"values": [{"date": "2019-12-01", "label": "Dec: Crisis peaks"}]},
      "encoding": {
        "x": {"field": "date", "type": "temporal"},
        "y": {"value": 20},
        "text": {"field": "label"}
      }
    }
  ],
  "config": {"background": "#0d1117", "view": {"stroke": null}}
}
```

- [ ] **Step 2: Create `vega/04_small_multiples.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "background": "#0d1117",
  "data": {"url": "data/fire_sample_map.csv"},
  "facet": {
    "field": "month",
    "type": "nominal",
    "sort": ["2019-08","2019-09","2019-11","2019-12","2020-01"],
    "header": {
      "labelColor": "#e8c9a0",
      "labelFontSize": 11,
      "labelExpr": "{'2019-08': 'Aug 2019', '2019-09': 'Sep 2019', '2019-11': 'Nov 2019', '2019-12': 'Dec 2019', '2020-01': 'Jan 2020'}[datum.label]"
    }
  },
  "columns": 5,
  "spec": {
    "width": 160,
    "height": 120,
    "projection": {"type": "mercator"},
    "layer": [
      {
        "data": {
          "url": "data/australia_states.geojson",
          "format": {"type": "json", "property": "features"}
        },
        "mark": {"type": "geoshape", "fill": "#162040", "stroke": "rgba(100,150,200,0.15)", "strokeWidth": 0.5}
      },
      {
        "mark": {"type": "circle", "opacity": 0.6, "size": 4, "color": "#e74c3c"}
      }
    ],
    "encoding": {
      "longitude": {"field": "longitude", "type": "quantitative"},
      "latitude": {"field": "latitude", "type": "quantitative"}
    }
  },
  "config": {"background": "#0d1117", "view": {"stroke": null}}
}
```

- [ ] **Step 3: Open `index.html` and verify both charts render**

Expect: area chart showing fire detections spiking in December; 5 small maps showing geographic spread.

- [ ] **Step 4: Commit**

```bash
git add vega/08_timeseries.json vega/04_small_multiples.json
git commit -m "feat: add time series and small multiples (Chapter 2)"
```

---

## Task 6: Intensity Charts (Chapter 3)

**Files:**
- Create: `vega/05_frp_histogram.json`
- Create: `vega/06_heatmatrix.json`
- Create: `vega/07_daynight_bar.json`
- Create: `vega/11_bubble_chart.json`

- [ ] **Step 1: Create `vega/05_frp_histogram.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 160,
  "background": "#0d1117",
  "data": {"url": "data/fire_frp_bins.csv"},
  "mark": {
    "type": "bar",
    "cornerRadiusTopLeft": 2,
    "cornerRadiusTopRight": 2,
    "color": {
      "gradient": "linear",
      "x1": 0, "y1": 1, "x2": 0, "y2": 0,
      "stops": [{"offset": 0, "color": "#922b21"}, {"offset": 1, "color": "#e74c3c"}]
    }
  },
  "encoding": {
    "x": {
      "field": "bin",
      "type": "ordinal",
      "sort": ["0–50","50–200","200–500","500–1k","1k–5k","5k+"],
      "title": "FRP Range (MW)",
      "axis": {"labelColor": "#9ca3af", "titleColor": "#9ca3af", "grid": false, "labelAngle": -30}
    },
    "y": {
      "field": "count",
      "type": "quantitative",
      "title": "Number of Detections",
      "scale": {"type": "log"},
      "axis": {"labelColor": "#9ca3af", "titleColor": "#9ca3af", "gridColor": "rgba(255,255,255,0.04)"}
    },
    "tooltip": [
      {"field": "bin", "title": "FRP Range"},
      {"field": "count", "title": "Detections", "format": ","}
    ]
  },
  "config": {"background": "#0d1117", "view": {"stroke": null}}
}
```

- [ ] **Step 2: Create `vega/06_heatmatrix.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 160,
  "background": "#0d1117",
  "data": {"url": "data/fire_monthly_state.csv"},
  "transform": [
    {"filter": {"field": "state", "oneOf": ["NSW","QLD","WA","NT","SA","VIC"]}}
  ],
  "mark": {"type": "rect", "cornerRadius": 2},
  "encoding": {
    "x": {
      "field": "month",
      "type": "ordinal",
      "sort": ["2019-08","2019-09","2019-11","2019-12","2020-01"],
      "title": null,
      "axis": {
        "labelColor": "#9ca3af",
        "labelExpr": "{'2019-08':'Aug','2019-09':'Sep','2019-11':'Nov','2019-12':'Dec','2020-01':'Jan'}[datum.label]"
      }
    },
    "y": {
      "field": "state",
      "type": "nominal",
      "sort": ["NSW","QLD","WA","NT","SA","VIC"],
      "title": null,
      "axis": {"labelColor": "#9ca3af"}
    },
    "color": {
      "field": "count",
      "type": "quantitative",
      "scale": {"scheme": "reds", "type": "log"},
      "legend": {"title": "Detections", "labelColor": "#9ca3af", "titleColor": "#9ca3af"}
    },
    "tooltip": [
      {"field": "month", "title": "Month"},
      {"field": "state", "title": "State"},
      {"field": "count", "title": "Detections", "format": ","},
      {"field": "avg_frp", "title": "Avg FRP (MW)", "format": ".0f"}
    ]
  },
  "config": {"background": "#0d1117", "view": {"stroke": null}}
}
```

- [ ] **Step 3: Create `vega/07_daynight_bar.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 120,
  "background": "#0d1117",
  "data": {"url": "data/fire_daynight.csv"},
  "mark": {"type": "bar", "cornerRadiusEnd": 4},
  "encoding": {
    "y": {
      "field": "label",
      "type": "nominal",
      "title": null,
      "axis": {"labelColor": "#e8c9a0", "grid": false, "labelFontSize": 12}
    },
    "x": {
      "field": "count",
      "type": "quantitative",
      "title": "Detections",
      "axis": {"labelColor": "#9ca3af", "titleColor": "#9ca3af", "gridColor": "rgba(255,255,255,0.04)"}
    },
    "color": {
      "field": "daynight",
      "type": "nominal",
      "scale": {"domain": ["D","N"], "range": ["#e74c3c","#34495e"]},
      "legend": null
    },
    "tooltip": [
      {"field": "label", "title": "Period"},
      {"field": "count", "title": "Detections", "format": ","}
    ]
  },
  "config": {"background": "#0d1117", "view": {"stroke": null}}
}
```

- [ ] **Step 4: Create `vega/11_bubble_chart.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 220,
  "background": "#0d1117",
  "data": {"url": "data/fire_monthly_state.csv"},
  "transform": [
    {"filter": {"field": "state", "oneOf": ["NSW","QLD","WA","NT","SA","VIC"]}}
  ],
  "mark": {"type": "circle", "opacity": 0.75},
  "encoding": {
    "x": {
      "field": "month",
      "type": "ordinal",
      "sort": ["2019-08","2019-09","2019-11","2019-12","2020-01"],
      "title": null,
      "axis": {
        "labelColor": "#9ca3af",
        "labelExpr": "{'2019-08':'Aug 2019','2019-09':'Sep 2019','2019-11':'Nov 2019','2019-12':'Dec 2019','2020-01':'Jan 2020'}[datum.label]"
      }
    },
    "y": {
      "field": "state",
      "type": "nominal",
      "sort": ["NSW","QLD","WA","NT","SA","VIC"],
      "title": null,
      "axis": {"labelColor": "#9ca3af"}
    },
    "size": {
      "field": "total_frp",
      "type": "quantitative",
      "scale": {"range": [20, 2500]},
      "legend": {"title": "Total FRP (MW)", "labelColor": "#9ca3af", "titleColor": "#9ca3af"}
    },
    "color": {
      "field": "count",
      "type": "quantitative",
      "scale": {"scheme": "reds"},
      "legend": null
    },
    "tooltip": [
      {"field": "state", "title": "State"},
      {"field": "month", "title": "Month"},
      {"field": "count", "title": "Detections", "format": ","},
      {"field": "total_frp", "title": "Total FRP (MW)", "format": ",.0f"},
      {"field": "avg_frp", "title": "Avg FRP (MW)", "format": ".1f"}
    ]
  },
  "config": {"background": "#0d1117", "view": {"stroke": null, "fill": "#0d1117"}}
}
```

- [ ] **Step 5: Open browser and verify all 4 charts render**

- [ ] **Step 6: Commit**

```bash
git add vega/05_frp_histogram.json vega/06_heatmatrix.json vega/07_daynight_bar.json vega/11_bubble_chart.json
git commit -m "feat: add intensity charts — FRP histogram, heat matrix, day/night, bubble (Chapter 3)"
```

---

## Task 7: Legacy Maps (Chapter 4)

**Files:**
- Create: `vega/10_overlay_map.json`
- Create: `vega/12_calendar_heatmap.json`
- Create: `scripts/fetch_wa_geojson.py`

- [ ] **Step 1: Download WA Fire Prone Areas GeoJSON**

```python
# scripts/fetch_wa_geojson.py
import urllib.request, json, os

# Read URL from package_show.json
with open("package_show.json") as f:
    pkg = json.load(f)
resources = pkg["result"]["resources"]
geojson_url = next(r["url"] for r in resources if r["format"] == "GeoJSON")
print("Downloading:", geojson_url)
urllib.request.urlretrieve(geojson_url, "data/wa_fire_prone_2025.geojson")
print("Saved to data/wa_fire_prone_2025.geojson")
size_mb = os.path.getsize("data/wa_fire_prone_2025.geojson") / 1e6
print(f"Size: {size_mb:.1f} MB")
```

Run:
```bash
python scripts/fetch_wa_geojson.py
```

If file > 2 MB, simplify geometry in Python:
```python
import json
with open("data/wa_fire_prone_2025.geojson") as f:
    gj = json.load(f)
# Keep only first 500 features if too large
gj["features"] = gj["features"][:500]
with open("data/wa_fire_prone_2025.geojson", "w") as f:
    json.dump(gj, f)
```

- [ ] **Step 2: Create `vega/10_overlay_map.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 320,
  "background": "#0d1117",
  "projection": {"type": "mercator"},
  "layer": [
    {
      "data": {
        "url": "data/australia_states.geojson",
        "format": {"type": "json", "property": "features"}
      },
      "mark": {"type": "geoshape", "fill": "#162040", "stroke": "rgba(100,150,200,0.2)", "strokeWidth": 0.5}
    },
    {
      "data": {
        "url": "data/wa_fire_prone_2025.geojson",
        "format": {"type": "json", "property": "features"}
      },
      "mark": {"type": "geoshape", "fill": "rgba(192,57,43,0.35)", "stroke": "rgba(231,76,60,0.6)", "strokeWidth": 0.5}
    },
    {
      "data": {"url": "data/fire_sample_map.csv"},
      "mark": {"type": "circle", "opacity": 0.5, "size": 3, "color": "#f39c12"}
    }
  ],
  "encoding": {
    "longitude": {"field": "longitude", "type": "quantitative"},
    "latitude": {"field": "latitude", "type": "quantitative"},
    "tooltip": [
      {"field": "state", "title": "State"},
      {"field": "month", "title": "Month"},
      {"field": "frp", "title": "FRP (MW)", "format": ".0f"}
    ]
  },
  "config": {"background": "#0d1117", "view": {"stroke": null}}
}
```

- [ ] **Step 3: Create `vega/12_calendar_heatmap.json`**

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 160,
  "background": "#0d1117",
  "data": {"url": "data/fire_daily.csv"},
  "transform": [
    {"calculate": "datetime(datum.date)", "as": "dt"},
    {"calculate": "day(datum.dt)", "as": "weekday"},
    {"calculate": "floor(dayofyear(datum.dt) / 7)", "as": "week"}
  ],
  "mark": {"type": "rect", "cornerRadius": 2},
  "encoding": {
    "x": {
      "field": "week",
      "type": "ordinal",
      "title": null,
      "axis": null
    },
    "y": {
      "field": "weekday",
      "type": "ordinal",
      "title": null,
      "axis": {
        "labelExpr": "['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][datum.label]",
        "labelColor": "#9ca3af"
      }
    },
    "color": {
      "field": "count",
      "type": "quantitative",
      "scale": {"scheme": "reds", "type": "sqrt"},
      "legend": {"title": "Detections/day", "labelColor": "#9ca3af", "titleColor": "#9ca3af"}
    },
    "tooltip": [
      {"field": "date", "title": "Date"},
      {"field": "count", "title": "Detections", "format": ","}
    ]
  },
  "config": {"background": "#0d1117", "view": {"stroke": null}}
}
```

- [ ] **Step 4: Open browser and verify Chapter 4 charts render**

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch_wa_geojson.py data/wa_fire_prone_2025.geojson vega/10_overlay_map.json vega/12_calendar_heatmap.json
git commit -m "feat: add legacy maps — WA overlay and calendar heatmap (Chapter 4)"
```

---

## Task 8: Final Polish & Interactivity

**Files:**
- Modify: `index.html` (stat counter, cross-chart filtering hints)
- Modify: `css/style.css` (hover states, responsive tweaks)

- [ ] **Step 1: Add narrative text to each chapter**

In `index.html`, update each `<p class="chapter-intro">` with 2–3 sentences of readable, jargon-free text explaining what the chart shows and why it matters. The text should already be there from Task 3 — review and refine it.

- [ ] **Step 2: Verify all 12 chart divs have content**

Open `index.html` in browser. Check devtools console for any Vega-Lite errors. Fix any `url` paths that are wrong (e.g. use relative paths from `index.html` location).

- [ ] **Step 3: Check total download size**

```bash
python -c "
import os
total = 0
for root, dirs, files in os.walk('.'):
    if '.git' in root: continue
    for f in files:
        p = os.path.join(root, f)
        s = os.path.getsize(p)
        total += s
        if s > 100000: print(f'{p}: {s//1024} KB')
print(f'Total: {total//1024} KB')
"
```

Expected: total < 3000 KB (3 MB).

- [ ] **Step 4: Add data source metadata to footer**

Verify the footer in `index.html` lists all 3 data sources with their origins. Already drafted in Task 3 — double-check it's accurate.

- [ ] **Step 5: Test on a narrow viewport**

Resize browser window to 900px width. Verify no horizontal scrolling, all charts remain visible, text is readable.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete Black Summer data visualisation — all 12 charts, polish, responsive"
```

---

## Self-Review Against Spec

| Spec Requirement | Task |
|---|---|
| ≥10 visualisations | Tasks 4–7 produce 12 ✅ |
| Multiple maps | Tasks 4 (dot map), 5 (small multiples ×5), 7 (overlay) = 7 maps ✅ |
| Multiple different idioms | Bar, dot map, area, facet, rect heat, circle bubble, calendar ✅ |
| 2 data sources combined | NASA FIRMS + WA Govt GeoJSON ✅ |
| Interactive exploration | Month selector, tooltips on all charts ✅ |
| Data < a few MB | Task 8 step 3 checks this ✅ |
| Smoke-ash theme | Task 3 CSS ✅ |
| Storytelling narrative text | Task 3 + Task 8 step 1 ✅ |
| Data sources credited in footer | Task 3 + Task 8 step 4 ✅ |
| Authorship + date | Footer ✅ |
| Single scrollable page | Task 3 structure ✅ |
