/* Authorization toolbar runtime cleanup.
   Removes the legacy toolbar, protects native selects, consolidates
   Authorization Letter actions, and keeps the editor shell visually clean
   without changing the underlying application functions. */
(function () {
  'use strict';

  const ACTIONS = [
    ['openLetterTemplateBtn', 'Use Authorization Template'],
    ['saveLetterTemplateBtn', 'Save as Template'],
    ['insertLetterBtn', 'Add Authorization to Packet'],
    ['downloadLetterBtn', 'Download Authorization PDF'],
  ];

  function cleanupLegacyToolbar() {
    const legacy = document.getElementById('editorToolbar');
    if (legacy) legacy.remove();
  }

  function protectNativeSelects() {
    document.addEventListener('mousedown', (event) => {
      const select = event.target?.closest?.('.authorization-doc-toolbar select');
      if (!select) return;
      event.stopPropagation();
    }, true);
  }

  function buildActionMenu() {
    const letterView = document.getElementById('letterView');
    if (!letterView) return;

    const toolbar = document.getElementById('authorizationDocumentToolbar');
    if (!toolbar) return;

    let menu = document.getElementById('authorizationActionMenu');

    if (!menu) {
      const existing = ACTIONS
        .map(([id]) => document.getElementById(id))
        .filter(Boolean);
      if (!existing.length) return;

      menu = document.createElement('div');
      menu.id = 'authorizationActionMenu';
      menu.className = 'authorization-action-menu';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'authorization-doc-btn authorization-action-toggle';
      toggle.setAttribute('aria-haspopup', 'menu');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.title = 'Letter actions';
      toggle.innerHTML = '<span>Actions</span><span class="authorization-action-chevron" aria-hidden="true">⌄</span>';

      const panel = document.createElement('div');
      panel.className = 'authorization-action-panel';
      panel.hidden = true;
      panel.setAttribute('role', 'menu');

      const closeMenu = () => {
        panel.hidden = true;
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      };

      ACTIONS.forEach(([id, label]) => {
        const source = document.getElementById(id);
        if (!source) return;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'authorization-action-item';
        item.textContent = label;
        item.setAttribute('role', 'menuitem');
        item.addEventListener('click', () => {
          source.click();
          closeMenu();
        });
        panel.appendChild(item);
        source.remove();
      });

      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        if (panel.hidden) {
          panel.hidden = false;
          menu.classList.add('is-open');
          toggle.setAttribute('aria-expanded', 'true');
        } else {
          closeMenu();
        }
      });

      document.addEventListener('click', (event) => {
        if (!menu.contains(event.target)) closeMenu();
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden) {
          closeMenu();
          toggle.focus();
        }
      });

      menu.appendChild(toggle);
      menu.appendChild(panel);
    }

    // Keep Actions inside the document toolbar rather than the page header.
    if (menu.parentElement !== toolbar) {
      const spacer = toolbar.querySelector('.authorization-doc-toolbar-spacer');
      if (spacer) toolbar.insertBefore(menu, spacer.nextSibling);
      else toolbar.appendChild(menu);
    }

    const headerActions = letterView.querySelector('.view-header .header-actions');
    if (headerActions) headerActions.removeAttribute('data-authorization-actions-collapsed');
  }

  function flattenEditorShell() {
    const letterView = document.getElementById('letterView');
    const card = letterView?.querySelector('.editor-card');
    const layout = letterView?.querySelector('.editor-layout');
    if (!card || !layout) return;
    layout.classList.add('authorization-editor-flat');
    card.classList.add('authorization-editor-flat-card');
  }

  function relocateWordCount() {
    const letterView = document.getElementById('letterView');
    const wordCount = document.getElementById('wordCount');
    const toolbar = document.getElementById('authorizationDocumentToolbar');
    if (!letterView || !wordCount || !toolbar || wordCount.dataset.relocated === '1') return;

    const status = document.createElement('span');
    status.className = 'authorization-word-count';
    status.appendChild(wordCount);
    toolbar.appendChild(status);
    wordCount.dataset.relocated = '1';

    const footer = letterView.querySelector('.editor-footer');
    if (footer) footer.remove();
  }

  function hidePageWrap() {
    const letterView = document.getElementById('letterView');
    const wrap = letterView?.querySelector('.letter-page-wrap');
    if (!wrap) return;
    wrap.classList.add('authorization-page-wrap-flat');
  }

  function mount() {
    protectNativeSelects();
    const run = () => {
      cleanupLegacyToolbar();
      buildActionMenu();
      flattenEditorShell();
      relocateWordCount();
      hidePageWrap();
    };
    queueMicrotask(run);
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
