# Changelog

All notable changes to this project are recorded here. Format: `[date] action - detail`.

---

## 2026-05-07 (Chart QA audit)

### Fixed - Chart labels, hover, and responsive display

- Added `docs/chart-audit-2026-05-07.md` with a chart-by-chart review of labels, axes, legends, hover content, layout clipping, duplicate content, and graph-type fit.
- Added a custom Vega tooltip handler in `index.html` and routed all embeds through `embedChart()` so Vega and Vega-Lite charts share consistent hover behaviour.
- Added aria/description encodings to the raw Vega alluvial and spatial hexbin marks.
- Updated `css/style.css` so the alluvial diagram and spatial hexbin map scale within their chart cards instead of clipping at medium widths.
- Fixed day/night bullet tooltip fields in `vega/07_daynight_bullet.json` so band and benchmark hover text is retained.
- Fixed `vega/11_bubble.json` point-scale padding warnings and changed the month tooltip to formatted labels such as `Aug 2019`.
- Final browser audit: 16/16 charts rendered, 16/16 charts exposed hover information, 0 visible bad-encoding labels, 0 card clipping issues, and 0 Vega/Vega-Lite console warnings.

---

## 2026-05-06 (Progress refresh)

### Changed - Documentation progress update

- Updated `README.md`, `CHANGELOG.md`, and `update.md` so the project status matches the current implementation.
- Reframed the historical wildfire work from a plan into completed integration work.
- Confirmed the current inventory as 16 completed visualisations across 4 chapters.
- Clarified the remaining work: browser QA, optional VIIRS daily time-series decision, data-method note, optional WA risk-zone GeoJSON, older planning-doc cleanup, and git commit.
- Rewrote the three progress documents as clean UTF-8 text to remove earlier mojibake/encoding artefacts.
- Replaced the Day vs Night ridgeline with state-level bullet chart small multiples comparing daytime detection share against a 50% even split benchmark.
- Replaced the Western Australia hotspot overlay map with a polar seasonal clock showing average VIIRS fire power by month.
- Replaced the first waffle chart with a semi-circle flame parliament unit chart.
- Added a fire-driver icon waffle for the main Black Summer fire drivers in Chapter 1.
- Replaced the radial firework dot plot with a historical distribution raincloud comparing Black Summer monthly fire area against 2005-2018 monthly distributions.
- Added a Vega alluvial diagram showing Month -> State -> FRP intensity pathways from VIIRS samples.
- Replaced the state density choropleth with a spatial hexbin map of VIIRS fire detections.

### Added - Vega alluvial diagram

- Added `scripts/prepare_alluvial.py`, which derives state, month, and FRP intensity flows from `data/viirs_sample_map.csv`.
- Added `data/alluvial_month_state_intensity.json`, a precomputed static layout containing alluvial nodes and link paths.
- Added `vega/16_state_month_intensity_alluvial.json`, a Vega chart with hover highlighting for ribbons and nodes.
- Updated Chapter 3 in `index.html` with a full-width alluvial chart card.

---

## 2026-05-05 (Session 4)

### Added - Historical wildfire charts

- Added `scripts/prepare_historical.py`, which reads `Historical_Wildfires.csv`, normalises region codes, and outputs `hist_annual.csv`, `hist_yearmonth.csv`, and `hist_seasonal_avg.csv`.
- Added `vega/13_annual_area.json`, a connected dot plot comparing Aug-Jan seasonal fire area across NSW, VIC, QLD, SA, and TAS.
- Added `vega/14_yearmonth_heat.json`, a 2005-2020 year x month heatmap of estimated fire area.
- Updated `index.html` so Chapter 4 includes both historical charts.
- Added a 2005-2018 historical average baseline layer to the daily time-series.

---

## 2026-05-05 (Session 3)

### Added - VIIRS 375m dataset integration

- Added `scripts/prepare_viirs.py`, which reads VIIRS 375m fire detection data directly from ZIP archives and produces browser-sized samples.
- Added `data/viirs_sample_map.csv` with 4,997 VIIRS fire points across Aug 2019-Jan 2020.
- Added `data/viirs_wa.csv` with 1,440 WA-only VIIRS fire points for the WA overlay map.
- Added `update.md` as the original implementation plan for the historical wildfire dataset.

### Changed

- Added October 2019 coverage to the monthly explorer and WA overlay through VIIRS.
- Switched `vega/10_wa_overlay.json` from the older MODIS sample to `viirs_wa.csv`.
- Switched the monthly explorer map in `index.html` to `viirs_sample_map.csv`.
- Added the October 2019 month button and hotspot zoom region.
- Corrected Chapter 1 and Chapter 4 narrative text to match the actual visuals.
- Scoped stat-counter animation to `.stat-num[data-target]` so navigation dots no longer display `NaN`.

---

## 2026-05-05 (Session 2)

### Added - Main visualisation set

- Added `vega/01_waffle.json`, a 10 x 10 waffle chart showing each state's share of national detections.
- Added `vega/02_state_streamgraph.json`, a state-by-month streamgraph.
- Added `vega/05_frp_density.json`, a FRP density curve with mean marker.
- Added `vega/06_heatmatrix.json`, now used as an Aug-Dec state escalation dumbbell chart.
- Added `vega/07_daynight_ridgeline.json`, originally comparing daytime and nighttime FRP distributions. This was later replaced by `vega/07_daynight_bullet.json`.
- Added `vega/09_choropleth.json`, originally a state detection-density choropleth and now a spatial hexbin map.
- Added initial `vega/10_wa_overlay.json`, a WA-focused hotspot overlay. This was later replaced with a polar seasonal clock using the same file path.
- Added `vega/11_bubble.json`, a state x month bubble chart.
- Added `vega/12_calendar.json`, a daily detection calendar heatmap.
- Added `data/fire_state_totals.csv` for state density charts.
- Added `data/fire_hexbin_map.json`, generated from VIIRS samples for the spatial bin map.

### Fixed

- Corrected GeoJSON loading to use Vega-Lite-compatible JSON feature extraction.
- Fixed choropleth label colour logic.
- Fixed calendar axis tick configuration.
- Fixed map projection bounds for container-width rendering.

---

## 2026-05-05 (Session 1)

### Added - Initial app and data pipeline

- Added `scripts/prepare_data.py`, which reads raw MODIS CSVs from ZIP archives, deduplicates detections, assigns Australian states, and outputs the aggregate CSVs used by the frontend.
- Added core data files: `fire_sample_map.csv`, `fire_daily.csv`, `fire_monthly_state.csv`, `fire_frp_bins.csv`, `fire_daynight.csv`, and `australia_states.geojson`.
- Added `css/style.css` with the smoke-ash theme, responsive layout helpers, chart cards, month buttons, and sticky navigation dots.
- Added `index.html`, a complete single-page app with hero, 4 chapters, animated counters, scroll-spy nav, and Vega-Lite embeds.
- Added early design and implementation docs under `docs/superpowers/`.
- Added initial `README.md` and `CHANGELOG.md`.

### Fixed

- Replaced a Vega-Lite selection param with a plain variable param so external monthly explorer buttons can update the map.
- Moved map projection to the top level of layered specs so Australia outlines and fire points share the same coordinate system.

---

## Session Notes

- User language: Chinese Simplified. Respond in Chinese by default.
- Preferred direction: high interactivity and visual complexity for HD-grade submission.
- No GitHub remote is configured yet. Current branch is `claude/strange-bassi-1ef69b`.
- Assignment does not require push history, so GitHub is optional unless the user sets it up.
