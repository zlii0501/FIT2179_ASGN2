# Australia's Black Summer - Data Visualisation 2

**Course:** FIT2179 Data Visualisation 2, Monash University  
**Due:** 29 May 2026  
**Worktree branch:** `claude/strange-bassi-1ef69b`  
**Hosting:** GitHub Pages, single `index.html`, no build step

---

## What This Is

A scrollable, single-page data story about Australia's 2019-2020 Black Summer bushfire season. It combines MODIS-derived aggregate charts, VIIRS 375m sampled fire points for the interactive maps, and `Historical_Wildfires.csv` for long-term context. The target audience is general Australians: plain language, strong narrative flow, and no statistics jargon.

**Visual theme:** Smoke Ash - dark navy `#111827` background, warm sand `#e8c9a0` text, crimson `#c0392b` and flame red `#e74c3c` data colours. Georgia serif for headings, Courier New monospace for numbers.

**Tech stack:** Vega-Lite 5 for most charts, Vega 5 for the alluvial diagram, vanilla JavaScript, custom CSS. No bundler, no framework.

---

## Current Progress

### Completed

- [x] Single-page app structure: hero plus 4 narrative chapters.
- [x] 16 Vega/Vega-Lite visualisations embedded and wired into `index.html`.
- [x] VIIRS monthly explorer and WA overlay now include October 2019.
- [x] Historical wildfire context added from `Historical_Wildfires.csv`.
- [x] Daily time-series includes a 2005-2018 historical baseline layer.
- [x] Data preparation scripts exist for MODIS, VIIRS, and historical wildfire files.
- [x] README, CHANGELOG, and update notes now reflect the current chart inventory.
- [x] Chart QA audit completed for all 16 visualisations; see `docs/chart-audit-2026-05-07.md`.

### Still Needs Doing

- [ ] Optional final browser pass at a wide desktop viewport and a narrow mobile viewport before submission.
- [ ] Decide whether the daily time-series should switch from MODIS-derived `fire_daily.csv` to VIIRS-derived daily totals, since the current daily series still has the older MODIS October gap.
- [ ] Add a concise data-method note explaining that some charts use MODIS aggregates while monthly maps use VIIRS samples.
- [ ] Fetch WA 2025 fire-prone GeoJSON from the SLIP endpoint only if a future official risk-zone layer is added; the current WA chart is a VIIRS-based polar seasonal clock.
- [ ] Update older `docs/superpowers/*` planning files if they will be submitted or used as project documentation.
- [ ] Commit all files to git before any push.

### Nice To Have

- [ ] Animated scroll-in for chapter labels.
- [ ] Back-to-top button.
- [ ] Print stylesheet.

---

## Project Structure

```text
/
├── index.html                 # Single-page app; inline monthly map + Vega embeds
├── css/
│   └── style.css              # Smoke-ash theme, layout, chart cards, controls
├── data/                      # Shipped CSV/GeoJSON data used by charts
│   ├── fire_daily.csv         # Daily MODIS detection totals
│   ├── fire_monthly_state.csv # Month x state aggregates: count, avg_frp, total_frp
│   ├── alluvial_month_state_intensity.json # Vega alluvial layout: month -> state -> intensity
│   ├── fire_sample_map.csv    # MODIS sample used by FRP density
│   ├── fire_daynight.csv      # Day/night detection counts for bullet chart
│   ├── fire_daynight_state.csv # State-level day/night shares for bullet small multiples
│   ├── fire_state_totals.csv  # State totals/density for summary charts
│   ├── hex_bins.geojson       # Full Australia spatial hexbin grid from VIIRS samples
│   ├── hex_bins_fine.geojson  # Finer state-zoom hexbin grid
│   ├── hist_annual.csv        # Historical Aug-Jan seasonal fire area totals
│   ├── hist_yearmonth.csv     # Historical year x month fire area totals
│   ├── hist_firework.csv      # Monthly historical area + Black Summer points for raincloud/firework views
│   ├── hist_month_distribution.csv # Monthly quantiles for the raincloud distribution bands
│   ├── hist_season_horizon.csv # Full-year monthly horizon chart anomaly bands retained for reference
│   ├── hist_seasonal_avg.csv  # 2005-2018 daily baseline for time-series
│   ├── viirs_sample_map.csv   # VIIRS monthly map + hotspot inset points
│   ├── viirs_wa.csv           # WA-only VIIRS overlay points
│   └── australia_states.geojson
├── scripts/
│   ├── prepare_data.py        # MODIS aggregate/sample generator
│   ├── prepare_viirs.py       # VIIRS sample generator
│   ├── prepare_historical.py  # Historical wildfire aggregate generator
│   ├── prepare_hexbins.py     # Full Australia empty/data hexbin grid generator
│   └── prepare_alluvial.py    # Static Vega alluvial layout generator
├── vega/                      # External Vega-Lite specs
└── docs/superpowers/          # Earlier design specs/plans
```

Raw source data stays outside deployed `data/` files: NASA MODIS ZIPs, NASA VIIRS ZIPs, `Historical_Wildfires.csv`, `package_show*.json`, and `source.xlsx`.

---

## Page Structure

| Section | ID | Current content |
|---|---|---|
| Hero | `#top` | Animated stat counters: 199,417 detections / 6 months / 6 states / 11,164 MW peak |
| Chapter 1 - Where | `#ch1` | Flame parliament chart with state table + state streamgraph + fire causes icon waffle |
| Chapter 2 - When | `#ch2` | Daily time-series with historical baseline + interactive VIIRS monthly map explorer + hotspot inset |
| Chapter 3 - How Intense | `#ch3` | FRP density, state-level day/night bullet chart, state-month bubble chart, month-state-intensity alluvial, Aug-Dec state escalation dumbbell |
| Chapter 4 - Legacy | `#ch4` | Historical annual area, monthly distribution raincloud, spatial fire bin map, calendar heatmap, WA polar seasonal clock |

---

## Visualisation Inventory

| # | ID | Chart type | Data file(s) | Status |
|---|---|---|---|---|
| 1 | `#viz-waffle` | Flame parliament unit chart + custom state share table | Inline sequence/state totals | Done |
| 2 | `#viz-state-bar` | State streamgraph over months | `fire_monthly_state.csv` | Done |
| 3 | `#viz-timeseries` | Daily time-series + 2005-2018 baseline | `fire_daily.csv` + `hist_seasonal_avg.csv` | Done |
| 4 | `#viz-month-map` | Interactive monthly VIIRS map | `viirs_sample_map.csv` + `australia_states.geojson` | Done |
| 5 | `#viz-month-inset` | Hotspot zoom inset for selected month | `viirs_sample_map.csv` + `australia_states.geojson` | Done |
| 6 | `#viz-frp-hist` | FRP density curve | `fire_sample_map.csv` | Done |
| 7 | `#viz-daynight` | State-level daytime share bullet chart | `fire_daynight_state.csv` | Done |
| 8 | `#viz-bubble` | State x month bubble chart | `fire_monthly_state.csv` | Done |
| 9 | `#viz-heatmatrix` | State escalation dumbbell, Aug to Dec | `fire_monthly_state.csv` | Done |
| 10 | `#viz-annual-area` | Historical seasonal fire area connected dot plot | `hist_annual.csv` | Done |
| 11 | `#viz-yearmonth-heat` | Historical distribution raincloud: Black Summer monthly area vs history | `hist_firework.csv` | Done |
| 12 | `#viz-hexbin` | Spatial VIIRS hexbin fire map | `hex_bins.geojson` + `australia_states.geojson` | Done |
| 13 | `#viz-calendar` | Daily detection calendar heatmap | `fire_daily.csv` | Done |
| 14 | `#viz-overlay` | WA polar seasonal fire clock; arc length shows average FRP | `viirs_wa.csv` | Done |
| 15 | `#viz-causes-waffle` | Fire causes icon waffle | Inline curated driver weights | Done |
| 16 | `#viz-alluvial` | Month -> state -> FRP intensity alluvial diagram | `alluvial_month_state_intensity.json` | Done |

---

## Latest Chart QA

See `docs/chart-audit-2026-05-07.md` for the full chart-by-chart audit. The pass checked labels, axes, legends, data labels, hover content, card clipping, repeated content, and chart-type fit.

Final adjustments from the audit:

- Added a custom Vega tooltip handler and routed all embeds through `embedChart()` so Vega and Vega-Lite charts share consistent hover behaviour.
- Added aria/description encodings to the raw Vega alluvial and spatial hexbin marks.
- Made the alluvial and spatial hexbin SVGs scale responsively inside their chart cards.
- Fixed day/night bullet tooltip fields so Vega-Lite no longer drops band and benchmark hover text.
- Fixed bubble-chart point-scale padding warnings and changed the bubble tooltip month to formatted labels such as `Aug 2019`.

Final browser audit result: 16/16 charts rendered, 16/16 charts exposed hover information, 0 visible bad-encoding labels, 0 chart-card clipping issues, and 0 Vega/Vega-Lite console warnings.

---

## Key Technical Notes

`#viz-month-map` uses a plain Vega-Lite variable param instead of a selection param so external month buttons can call `view.signal('sel_month', key).run()`. The map projection stays at the top level of the layered spec so geoshape and fire-point layers share coordinates.

States are assigned in `prepare_data.py` with lat/lon bounding boxes. `prepare_hexbins.py` clips the spatial bin map to the state GeoJSON so empty land cells can remain visible even where no VIIRS detections fell; ACT bins are grouped into NSW for the map filter. The map uses `hex_bins.geojson` for the full-Australia view and switches to `hex_bins_fine.geojson` for state zooms. `prepare_viirs.py` thins VIIRS detections for browser performance. `prepare_historical.py` normalises historical region codes and outputs annual, year-month, and seasonal baseline CSVs. `prepare_alluvial.py` precomputes static node/link paths for the Vega alluvial diagram so the browser does not need a Sankey layout library.

Shipped `data/` files are kept small for GitHub Pages. Large raw files stay local and are regenerated only when source data changes.

---

## Running Locally

```bash
python scripts/prepare_data.py
python scripts/prepare_viirs.py
python scripts/prepare_historical.py
python scripts/prepare_alluvial.py
python -m http.server 8080
```

Then open `http://localhost:8080`.

---

## Data Sources

| Source | Coverage / use |
|---|---|
| NASA FIRMS MODIS via Kaggle | Older aggregate pipeline: daily totals, FRP density, day/night detection counts |
| NASA FIRMS VIIRS 375m fire detections | Monthly explorer and WA overlay samples, includes October 2019 |
| Historical Wildfires dataset | 2005-2020 historical fire area/count baseline |
| data.gov.au 2019-20 Financial Year Bushfire Boundaries | Source metadata retained; current page now uses a VIIRS spatial bin map over state outlines |
| WA Government SLIP Bush Fire Prone Areas 2025 | Optional future WA risk-zone layer |
