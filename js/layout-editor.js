(function () {
  const STORAGE_KEY = 'blackSummerLayoutDraft.v1';
  const ROW_HEIGHT = 46;
  const MIN_ROW_SPAN = 2;
  const MAX_ROW_SPAN = 24;

  const chapters = [
    {
      id: 'ch1',
      title: 'Chapter 1 - Where',
      items: [
        { id: 'ch1-lede', label: 'Chapter 1 lede', kind: 'lede', colStart: 0, colSpan: 4, rowStart: 0, rowSpan: 6 },
        { id: 'fig02-waffle', label: 'Fig. 02 Parliament', kind: 'large', colStart: 4, colSpan: 8, rowStart: 0, rowSpan: 10 },
        { id: 'fig01-causes', label: 'Fig. 01 Causes', kind: 'chart', colStart: 0, colSpan: 4, rowStart: 6, rowSpan: 12 },
        { id: 'fig03-state-stream', label: 'Fig. 03A State stream', kind: 'large', colStart: 4, colSpan: 8, rowStart: 10, rowSpan: 8 },
        { id: 'fig03-state-radar', label: 'Fig. 03B State radar', kind: 'large', colStart: 0, colSpan: 12, rowStart: 18, rowSpan: 8 }
      ]
    },
    {
      id: 'ch2',
      title: 'Chapter 2 - When',
      items: [
        { id: 'ch2-lede', label: 'Chapter lede', kind: 'lede', colStart: 0, colSpan: 12, rowStart: 0, rowSpan: 4 },
        { id: 'fig04-timeseries', label: 'Fig. 04 Daily detections', kind: 'chart', colStart: 0, colSpan: 8, rowStart: 4, rowSpan: 6 },
        { id: 'fig05-month-map', label: 'Fig. 05 Monthly explorer', kind: 'large', colStart: 0, colSpan: 12, rowStart: 10, rowSpan: 13 }
      ]
    },
    {
      id: 'ch3',
      title: 'Chapter 3 - How Intense',
      items: [
        { id: 'ch3-lede', label: 'Chapter lede', kind: 'lede', colStart: 0, colSpan: 12, rowStart: 0, rowSpan: 4 },
        { id: 'fig06-frp-density', label: 'Fig. 06 FRP density', kind: 'chart', colStart: 0, colSpan: 8, rowStart: 4, rowSpan: 6 },
        { id: 'fig07-daynight', label: 'Fig. 07 Day/night', kind: 'chart', colStart: 0, colSpan: 6, rowStart: 10, rowSpan: 6 },
        { id: 'fig08-bubble', label: 'Fig. 08 Bubble', kind: 'chart', colStart: 6, colSpan: 6, rowStart: 10, rowSpan: 6 },
        { id: 'fig09-alluvial', label: 'Fig. 09 Alluvial', kind: 'large', colStart: 0, colSpan: 12, rowStart: 16, rowSpan: 8 },
        { id: 'fig10-heatmatrix', label: 'Fig. 10 Change lines', kind: 'large', colStart: 0, colSpan: 12, rowStart: 24, rowSpan: 8 }
      ]
    },
    {
      id: 'ch4',
      title: 'Chapter 4 - Legacy',
      items: [
        { id: 'ch4-lede', label: 'Chapter lede', kind: 'lede', colStart: 0, colSpan: 12, rowStart: 0, rowSpan: 4 },
        { id: 'fig11-annual-area', label: 'Fig. 11 Annual area', kind: 'chart', colStart: 0, colSpan: 8, rowStart: 4, rowSpan: 6 },
        { id: 'fig12-raincloud', label: 'Fig. 12 Raincloud', kind: 'large', colStart: 0, colSpan: 12, rowStart: 10, rowSpan: 8 },
        { id: 'fig13-hexbin', label: 'Fig. 13 Hexbin map', kind: 'large', colStart: 0, colSpan: 12, rowStart: 18, rowSpan: 8 },
        { id: 'fig14-comparison', label: 'Fig. 14/15 Comparison', kind: 'large', colStart: 0, colSpan: 12, rowStart: 26, rowSpan: 10 }
      ]
    }
  ];

  const boardsEl = document.getElementById('boards');
  const canvasWidthEl = document.getElementById('canvas-width');
  const canvasWidthValueEl = document.getElementById('canvas-width-value');
  const selectedTitleEl = document.getElementById('selected-title');
  const cssOutputEl = document.getElementById('css-output');
  const toastEl = document.getElementById('toast');

  const fields = {
    colStart: document.getElementById('field-col-start'),
    colSpan: document.getElementById('field-col-span'),
    rowStart: document.getElementById('field-row-start'),
    rowSpan: document.getElementById('field-row-span')
  };

  let state = loadState();
  let selectedId = Object.keys(state.items)[0] || null;
  let dragState = null;
  let toastTimer = null;
  let saveTimer = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function defaultState() {
    const items = {};
    chapters.forEach(chapter => {
      chapter.items.forEach((item, index) => {
        items[item.id] = {
          chapter: chapter.id,
          kind: item.kind,
          label: item.label,
          colStart: item.colStart,
          colSpan: item.colSpan,
          rowStart: item.rowStart,
          rowSpan: item.rowSpan,
          order: index + 1
        };
      });
    });
    return {
      version: 1,
      canvasWidth: 1240,
      updatedAt: new Date().toISOString(),
      items
    };
  }

  function loadState() {
    const base = defaultState();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      if (!saved || !saved.items) return base;
      Object.entries(saved.items).forEach(([id, item]) => {
        if (!base.items[id]) return;
        base.items[id] = sanitizeItem({ ...base.items[id], ...item });
      });
      base.canvasWidth = clamp(Number(saved.canvasWidth) || base.canvasWidth, 900, 1440);
      base.updatedAt = saved.updatedAt || base.updatedAt;
      return base;
    } catch (error) {
      console.warn('Saved layout could not be loaded.', error);
      return base;
    }
  }

  function sanitizeItem(item) {
    const colStart = clamp(Math.round(Number(item.colStart) || 0), 0, 11);
    const colSpan = clamp(Math.round(Number(item.colSpan) || 12), 1, 12 - colStart);
    return {
      ...item,
      colStart,
      colSpan,
      rowStart: clamp(Math.round(Number(item.rowStart) || 0), 0, 60),
      rowSpan: clamp(Math.round(Number(item.rowSpan) || MIN_ROW_SPAN), MIN_ROW_SPAN, MAX_ROW_SPAN),
      order: Math.round(Number(item.order) || 1)
    };
  }

  function chapterItems(chapterId) {
    return Object.entries(state.items)
      .filter(([, item]) => item.chapter === chapterId)
      .map(([id, item]) => ({ id, ...item }));
  }

  function normalizeOrders() {
    chapters.forEach(chapter => {
      chapterItems(chapter.id)
        .sort((a, b) => a.rowStart - b.rowStart || a.colStart - b.colStart || a.id.localeCompare(b.id))
        .forEach((item, index) => {
          state.items[item.id].order = index + 1;
        });
    });
  }

  function saveState(silent = false) {
    normalizeOrders();
    state.updatedAt = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateInspector();
    if (!silent) showToast('Saved');
  }

  function queueSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveState(true), 300);
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), 1800);
  }

  function cardStyle(item) {
    const left = (item.colStart / 12) * 100;
    const width = (item.colSpan / 12) * 100;
    return {
      left: `calc(${left}% + 5px)`,
      width: `calc(${width}% - 10px)`,
      top: `${item.rowStart * ROW_HEIGHT + 5}px`,
      height: `${item.rowSpan * ROW_HEIGHT - 10}px`
    };
  }

  function applyCardStyle(card, item) {
    const style = cardStyle(item);
    Object.assign(card.style, style);
    card.querySelector('.card-meta').textContent =
      `Col ${item.colStart + 1} / Span ${item.colSpan} / ${item.rowSpan * ROW_HEIGHT}px`;
  }

  function render() {
    canvasWidthEl.value = String(state.canvasWidth);
    canvasWidthValueEl.textContent = `${state.canvasWidth}px`;
    boardsEl.innerHTML = '';

    chapters.forEach(chapter => {
      const chapterEl = document.createElement('section');
      chapterEl.className = 'chapter-board';

      const header = document.createElement('div');
      header.className = 'chapter-board-header';
      header.innerHTML = `
        <h2>${chapter.title}</h2>
        <span class="chapter-meta">12 columns</span>
      `;

      const canvas = document.createElement('div');
      canvas.className = 'chapter-canvas';
      canvas.dataset.chapter = chapter.id;
      canvas.style.width = `${state.canvasWidth}px`;
      const items = chapterItems(chapter.id);
      const maxRow = items.reduce((max, item) => Math.max(max, item.rowStart + item.rowSpan), 8);
      canvas.style.height = `${Math.max(maxRow * ROW_HEIGHT + 10, 260)}px`;

      items.forEach(item => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'layout-card';
        card.dataset.id = item.id;
        card.dataset.kind = item.kind;
        card.setAttribute('aria-label', item.label);
        if (item.id === selectedId) card.classList.add('is-selected');
        card.innerHTML = `
          <span class="card-kicker">${item.id}</span>
          <strong class="card-title">${item.label}</strong>
          <span class="card-meta"></span>
          <span class="resize-handle" aria-hidden="true"></span>
        `;
        applyCardStyle(card, item);
        canvas.appendChild(card);
      });

      chapterEl.append(header, canvas);
      boardsEl.appendChild(chapterEl);
    });

    updateInspector();
    bindRenderedCards();
  }

  function bindRenderedCards() {
    document.querySelectorAll('.layout-card').forEach(card => {
      card.addEventListener('pointerdown', handlePointerDown);
      card.addEventListener('keydown', handleCardKeydown);
      card.addEventListener('click', () => selectItem(card.dataset.id));
    });
  }

  function selectItem(id) {
    if (!state.items[id]) return;
    selectedId = id;
    document.querySelectorAll('.layout-card').forEach(card => {
      card.classList.toggle('is-selected', card.dataset.id === id);
    });
    updateInspector();
  }

  function updateInspector() {
    const item = state.items[selectedId];
    cssOutputEl.value = generateCss();
    if (!item) {
      selectedTitleEl.textContent = 'None';
      Object.values(fields).forEach(field => field.value = '');
      return;
    }

    selectedTitleEl.textContent = item.label;
    fields.colStart.value = String(item.colStart + 1);
    fields.colSpan.value = String(item.colSpan);
    fields.rowStart.value = String(item.rowStart + 1);
    fields.rowSpan.value = String(item.rowSpan);
  }

  function handlePointerDown(event) {
    const card = event.currentTarget;
    const resizeHandle = event.target.closest('.resize-handle');
    const id = card.dataset.id;
    const item = state.items[id];
    const canvas = card.closest('.chapter-canvas');
    if (!item || !canvas) return;

    selectItem(id);
    card.setPointerCapture(event.pointerId);
    dragState = {
      id,
      type: resizeHandle ? 'resize' : 'move',
      startX: event.clientX,
      startY: event.clientY,
      canvasWidth: canvas.clientWidth,
      original: clone(item)
    };
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!dragState) return;
    const item = state.items[dragState.id];
    if (!item) return;

    const colWidth = dragState.canvasWidth / 12;
    const colDelta = Math.round((event.clientX - dragState.startX) / colWidth);
    const rowDelta = Math.round((event.clientY - dragState.startY) / ROW_HEIGHT);

    if (dragState.type === 'move') {
      item.colStart = clamp(dragState.original.colStart + colDelta, 0, 12 - item.colSpan);
      item.rowStart = clamp(dragState.original.rowStart + rowDelta, 0, 60);
    } else {
      item.colSpan = clamp(dragState.original.colSpan + colDelta, 1, 12 - item.colStart);
      item.rowSpan = clamp(dragState.original.rowSpan + rowDelta, MIN_ROW_SPAN, MAX_ROW_SPAN);
    }

    const card = document.querySelector(`.layout-card[data-id="${dragState.id}"]`);
    if (card) applyCardStyle(card, item);
    growCanvasFor(item);
    updateInspector();
    queueSave();
  }

  function handlePointerUp() {
    if (!dragState) return;
    dragState = null;
    saveState(true);
    render();
  }

  function growCanvasFor(item) {
    const canvas = document.querySelector(`.chapter-canvas[data-chapter="${item.chapter}"]`);
    if (!canvas) return;
    const neededHeight = (item.rowStart + item.rowSpan) * ROW_HEIGHT + 10;
    if (neededHeight > canvas.clientHeight) canvas.style.height = `${neededHeight}px`;
  }

  function handleCardKeydown(event) {
    const id = event.currentTarget.dataset.id;
    const item = state.items[id];
    if (!item) return;

    const resize = event.shiftKey;
    let handled = true;

    if (event.key === 'ArrowLeft') {
      if (resize) item.colSpan = clamp(item.colSpan - 1, 1, 12 - item.colStart);
      else item.colStart = clamp(item.colStart - 1, 0, 12 - item.colSpan);
    } else if (event.key === 'ArrowRight') {
      if (resize) item.colSpan = clamp(item.colSpan + 1, 1, 12 - item.colStart);
      else item.colStart = clamp(item.colStart + 1, 0, 12 - item.colSpan);
    } else if (event.key === 'ArrowUp') {
      if (resize) item.rowSpan = clamp(item.rowSpan - 1, MIN_ROW_SPAN, MAX_ROW_SPAN);
      else item.rowStart = clamp(item.rowStart - 1, 0, 60);
    } else if (event.key === 'ArrowDown') {
      if (resize) item.rowSpan = clamp(item.rowSpan + 1, MIN_ROW_SPAN, MAX_ROW_SPAN);
      else item.rowStart = clamp(item.rowStart + 1, 0, 60);
    } else {
      handled = false;
    }

    if (!handled) return;
    event.preventDefault();
    selectedId = id;
    saveState(true);
    render();
    document.querySelector(`.layout-card[data-id="${id}"]`)?.focus();
  }

  function updateSelectedFromFields() {
    const item = state.items[selectedId];
    if (!item) return;
    const colStart = clamp(Math.round(Number(fields.colStart.value) || 1) - 1, 0, 11);
    item.colStart = colStart;
    item.colSpan = clamp(Math.round(Number(fields.colSpan.value) || item.colSpan), 1, 12 - colStart);
    item.rowStart = clamp(Math.round(Number(fields.rowStart.value) || 1) - 1, 0, 60);
    item.rowSpan = clamp(Math.round(Number(fields.rowSpan.value) || item.rowSpan), MIN_ROW_SPAN, MAX_ROW_SPAN);
    saveState(true);
    render();
  }

  function cssGridColumn(item) {
    if (item.colSpan >= 12) return '1 / -1';
    return `${item.colStart + 1} / span ${item.colSpan}`;
  }

  function cssGridRow(item) {
    return `${item.rowStart + 1} / span ${item.rowSpan}`;
  }

  function generateCss() {
    normalizeOrders();
    const lines = [
      '/* Generated by layout-editor.html */',
      '@media (min-width: 861px) {'
    ];

    chapters.forEach(chapter => {
      lines.push(`  /* ${chapter.title} */`);
      lines.push(`  .chapter-grid-${chapter.id} {`);
      lines.push('    grid-auto-rows: 46px;');
      lines.push('    grid-auto-flow: row;');
      lines.push('    row-gap: 10px;');
      lines.push('  }');
      chapterItems(chapter.id)
        .sort((a, b) => a.order - b.order)
        .forEach(item => {
          lines.push(`  [data-layout-id="${item.id}"] {`);
          lines.push(`    order: ${item.order};`);
          lines.push(`    grid-column: ${cssGridColumn(item)};`);
          lines.push(`    grid-row: ${cssGridRow(item)};`);
          lines.push('    align-self: stretch;');
          lines.push(`    min-height: ${item.rowSpan * ROW_HEIGHT}px;`);
          lines.push('  }');
        });
    });

    lines.push('}');
    lines.push('');
    lines.push('@media (max-width: 860px) {');
    lines.push('  .chapter-grid > [data-layout-id] {');
    lines.push('    grid-column: 1 / -1 !important;');
    lines.push('    grid-row: auto !important;');
    lines.push('    order: initial !important;');
    lines.push('    align-self: auto !important;');
    lines.push('    min-height: auto !important;');
    lines.push('  }');
    lines.push('}');
    return lines.join('\n');
  }

  function downloadText(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    saveState(true);
    downloadText('layout-draft.json', JSON.stringify(state, null, 2), 'application/json');
    showToast('JSON exported');
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        const imported = JSON.parse(String(reader.result || '{}'));
        if (!imported.items) throw new Error('Missing items');
        const next = defaultState();
        Object.entries(imported.items).forEach(([id, item]) => {
          if (next.items[id]) next.items[id] = sanitizeItem({ ...next.items[id], ...item });
        });
        next.canvasWidth = clamp(Number(imported.canvasWidth) || state.canvasWidth, 900, 1440);
        state = next;
        selectedId = Object.keys(state.items)[0] || null;
        saveState(true);
        render();
        showToast('JSON imported');
      } catch (error) {
        showToast('Import failed');
        console.warn(error);
      }
    });
    reader.readAsText(file);
  }

  function resetLayout() {
    state = defaultState();
    selectedId = Object.keys(state.items)[0] || null;
    window.localStorage.removeItem(STORAGE_KEY);
    render();
    showToast('Reset');
  }

  async function copyCss() {
    const css = generateCss();
    try {
      await navigator.clipboard.writeText(css);
      showToast('CSS copied');
    } catch (error) {
      cssOutputEl.value = css;
      cssOutputEl.focus();
      cssOutputEl.select();
      showToast('CSS selected');
    }
  }

  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUp);
  document.addEventListener('pointercancel', handlePointerUp);

  canvasWidthEl.addEventListener('input', () => {
    state.canvasWidth = clamp(Number(canvasWidthEl.value) || 1240, 900, 1440);
    saveState(true);
    render();
  });

  Object.values(fields).forEach(field => {
    field.addEventListener('change', updateSelectedFromFields);
  });

  document.getElementById('save-layout').addEventListener('click', () => saveState(false));
  document.getElementById('apply-layout').addEventListener('click', () => {
    saveState(true);
    window.open('index.html', '_blank');
    showToast('Applied');
  });
  document.getElementById('copy-css').addEventListener('click', copyCss);
  document.getElementById('download-css').addEventListener('click', () => {
    downloadText('layout-overrides.css', generateCss(), 'text/css');
    showToast('CSS downloaded');
  });
  document.getElementById('reset-layout').addEventListener('click', resetLayout);
  document.getElementById('export-json').addEventListener('click', exportJson);
  document.getElementById('import-json').addEventListener('change', event => {
    importJson(event.target.files[0]);
    event.target.value = '';
  });

  render();
})();
