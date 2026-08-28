/* Authorization Letter document editor layer.
   Single-user, Google Docs-inspired behavior.
   Does not replace existing application functions. */
(function () {
  'use strict';

  const EDITOR_ID = 'letterEditor';
  const TOOLBAR_ID = 'authorizationDocumentToolbar';
  const FIND_ID = 'authorizationFindPanel';
  const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72];

  const $ = (s, root = document) => root.querySelector(s);

  function editor() {
    return document.getElementById(EDITOR_ID);
  }

  function focusEditor() {
    const el = editor();
    if (!el) return false;
    el.focus({ preventScroll: true });
    return true;
  }

  function exec(command, value = null) {
    if (!focusEditor()) return false;
    try {
      document.execCommand(command, false, value);
      editor()?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: command }));
      return true;
    } catch (error) {
      console.warn('Authorization editor command failed:', command, error);
      return false;
    }
  }

  function addButton(toolbar, label, title, action, group = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'authorization-doc-btn';
    button.textContent = label;
    button.title = title;
    button.dataset.action = action;
    if (group) button.dataset.group = group;
    toolbar.appendChild(button);
    return button;
  }

  function buildToolbar(host) {
    if (document.getElementById(TOOLBAR_ID)) return document.getElementById(TOOLBAR_ID);

    const toolbar = document.createElement('div');
    toolbar.id = TOOLBAR_ID;
    toolbar.className = 'authorization-doc-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Document editing toolbar');

    const undo = addButton(toolbar, '↶', 'Undo', 'undo', 'edit');
    const redo = addButton(toolbar, '↷', 'Redo', 'redo', 'edit');
    addButton(toolbar, 'B', 'Bold', 'bold', 'text').classList.add('doc-bold');
    addButton(toolbar, 'I', 'Italic', 'italic', 'text').classList.add('doc-italic');
    addButton(toolbar, 'U', 'Underline', 'underline', 'text').classList.add('doc-underline');
    addButton(toolbar, 'S', 'Strikethrough', 'strikeThrough', 'text').classList.add('doc-strike');

    const font = document.createElement('select');
    font.className = 'authorization-doc-select authorization-doc-font';
    font.title = 'Font family';
    [['Arial', 'Arial, sans-serif'], ['Georgia', 'Georgia, serif'], ['Times New Roman', '"Times New Roman", serif'], ['Verdana', 'Verdana, sans-serif'], ['Courier New', '"Courier New", monospace']]
      .forEach(([label, value]) => {
        const option = new Option(label, value);
        font.appendChild(option);
      });
    toolbar.appendChild(font);

    const size = document.createElement('select');
    size.className = 'authorization-doc-select authorization-doc-size';
    size.title = 'Font size';
    FONT_SIZES.forEach((px) => size.appendChild(new Option(String(px), String(px))));
    size.value = '12';
    toolbar.appendChild(size);

    const format = document.createElement('select');
    format.className = 'authorization-doc-select authorization-doc-style';
    format.title = 'Paragraph style';
    [['Normal text', 'p'], ['Title', 'h1'], ['Subtitle', 'h2'], ['Heading 1', 'h1'], ['Heading 2', 'h2'], ['Heading 3', 'h3'], ['Quote', 'blockquote'], ['Code', 'pre']]
      .forEach(([label, value]) => format.appendChild(new Option(label, value)));
    toolbar.appendChild(format);

    addButton(toolbar, '• List', 'Bulleted list', 'insertUnorderedList', 'paragraph');
    addButton(toolbar, '1. List', 'Numbered list', 'insertOrderedList', 'paragraph');
    addButton(toolbar, '↤', 'Decrease indent', 'outdent', 'paragraph');
    addButton(toolbar, '↦', 'Increase indent', 'indent', 'paragraph');

    const align = document.createElement('select');
    align.className = 'authorization-doc-select';
    align.title = 'Alignment';
    [['Left', 'justifyLeft'], ['Center', 'justifyCenter'], ['Right', 'justifyRight'], ['Justify', 'justifyFull']]
      .forEach(([label, value]) => align.appendChild(new Option(label, value)));
    toolbar.appendChild(align);

    const textColor = document.createElement('input');
    textColor.type = 'color';
    textColor.className = 'authorization-doc-color';
    textColor.title = 'Text color';
    textColor.value = '#111827';
    toolbar.appendChild(textColor);

    const highlight = document.createElement('input');
    highlight.type = 'color';
    highlight.className = 'authorization-doc-color';
    highlight.title = 'Highlight color';
    highlight.value = '#fff59d';
    toolbar.appendChild(highlight);

    addButton(toolbar, '↗', 'Insert or edit link', 'link', 'insert');
    addButton(toolbar, 'T', 'Insert table', 'table', 'insert');
    addButton(toolbar, '↵', 'Insert page break', 'pageBreak', 'insert');
    addButton(toolbar, 'Ω', 'Insert special character', 'special', 'insert');
    addButton(toolbar, '⌕', 'Find and replace', 'find', 'tools');
    addButton(toolbar, 'Clear', 'Clear formatting', 'removeFormat', 'tools');

    const spacer = document.createElement('span');
    spacer.className = 'authorization-doc-toolbar-spacer';
    toolbar.appendChild(spacer);
    addButton(toolbar, '?', 'Keyboard shortcuts', 'shortcuts', 'help');

    toolbar.addEventListener('mousedown', (event) => {
      // Preserve the editor selection when the toolbar is pressed.
      if (event.target.matches('button, select, input')) event.preventDefault();
    });

    toolbar.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      runAction(button.dataset.action);
    });

    font.addEventListener('change', () => exec('fontName', font.value));
    size.addEventListener('change', () => applyFontSize(size.value));
    format.addEventListener('change', () => exec('formatBlock', format.value));
    align.addEventListener('change', () => exec(align.value));
    textColor.addEventListener('input', () => exec('foreColor', textColor.value));
    highlight.addEventListener('input', () => exec('hiliteColor', highlight.value));

    host.parentNode.insertBefore(toolbar, host);
    return toolbar;
  }

  function applyFontSize(px) {
    if (!focusEditor()) return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
      exec('fontSize', '3');
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const node = sel.anchorNode?.parentElement;
        if (node) node.style.fontSize = `${px}px`;
      }
      return;
    }
    exec('fontSize', '7');
    editor().querySelectorAll('font[size="7"]').forEach((node) => {
      node.removeAttribute('size');
      node.style.fontSize = `${px}px`;
    });
  }

  function selectedText() {
    const sel = window.getSelection();
    return sel ? String(sel.toString() || '') : '';
  }

  function insertLink() {
    const existing = selectedText();
    const url = window.prompt('Enter URL', 'https://');
    if (!url) return;
    if (!existing) {
      const text = window.prompt('Link text', url);
      if (!text) return;
      exec('insertHTML', `<a href="${escapeHtmlAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`);
    } else {
      exec('createLink', url);
    }
  }

  function insertTable() {
    const rows = Math.max(1, Math.min(20, Number.parseInt(window.prompt('Rows', '2') || '2', 10)));
    const cols = Math.max(1, Math.min(12, Number.parseInt(window.prompt('Columns', '2') || '2', 10)));
    let html = '<table class="authorization-doc-table"><tbody>';
    for (let r = 0; r < rows; r += 1) {
      html += '<tr>';
      for (let c = 0; c < cols; c += 1) html += '<td>&nbsp;</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    exec('insertHTML', html);
  }

  function insertPageBreak() {
    exec('insertHTML', '<div class="authorization-page-break" contenteditable="false"><span>Page break</span></div><p><br></p>');
  }

  function insertSpecial() {
    const value = window.prompt('Enter a special character', '©');
    if (value) exec('insertText', value);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function escapeHtmlAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function buildFindPanel() {
    let panel = document.getElementById(FIND_ID);
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = FIND_ID;
    panel.className = 'authorization-find-panel';
    panel.innerHTML = `
      <div class="authorization-find-row">
        <input class="find-query" type="search" placeholder="Find in document" aria-label="Find in document">
        <input class="replace-query" type="text" placeholder="Replace with" aria-label="Replace with">
        <button type="button" data-find-action="next">Find next</button>
        <button type="button" data-find-action="replace">Replace</button>
        <button type="button" data-find-action="replaceAll">Replace all</button>
        <button type="button" data-find-action="close" aria-label="Close">×</button>
      </div>`;

    panel.addEventListener('click', (event) => {
      const action = event.target.closest('[data-find-action]')?.dataset.findAction;
      if (!action) return;
      const root = editor();
      if (!root) return;
      const query = $('.find-query', panel)?.value || '';
      const replacement = $('.replace-query', panel)?.value || '';
      if (!query && action !== 'close') return;
      if (action === 'close') panel.hidden = true;
      if (action === 'next') findNext(query);
      if (action === 'replace') replaceSelection(query, replacement);
      if (action === 'replaceAll') replaceAll(query, replacement);
    });

    const letterView = document.getElementById('letterView');
    letterView?.appendChild(panel);
    return panel;
  }

  function findNext(query) {
    focusEditor();
    if (typeof window.find === 'function') {
      window.find(query, false, false, true, false, false, false);
    }
  }

  function replaceSelection(query, replacement) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.toString() !== query) {
      findNext(query);
      return;
    }
    exec('insertText', replacement);
  }

  function replaceAll(query, replacement) {
    const root = editor();
    if (!root || !query) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.nodeValue.includes(query)) node.nodeValue = node.nodeValue.split(query).join(replacement);
    });
    root.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText' }));
  }

  function showShortcutHelp() {
    const commands = [
      'Ctrl/Cmd + B — Bold', 'Ctrl/Cmd + I — Italic', 'Ctrl/Cmd + U — Underline',
      'Ctrl/Cmd + Z — Undo', 'Ctrl/Cmd + Shift + Z — Redo', 'Ctrl/Cmd + K — Link',
      'Ctrl/Cmd + F — Find', 'Ctrl/Cmd + P — Print', 'Ctrl/Cmd + S — Save',
      'Ctrl/Cmd + Enter — Page break', 'Ctrl/Cmd + Shift + 7 — Numbered list', 'Ctrl/Cmd + Shift + 8 — Bulleted list'
    ];
    window.alert(`Authorization Letter shortcuts\n\n${commands.join('\n')}`);
  }

  function runAction(action) {
    if (action === 'undo') return exec('undo');
    if (action === 'redo') return exec('redo');
    if (action === 'bold') return exec('bold');
    if (action === 'italic') return exec('italic');
    if (action === 'underline') return exec('underline');
    if (action === 'strikeThrough') return exec('strikeThrough');
    if (action === 'insertUnorderedList') return exec('insertUnorderedList');
    if (action === 'insertOrderedList') return exec('insertOrderedList');
    if (action === 'outdent') return exec('outdent');
    if (action === 'indent') return exec('indent');
    if (action === 'removeFormat') return exec('removeFormat');
    if (action === 'link') return insertLink();
    if (action === 'table') return insertTable();
    if (action === 'pageBreak') return insertPageBreak();
    if (action === 'special') return insertSpecial();
    if (action === 'find') {
      const panel = buildFindPanel();
      panel.hidden = false;
      $('.find-query', panel)?.focus();
      return;
    }
    if (action === 'shortcuts') return showShortcutHelp();
  }

  function selectionIsInEditor() {
    const root = editor();
    const sel = window.getSelection();
    return !!(root && sel && sel.rangeCount && root.contains(sel.anchorNode));
  }

  function handleShortcut(event) {
    const root = editor();
    if (!root || !selectionIsInEditor()) return;
    const mod = event.ctrlKey || event.metaKey;
    if (!mod) return;

    const key = event.key.toLowerCase();
    let handled = true;

    if (key === 'b') runAction('bold');
    else if (key === 'i') runAction('italic');
    else if (key === 'u') runAction('underline');
    else if (key === 'k') runAction('link');
    else if (key === 'f') runAction('find');
    else if (key === 's') {
      event.preventDefault();
      root.dispatchEvent(new CustomEvent('tubol:document-save', { bubbles: true }));
      if (typeof window.saveLetter === 'function') window.saveLetter();
    } else if (key === 'p') {
      event.preventDefault();
      window.print();
    } else if (key === 'enter') runAction('pageBreak');
    else if (key === '7' && event.shiftKey) runAction('insertOrderedList');
    else if (key === '8' && event.shiftKey) runAction('insertUnorderedList');
    else if (key === '/') showShortcutHelp();
    else handled = false;

    if (handled) event.preventDefault();
  }

  function mount() {
    const root = editor();
    const letterView = document.getElementById('letterView');
    if (!root || !letterView || root.dataset.documentEditorMounted === '1') return;
    root.dataset.documentEditorMounted = '1';

    buildToolbar(root);
    buildFindPanel();
    document.addEventListener('keydown', handleShortcut, true);

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Tab' && selectionIsInEditor()) {
        event.preventDefault();
        exec('insertText', '\t');
      }
    });

    root.addEventListener('paste', () => {
      window.setTimeout(() => root.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' })), 0);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();

  window.TUBOLAuthorizationDocumentEditor = { mount, exec, runAction };
})();
