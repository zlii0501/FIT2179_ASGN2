(function () {
  const STORAGE_KEY = 'blackSummerLayoutDraft.v1';
  const MIN_DESKTOP_WIDTH = 861;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeSelector(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function readDraft() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Layout draft could not be read.', error);
      return null;
    }
  }

  function gridColumnFor(item) {
    const colStart = clamp(Number(item.colStart) || 0, 0, 11);
    const colSpan = clamp(Number(item.colSpan) || Number(item.cols) || 12, 1, 12 - colStart);
    return colSpan >= 12 ? '1 / -1' : `${colStart + 1} / span ${colSpan}`;
  }

  function heightFor(item) {
    const explicitHeight = Number(item.height);
    if (Number.isFinite(explicitHeight) && explicitHeight > 0) return explicitHeight;
    const rowSpan = Number(item.rowSpan);
    return Number.isFinite(rowSpan) && rowSpan > 0 ? rowSpan * 46 : 0;
  }

  function gridRowFor(item) {
    const rowStart = clamp(Number(item.rowStart) || 0, 0, 80);
    const rowSpan = clamp(Number(item.rowSpan) || 4, 1, 40);
    return `${rowStart + 1} / span ${rowSpan}`;
  }

  function clearDraftStyles() {
    document.querySelectorAll('[data-layout-grid-draft]').forEach(element => {
      element.style.removeProperty('grid-auto-rows');
      element.style.removeProperty('grid-auto-flow');
      element.style.removeProperty('row-gap');
      delete element.dataset.layoutGridDraft;
    });
    document.querySelectorAll('[data-layout-id][data-layout-draft]').forEach(element => {
      element.style.removeProperty('order');
      element.style.removeProperty('grid-column');
      element.style.removeProperty('grid-row');
      element.style.removeProperty('align-self');
      element.style.removeProperty('min-height');
      element.style.removeProperty('--layout-min-height');
      delete element.dataset.layoutDraft;
    });
  }

  function applyDraft(draft = readDraft()) {
    clearDraftStyles();
    if (!draft || !draft.items || window.innerWidth < MIN_DESKTOP_WIDTH) return;

    Object.entries(draft.items).forEach(([id, item]) => {
      const element = document.querySelector(`[data-layout-id="${escapeSelector(id)}"]`);
      if (!element || !item) return;

      const order = Number(item.order);
      if (Number.isFinite(order)) element.style.order = String(order);
      element.style.gridColumn = gridColumnFor(item);
      element.style.gridRow = gridRowFor(item);
      element.style.alignSelf = 'stretch';

      const minHeight = heightFor(item);
      if (minHeight > 0) {
        const px = `${clamp(Math.round(minHeight), 120, 1100)}px`;
        element.style.minHeight = px;
        element.style.setProperty('--layout-min-height', px);
      }

      const grid = element.closest('.chapter-grid');
      if (grid) {
        grid.style.gridAutoRows = '46px';
        grid.style.gridAutoFlow = 'row';
        grid.style.rowGap = '10px';
        grid.dataset.layoutGridDraft = 'true';
      }

      element.dataset.layoutDraft = 'true';
    });
  }

  window.BlackSummerLayout = {
    STORAGE_KEY,
    apply: applyDraft,
    clear() {
      window.localStorage.removeItem(STORAGE_KEY);
      clearDraftStyles();
    },
    read: readDraft
  };

  applyDraft();
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) applyDraft();
  });
  window.addEventListener('resize', () => applyDraft());
})();
