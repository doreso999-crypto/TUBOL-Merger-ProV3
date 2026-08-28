/* Authorization Letter editor polish layer.
   Keeps the existing editor engine untouched.
   - Hides Paper + Margins behind a compact document-layout icon menu.
   - Uses standard point sizes while feeding the existing px-based editor command.
*/
(function () {
  'use strict';

  const FONT_SIZES_PT = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72];
  const PX_PER_PT = 96 / 72;

  function movePageControlsIntoMenu() {
    const toolbar = document.getElementById('authorizationDocumentToolbar');
    const settingsBar = document.getElementById('editorSettingsBar');
    if (!toolbar || !settingsBar || settingsBar.dataset.movedToDocumentLayoutMenu === '1') return;

    const group = document.createElement('div');
    group.className = 'authorization-doc-layout-panel';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Page layout');

    Array.from(settingsBar.querySelectorAll('.settings-group')).forEach((item) => group.appendChild(item));

    const wrapper = document.createElement('div');
    wrapper.className = 'authorization-doc-layout-menu';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'authorization-doc-btn authorization-doc-layout-toggle';
    button.title = 'Page setup';
    button.setAttribute('aria-label', 'Open page setup');
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M8.5 11h7M8.5 14h7M8.5 17h5"/></svg>';

    const popover = document.createElement('div');
    popover.className = 'authorization-doc-layout-popover';
    popover.hidden = true;
    popover.appendChild(group);
    wrapper.appendChild(button);
    wrapper.appendChild(popover);
    toolbar.appendChild(wrapper);

    const close = () => {
      popover.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      wrapper.classList.remove('is-open');
    };

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const opening = popover.hidden;
      popover.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
      wrapper.classList.toggle('is-open', opening);
    });

    popover.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', close);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    settingsBar.hidden = true;
    settingsBar.dataset.movedToDocumentLayoutMenu = '1';
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

    select.value = String(Math.round(12 * PX_PER_PT * 1000) / 1000);
    select.title = 'Font size (pt)';
    select.setAttribute('aria-label', 'Font size (points)');
    select.dataset.standardized = '1';
  }

  function polish() {
    movePageControlsIntoMenu();
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
