/* ========================================================
   VIZ 4 — Monthly Explorer (large map + selector buttons)
   ======================================================== */
const months = [
  { key: "2019-08", label: "Aug 2019", count: "16,254",  note: "Season begins — savanna fires burning in WA and NT" },
  { key: "2019-09", label: "Sep 2019", count: "19,756",  note: "Spring arrives, detections spread south-east" },
  { key: "2019-10", label: "Oct 2019", count: "41,308",  note: "October surge — NSW coast ignites under drought conditions" },
  { key: "2019-11", label: "Nov 2019", count: "47,138",  note: "Fire danger ratings surge across NSW and QLD" },
  { key: "2019-12", label: "Dec 2019", count: "81,412",  note: "Peak month — catastrophic fire conditions declared" },
  { key: "2020-01", label: "Jan 2020", count: "34,794",  note: "Rain finally arrives, crisis begins to ease" }
];

let monthMapView = null;
let monthInsetView = null;
let activeMonthKey = "2019-12";
let activeFrpBin = null;
let monthSwitchTimer = null;
let insetRenderToken = 0;

const frpIntensityBins = [
  { key: "Low",      label: "Low",      range: "< 50 MW",    color: "#ffd166" },
  { key: "Moderate", label: "Moderate", range: "50-99 MW",   color: "#f8961e" },
  { key: "High",     label: "High",     range: "100-249 MW", color: "#f3722c" },
  { key: "Severe",   label: "Severe",   range: "250-499 MW", color: "#d00000" },
  { key: "Extreme",  label: "Extreme",  range: "500+ MW",    color: "#7f1d1d" }
];

const monthZoomRegions = {
  "2019-08": { label: "Top End, NT",          center: [131.2, -13.9], scale: 4300 },
  "2019-09": { label: "North coast NSW",      center: [152.3, -29.2], scale: 5600 },
  "2019-10": { label: "NSW Central Coast",    center: [151.5, -32.5], scale: 5800 },
  "2019-11": { label: "Mid-north NSW coast",  center: [152.0, -31.1], scale: 5200 },
  "2019-12": { label: "South-east NSW",       center: [150.4, -33.3], scale: 5200 },
  "2020-01": { label: "Gippsland, VIC",       center: [148.9, -36.5], scale: 5000 }
};

const monthMapProjection = {
  center: [134.5, -27.4],
  scale: 720
};

const insetScaleLimits = { min: 3600, max: 9200 };
const australiaBounds = {
  lon: [112, 154],
  lat: [-44, -10]
};

let activeInsetCenter = [...monthZoomRegions[activeMonthKey].center];
let activeInsetLabel = monthZoomRegions[activeMonthKey].label;
let activeInsetScale = monthZoomRegions[activeMonthKey].scale;
let insetControlTimer = null;
let isZoomDragging = false;
let monthInsetChartHeight = 190;
let pendingInsetSignalFrame = null;

function getActiveZoomRegion(monthKey) {
  const fallback = monthZoomRegions[monthKey] || monthZoomRegions[activeMonthKey];
  return {
    label: activeInsetLabel || fallback.label,
    center: activeInsetCenter || fallback.center,
    scale: activeInsetScale || fallback.scale
  };
}

function setInsetScale(value) {
  const numeric = Number(value);
  activeInsetScale = Math.max(
    insetScaleLimits.min,
    Math.min(insetScaleLimits.max, Number.isFinite(numeric) ? numeric : 5200)
  );
}

function getMonthInsetChartHeight() {
  if (!monthInsetEl || monthInsetEl.classList.contains('is-compact')) return monthInsetChartHeight;
  const head = monthInsetEl.querySelector('.month-inset-head')?.offsetHeight || 34;
  const chrome = head + 32;
  return Math.max(120, Math.min(340, Math.round(monthInsetEl.clientHeight - chrome)));
}

function syncInsetControls(monthKey) {
  const region = getActiveZoomRegion(monthKey);
  if (monthInsetLabelEl) monthInsetLabelEl.textContent = region.label;
}

function scheduleMonthInsetRender(delay = 80) {
  window.clearTimeout(insetControlTimer);
  if (monthInsetEl?.classList.contains('is-compact')) return;
  insetControlTimer = window.setTimeout(() => renderMonthInset(activeMonthKey), delay);
}

function updateMonthInsetSignals() {
  if (!monthInsetView) return false;
  try {
    monthInsetView
      .signal('sel_month', activeMonthKey)
      .signal('hover_frp_bin', activeFrpBin)
      .signal('inset_center', activeInsetCenter)
      .signal('inset_scale', activeInsetScale)
      .run();
    updateZoomLens();
    return true;
  } catch {
    return false;
  }
}

function scheduleInsetSignalUpdate() {
  if (!monthInsetView || pendingInsetSignalFrame) return;
  pendingInsetSignalFrame = window.requestAnimationFrame(() => {
    pendingInsetSignalFrame = null;
    updateMonthInsetSignals();
  });
}

function setFrpHighlight(key) {
  activeFrpBin = key;
  document.querySelectorAll('.frp-legend-item').forEach(item => {
    item.classList.toggle('active', item.dataset.key === key);
  });
  if (monthMapView) {
    monthMapView.signal('hover_frp_bin', key).run();
  }
  if (monthInsetView) {
    updateMonthInsetSignals();
  }
}

function makeMonthInsetSpec(monthKey) {
  const region = getActiveZoomRegion(monthKey);
  return {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "width": "container",
    "height": monthInsetChartHeight,
    "projection": {
      "type": "mercator",
      "center": { "expr": "inset_center" },
      "scale": { "expr": "inset_scale" }
    },
    "params": [
      { "name": "sel_month", "value": monthKey },
      { "name": "hover_frp_bin", "value": activeFrpBin },
      { "name": "inset_center", "value": region.center },
      { "name": "inset_scale", "value": activeInsetScale || region.scale }
    ],
    "layer": [
      {
        "data": {
          "url": "data/australia_states.geojson",
          "format": { "type": "json", "property": "features" }
        },
        "mark": {
          "type": "geoshape",
          "fill": "#203748",
          "stroke": "rgba(180,210,220,0.55)",
          "strokeWidth": 0.8
        }
      },
      {
        "data": { "url": "data/viirs_sample_map.csv" },
        "transform": [
          { "filter": "datum.month == sel_month" },
          {
            "calculate": "datum.frp < 50 ? 'Low' : datum.frp < 100 ? 'Moderate' : datum.frp < 250 ? 'High' : datum.frp < 500 ? 'Severe' : 'Extreme'",
            "as": "frp_bin"
          }
        ],
        "mark": { "type": "circle" },
        "encoding": {
          "longitude": { "field": "longitude", "type": "quantitative" },
          "latitude":  { "field": "latitude",  "type": "quantitative" },
          "color": {
            "field": "frp_bin",
            "type": "nominal",
            "scale": {
              "domain": ["Low", "Moderate", "High", "Severe", "Extreme"],
              "range": ["#ffd166", "#f8961e", "#f3722c", "#d00000", "#7f1d1d"]
            },
            "legend": null
          },
          "size": {
            "field": "frp",
            "type": "quantitative",
            "scale": { "type": "sqrt", "range": [10, 210] },
            "legend": null
          },
          "opacity": {
            "condition": [
              {
                "test": "hover_frp_bin !== null && datum.frp_bin === hover_frp_bin",
                "value": 1
              },
              {
                "test": "hover_frp_bin === null",
                "value": 0.76
              }
            ],
            "value": 0.08
          },
          "tooltip": [
            { "field": "state",    "title": "State" },
            { "field": "month",    "title": "Month" },
            { "field": "frp_bin",  "title": "Intensity" },
            { "field": "frp",      "title": "FRP (MW)", "format": ".0f" }
          ]
        }
      }
    ]
  };
}

/* Variable param approach: sel_month is a plain variable, not a selection.
   Updated externally via view.signal('sel_month', value).run().
   Projection at top level so both geoshape + circle layers share it. */
const monthMapSpec = {
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "width": "container",
  "height": 540,
  "projection": {
    "type": "mercator",
    "center": [134.5, -27.4],
    "scale": 720
  },
  "params": [
    { "name": "sel_month", "value": "2019-12" },
    { "name": "hover_frp_bin", "value": null }
  ],
  "layer": [
    {
      "data": {
        "url": "data/australia_states.geojson",
        "format": { "type": "json", "property": "features" }
      },
      "mark": {
        "type": "geoshape",
        "fill": "#182b3a",
        "stroke": "rgba(180,210,220,0.55)",
        "strokeWidth": 1
      },
      "tooltip": [
        { "field": "properties.STATE_NAME", "title": "State" }
      ]
    },
    {
      "data": { "url": "data/viirs_sample_map.csv" },
      "transform": [
        { "filter": "datum.month == sel_month" },
        {
          "calculate": "datum.frp < 50 ? 'Low' : datum.frp < 100 ? 'Moderate' : datum.frp < 250 ? 'High' : datum.frp < 500 ? 'Severe' : 'Extreme'",
          "as": "frp_bin"
        }
      ],
      "mark": { "type": "circle" },
      "encoding": {
        "longitude": { "field": "longitude", "type": "quantitative" },
        "latitude":  { "field": "latitude",  "type": "quantitative" },
        "color": {
          "field": "frp_bin",
          "type": "nominal",
          "scale": {
            "domain": ["Low", "Moderate", "High", "Severe", "Extreme"],
            "range": ["#ffd166", "#f8961e", "#f3722c", "#d00000", "#7f1d1d"]
          },
          "legend": null
        },
        "size": {
          "field": "frp", "type": "quantitative",
          "scale": { "type": "sqrt", "range": [8, 180] },
          "legend": null
        },
        "opacity": {
          "condition": [
            {
              "test": "hover_frp_bin !== null && datum.frp_bin === hover_frp_bin",
              "value": 1
            },
            {
              "test": "hover_frp_bin === null",
              "value": 0.72
            }
          ],
          "value": 0.06
        },
        "tooltip": [
          { "field": "state",    "title": "State" },
          { "field": "month",    "title": "Month" },
          { "field": "frp_bin",  "title": "Intensity" },
          { "field": "frp",      "title": "FRP (MW)", "format": ".0f" },
          { "field": "daynight", "title": "Day/Night" }
        ]
      }
    }
  ]
};

embedChart('#viz-month-map', monthMapSpec, embedOpts).then(result => {
  monthMapView = result.view;
});

/* Build selector buttons */
const selectorEl = document.getElementById('month-selector');
const frpLegendEl = document.getElementById('frp-legend-items');
const noteEl = document.getElementById('month-map-note');
const monthMapPanel = document.querySelector('.month-map-panel');
const monthZoomLensEl = document.querySelector('.month-zoom-lens');
const monthInsetEl = document.querySelector('.month-inset');
const monthInsetLabelEl = document.getElementById('month-inset-label');
const monthInsetToggleEl = document.getElementById('month-inset-toggle');

function getPresetZoomRegion(monthKey) {
  return monthZoomRegions[monthKey] || monthZoomRegions[activeMonthKey];
}

function resetInsetFocusForMonth(monthKey) {
  const region = getPresetZoomRegion(monthKey);
  activeInsetCenter = [...region.center];
  activeInsetLabel = region.label;
  setInsetScale(region.scale);
  syncInsetControls(monthKey);
  updateZoomLens();
}

function renderMonthInset(monthKey) {
  if (monthInsetEl?.classList.contains('is-compact')) return;
  if (isZoomDragging) return;
  const nextHeight = getMonthInsetChartHeight();
  if (monthInsetView && Math.abs(nextHeight - monthInsetChartHeight) < 8) {
    updateMonthInsetSignals();
    return;
  }
  monthInsetChartHeight = nextHeight;
  const token = ++insetRenderToken;
  syncInsetControls(monthKey);
  if (monthInsetEl) monthInsetEl.classList.add('is-rendering');
  embedChart('#viz-month-inset', makeMonthInsetSpec(monthKey), embedOpts).then(result => {
    if (token !== insetRenderToken) {
      result.view.finalize();
      return;
    }
    monthInsetView = result.view;
    updateMonthInsetSignals();
    if (monthInsetEl) monthInsetEl.classList.remove('is-rendering');
    updateZoomLens();
  });
}

function setInsetOpen(open, render = true) {
  if (!monthInsetEl) return;
  if (!open) {
    monthInsetEl.style.width = '';
    monthInsetEl.style.height = '';
  }
  monthInsetEl.classList.toggle('is-compact', !open);
  monthMapPanel?.classList.toggle('is-zoom-active', open);
  if (monthInsetToggleEl) {
    monthInsetToggleEl.textContent = open ? 'Min' : 'Open';
    monthInsetToggleEl.setAttribute('aria-expanded', String(open));
    monthInsetToggleEl.setAttribute('aria-label', open ? 'Collapse hotspot zoom' : 'Open hotspot zoom');
  }
  updateZoomLens();
  if (open && render) scheduleMonthInsetRender(40);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mercatorY(lat) {
  const radians = clamp(lat, -85, 85) * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

function inverseMercatorY(value) {
  return (2 * Math.atan(Math.exp(value)) - Math.PI / 2) * 180 / Math.PI;
}

function getMonthMapSvgMetrics() {
  const svg = monthMapPanel?.querySelector('#viz-month-map svg');
  if (!svg) return null;
  const svgRect = svg.getBoundingClientRect();
  const panelRect = monthMapPanel.getBoundingClientRect();
  const viewBox = svg.viewBox?.baseVal;
  return {
    svgRect,
    panelRect,
    width: viewBox?.width || svgRect.width,
    height: viewBox?.height || svgRect.height
  };
}

function getInsetViewportSize() {
  const svg = monthInsetEl?.querySelector('#viz-month-inset svg');
  const viewBox = svg?.viewBox?.baseVal;
  if (viewBox?.width && viewBox?.height) {
    return { width: viewBox.width, height: viewBox.height };
  }

  const insetStyles = monthInsetEl ? getComputedStyle(monthInsetEl) : null;
  const horizontalPadding = insetStyles
    ? parseFloat(insetStyles.paddingLeft) + parseFloat(insetStyles.paddingRight)
    : 0;
  const hostWidth = document.getElementById('viz-month-inset')?.clientWidth;
  const insetWidth = monthInsetEl ? monthInsetEl.clientWidth - horizontalPadding : 260;
  return {
    width: Math.max(180, Math.round(hostWidth || insetWidth || 260)),
    height: getMonthInsetChartHeight()
  };
}

function pointerToMapLonLat(event) {
  const metrics = getMonthMapSvgMetrics();
  if (!metrics || !metrics.svgRect.width || !metrics.svgRect.height) return null;
  const x = (event.clientX - metrics.svgRect.left) / metrics.svgRect.width * metrics.width;
  const y = (event.clientY - metrics.svgRect.top) / metrics.svgRect.height * metrics.height;
  const lon = monthMapProjection.center[0] + (x - metrics.width / 2) / monthMapProjection.scale * 180 / Math.PI;
  const centeredMercator = mercatorY(monthMapProjection.center[1]);
  const lat = inverseMercatorY(centeredMercator - (y - metrics.height / 2) / monthMapProjection.scale);
  return [
    clamp(lon, australiaBounds.lon[0], australiaBounds.lon[1]),
    clamp(lat, australiaBounds.lat[0], australiaBounds.lat[1])
  ];
}

function mapLonLatToPanelPoint(center) {
  const metrics = getMonthMapSvgMetrics();
  if (!metrics || !metrics.svgRect.width || !metrics.svgRect.height) return null;
  const x = metrics.width / 2 + monthMapProjection.scale * (center[0] - monthMapProjection.center[0]) * Math.PI / 180;
  const centeredMercator = mercatorY(monthMapProjection.center[1]);
  const y = metrics.height / 2 - monthMapProjection.scale * (mercatorY(center[1]) - centeredMercator);
  const clientX = metrics.svgRect.left + x / metrics.width * metrics.svgRect.width;
  const clientY = metrics.svgRect.top + y / metrics.height * metrics.svgRect.height;
  return {
    x: clientX - metrics.panelRect.left,
    y: clientY - metrics.panelRect.top
  };
}

function fitLensSize(rawWidth, rawHeight, maxWidth, maxHeight) {
  const ratio = rawWidth / rawHeight || 1.4;
  let width = rawWidth;
  let height = rawHeight;
  const minHeight = 24;
  const minWidth = minHeight * ratio;

  if (height < minHeight) {
    height = minHeight;
    width = minWidth;
  }
  if (width < minWidth) {
    width = minWidth;
    height = width / ratio;
  }

  const maxFactor = Math.min(maxWidth / width, maxHeight / height, 1);
  width *= maxFactor;
  height *= maxFactor;

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

function updateZoomLens() {
  if (!monthZoomLensEl || !monthMapPanel || monthInsetEl?.classList.contains('is-compact')) return;
  const point = mapLonLatToPanelPoint(activeInsetCenter);
  if (!point) return;
  const metrics = getMonthMapSvgMetrics();
  if (!metrics) return;
  const insetViewport = getInsetViewportSize();
  const projectionRatio = monthMapProjection.scale / activeInsetScale;
  const lensSize = fitLensSize(
    insetViewport.width * projectionRatio * (metrics.svgRect.width / metrics.width),
    insetViewport.height * projectionRatio * (metrics.svgRect.height / metrics.height),
    metrics.panelRect.width * 0.55,
    metrics.panelRect.height * 0.55
  );
  monthZoomLensEl.style.setProperty('--lens-left', `${Math.round(point.x)}px`);
  monthZoomLensEl.style.setProperty('--lens-top', `${Math.round(point.y)}px`);
  monthZoomLensEl.style.setProperty('--lens-width', `${lensSize.width}px`);
  monthZoomLensEl.style.setProperty('--lens-height', `${lensSize.height}px`);
}

function updateInsetFocusFromPointer(event, renderDelay = 70) {
  const center = pointerToMapLonLat(event);
  if (!center) return;
  activeInsetCenter = center;
  activeInsetLabel = 'Custom focus';
  syncInsetControls(activeMonthKey);
  updateZoomLens();
  scheduleInsetSignalUpdate();
  if (renderDelay !== null && !monthInsetView) scheduleMonthInsetRender(renderDelay);
}

function shouldHandleMapZoomEvent(event) {
  return Boolean(monthMapPanel) && !event.target.closest('.month-inset, .map-legend, .month-controls, .month-selector');
}

if (monthInsetToggleEl && monthInsetEl) {
  monthInsetToggleEl.addEventListener('click', () => {
    setInsetOpen(monthInsetEl.classList.contains('is-compact'));
  });
}

if (window.ResizeObserver && monthInsetEl) {
  const insetResizeObserver = new ResizeObserver(() => {
    if (!monthInsetEl.classList.contains('is-compact') && !isZoomDragging) scheduleMonthInsetRender(140);
  });
  insetResizeObserver.observe(monthInsetEl);
}

if (monthMapPanel) {
  monthMapPanel.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !shouldHandleMapZoomEvent(event)) return;
    setInsetOpen(true, false);
    isZoomDragging = true;
    monthMapPanel.classList.add('is-zoom-dragging');
    try {
      monthMapPanel.setPointerCapture?.(event.pointerId);
    } catch {
      /* Pointer capture is optional; dragging still works without it. */
    }
    updateInsetFocusFromPointer(event, null);
    event.preventDefault();
  });

  monthMapPanel.addEventListener('pointermove', event => {
    if (!isZoomDragging) return;
    updateInsetFocusFromPointer(event, null);
  });

  ['pointerup', 'pointercancel'].forEach(type => {
    monthMapPanel.addEventListener(type, event => {
      if (!isZoomDragging) return;
      isZoomDragging = false;
      monthMapPanel.classList.remove('is-zoom-dragging');
      try {
        monthMapPanel.releasePointerCapture?.(event.pointerId);
      } catch {
        /* Ignore if the pointer was released outside the panel. */
      }
      scheduleMonthInsetRender(20);
    });
  });

  monthMapPanel.addEventListener('wheel', event => {
    if (!shouldHandleMapZoomEvent(event)) return;
    event.preventDefault();
    setInsetOpen(true, false);
    const wheelFactor = Math.exp(-event.deltaY * 0.0012);
    setInsetScale(activeInsetScale * wheelFactor);
    updateInsetFocusFromPointer(event, monthInsetView ? null : 120);
  }, { passive: false });
}

window.addEventListener('resize', () => updateZoomLens());

months.forEach(m => {
  const btn = document.createElement('button');
  btn.className = 'month-btn' + (m.key === activeMonthKey ? ' active' : '');
  btn.dataset.key = m.key;
  btn.innerHTML = `
    <span class="mb-label">${m.label}</span>
    <span class="mb-count">${m.count} detections</span>
  `;
  btn.addEventListener('click', () => {
    const monthChanged = activeMonthKey !== m.key;
    activeMonthKey = m.key;
    document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    resetInsetFocusForMonth(m.key);
    noteEl.textContent = `Showing: ${m.label} — ${m.note}`;
    /* Update the variable signal directly — works with plain params, not selections */
    if (monthMapView) {
      if (!monthChanged || !monthMapPanel) {
        monthMapView.signal('sel_month', m.key).run();
      } else {
        window.clearTimeout(monthSwitchTimer);
        monthMapPanel.classList.add('is-switching');
        monthSwitchTimer = window.setTimeout(() => {
          monthMapView.signal('sel_month', m.key).run();
          monthMapPanel.classList.remove('is-switching');
        }, 90);
      }
    }
    if (monthInsetView) {
      updateMonthInsetSignals();
    } else {
      scheduleMonthInsetRender(monthChanged ? 120 : 40);
    }
  });
  selectorEl.appendChild(btn);
});

frpIntensityBins.forEach(bin => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'frp-legend-item';
  btn.dataset.key = bin.key;
  btn.style.setProperty('--swatch', bin.color);
  btn.innerHTML = `
    <span class="frp-swatch" aria-hidden="true"></span>
    <span class="frp-copy">
      <span class="frp-label">${bin.label}</span>
      <span class="frp-range">${bin.range}</span>
    </span>
  `;
  btn.addEventListener('mouseenter', () => setFrpHighlight(bin.key));
  btn.addEventListener('focus', () => setFrpHighlight(bin.key));
  btn.addEventListener('mouseleave', () => setFrpHighlight(null));
  btn.addEventListener('blur', () => setFrpHighlight(null));
  btn.addEventListener('click', () => setFrpHighlight(bin.key));
  frpLegendEl.appendChild(btn);
});

resetInsetFocusForMonth(activeMonthKey);
setInsetOpen(false, false);
