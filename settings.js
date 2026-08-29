/* Isolated Settings controller. It is independent of the retired Letter Editor. */
(() => {
  function $s(selector) { return document.querySelector(selector); }

  function getPalette() {
    const themes = window.THEME_DEFAULTS;
    if (themes && typeof themes === 'object') {
      const key = localStorage.getItem('pdfWorkspaceTheme') || 'light';
      return themes[key] || themes.light;
    }
    return {
      accent: '#2563eb',
      highlight: '#b3d7ff'
    };
  }

  function syncFields() {
    const palette = getPalette();
    const highlight = localStorage.getItem('pdfWorkspaceHighlight') || palette.highlight;
    const accent = localStorage.getItem('pdfWorkspaceAccent') || palette.accent;
    const theme = localStorage.getItem('pdfWorkspaceTheme') || 'light';

    const highlightInput = $s('#highlightColorInput');
    const highlightValue = $s('#highlightColorValue');
    const accentInput = $s('#accentColorInput');
    const accentValue = $s('#accentColorValue');
    const themeSelect = $s('#themeSelect');

    if (highlightInput) highlightInput.value = highlight;
    if (highlightValue) highlightValue.textContent = highlight.toUpperCase();
    if (accentInput) accentInput.value = accent;
    if (accentValue) accentValue.textContent = accent.toUpperCase();
    if (themeSelect) themeSelect.value = theme;
  }

  function open() {
    const modal = $s('#settingsModal');
    if (!modal) return;
    syncFields();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function close() {
    const modal = $s('#settingsModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function applyThemeValue(value) {
    if (typeof window.setTheme === 'function') {
      window.setTheme(value);
    } else {
      localStorage.setItem('pdfWorkspaceTheme', value);
    }
    syncFields();
  }

  function applyAccent(value) {
    if (typeof window.applyAccentColor === 'function') {
      window.applyAccentColor(value);
    } else {
      localStorage.setItem('pdfWorkspaceAccent', value);
    }
    syncFields();
  }

  function applyHighlight(value) {
    if (typeof window.applyHighlightColor === 'function') {
      window.applyHighlightColor(value);
    } else {
      localStorage.setItem('pdfWorkspaceHighlight', value);
    }
    syncFields();
  }

  function resetAccent() {
    if (typeof window.resetAccentColor === 'function') window.resetAccentColor();
    else localStorage.removeItem('pdfWorkspaceAccent');
    syncFields();
  }

  function resetHighlight() {
    if (typeof window.resetHighlightColor === 'function') window.resetHighlightColor();
    else localStorage.removeItem('pdfWorkspaceHighlight');
    syncFields();
  }

  function bind() {
    const settingsButton = $s('#settingsBtn');
    if (settingsButton) {
      settingsButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        open();
      }, true);
    }

    const closeButton = $s('#settingsCloseBtn');
    if (closeButton) {
      closeButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }, true);
    }

    const doneButton = $s('#settingsDoneBtn');
    if (doneButton) {
      doneButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }, true);
    }

    const modal = $s('#settingsModal');
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          event.preventDefault();
          event.stopImmediatePropagation();
          close();
        }
      }, true);
    }

    const theme = $s('#themeSelect');
    if (theme) {
      theme.addEventListener('change', (event) => {
        event.stopImmediatePropagation();
        applyThemeValue(event.target.value);
      }, true);
    }

    const accent = $s('#accentColorInput');
    if (accent) {
      accent.addEventListener('input', (event) => {
        event.stopImmediatePropagation();
        applyAccent(event.target.value);
      }, true);
    }

    const highlight = $s('#highlightColorInput');
    if (highlight) {
      highlight.addEventListener('input', (event) => {
        event.stopImmediatePropagation();
        applyHighlight(event.target.value);
      }, true);
    }

    const accentReset = $s('#accentResetBtn');
    if (accentReset) {
      accentReset.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        resetAccent();
      }, true);
    }

    const highlightReset = $s('#highlightResetBtn');
    if (highlightReset) {
      highlightReset.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        resetHighlight();
      }, true);
    }

    document.addEventListener('keydown', (event) => {
      const modal = $s('#settingsModal');
      if (event.key === 'Escape' && modal?.classList.contains('open')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    }, true);

    syncFields();
    if (typeof window.setTheme === 'function') {
      window.setTheme(localStorage.getItem('pdfWorkspaceTheme') || 'light');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
