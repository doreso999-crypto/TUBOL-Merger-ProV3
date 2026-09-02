/* TUBOL Templates launcher. Placeholder modal for future template management. */
(() => {
  const STYLE_ID = 'templatesModalStyles';
  const MODAL_ID = 'templatesModal';
  const BUTTON_ID = 'templatesBtn';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .templates-modal { position: fixed; inset: 0; z-index: 10050; display: none; align-items: center; justify-content: center; padding: 24px; background: rgba(15, 23, 42, .46); backdrop-filter: blur(4px); }
      .templates-modal.open { display: flex; }
      .templates-card { width: min(720px, 100%); max-height: min(720px, calc(100vh - 48px)); overflow: auto; border: 1px solid var(--border-color, #d7dee8); border-radius: 18px; background: var(--surface, #fff); color: var(--text, #111827); box-shadow: 0 24px 70px rgba(15, 23, 42, .24); padding: 24px; }
      .templates-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
      .templates-title-wrap { min-width: 0; }
      .templates-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .12em; opacity: .68; margin-bottom: 6px; }
      .templates-card h2 { margin: 0; font-size: 24px; line-height: 1.2; }
      .templates-close { border: 0; background: transparent; color: inherit; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; font-size: 18px; }
      .templates-close:hover { background: rgba(127, 127, 127, .12); }
      .templates-placeholder { border: 1px dashed var(--border-color, #cbd5e1); border-radius: 14px; padding: 34px 24px; text-align: center; background: rgba(127, 127, 127, .035); }
      .templates-placeholder-icon { font-size: 34px; margin-bottom: 10px; }
      .templates-placeholder strong { display: block; font-size: 16px; margin-bottom: 6px; }
      .templates-placeholder span { display: block; opacity: .68; }
      .templates-footer { display: flex; justify-content: flex-end; margin-top: 20px; }
      .templates-done { border: 0; border-radius: 10px; padding: 10px 16px; font: inherit; font-weight: 700; cursor: pointer; background: var(--accent, #2563eb); color: #fff; }
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'templates-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="templates-card" role="dialog" aria-modal="true" aria-labelledby="templatesTitle">
        <div class="templates-header">
          <div class="templates-title-wrap">
            <div class="templates-eyebrow">WORKSPACE</div>
            <h2 id="templatesTitle">Templates</h2>
          </div>
          <button class="templates-close" id="templatesCloseBtn" type="button" title="Close Templates" aria-label="Close Templates">✕</button>
        </div>
        <div class="templates-placeholder">
          <div class="templates-placeholder-icon" aria-hidden="true">▤</div>
          <strong>Template manager coming next</strong>
          <span>This modal is ready for the template library and editor.</span>
        </div>
        <div class="templates-footer">
          <button class="templates-done" id="templatesDoneBtn" type="button">Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function ensureButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const actions = document.querySelector('.top-actions');
    if (!actions) return;
    const button = document.createElement('button');
    button.className = 'btn btn-ghost';
    button.id = BUTTON_ID;
    button.type = 'button';
    button.title = 'Open templates';
    button.innerHTML = '▤ <span class="btn-label">Templates</span>';
    actions.insertBefore(button, document.getElementById('settingsBtn') || null);
  }

  function open() {
    ensureStyles();
    ensureModal();
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function close() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function bind() {
    ensureStyles();
    ensureButton();
    ensureModal();

    document.getElementById(BUTTON_ID)?.addEventListener('click', (event) => {
      event.preventDefault();
      open();
    });
    document.getElementById('templatesCloseBtn')?.addEventListener('click', close);
    document.getElementById('templatesDoneBtn')?.addEventListener('click', close);
    document.getElementById(MODAL_ID)?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) close();
    });
    document.addEventListener('keydown', (event) => {
      const modal = document.getElementById(MODAL_ID);
      if (event.key === 'Escape' && modal?.classList.contains('open')) {
        event.preventDefault();
        close();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
