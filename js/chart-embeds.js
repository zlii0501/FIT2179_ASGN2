/* VIZ 5 — FRP Density (loaded from file) */
embedChart('#viz-frp-hist', 'vega/05_frp_density.json', embedOpts);

/* VIZ 7 — Day/Night Bullet Chart (loaded from file) */
embedChart('#viz-daynight', 'vega/07_daynight_bullet.json?v=height400-20260528', embedOpts);

/* VIZ 11 — Bubble Chart (loaded from file) */
embedChartFitHeight('#viz-bubble', 'vega/11_bubble.json?v=calendar-colors-20260528', embedOpts, {
  offset: 56,
  minHeight: 260
});

/* VIZ 16 — Month -> State -> Intensity Alluvial (Vega spec loaded from file) */
embedChartFitSize('#viz-alluvial', 'vega/16_state_month_intensity_alluvial.json?v=intensity-inline-counts-20260524', embedOpts, {
  minWidth: 520,
  minHeight: 260
});

/* VIZ 6 - State escalation dumbbell (loaded from file) */
embedChartFitHeight('#viz-heatmatrix', 'vega/06_heatmatrix.json?v=fig10-natural-20260526', embedOpts, {
  offset: 43,
  minHeight: 150
});

/* VIZ 13 — Annual area connected dot plot */
embedChart('#viz-annual-area', 'vega/13_annual_area.json?v=container-20260527', embedOpts);
