# Fig. 08 and Section 4 QA Change Log

Date: 2026-05-25
Scope: Chapter 3 Fig. 08 and Chapter 4 Fig. 11, Fig. 12, Fig. 13, Fig. 14/15

## Baseline

The layout requirements file was treated as a completed quality baseline, not a task list. The pass focused on finding remaining unlisted problems through code review and browser screenshots.

## Issues Found

- Fig. 08 was named as a bubble chart in code, but rendered as a heatmap. Its visible marks only encoded average FRP, while the caption also asked readers to compare detection load.
- Fig. 08 expected an October category in the spec, but the current `data/fire_monthly_state.csv` contains only Aug, Sep, Nov, Dec, and Jan.
- Fig. 11 labelled every year because the Black Summer filter treated the CSV string value `False` as truthy.
- Fig. 11 title and caption overstated the gap above earlier seasons; 2012-13 is close enough that a softer wording is more accurate.
- Fig. 12's built-in colour legend title was too long and could truncate in the chart.
- Fig. 13 rendered too small within a tall full-width card on desktop.
- Fig. 14/15 described Aug-Jan windows and Fig. 15 showed six months, but Fig. 14's calendar panel only displayed about four months.

## Changes Made

- Converted Fig. 08 to actual bubble marks: colour encodes average FRP and bubble size encodes detection count.
- Added a compact custom Fig. 08 legend so both encodings remain visible inside the card.
- Removed the absent October category from Fig. 08's sort and label expressions, matching the current data source.
- Made Fig. 08 and Fig. 11 use height-fitting Vega embeds so the chart body grows with the card.
- Fixed Fig. 11's Black Summer label filter to accept boolean or string `True` only.
- Updated Fig. 11 title and caption to say the season tops prior years without overstating the margin.
- Shortened Fig. 12's Vega legend title to `Times median`.
- Enlarged Fig. 13's desktop SVG height and kept mobile sizing fluid.
- Expanded Fig. 14 calendar filtering, labels, and selected window opacity to six months.
- Updated comparison JS chips and label calculations so the displayed window now ends in Jan instead of Nov.
- Updated script/spec cache-busting query strings for changed assets.
- Added fixed mobile chart heights for Fig. 08 and Fig. 11 to prevent flex/ResizeObserver height feedback loops.
- Expanded the Fig. 14/15 timeline handle hit area without changing the visible control size.

## Verification Notes

- JSON validation passed for all touched Vega/Vega-Lite specs.
- `git diff --check` passed for the edited files.
- Browser screenshot regression checked desktop and mobile views after the follow-up mobile sizing fix.

## Follow-up: Colour Hierarchy and Figure-Ground

- Verified Fig. 05 uses the `latitude` and `longitude` CSV fields expected by the Vega-Lite map encoding, then checked the point map in browser so detections land on the Australia basemap.
- Strengthened Fig. 05 figure-ground contrast by darkening the state ground, reducing boundary emphasis, and adding a subtle map-panel ground while keeping all FRP intensity bins at the same baseline opacity.
- Strengthened Fig. 08 visual hierarchy by making the bubble colour ramp and size legend carry stronger warm foreground contrast.
- Strengthened Fig. 12 by pushing historical min/max, IQR, median, and dot marks into muted grey/tan background layers while increasing Black Summer rule, point size, stroke, and warm colour contrast.
- Strengthened Fig. 13 by darkening the map ground and empty bins, lowering their opacity, and increasing the warm count-bin ramp so active fire corridors read as the figure.
- Updated cache-busting query strings for the changed CSS, JS, and Vega assets.
- Re-validated the touched JSON specs and ran `git diff --check`.
- Browser screenshots checked Fig. 05, Fig. 08, Fig. 12, and Fig. 13 at desktop scale after the hierarchy pass.
