(async function () {
  const STORAGE_KEY = 'blackSummerGrapesProject.v1';
  const toastEl = document.getElementById('gjs-toast');

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toastEl.classList.remove('is-visible'), 1800);
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

  async function loadIndexMarkup() {
    const response = await fetch('index.html', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load index.html (${response.status})`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script').forEach(script => script.remove());
    const body = doc.body.cloneNode(true);
    body.querySelectorAll('[id]').forEach(el => {
      el.dataset.originalId = el.id;
    });
    return body.innerHTML;
  }

  function canvasStyles() {
    return [
      'css/style.css?v=fig06-caption-legend-20260523',
      'css/layout-overrides.css?v=7'
    ];
  }

  function addBlocks(editor) {
    const blocks = editor.Blocks;
    blocks.add('bs-section', {
      label: 'Section',
      category: 'Black Summer',
      content: '<section class="chapter"><div class="chapter-grid"><div class="chart-card grid-span-12"><div class="chart-title"><span class="chart-number">Fig.</span><span class="chart-title-text">New section title</span></div><p class="chart-annotation compact-p">Add your text here.</p></div></div></section>'
    });
    blocks.add('bs-card', {
      label: 'Chart Card',
      category: 'Black Summer',
      content: '<div class="chart-card grid-span-6"><div class="chart-title"><span class="chart-number">Fig.</span><span class="chart-title-text">Chart title</span></div><p class="chart-annotation compact-p">Chart note.</p></div>'
    });
    blocks.add('bs-paragraph', {
      label: 'Paragraph',
      category: 'Black Summer',
      content: '<p class="chart-annotation compact-p">Write a concise explanation for this visualisation.</p>'
    });
    blocks.add('bs-lede', {
      label: 'Chapter Lede',
      category: 'Black Summer',
      content: '<div class="chapter-lede"><p class="chapter-kicker">Chapter</p><h2>Chapter title</h2><p>Introductory text.</p></div>'
    });
  }

  function addCommands(editor) {
    editor.Commands.add('export-page-html', {
      run() {
        const css = editor.getCss();
        const html = editor.getHtml();
        const output = [
          '<!DOCTYPE html>',
          '<html lang="en">',
          '<head>',
          '  <meta charset="UTF-8">',
          '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
          "  <title>Australia's Black Summer - GrapesJS Export</title>",
          '  <style>',
          css,
          '  </style>',
          '</head>',
          '<body>',
          html,
          '</body>',
          '</html>'
        ].join('\n');
        downloadText('grapesjs-export.html', output, 'text/html');
        showToast('HTML exported');
      }
    });

    editor.Commands.add('export-page-css', {
      run() {
        downloadText('grapesjs-export.css', editor.getCss(), 'text/css');
        showToast('CSS exported');
      }
    });

    editor.Commands.add('reset-grapes-draft', {
      async run() {
        window.localStorage.removeItem(STORAGE_KEY);
        editor.setComponents(await loadIndexMarkup());
        editor.setStyle('');
        editor.clearDirtyCount();
        showToast('Draft reset');
      }
    });
  }

  function wireButtons(editor) {
    document.getElementById('export-html').addEventListener('click', () => {
      editor.runCommand('export-page-html');
    });
    document.getElementById('export-css').addEventListener('click', () => {
      editor.runCommand('export-page-css');
    });
    document.getElementById('reset-grapes').addEventListener('click', () => {
      editor.runCommand('reset-grapes-draft');
    });
  }

  try {
    if (!window.grapesjs) {
      throw new Error('GrapesJS failed to load from the CDN.');
    }

    const initialMarkup = await loadIndexMarkup();
    const editor = grapesjs.init({
      container: '#gjs',
      height: '100%',
      fromElement: false,
      components: initialMarkup,
      storageManager: {
        type: 'local',
        autosave: true,
        autoload: true,
        stepsBeforeSave: 1,
        options: {
          local: { key: STORAGE_KEY }
        }
      },
      canvas: {
        styles: canvasStyles()
      },
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Tablet', width: '860px' },
          { name: 'Mobile', width: '390px' }
        ]
      }
    });

    editor.Commands.add('set-device-desktop', {
      run: ed => ed.setDevice('Desktop')
    });
    editor.Commands.add('set-device-tablet', {
      run: ed => ed.setDevice('Tablet')
    });
    editor.Commands.add('set-device-mobile', {
      run: ed => ed.setDevice('Mobile')
    });

    addBlocks(editor);
    addCommands(editor);
    wireButtons(editor);

    editor.on('storage:store', () => showToast('Draft saved locally'));
    editor.on('load', () => showToast('GrapesJS ready'));
  } catch (error) {
    console.error(error);
    document.getElementById('gjs').innerHTML = [
      '<section class="editor-loading">',
      '<p>GrapesJS could not start. Check the console for details.</p>',
      '</section>'
    ].join('');
    showToast('GrapesJS failed to start');
  }
})();
