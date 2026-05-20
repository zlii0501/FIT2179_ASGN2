const raincloudEl = document.getElementById('viz-yearmonth-heat');
const raincloudToolbarEl = document.getElementById('raincloud-detail-toolbar');
const raincloudBackEl = document.getElementById('raincloud-back');
const raincloudTitleEl = document.getElementById('raincloud-detail-title');
let raincloudView = null;
let raincloudMode = 'overview';
let raincloudRenderToken = 0;

function cloneSpec(spec) {
  return JSON.parse(JSON.stringify(spec));
}

function getRaincloudDatum(item) {
  let cursor = item;
  while (cursor) {
    if (cursor.datum && (cursor.datum.month_num || cursor.datum.month_label)) return cursor.datum;
    cursor = cursor.mark?.group || cursor.parent || null;
  }
  return null;
}

function setRaincloudToolbar(isDetail, label = '') {
  if (!raincloudToolbarEl) return;
  raincloudToolbarEl.hidden = !isDetail;
  if (raincloudTitleEl) raincloudTitleEl.textContent = label ? `${label} annual detail` : '';
}

async function swapRaincloud(makeSpec, afterEmbed) {
  const token = ++raincloudRenderToken;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (raincloudEl) {
    raincloudEl.classList.add('is-raincloud-transitioning', 'is-raincloud-exit');
  }
  await new Promise(resolve => window.setTimeout(resolve, reduceMotion ? 0 : 150));
  if (token !== raincloudRenderToken) return null;

  if (raincloudView) {
    raincloudView.finalize();
    raincloudView = null;
  }

  const result = await embedChart('#viz-yearmonth-heat', makeSpec(), embedOpts);
  if (token !== raincloudRenderToken) {
    result.view.finalize();
    return null;
  }

  raincloudView = result.view;
  if (afterEmbed) afterEmbed(result.view);
  if (raincloudEl) {
    raincloudEl.classList.remove('is-raincloud-exit');
    raincloudEl.classList.add('is-raincloud-enter');
    requestAnimationFrame(() => {
      raincloudEl.classList.remove('is-raincloud-enter', 'is-raincloud-transitioning');
    });
  }
  return result;
}

function attachRaincloudOverviewClick(view) {
  view.addEventListener('click', (event, item) => {
    if (raincloudMode !== 'overview') return;
    const datum = getRaincloudDatum(item);
    if (!datum?.month_num) return;
    showRaincloudDetail(Number(datum.month_num), datum.month_label || `Month ${datum.month_num}`);
  });
}

async function showRaincloudOverview() {
  raincloudMode = 'overview';
  setRaincloudToolbar(false);
  await swapRaincloud(
    () => 'vega/14_yearmonth_heat.json?v=card-fit-20260521',
    attachRaincloudOverviewClick
  );
}

async function showRaincloudDetail(monthNum, monthLabel) {
  raincloudMode = 'detail';
  setRaincloudToolbar(true, monthLabel);
  const response = await fetch('vega/14_yearmonth_detail.json?v=card-fit-20260521');
  const detailSpec = await response.json();
  await swapRaincloud(() => {
    const spec = cloneSpec(detailSpec);
    const selectedMonth = spec.params?.find(param => param.name === 'selectedMonth');
    if (selectedMonth) selectedMonth.value = monthNum;
    return spec;
  });
}

if (raincloudBackEl) {
  raincloudBackEl.addEventListener('click', showRaincloudOverview);
}

showRaincloudOverview();
