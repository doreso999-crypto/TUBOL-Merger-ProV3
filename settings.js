/* Isolated Settings controller. It is independent of the retired Letter Editor. */
(() => {
  function $s(selector) { return document.querySelector(selector); }

  function ensureModal() {
    if ($s('#settingsModal')) return;
    const modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.className = 'settings-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="settings-card" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <div class="panel-close-row">
          <div><div class="eyebrow">WORKSPACE SETTINGS</div><h2 id="settingsTitle">Settings</h2></div>
          <button class="preview-tool close" id="settingsCloseBtn" type="button" title="Close">✕</button>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Appearance</div>
          <label class="settings-field">Theme
            <select id="themeSelect">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="aqua">Aqua</option>
              <option value="adventure">Medieval Adventure</option>
              <option value="zombie">Zombie</option>
              <option value="warm">Warm</option>
              <option value="contrast">High Contrast</option>
            </select>
          </label>
          <div class="settings-color-grid">
            <label class="settings-field">Button &amp; accent color
              <div class="color-row"><input id="accentColorInput" type="color" value="#2563eb"><span id="accentColorValue">#2563EB</span><button type="button" class="settings-reset-btn" id="accentResetBtn">Reset</button></div>
            </label>
            <label class="settings-field">Text selection highlight
              <div class="color-row"><input id="highlightColorInput" type="color" value="#b3d7ff"><span id="highlightColorValue">#B3D7FF</span><button type="button" class="settings-reset-btn" id="highlightResetBtn">Reset</button></div>
            </label>
          </div>
          <p class="subtext">Accent affects buttons, key text, and active controls. Selection highlight uses the familiar light-blue browser-style selection by default.</p>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">Desktop icon</div>
          <p class="subtext">To change the Windows icon, replace <strong>assets/icon.ico</strong>. For macOS, replace <strong>assets/icon.icns</strong>. Then rebuild the app.</p>
        </div>
        <div class="save-export-actions"><span></span><button class="btn btn-primary" id="settingsDoneBtn" type="button">Done</button></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function getPalette() {
    if (typeof window.getActivePalette === 'function') return window.getActivePalette();
    return { accent: '#2563eb', highlight: '#b3d7ff' };
  }

  function syncFields() {
    const palette = getPalette();
    const highlight = localStorage.getItem('pdfWorkspaceHighlight') || palette.highlight || '#b3d7ff';
    const accent = localStorage.getItem('pdfWorkspaceAccent') || palette.accent || '#2563eb';
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
    ensureModal();
    const modal = $s('#settingsModal');
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
    if (typeof window.setTheme === 'function') window.setTheme(value);
    else localStorage.setItem('pdfWorkspaceTheme', value);
    syncFields();
  }

  function applyAccent(value) {
    if (typeof window.applyAccentColor === 'function') window.applyAccentColor(value);
    else localStorage.setItem('pdfWorkspaceAccent', value);
    syncFields();
  }

  function applyHighlight(value) {
    if (typeof window.applyHighlightColor === 'function') window.applyHighlightColor(value);
    else localStorage.setItem('pdfWorkspaceHighlight', value);
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
    ensureModal();

    $s('#settingsBtn')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      open();
    }, true);

    $s('#settingsCloseBtn')?.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation(); close();
    }, true);
    $s('#settingsDoneBtn')?.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation(); close();
    }, true);
    $s('#settingsModal')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) {
        event.preventDefault(); event.stopImmediatePropagation(); close();
      }
    }, true);

    $s('#themeSelect')?.addEventListener('change', (event) => {
      event.stopImmediatePropagation(); applyThemeValue(event.target.value);
    }, true);
    $s('#accentColorInput')?.addEventListener('input', (event) => {
      event.stopImmediatePropagation(); applyAccent(event.target.value);
    }, true);
    $s('#highlightColorInput')?.addEventListener('input', (event) => {
      event.stopImmediatePropagation(); applyHighlight(event.target.value);
    }, true);
    $s('#accentResetBtn')?.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation(); resetAccent();
    }, true);
    $s('#highlightResetBtn')?.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation(); resetHighlight();
    }, true);

    document.addEventListener('keydown', (event) => {
      const modal = $s('#settingsModal');
      if (event.key === 'Escape' && modal?.classList.contains('open')) {
        event.preventDefault(); event.stopImmediatePropagation(); close();
      }
    }, true);

    syncFields();
    if (typeof window.setTheme === 'function') {
      window.setTheme(localStorage.getItem('pdfWorkspaceTheme') || 'light');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
