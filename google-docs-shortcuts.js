/* Google Docs-style keyboard shortcuts for the existing Authorization Letter editor.
   Isolated feature: no existing application functions are replaced. */
(function () {
  'use strict';

  const EDITOR_ID = 'letterEditor';

  function getEditor() {
    return document.getElementById(EDITOR_ID);
  }

  function isEditableTarget(target) {
    if (!target) return false;
    if (target.matches?.('input, textarea, select, [contenteditable="true"]')) return true;
    return !!target.closest?.('input, textarea, select, [contenteditable="true"]');
  }

  function isInEditor(target) {
    const editor = getEditor();
    return !!editor && (target === editor || editor.contains(target));
  }

  function focusEditor() {
    const editor = getEditor();
    if (!editor) return null;
    editor.focus({ preventScroll: true });
    return editor;
  }

  function command(name, value = null) {
    const editor = focusEditor();
    if (!editor) return false;
    try {
      document.execCommand(name, false, value);
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: `format${name}` }));
      return true;
    } catch {
      return false;
    }
  }

  function insertPageBreak() {
    const editor = focusEditor();
    if (!editor) return;
    try {
      document.execCommand('insertHTML', false, '<div class="tubol-page-break" data-page-break="true"></div>');
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertParagraph' }));
    } catch {}
  }

  function saveLetter() {
    const editor = getEditor();
    if (!editor) return;
    localStorage.setItem('pdfWorkspaceLetter', editor.innerHTML);
    editor.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function showShortcutHelp() {
    let dialog = document.getElementById('tubol-shortcut-help');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'tubol-shortcut-help';
      dialog.style.cssText = [
        'border:0', 'border-radius:12px', 'padding:0', 'max-width:620px', 'width:calc(100vw - 32px)',
        'background:var(--panel,#fff)', 'color:var(--text,#111827)',
        'box-shadow:0 20px 60px rgba(0,0,0,.28)'
      ].join(';');
      dialog.innerHTML = `
        <div style="padding:18px 20px;border-bottom:1px solid rgba(127,127,127,.2);display:flex;align-items:center;justify-content:space-between;gap:12px">
          <strong style="font-size:18px">Keyboard shortcuts</strong>
          <button type="button" data-close-shortcuts style="border:0;background:transparent;font-size:22px;cursor:pointer" aria-label="Close">×</button>
        </div>
        <div style="padding:18px 20px;display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font:14px/1.4 system-ui,sans-serif">
          <div><b>Ctrl/Cmd+B</b> — Bold</div>
          <div><b>Ctrl/Cmd+I</b> — Italic</div>
          <div><b>Ctrl/Cmd+U</b> — Underline</div>
          <div><b>Ctrl/Cmd+Shift+X</b> — Strikethrough</div>
          <div><b>Ctrl/Cmd+.</b> — Superscript</div>
          <div><b>Ctrl/Cmd+,</b> — Subscript</div>
          <div><b>Ctrl/Cmd+Shift+7</b> — Numbered list</div>
          <div><b>Ctrl/Cmd+Shift+8</b> — Bulleted list</div>
          <div><b>Ctrl/Cmd+]</b> — Increase indent</div>
          <div><b>Ctrl/Cmd+[</b> — Decrease indent</div>
          <div><b>Ctrl/Cmd+Z</b> — Undo</div>
          <div><b>Ctrl/Cmd+Shift+Z</b> — Redo</div>
          <div><b>Ctrl/Cmd+Y</b> — Repeat / redo</div>
          <div><b>Ctrl/Cmd+K</b> — Link</div>
          <div><b>Ctrl/Cmd+S</b> — Save</div>
          <div><b>Ctrl/Cmd+P</b> — Print</div>
          <div><b>Ctrl/Cmd+Enter</b> — Page break</div>
          <div><b>Ctrl/Cmd+/</b> — Shortcut list</div>
        </div>`;
      document.body.appendChild(dialog);
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog || event.target.closest?.('[data-close-shortcuts]')) dialog.close();
      });
    }
    if (!dialog.open) dialog.showModal();
  }

  function link() {
    const url = window.prompt('Enter URL');
    if (url) command('createLink', url.trim());
  }

  function handleKeydown(event) {
    const primary = event.ctrlKey || event.metaKey;
    if (!primary) return;

    const editor = getEditor();
    const inEditor = isInEditor(event.target) || document.activeElement === editor;
    const key = event.key.toLowerCase();
    const shift = event.shiftKey;

    if (key === '/' && !shift) {
      event.preventDefault();
      showShortcutHelp();
      return;
    }

    if (!inEditor) return;
    if (!isEditableTarget(event.target) && document.activeElement !== editor) return;

    switch (key) {
      case 'b':
        event.preventDefault(); command('bold'); break;
      case 'i':
        event.preventDefault(); command('italic'); break;
      case 'u':
        event.preventDefault(); command('underline'); break;
      case 'x':
        if (shift) { event.preventDefault(); command('strikeThrough'); }
        break;
      case '.':
        event.preventDefault(); command('superscript'); break;
      case ',':
        event.preventDefault(); command('subscript'); break;
      case '7':
        if (shift) { event.preventDefault(); command('insertOrderedList'); }
        break;
      case '8':
        if (shift) { event.preventDefault(); command('insertUnorderedList'); }
        break;
      case ']':
        event.preventDefault(); command('indent'); break;
      case '[':
        event.preventDefault(); command('outdent'); break;
      case 'z':
        event.preventDefault(); command(shift ? 'redo' : 'undo'); break;
      case 'y':
        event.preventDefault(); command('redo'); break;
      case 'k':
        event.preventDefault(); link(); break;
      case 's':
        event.preventDefault(); saveLetter(); break;
      case 'p':
        event.preventDefault(); window.print(); break;
      case 'enter':
        event.preventDefault(); insertPageBreak(); break;
      default:
        break;
    }
  }

  document.addEventListener('keydown', handleKeydown, true);

  window.TUBOLGoogleDocsShortcuts = {
    showHelp: showShortcutHelp,
    saveLetter,
  };
})();
