/* --- Shared Vega-Lite config --- */
const vlConfig = {
  background: "transparent",
  font: "Georgia, serif",
  axis: {
    gridColor: "rgba(255,255,255,0.06)",
    domainColor: "rgba(255,255,255,0.15)",
    tickColor: "rgba(255,255,255,0.15)",
    labelColor: "#9ca3af",
    titleColor: "#b8956a",
    labelFont: "sans-serif",
    titleFont: "sans-serif",
    labelFontSize: 11,
    titleFontSize: 12
  },
  legend: {
    labelColor: "#b8956a",
    titleColor: "#b8956a",
    labelFont: "sans-serif",
    titleFont: "sans-serif",
    labelFontSize: 11,
    titleFontSize: 11
  },
  title: { color: "#e8c9a0", font: "Georgia, serif", fontSize: 14 },
  view: { stroke: null }
};

const tooltipEl = document.createElement('div');
tooltipEl.className = 'custom-vega-tooltip';
document.body.appendChild(tooltipEl);

function escapeTooltip(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tooltipHtml(value) {
  if (value == null || value === '') return '';
  if (typeof value !== 'object') return `<div class="custom-vega-tooltip-single">${escapeTooltip(value)}</div>`;
  return Object.entries(value)
    .filter(([, v]) => v != null && v !== '')
    .map(([key, v]) => `
      <div class="custom-vega-tooltip-row">
        <span>${escapeTooltip(key)}</span>
        <strong>${escapeTooltip(v)}</strong>
      </div>
    `)
    .join('');
}

function positionTooltip(event) {
  const pad = 14;
  const rect = tooltipEl.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + rect.width > window.innerWidth - pad) x = event.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - pad) y = event.clientY - rect.height - pad;
  tooltipEl.style.transform = `translate(${Math.max(pad, x)}px, ${Math.max(pad, y)}px)`;
}

function customTooltipHandler(handler, event, item, value) {
  const html = tooltipHtml(value);
  if (!html) {
    tooltipEl.classList.remove('visible');
    return;
  }
  tooltipEl.innerHTML = html;
  tooltipEl.classList.add('visible');
  positionTooltip(event);
}

const embedOpts = { renderer: 'svg', actions: false, config: vlConfig, tooltip: customTooltipHandler };
const embedChart = (selector, spec, opts = embedOpts) =>
  vegaEmbed(selector, spec, opts).then(result => {
    result.view.tooltip(customTooltipHandler);
    return result;
  });

function chartHeightFor(selector, offset = 0, minHeight = 180) {
  const el = document.querySelector(selector);
  if (!el) return minHeight;
  return Math.max(minHeight, Math.floor(el.getBoundingClientRect().height - offset));
}

async function loadChartSpec(spec) {
  if (typeof spec !== 'string') return JSON.parse(JSON.stringify(spec));
  const response = await fetch(spec);
  if (!response.ok) throw new Error(`Could not load Vega spec: ${spec}`);
  return response.json();
}

function embedChartFitHeight(selector, spec, opts = embedOpts, sizing = {}) {
  const { offset = 0, minHeight = 180 } = sizing;
  return loadChartSpec(spec).then(baseSpec => {
    const targetEl = document.querySelector(selector);
    const fittedSpec = {
      ...baseSpec,
      height: chartHeightFor(selector, offset, minHeight)
    };

    return vegaEmbed(selector, fittedSpec, opts).then(result => {
      let frame = null;
      const syncHeight = () => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          result.view.height(chartHeightFor(selector, offset, minHeight)).runAsync();
        });
      };

      result.view.tooltip(customTooltipHandler);
      if (targetEl && 'ResizeObserver' in window) {
        new ResizeObserver(syncHeight).observe(targetEl);
      } else {
        window.addEventListener('resize', syncHeight);
      }
      syncHeight();
      return result;
    });
  });
}

function embedChartFitSize(selector, spec, opts = embedOpts, sizing = {}) {
  const {
    widthOffset = 0,
    heightOffset = 0,
    minWidth = 300,
    minHeight = 220
  } = sizing;

  return loadChartSpec(spec).then(baseSpec => {
    const targetEl = document.querySelector(selector);
    const getSize = () => {
      const rect = targetEl?.getBoundingClientRect();
      return {
        width: Math.max(minWidth, Math.floor((rect?.width || minWidth) - widthOffset)),
        height: Math.max(minHeight, Math.floor((rect?.height || minHeight) - heightOffset))
      };
    };
    const initial = getSize();
    const fittedSpec = { ...baseSpec, width: initial.width, height: initial.height };

    return vegaEmbed(selector, fittedSpec, opts).then(result => {
      let frame = null;
      const syncSize = () => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          const next = getSize();
          result.view.width(next.width).height(next.height).runAsync();
        });
      };

      result.view.tooltip(customTooltipHandler);
      if (targetEl && 'ResizeObserver' in window) {
        new ResizeObserver(syncSize).observe(targetEl);
      } else {
        window.addEventListener('resize', syncSize);
      }
      syncSize();
      return result;
    });
  });
}
