/* M&O Authorization action — isolated from the removed Letter Editor. */
(() => {
  'use strict';

  const TEMPLATE_APPLY_ID = 'letterTemplateApplyBtn';
  const AUTH_BUTTON_ID = 'openAuthorizationFromMergeBtn';
  const BUREAUS = {
    experian: { name: 'Experian', address: 'Experian\nP.O. Box 2002\nAllen, TX 75013' },
    equifax: { name: 'Equifax Information Services LLC', address: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374' },
    transunion: { name: 'TransUnion Consumer Solutions', address: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000' },
  };

  function esc(value) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(String(value ?? ''));
    return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  function buildAuthorizationMarkup(template, name, date, bureau) {
    const bureauAddressHtml = bureau.address.split('\n').map(esc).join('<br>');
    const html = template.html || `<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.35">${esc(template.content || '').replace(/\n/g, '<br>')}</div>`;
    return html
      .replaceAll('{{CLIENT_NAME}}', esc(name))
      .replaceAll('{{DATE}}', esc(date))
      .replaceAll('{{BUREAU_NAME}}', esc(bureau.name))
      .replaceAll('{{BUREAU_ADDRESS_HTML}}', bureauAddressHtml)
      .replaceAll('{{BUREAU_ADDRESS}}', bureauAddressHtml);
  }

  function removeEditorSurface() {
    document.querySelector('[data-view="letterView"]')?.remove();
    document.getElementById('letterView')?.remove();
    document.getElementById('saveTemplateModal')?.remove();
    document.querySelectorAll('#editorSettingsBar, #editorToolbar, #letterEditor, #wordCount, #paperSizeSelect, #marginSelect, #fontFamilySelect, #fontSizeSelect, #lineSpacingSelect, #listStyleSelect')
      .forEach((el) => el.remove());
  }

  function ensureHiddenEditor() {
    let editor = document.getElementById('letterEditor');
    if (!editor) {
      editor = document.createElement('div');
      editor.id = 'letterEditor';
      Object.assign(editor.style, {
        position: 'fixed', left: '-100000px', top: '0',
        width: '816px', minHeight: '1056px', height: '1056px',
        padding: '96px', background: '#fff', pointerEvents: 'none', opacity: '0'
      });
      document.body.appendChild(editor);
    }
    return editor;
  }

  function replaceApplyButton() {
    const original = document.getElementById(TEMPLATE_APPLY_ID);
    if (!original || original.dataset.moAuthorizationBound === 'true') return original;

    const button = original.cloneNode(true);
    button.dataset.moAuthorizationBound = 'true';
    original.replaceWith(button);

    button.addEventListener('click', async () => {
      if (!window.authorizationAddDirectlyToPacket) return;
      window.authorizationAddDirectlyToPacket = false;

      try {
        const select = document.getElementById('letterTemplateSelect');
        const templates = typeof window.getAuthTemplates === 'function' ? window.getAuthTemplates() : [];
        const template = templates.find((item) => item.id === select?.value) || templates[0];
        if (!template) throw new Error('No authorization template is available.');

        const name = (document.getElementById('letterTemplateClientName')?.value || '').trim() || 'Your Name';
        const fallbackDate = new Date().toISOString().slice(0, 10);
        const rawDate = document.getElementById('letterTemplateDate')?.value ||
          (typeof window.getEasternToday === 'function' ? window.getEasternToday() : fallbackDate);
        const date = typeof window.formatAuthDate === 'function' ? window.formatAuthDate(rawDate) : rawDate;
        const bureau = BUREAUS[document.getElementById('letterTemplateBureau')?.value || 'equifax'] || BUREAUS.equifax;

        ensureHiddenEditor().innerHTML = buildAuthorizationMarkup(template, name, date, bureau);
        if (typeof window.insertLetterIntoPacket !== 'function') throw new Error('Authorization packet insertion is unavailable.');
        await window.insertLetterIntoPacket();
        if (typeof window.closeLetterTemplateModal === 'function') window.closeLetterTemplateModal();
      } catch (error) {
        console.error('M&O Authorization insertion failed', error);
        if (typeof window.toast === 'function') window.toast(error?.message || 'Could not add authorization to packet', 'error');
      } finally {
        button.textContent = 'Add Authorization to Packet';
      }
    });
    return button;
  }

  function setupAuthorizationAction() {
    const mergeView = document.getElementById('mergeView');
    const mergeActions = mergeView?.querySelector('.header-actions');
    const templateApply = document.getElementById(TEMPLATE_APPLY_ID);
    if (!mergeActions || !templateApply) return;

    removeEditorSurface();
    const apply = replaceApplyButton();

    let button = document.getElementById(AUTH_BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.id = AUTH_BUTTON_ID;
      button.title = 'Add Authorization to Packet';
      button.textContent = '＋ Authorization';
      const compress = document.getElementById('compressPacketBtn');
      mergeActions.insertBefore(button, compress || mergeActions.lastElementChild);
    }

    if (button.dataset.actionBound !== 'true') {
      button.dataset.actionBound = 'true';
      button.addEventListener('click', () => {
        window.authorizationAddDirectlyToPacket = true;
        const currentApply = document.getElementById(TEMPLATE_APPLY_ID) || apply;
        if (currentApply) currentApply.textContent = 'Add Authorization to Packet';
        if (typeof window.openLetterTemplateModal === 'function') {
          window.openLetterTemplateModal();
        } else if (typeof window.toast === 'function') {
          window.toast('Authorization template is unavailable', 'error');
        }
      });
    }

    const reset = () => {
      window.authorizationAddDirectlyToPacket = false;
      const currentApply = document.getElementById(TEMPLATE_APPLY_ID);
      if (currentApply) currentApply.textContent = 'Populate Letter';
    };
    document.getElementById('letterTemplateCancelBtn')?.addEventListener('click', reset);
    document.getElementById('letterTemplateCloseBtn')?.addEventListener('click', reset);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupAuthorizationAction, { once: true });
  else setupAuthorizationAction();
})();
