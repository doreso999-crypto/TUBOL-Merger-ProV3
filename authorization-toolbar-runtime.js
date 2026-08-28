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
    if (!letterView || document.getElementById('authorizationActionMenu')) return;

    const headerActions = letterView.querySelector('.view-header .header-actions');
    if (!headerActions) return;

    const existing = ACTIONS
      .map(([id]) => document.getElementById(id))
      .filter(Boolean);
    if (!existing.length) return;

    const menu = document.createElement('div');
    menu.id = 'authorizationActionMenu';
    menu.className = 'authorization-action-menu';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn btn-secondary authorization-action-toggle';
    toggle.setAttribute('aria-haspopup', 'menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.title = 'Letter actions';
    toggle.innerHTML = '<span>Actions</span><span class="authorization-action-chevron" aria-hidden="true">⌄</span>';

    const panel = document.createElement('div');
    panel.className = 'authorization-action-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'menu');

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

    function closeMenu() {
      panel.hidden = true;
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    function openMenu() {
      panel.hidden = false;
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      if (panel.hidden) openMenu();
      else closeMenu();
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
    headerActions.appendChild(menu);

    headerActions.dataset.authorizationActionsCollapsed = '1';
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
