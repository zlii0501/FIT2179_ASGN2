# Black Summer Layout & Chart Requirements

**Date:** 2026-05-25
**Project:** FIT2179 Black Summer Data Story
**Status:** Living design requirements
**Primary files affected by future work:** `index.html`, `css/style.css`, `vega/*.json`, `js/*.js`

---

## Purpose

This document records the layout, graph sizing, legend, paragraph, and left/right structure rules that emerged from the recent section-by-section revisions. Future edits should use this as the baseline design standard before changing chart cards, Vega specs, or interaction code.

目标是让每个 card 内部的 graph、paragraph、legend、controls 都清楚、完整、平衡，不再出现 clipped content、overlap、过多 white space，或只拉大 container 但图表本体没有变大的情况。

---

## Overall Layout Rules

- Card size, position, grid span, and page grid structure should stay unchanged by default.
- If a card must become larger, the request must explicitly say so, such as the previous Fig. 14/15 combined-card adjustment.
- Prefer changing only internal layout: graph scale, chart padding, label position, legend placement, paragraph width, and internal gaps.
- Every card should have a clear reading order: title first, graph as the main visual object, then explanatory paragraph / legend / controls in a predictable place.
- Avoid three recurring problems: content clipped by the card, text or labels overlapping chart marks, and graph areas surrounded by unused white space.
- Section-level rhythm matters: neighboring cards should feel close to related content, with no unexpected vertical gaps between cards and the section above.
- Similar elements should look consistent across the story: paragraph size, legend styling, state colors, swatch sizes, title hierarchy, and control density.

---

## Graph Rules

- The graph itself must resize, not only its outer container. Check the actual SVG, canvas, or Vega embed dimensions after changing card height or width.
- Graphs should fill the available visual space while preserving readable labels and enough breathing room around axes, node labels, or map marks.
- If there is empty space under or around a graph, reduce internal chart padding, fixed Vega dimensions, viewBox whitespace, or wrapper min-height before changing the card grid.
- If labels are hidden by lines, dots, nodes, or ribbons, adjust label offsets, scale range, mark opacity, line width, or chart padding.
- Radar charts should be large enough to compare state profiles clearly; radar lines should be thin enough that axis text remains readable.
- Sankey / alluvial charts should occupy the remaining horizontal and vertical card space, with node labels and values small but legible.
- Maps should show the full geography unless the interaction intentionally zooms into a region; legends and controls should not cover important map areas.
- Data labels should be only slightly larger than numeric detail text. Element titles such as Month, State, and FRP Intensity should not dominate the chart.

---

## Paragraph Rules

- All paragraph text should use the shared paragraph size defined in CSS, currently `--paragraph-font-size`.
- Paragraphs support the chart; they should not take so much space that the graph becomes visually secondary.
- When paragraph and legend share one column, paragraph should usually be above legend.
- When paragraph and legend sit below a graph, their widths should feel balanced and their text length should be visually comparable.
- If paragraph text is placed beside a graph, keep it wide enough to avoid excessive line breaks.
- If a card still has visible white space after the graph and legend are sized correctly, the paragraph may be extended to fill that space.
- When paragraph copy is extended for layout balance, keep each visible Chinese line to 12 characters or fewer. For English copy, use short phrase breaks with the same compact visual rhythm.
- Figure-specific dynamic paragraphs, such as Fig. 05 month descriptions, may change content by state/month, but typography and layout should remain consistent.
- Hidden or alternate paragraphs should not leave layout gaps or affect visible chart sizing.

---

## Legend Rules

- Legends must sit near the visual encoding they explain and should not compete with the graph for primary attention.
- Legend icons, PNGs, swatches, line samples, point-size samples, and color keys must be large enough to read at normal screen size.
- Legend text should not wrap awkwardly or create uneven rows unless intentionally arranged into columns.
- Legends should clearly explain color, line type, point size, flow width, state identity, FRP intensity, and any selection state.
- Color legends should use accessible palettes, including red-green color-blind-friendly state colors.
- If an interaction uses hover or selection, the legend should show the selectable state and connect clearly to the affected figure.
- Remove explanatory legend copy when it repeats the title or distracts from the graph, such as unnecessary helper text in the Fig. 14/15 combined legend.

---

## Left / Right Structure Rules

- In two-column card interiors, the left side usually carries explanation: paragraph, legend, controls, or zoom detail.
- The right side usually carries the main graph, unless a figure-specific request says otherwise.
- Left and right columns must feel visually balanced. Avoid one side being dense while the other side has obvious empty space.
- When a group is described as taking 50% width, the whole group should take that width, then its internal elements should align inside it.
- If legend + graph are treated as one group, align their heights and spacing so they read as a single unit.
- When multiple elements need to be the same height, match their visual height and vertical rhythm rather than forcing brittle fixed heights everywhere.

---

## Figure-Specific Requirements

### Fig. 01

- Use the corresponding PNG icon for each driver legend item.
- Legend should be arranged in two columns when space allows.
- Legend icons should be large enough to recognize quickly.
- Paragraph, legend, and graph should form a clear hierarchy.
- Waffle / SVG graph width should be automatic and should not be constrained by unnecessary max-width rules.

### Fig. 02, Fig. 03A, Fig. 03B

- State colors should be consistent across all three figures and red-green color-blind friendly.
- Hover legend behavior should control related state marks across Fig. 02, Fig. 03A, and Fig. 03B where possible.
- Fig. 03B radar chart should be close to square and visibly larger than its earlier cramped version.
- Radar lines should be thinner so they do not block axis text.
- Fig. 03A and Fig. 03B legends should use the same visual language.
- Fig. 03B paragraph width should align with the legend above or beside it.

### Fig. 04

- The old time/player control should be removed when not used.
- The line-style legend should occupy the former control area.
- Legend must explain solid and dashed line meanings clearly.
- Graph must not remain affected by removed or hidden time-control logic.
- Reduce y-axis label height or padding if it creates unnecessary vertical pressure.

### Fig. 05

- Month selector belongs on the far right.
- Main layout intent: title, then map-focused content, with month controls separated on the right.
- Map should display fully and not be clipped.
- Point Size legend should sit at the map's top-right area.
- Fire Power legend should sit at the lower-left of the map and remain bottom-aligned.
- Hotspot Zoom should be visible by default and use the remaining space between paragraph and Fire Power where requested.
- Month-specific paragraphs should describe the selected month rather than repeating one generic message.
- Fire point icons / marks must not be cropped by legend or map bounds.

### Fig. 06

- Paragraph and legend should sit on the left side of the graph.
- Legend should be below the paragraph.
- The graph should fill the remaining height and width of the card, not only the graph container.
- Density and mean-line legend items must be readable and close to the explanatory paragraph.

### Fig. 07 and Fig. 10

- Cards should sit close to the content above and avoid extra vertical gaps.
- Graphs should stretch to fill remaining vertical space, including the actual SVG / chart body.
- Fig. 10 paragraph blocks and legend should sit below the graph.
- Fig. 10 two paragraph blocks should have visually balanced line lengths.
- The combined height of Fig. 06 and Fig. 10 sections may be adjusted as long as the total height rhythm remains stable.

### Fig. 09

- Sankey / alluvial chart body should be significantly larger and should fill available horizontal and vertical space.
- Avoid only expanding the container; the actual alluvial marks, nodes, ribbons, labels, and values must scale into the space.
- Month, State, and FRP Intensity titles should be moved upward enough that graph ribbons do not cover them.
- Month and state labels such as Aug, NSW, QLD should be smaller than before, only slightly larger than their numeric values.
- Show only months that exist in the current data source, but include the year in month labels.
- FRP intensity labels should show value inline as `Element Name Number`, such as `Low 3,795`.
- Legend must include flow width, state colors, and FRP intensity colors.

### Fig. 12 and Fig. 13

- Interaction state, selection state, and legends should be large enough to read without guessing.
- Fig. 12 detail / overview transitions should keep captions and legends aligned with the visible chart state.
- Fig. 13 state selection controls and legend should be prominent enough for repeated interaction.

### Fig. 14 and Fig. 15

- Fig. 14 and Fig. 15 should live in one combined card when requested.
- Fig. 15 should sit under or beside the relevant Fig. 14 counterpart according to the current comparison layout.
- Combined legends should align with the title area.
- Legends should be vertical or horizontal according to the requested state, but must stay aligned and compact.
- Remove unnecessary explanatory text from the legend panel when it distracts from the comparison.
- Fig. 15 graph and paragraph should share balanced width and height with the legend / Fig. 15A group.

---

## Interaction and Data Rules

- If a chart depends on VIIRS data, prefer deriving it from the raw NASA VIIRS zip files in `data/` and regenerating the CSV through the existing pipeline.
- If the raw data only contains Aug 2019 to Jan 2020, show only those months and label the year clearly.
- Hover and selection states should be meaningful, visible, and connected to legends.
- Removed controls should not leave hidden state, layout gaps, or stale JavaScript effects.
- Any month, state, or intensity label shown in a chart should match the current filtered data.

---

## Acceptance Checklist

- Each card has a clear reading order.
- Graph is the visual focus of the card.
- Graph body fills available space, not just the container.
- Paragraph font size is consistent across visible paragraphs.
- Paragraphs may fill white space, but their visual line length stays short and controlled.
- Legends are complete, aligned, readable, and close to what they explain.
- State colors are consistent and accessible.
- No important graph label, mark, legend, or paragraph is clipped.
- No text overlaps chart marks in a way that blocks meaning.
- Left/right layouts are balanced and do not leave obvious empty columns.
- Old or removed controls no longer influence chart rendering.
- Figure-specific requirements above are preserved unless a later request explicitly changes them.
