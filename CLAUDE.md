# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static, single-page data visualisation assignment for FIT2179 (Monash University, 2026). The page tells the story of Australia's "Black Summer" bushfire season (2019–2020) through 15 interactive Vega/Vega-Lite charts embedded in a dark-themed scrollytelling layout.

There is no build step, no package manager, and no test suite. All files are served directly from the filesystem or a local web server. The page is hosted on GitHub Pages.

## Running the Project

Open `index.html` in a browser. Because several charts load data via `fetch()` (CSVs, GeoJSON, Vega JSON specs), you need a local server to avoid CORS errors:

```powershell
# Python (simplest)
python -m http.server 8080

# Node http-server (if installed)
npx http-server -p 8080
```

Then visit `http://localhost:8080`.

`layout-editor.html`, `grapesjs-editor.html`, `map3d.html`, and `fire-preview.html` are development-only tools/prototypes and are not part of the final submission.

## Data Preparation Scripts

The `data/` directory contains pre-built files committed to the repo. Regenerate them only when the raw source data changes:

```bash
python scripts/prepare_data.py        # MODIS aggregate CSVs (fire_daily.csv, fire_monthly_state.csv, etc.)
python scripts/prepare_viirs.py       # VIIRS sample CSVs (viirs_sample_map.csv, viirs_wa.csv)
python scripts/prepare_historical.py  # Historical wildfire baseline CSVs (hist_*.csv)
python scripts/prepare_hexbins.py     # Hexagonal bin GeoJSON grids (hex_bins.geojson, hex_bins_fine.geojson)
python scripts/prepare_alluvial.py    # Pre-computed alluvial layout JSON
```

Raw source data (NASA MODIS/VIIRS ZIPs, `Historical_Wildfires.csv`, `package_show*.json`) lives outside `data/` and is not committed. `prepare_hexbin_map.py` generates `fire_hexbin_map.json`.

Two distinct data sources power different charts:
- **MODIS-derived aggregates** (`fire_*.csv`, `hist_*.csv`): daily totals, FRP density, day/night counts — used by timeline, density, bullet, and historical charts.
- **VIIRS 375 m point samples** (`viirs_*.csv`, `hex_bins*.geojson`): actual fire locations — used by the monthly explorer map, hexbin spatial map, and WA polar clock. VIIRS includes October 2019 which MODIS data lacks.

## Page Structure

| Section | ID | Chapter |
|---|---|---|
| Hero | `#top` | Animated stat counters (199,417 detections / 6 months / 6 states / 11,164 MW peak) |
| Chapter 1 | `#ch1` | Where — fire parliament, state streamgraph, fire causes waffle |
| Chapter 2 | `#ch2` | When — daily time-series with historical baseline, monthly VIIRS map explorer |
| Chapter 3 | `#ch3` | How Intense — FRP density, day/night bullet, bubble, alluvial, dumbbell |
| Chapter 4 | `#ch4` | Legacy — historical area, raincloud, hexbin map, calendar heatmap, WA polar clock |
| Chapter 5 | `#ch5` | 3D Map prototype (dev only) |

## Architecture

### Entry point

`index.html` is the entire page. It loads Vega/Vega-Lite/Vega-Embed from CDN, then the project's JS files in this order:

1. `js/layout-runtime.js` — reads a localStorage draft (key `blackSummerLayoutDraft.v1`) and applies saved grid overrides to `[data-layout-id]` elements at runtime. Used in conjunction with the layout editor.
2. `js/ui.js` — hero counter animations and nav-dot scrollspy.
3. `js/vega-utils.js` — shared `embedOpts`, `vlConfig` (dark-theme Vega config), and `embedChart()` wrapper that attaches a custom tooltip handler to every chart.
4. `js/basic-charts.js` — embeds Figs 01–03 from spec files plus the Fig 04 daily time-series as an inline Vega-Lite spec; contains the Fig 01 interactive driver-legend logic and the cross-chart `broadcastStateHover()` that links hover across Figs 02, 03A, 03B.
5. `js/month-explorer.js` — Fig 05 monthly map with zoom-lens inset, month selector buttons, and FRP filter.
6. `js/chart-embeds.js` — embeds the remaining standalone Vega specs (Figs 06–09, 11) using `embedChartFitHeight` / `embedChartFitSize` for responsive sizing.
7. `js/raincloud-detail.js` — Fig 12 raincloud drill-down (overview ↔ detail toggle).
8. `js/hexbin-zoom.js` — Fig 13 animated hexbin map with state-filter buttons.
9. `js/comparison.js` — Fig 14/15 comparison panels with draggable season-window handles; uses `embedComposedPanel()` to extract individual panels from a multi-panel Vega spec.

### Vega specs (`vega/`)

Each `vega/*.json` file is a self-contained Vega or Vega-Lite spec. Charts that need to share data or signals across panels are kept in a single JSON and sliced by `embedComposedPanel()` in `comparison.js`. Data URLs in specs are relative paths (e.g. `data/fire_monthly_state.csv`) — they resolve against the server root.

Figure-to-spec mapping:

| Figure | Spec file |
|---|---|
| Fig 01 | `vega/15_fire_causes_waffle.json` |
| Fig 02 | `vega/01_waffle.json` |
| Fig 03A | `vega/02_state_streamgraph.json` |
| Fig 03B | `vega/03_state_radar.json` |
| Fig 04 | inline `timeseriesSpec` in `js/basic-charts.js` |
| Fig 05 | `vega/09_choropleth.json` (main map) |
| Fig 06 | `vega/05_frp_density.json` |
| Fig 07 | `vega/07_daynight_bullet.json` |
| Fig 08 | `vega/11_bubble.json` |
| Fig 09 | `vega/16_state_month_intensity_alluvial.json` |
| Fig 10 | `vega/06_heatmatrix.json` |
| Fig 11 | `vega/13_annual_area.json` |
| Fig 12 | `vega/14_yearmonth_heat.json` / `vega/14_yearmonth_detail.json` |
| Fig 13 | `vega/09_hexbin.json` |
| Fig 14/15 | `vega/12_calendar.json` / `vega/10_wa_overlay.json` |

### Vega utilities (`js/vega-utils.js`)

Beyond `embedChart()`, the file exports three responsive variants that bind a `ResizeObserver` to keep the chart sized to its container:

- `embedChartFitHeight(selector, spec, opts, { offset, minHeight })` — syncs chart height to container, used for tall charts in constrained cards.
- `embedChartFitWidth(selector, spec, opts, { offset, minWidth })` — syncs chart width.
- `embedChartFitSize(selector, spec, opts, { widthOffset, heightOffset, minWidth, minHeight })` — syncs both dimensions; used for the alluvial chart.

`loadChartSpec(spec)` fetches and deep-copies a JSON spec from a URL (or returns a clone if already an object), used internally by the responsive helpers.

### Styling

`css/style.css` defines all design tokens as CSS custom properties on `:root` and contains the full dark-theme styles (background `#111827`, primary text `#e8c9a0`, accent `#c0392b`).

`css/layout-overrides.css` is **generated** by `layout-editor.html` and should not be hand-edited. It contains `@media (min-width: 861px)` rules that pin each `[data-layout-id]` card to an explicit CSS Grid column/row position. Below 861 px the page stacks vertically using the default flow.

### Data files (`data/`)

CSV and GeoJSON files consumed directly by Vega specs or JS:

- `fire_*.csv` — VIIRS satellite detection data for the 2019–20 season (aggregated by state, month, FRP bin, day/night, etc.)
- `hist_*.csv` — historical 2005–2018 baseline data for comparison charts; `hist_daily_continuous.csv` is consumed directly by `comparison.js` to build the timeline sparkline.
- `viirs_sample_map.csv`, `viirs_wa.csv` — VIIRS point samples for map charts.
- `australia_states.geojson`, `fire_boundaries.geojson` — map geometry
- `hex_bins.geojson`, `hex_bins_fine.geojson` — pre-computed hexagonal bins for Fig 13
- `alluvial_month_state_intensity.json`, `fire_hexbin_map.json` — pre-aggregated JSON for the alluvial and hexbin charts

### Cache-busting

Query strings on `<script src>` and `<link href>` tags (e.g. `?v=fig03-polish-20260522`) are manual cache busters — update them when changing the corresponding file.

## Design Conventions

- **Colour palette** (state encoding, consistent across all charts): NSW `#D55E00`, QLD `#E69F00`, WA `#0072B2`, NT `#CC79A7`, SA `#009E73`, VIC `#56B4E9`. These are Wong (2011) colour-blind-safe colours and must not be changed.
- **Chart titles** follow the pattern: `<span class="chart-number">Fig. NN</span><span class="chart-title-text">…</span>`.
- All Vega charts use `embedOpts` from `vega-utils.js` (SVG renderer, no action buttons, dark config, custom tooltip).
- The `vlConfig` object in `vega-utils.js` is the single source of truth for chart typography and axis colours — do not override these inside individual Vega specs.
- Charts that must fill a variable-height container use `embedChartFitHeight` / `embedChartFitSize` rather than a hardcoded `height` in their spec.

## Reference Docs

- `docs/chart-audit-2026-05-07.md` — per-chart QA audit (labels, axes, hover, clipping, encoding fit). Read this before making chart changes.
- `docs/superpowers/specs/` — design specs for the layout and 3D map prototype.
- `CHANGELOG.md` — running log of changes by date.
