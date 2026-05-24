/* VIZ 5 — FRP Density (loaded from file) */
embedChart('#viz-frp-hist', 'vega/05_frp_density.json', embedOpts);

/* VIZ 7 — Day/Night Bullet Chart (loaded from file) */
embedChartFitHeight('#viz-daynight', 'vega/07_daynight_bullet.json?v=fit-height-20260523', embedOpts, {
  offset: 10,
  minHeight: 280
});

/* VIZ 11 — Bubble Chart (loaded from file) */
embedChart('#viz-bubble', 'vega/11_bubble.json?v=card-fit-20260521', embedOpts);

/* VIZ 16 — Month -> State -> Intensity Alluvial (Vega spec loaded from file) */
embedChartFitSize('#viz-alluvial', 'vega/16_state_month_intensity_alluvial.json?v=internal-tall-20260524', embedOpts, {
  minWidth: 520,
  minHeight: 260
});

/* VIZ 6 - State escalation dumbbell (loaded from file) */
embedChartFitHeight('#viz-heatmatrix', 'vega/06_heatmatrix.json?v=fit-height-20260523', embedOpts, {
  offset: 42,
  minHeight: 280
});

/* VIZ 9 — Hexbin map + state filter */
embedChart('#viz-annual-area', 'vega/13_annual_area.json', embedOpts);
