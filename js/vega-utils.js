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
