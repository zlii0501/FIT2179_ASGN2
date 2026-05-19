# Chart QA Audit - 2026-05-07

Scope: all 16 visible Vega/Vega-Lite charts in `index.html`.

Test method: local browser QA on `http://127.0.0.1:8000/` using Chrome DevTools Protocol at a 764 x 485 viewport, plus targeted real mouse-hover checks on the alluvial, spatial hexbin, and bubble charts. The audit checked visible labels, axis/legend/data labels, hover content, clipping/overflow, repeated content, and chart-type fit.

## Overall Result

- All 16 charts render successfully.
- No visible mojibake or replacement-character text was found in the page body.
- Final browser console warnings/errors from Vega/Vega-Lite: 0.
- Final layout status: no audited chart is clipped by its chart card or container at the tested responsive width.
- Final hover status: every chart exposes hover/aria information; the alluvial, hexbin, and bubble charts were also spot-checked with real mouse movement and showed the custom tooltip.

## Issues Found And Fixed

| Issue | Affected chart(s) | Fix | Final result |
|---|---|---|---|
| Fixed 940px SVGs were clipped in medium/mobile-width cards. | `#viz-alluvial`, `#viz-hexbin` | Added responsive SVG scaling for Vega roots in `css/style.css`. | Both charts now scale to the card width without horizontal overflow. |
| Vega-Lite dropped constant tooltip entries for day/night bands. | `#viz-daynight` | Replaced constant tooltip values with calculated fields in `vega/07_daynight_bullet.json`. | Band, meaning, and benchmark hover text now remains available and console warnings are gone. |
| Point-scale padding warnings appeared because `paddingInner` was used on point scales. | `#viz-bubble` | Replaced `paddingInner/paddingOuter` with point-scale `padding` in `vega/11_bubble.json`. | Console warning removed. |
| Bubble tooltip month displayed raw `YYYY-MM` in some contexts. | `#viz-bubble` | Added `month_label` transform and used it in tooltip. | Hover now shows labels such as `Aug 2019`. |
| Raw Vega marks had no accessible descriptions. | `#viz-alluvial`, `#viz-hexbin` | Added `aria` and `description` encodings to interactive Vega marks. | Hover/a11y descriptions now include flow/node/bin details. |
| Tooltip behaviour depended on library defaults. | All embedded charts | Added a small custom tooltip handler in `index.html` and applied it through `embedChart()`. | Tooltip display is consistent across Vega and Vega-Lite charts. |

## Per-Chart Audit

| ID | Label / Axis / Legend Check | Hover Check | Layout Check | Duplication / Type Review | Final status |
|---|---|---|---|---|---|
| `#viz-waffle` | Title and custom state-share table match the flame parliament message. | State and share values are exposed. | Fits card. | Unit chart is distinct from the fire-driver waffle because it shows state share, not causes. | OK |
| `#viz-state-bar` | Title and legend communicate month-by-state change. | State, month, and detection count available. | Fits card. | Complements daily time-series by showing monthly state composition. | OK |
| `#viz-causes-waffle` | Title and icon legend communicate six driver categories. | Driver, emphasis, and meaning available. | Fits card. | Uses a unit/icon grammar like the first waffle, but answers a different qualitative question. | OK |
| `#viz-timeseries` | Daily detection axis and historical-baseline framing are clear. | Date and detection/baseline values available on data marks. | Fits card. | Distinct from calendar heatmap: continuous trend vs day-by-day pattern. | OK |
| `#viz-month-map` | Month map title, FRP legend, and size legend are aligned with the monthly explorer. | State, month, intensity, FRP, and day/night available. | Fits card. | Distinct from hexbin map: point-level monthly exploration vs full-season spatial bins. | OK |
| `#viz-month-inset` | Inset label follows selected hotspot region/month. | Hotspot state, month, intensity, and FRP available. | Fits inside monthly map card. | Supports the main monthly map rather than duplicating a separate chart. | OK |
| `#viz-frp-hist` | FRP axis and density framing are clear. | FRP and density values available. | Fits card. | Unique distribution view for fire power. | OK |
| `#viz-daynight` | Daytime-share axis, 50% benchmark, and band labels are clear. | State counts, daytime share, band, meaning, and benchmark available. | Fits card. | Reasonable chart type for benchmark comparison. | OK |
| `#viz-bubble` | State/month axes and size/colour legends communicate total energy and average FRP. | State, formatted month, detections, average FRP, and total energy available. | Fits card. | Overlaps partly with monthly state charts, but adds energy magnitude and intensity. | OK |
| `#viz-alluvial` | Month, state, and FRP intensity column labels are visible. | Flow/node detection details available and real mouse hover was verified. | Now scales within the card. | Unique pathway view; not duplicated elsewhere. | OK |
| `#viz-heatmatrix` | Dumbbell title and sqrt-axis label explain Aug-Dec escalation. | State, month, detections, avg FRP, and total FRP available. | Fits card. | Some overlap with state-month charts, but it isolates the Aug-to-Dec escalation story. | OK |
| `#viz-annual-area` | Season axis and area axis are clear. | Season and estimated area available. | Fits card. | Unique long-term seasonal context. | OK |
| `#viz-yearmonth-heat` | Raincloud labels distinguish historical distribution and Black Summer points. | Month, historical quantiles, Black Summer area, and deltas available on marks. | Fits card. | Unique historical month-distribution context. | OK |
| `#viz-hexbin` | Filter, bin legend, empty-bin treatment, and state-zoom framing are clear. | State, detection count, average FRP, and main month/no-detection status available; real mouse hover was verified. | Now scales within the card. | Unique full-season spatial aggregation; complements monthly point map. | OK |
| `#viz-calendar` | Calendar title and day grid communicate one square per day. | Date and detection count available. | Fits card. | Distinct from time-series because it emphasizes daily rhythm and calendar position. | OK |
| `#viz-overlay` | WA polar title and month labels communicate average fire power by month. | Month, average FRP, max FRP, and sampled points available. | Fits card. | Unique WA-only seasonal rhythm view. | OK |

## Recommendations

- Keep the current chart set. There is thematic overlap in the time and state-month views, but each chart answers a different question: daily trend, calendar rhythm, monthly state composition, energy intensity, escalation, and spatial aggregation.
- If the story must be shortened later, the most optional pair is `#viz-bubble` and `#viz-heatmatrix`, because both touch state-month change. Keep both for now because the bubble chart emphasizes energy and the dumbbell chart emphasizes Aug-Dec escalation.
- Continue testing at a wide desktop viewport and a narrow mobile viewport before final submission; the current fixes specifically address the medium-width clipping discovered in this audit.
