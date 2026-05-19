# Progress Update - Historical_Wildfires.csv Integration

## Status

Completed. The historical wildfire dataset has been processed and integrated into the page.

`Historical_Wildfires.csv` provides daily records for 2005-2020 with these useful fields:

- `Region`
- `Date`
- `Estimated_fire_area` in km2
- `Mean_estimated_fire_radiative_power`
- `Count`

Region codes are normalised in `scripts/prepare_historical.py`:

- `QL` -> `QLD`
- `VI` -> `VIC`
- `TA` -> `TAS`

## Implemented Charts

| # | ID | File | Type | Data | Location | Status |
|---|---|---|---|---|---|---|
| 13 | `viz-annual-area` | `vega/13_annual_area.json` | Connected dot plot | `hist_annual.csv` | Top of Ch4 | Done |
| 14 | `viz-yearmonth-heat` | `vega/14_yearmonth_heat.json` | Historical distribution raincloud | `hist_firework.csv` | Second chart in Ch4 | Done |

Chart 13 compares Aug-Jan bushfire seasons and highlights 2019-20.

Chart 14 now shows a historical distribution raincloud: each row is a month, grey clouds/dots show 2005-2018 history, and red points highlight the Aug 2019-Jan 2020 Black Summer months.

## Updated Existing Chart

The daily time-series in Chapter 2 now includes a second layer from `data/hist_seasonal_avg.csv`: a 2005-2018 historical average baseline.

## Generated Data Files

Run `scripts/prepare_historical.py` to regenerate:

| File | Content |
|---|---|
| `data/hist_annual.csv` | Seasonal totals: `year`, `total_fire_area_km2`, `total_count`, `is_black_summer` |
| `data/hist_yearmonth.csv` | Year x month totals: `year`, `month_num`, `month_label`, `total_fire_area_km2`, `total_count` |
| `data/hist_season_horizon.csv` | Full-year horizon bands: year, month, baseline average, anomaly ratio, Black Summer window flag, and band value |
| `data/hist_firework.csv` | Monthly historical distribution data: year, month, fire area, historical median, Black Summer flag, and optional x/y positions |
| `data/hist_month_distribution.csv` | Monthly quantiles for the raincloud distribution bands |
| `data/hist_seasonal_avg.csv` | Historical baseline: `month_day`, `avg_count`, `baseline_date` |

## Page Structure Now

```text
Ch4 - Legacy
  [13_annual_area]        Done
  [14_yearmonth_heat]     Done
  [spatial bin map]       Done
  [calendar] [WA overlay] Done
```

Result after the historical update: the project had 14 visualisations and 3 major data sources: MODIS, VIIRS, and Historical Wildfires. The current page has since grown to 16 visualisations after adding the fire-driver icon waffle and the month-state-intensity alluvial diagram.

## Remaining Follow-Up

- Optional final browser QA at wide desktop and narrow mobile widths.
- Decide whether the Chapter 2 daily time-series should be regenerated from VIIRS to remove the older MODIS October gap.
- Add a concise data-method note to the page or README explaining mixed MODIS/VIIRS/Historical sources.

## Latest Add-on - Chart QA Audit

Completed. See `docs/chart-audit-2026-05-07.md`.

The audit checked all 16 visible charts for label accuracy, axis/legend/data-label clarity, hover content, layout clipping, duplicate content, and chart-type fit.

Final changes from the audit:

- Added a custom Vega tooltip handler and routed all chart embeds through `embedChart()`.
- Added aria/description encodings to raw Vega alluvial and hexbin marks.
- Made the alluvial and spatial hexbin SVGs scale inside their chart cards.
- Fixed day/night bullet tooltip fields.
- Fixed bubble chart point-scale padding warnings and formatted the bubble tooltip month labels.

Final browser result: 16/16 charts rendered, 16/16 charts exposed hover information, no visible bad-encoding labels, no card clipping issues, and no Vega/Vega-Lite console warnings.

## Latest Add-on - Month -> State -> Intensity Alluvial

Completed. The page now includes a Vega alluvial diagram in Chapter 3.

| File | Content |
|---|---|
| `scripts/prepare_alluvial.py` | Generates static alluvial node/link geometry from `viirs_sample_map.csv` |
| `data/alluvial_month_state_intensity.json` | Precomputed nodes and SVG path strings for the alluvial chart |
| `vega/16_state_month_intensity_alluvial.json` | Vega alluvial diagram with hover highlighting |

The diagram uses VIIRS sample records and bins FRP into Low, Moderate, High, Severe, and Extreme intensity classes.
