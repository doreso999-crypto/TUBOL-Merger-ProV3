/* Authorization Letter editor polish layer.
   Keeps the existing editor engine untouched.
   - Moves Paper + Margins into the active document toolbar.
   - Makes the font-size dropdown use standard point sizes while preserving
     the current editor's px-based command implementation by feeding it the
     corresponding CSS-pixel values.
*/
(function () {
  'use strict';

  const FONT_SIZES_PT = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72];
  const PX_PER_PT = 96 / 72;

  function movePageControlsIntoToolbar() {
    const toolbar = document.getElementById('authorizationDocumentToolbar');
    const settingsBar = document.getElementById('editorSettingsBar');
    if (!toolbar || !settingsBar || settingsBar.dataset.movedToDocumentToolbar === '1') return;

    const group = document.createElement('div');
    group.className = 'authorization-doc-layout-group';
    group.setAttribute('aria-label', 'Page layout');

    Array.from(settingsBar.querySelectorAll('.settings-group')).forEach((item) => group.appendChild(item));
    const separator = document.createElement('span');
    separator.className = 'authorization-doc-separator';
    toolbar.appendChild(separator);
    toolbar.appendChild(group);

    settingsBar.hidden = true;
    settingsBar.dataset.movedToDocumentToolbar = '1';
  }

  function normalizeFontSizeSelect() {
    const select = document.querySelector('#authorizationDocumentToolbar .authorization-doc-size');
    if (!select || select.dataset.standardized === '1') return;

    select.innerHTML = '';
    FONT_SIZES_PT.forEach((pt) => {
      const option = document.createElement('option');
      option.value = String(Math.round(pt * PX_PER_PT * 1000) / 1000);
      option.textContent = String(pt);
      select.appendChild(option);
    });

    // 12 pt = 16 CSS px at the standard 96 CSS px/in baseline.
    select.value = String(Math.round(12 * PX_PER_PT * 1000) / 1000);
    select.title = 'Font size (pt)';
    select.setAttribute('aria-label', 'Font size (points)');
    select.dataset.standardized = '1';
  }

  function polish() {
    movePageControlsIntoToolbar();
    normalizeFontSizeSelect();
  }

  function startObserver() {
    polish();
    const observer = new MutationObserver(() => polish());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }
})();
