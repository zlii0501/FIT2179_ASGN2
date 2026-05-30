# Part B: Domain Description

**Name:** Zefeng Li
**Student ID:** 36080888
**Studio Session:** 07_OnCampus
*FIT2179 Data Visualisation, Monash University*

---

## Describe your domain chosen for DV II

This visualisation explores Australia's 2019–2020 **Black Summer** bushfire season — one of the most catastrophic ecological events in modern Australian history. The domain examines the *spatial*, *temporal*, and *intensity* dimensions of the season through 16 interactive charts, set against fourteen years of historical wildfire baselines. The story matters because Black Summer marked a turning point in public consciousness around bushfire risk, climate volatility, and emergency preparedness, and the satellite-detection record reveals patterns that go far beyond the headline figures of "millions of hectares burned".

## Describe the Why and Who aspects of your DV II

The visualisation is designed for the average Australian adult aged 18 and above — readers with an interest in environmental events, public safety, and climate awareness, but no GIS, remote-sensing, or statistical training assumed. The central question is: **Just how exceptional was Black Summer, and where, when, and how intensely did it burn?** The goal is to lift the audience from a single headline number into the granular structure of the season — which states bore the brunt, when the season peaked, how fire intensity (FRP, Fire Radiative Power) was distributed across day and night, and how the season ranks against the 2005–2018 baseline. The narrative is delivered through a scrollytelling layout so that each insight builds on the previous one.

## Describe the "What" aspect of your DV II

Three data sources were used. The primary spatial dataset is **NASA FIRMS VIIRS 375 m active fire detections** (filtered to Australia, August 2019 – March 2020, thinned to ~200,000 detections), supplying per-detection latitude, longitude, FRP, day/night flag, and acquisition timestamp; this powers all spatial and monthly-explorer charts and is the only source that contains October 2019. This is complemented by **NASA MODIS-derived aggregates** (`fire_*.csv`: daily totals, state monthly counts, FRP bins, day/night state counts) used for time-series, density, bullet, and bubble charts, and the **Historical Wildfires dataset (2005–2018)** which provides annual, monthly, and daily baselines (`hist_*.csv`) for long-run comparison. State boundaries come from `australia_states.geojson`. A known caveat — MODIS lacks October 2019 — is addressed by routing monthly maps to VIIRS so the season opener is not missing.

## Describe the "How" aspect of your DV II

The dashboard is a single scrollable page (`index.html`) deployed on GitHub Pages, organised into a hero panel and four narrative chapters: **Where → When → How Intense → Legacy**. All charts are built in Vega or Vega-Lite with a shared dark "Smoke Ash" theme (background `#111827`, sand text `#e8c9a0`, crimson accent `#c0392b`), Wong (2011) colour-blind-safe state colours, Georgia serif for headings, and Courier New monospace for numeric labels. Interactivity includes Vega tooltips on every chart, cross-chart hover-linking across Figs 02 / 03A / 03B, month-selector buttons + FRP slider on the monthly map, state-filter buttons on the hexbin map, an overview ↔ detail toggle on the raincloud, and draggable season-window handles on the comparison cards. Detailed mark-and-channel breakdown per chart:

**Fig 01 — Fire Causes Icon Waffle.** Marks: square unit cells in a 10×10 grid. Channels: *position* (row, column) — ordinal slot within the grid; *colour hue* — ignition cause category (lightning, accidental, arson, hazard reduction, etc.). One cell = 1% of total ignitions, so total area per category encodes proportion.

**Fig 02 — Flame Parliament Unit Chart.** Marks: stylised flame icons arranged in a semi-circular parliament layout. Channels: *radial position* — ordinal slot within the arc; *colour hue* — state (NSW/QLD/WA/NT/SA/VIC). Each icon represents one share of total detections, so the angular span of each state's wedge encodes the state's share.

**Fig 03A — State Streamgraph.** Marks: stacked filled areas. Channels: *x-position* — month (ordinal time axis, Aug–Mar); *y-position* — count of detections (quantitative, with a wiggle-balanced baseline); *colour hue* — state. Linked hover broadcasts the focused state to Figs 02 and 03B via `broadcastStateHover()`.

**Fig 03B — State Radar.** Marks: closed line polygons (one ring per state). Channels: *angle* — month (cyclic, 12 spokes); *radius* — detection count (quantitative); *colour hue* — state. Provides a cyclic counterpoint to the linear streamgraph for the same data.

**Fig 04 — Daily Time-Series with Historical Baseline.** Marks: a line for the 2019–20 daily series plus a translucent area band for the 2005–2018 historical envelope. Channels: *x-position* — date (continuous); *y-position* — daily detection count; *colour hue* — current season vs baseline; *opacity* — separates the envelope from the foreground line.

**Fig 05 — Interactive VIIRS Monthly Map with Zoom-Lens Inset.** Marks: small circles (fire detections) layered above polygon geoshapes (state outlines). Channels: *longitude / latitude* — geographic position via Mercator projection; *size (area)* — FRP magnitude; *colour saturation* on a warm yellow→red ramp — FRP; *opacity* — controlled by the FRP filter slider. External month-selector buttons mutate the `sel_month` Vega signal; a linked inset re-renders the busiest sub-region at higher zoom.

**Fig 06 — FRP Density Curve.** Marks: filled kernel-density area. Channels: *x-position* — FRP magnitude (quantitative, log-scaled to handle long tail); *y-position* — density; *colour fill* — single accent (categorical anchor). Communicates that fire intensity is extremely right-skewed.

**Fig 07 — Day/Night Bullet Chart Small Multiples.** Marks: foreground bar (measure), tick (benchmark line), background band rectangles (qualitative range). Channels: *x-position* — daytime detection share (0–100%); *facet (row position)* — state; *colour hue* — state; *tick position* — 50% even-split benchmark; *band lightness* — qualitative ranges (low/mid/high daytime dominance).

**Fig 08 — State × Month Bubble Chart.** Marks: circles. Channels: *x-position* — month; *y-position* — state; *size (area)* — count of detections; *colour hue* — state. Reveals which state-month cells dominated the season at a glance.

**Fig 09 — Month → State → Intensity Alluvial Diagram.** Marks: rectangular nodes plus curved band links. Channels: *x-position* — pipeline stage (Month, State, Intensity bin); *y-position* — ordering within stage; *thickness / cross-section* — flow volume (quantitative); *colour hue* — source state on the left, intensity bin on the right. Pre-computed in `prepare_alluvial.py` so no browser-side Sankey layout is needed.

**Fig 10 — State Escalation Dumbbell (Aug → Dec).** Marks: pair of endpoint circles joined by a line segment. Channels: *x-position* — detection count; *y-position* — state; *colour hue* — time point (Aug vs Dec); *line length* — month-over-month escalation magnitude.

**Fig 11 — Historical Annual Seasonal Fire Area (Connected Dot Plot).** Marks: filled circles connected by a line. Channels: *x-position* — year; *y-position* — Aug–Jan seasonal fire area; *colour hue* — highlights the 2019–20 anomaly against the multi-year trend; *line* — sequential year ordering.

**Fig 12 — Historical Distribution Raincloud.** Marks: half-violin (density area), strip-plot dots (individual months), box-plot rectangles with median rule. Channels: *x-position* — month; *y-position* — monthly fire area; *colour hue* — Black Summer points vs 2005–2018 distribution; *width of violin* — density. An overview ↔ detail toggle (`js/raincloud-detail.js`) swaps the same encoding at higher resolution.

**Fig 13 — Spatial VIIRS Hexbin Map.** Marks: hexagonal polygon tiles. Channels: *longitude / latitude* — hex centroid via projection; *colour intensity* — detection count per hex on a sequential brown → red → yellow ramp; *opacity* — separates land vs zero-detection cells. State-filter buttons (`js/hexbin-zoom.js`) animate a switch to a finer grid (`hex_bins_fine.geojson`) and re-zoom.

**Fig 14 — Daily Detection Calendar Heatmap.** Marks: square cells. Channels: *x-position* — week index across the season; *y-position* — day of week; *colour intensity* — daily detection count on a sequential ramp. Draggable handles let the reader select a sub-season window that updates the comparison panel signal.

**Fig 15 — WA Polar Seasonal Clock.** Marks: radial arc segments. Channels: *angle* — month (cyclic, 12 sectors); *arc length / radial extent* — average VIIRS FRP for that month; *colour hue* — month-quarter grouping. Reads as a clock-face of Western Australia's seasonal fire-energy distribution.
