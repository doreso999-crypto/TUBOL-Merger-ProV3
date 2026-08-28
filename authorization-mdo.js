/* TUBOL — Merge & Organize Authorization workflow only. */
(() => {
  'use strict';

  const AUTH_BUREAUS = {
    experian: { name: 'Experian', address: 'Experian\nP.O. Box 2002\nAllen, TX 75013' },
    equifax: { name: 'Equifax Information Services LLC', address: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374' },
    transunion: { name: 'TransUnion Consumer Solutions', address: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000' },
  };

  const DEFAULT_AUTH_TEMPLATE = {
    id: 'authorization-default',
    name: 'Authorization Dispute',
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.5">
{{BUREAU_ADDRESS_HTML}}<br><br>
This is <strong>{{CLIENT_NAME}}</strong> and I authorize this dispute.<br><br>
Today is {{DATE}}.<br><br>
I am mailing this through a mailing company as I can’t physically go into postal office due to health issues. This is my authorization for you to process this dispute.<br><br>
This is not a third party agency or anyone else authorizing this dispute.<br><br>
Please do not deflect or not process my dispute for any such reason.<br>
Again, this is <strong>{{CLIENT_NAME}}</strong><br><br>
I authorize this dispute.
</div>`
  };

  const esc = (value) => {
    const text = String(value ?? '');
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(text);
    return text.replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
  };

  function getTemplates() {
    try {
      const stored = JSON.parse(localStorage.getItem('pdfWorkspaceAuthTemplates') || 'null');
      if (Array.isArray(stored) && stored.length) {
        const migrated = stored.map(item => item?.id === 'authorization-default' ? DEFAULT_AUTH_TEMPLATE : item);
        localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(migrated));
        return migrated;
      }
    } catch (error) {
      console.warn('Authorization template storage could not be read.', error);
    }
    const seeded = [DEFAULT_AUTH_TEMPLATE];
    localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(seeded));
    return seeded;
  }

  function saveTemplates(list) {
    localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(list));
  }

  function getEasternToday() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function formatAuthDate(value) {
    if (!value) return '';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${month}/${day}/${year}` : String(value);
  }

  function renderLetterTemplateOptions() {
    const select = document.getElementById('letterTemplateSelect');
    if (!select) return;
    const templates = getTemplates();
    select.innerHTML = '';
    templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    });
    updateTemplateDeleteState();
  }

  function updateLetterTemplateModalAddress() {
    const key = document.getElementById('letterTemplateBureau')?.value || 'equifax';
    const bureau = AUTH_BUREAUS[key] || AUTH_BUREAUS.equifax;
    const target = document.getElementById('letterTemplateBureauAddress');
    if (target) target.textContent = bureau.address.replace(/\n/g, ' • ');
  }

  function openLetterTemplateModal() {
    renderLetterTemplateOptions();
    const date = document.getElementById('letterTemplateDate');
    const bureau = document.getElementById('letterTemplateBureau');
    if (date && !date.value) date.value = getEasternToday();
    if (bureau && !bureau.value) bureau.value = 'equifax';
    updateLetterTemplateModalAddress();
    const modal = document.getElementById('letterTemplateModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeLetterTemplateModal() {
    const modal = document.getElementById('letterTemplateModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.getElementById('saveExportModal')?.classList.contains('open')) {
      document.body.classList.remove('modal-open');
    }
  }

  function updateTemplateDeleteState() {
    const button = document.getElementById('deleteSavedTemplateBtn');
    const id = document.getElementById('letterTemplateSelect')?.value;
    if (button) button.disabled = !id || id === 'authorization-default';
  }

  function buildAuthorizationHtml() {
    const id = document.getElementById('letterTemplateSelect')?.value;
    const templates = getTemplates();
    const template = templates.find(item => item.id === id) || templates[0];
    if (!template) throw new Error('No authorization template is available.');

    const name = (document.getElementById('letterTemplateClientName')?.value || '').trim() || 'Your Name';
    const rawDate = document.getElementById('letterTemplateDate')?.value || getEasternToday();
    const date = formatAuthDate(rawDate);
    const bureauKey = document.getElementById('letterTemplateBureau')?.value || 'equifax';
    const bureau = AUTH_BUREAUS[bureauKey] || AUTH_BUREAUS.equifax;
    const bureauAddressHtml = bureau.address.split('\n').map(esc).join('<br>');
    const templateHtml = template.html || `<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.35">${esc(template.content || '').replace(/\n/g, '<br>')}</div>`;

    return templateHtml
      .replaceAll('{{CLIENT_NAME}}', esc(name))
      .replaceAll('{{DATE}}', esc(date))
      .replaceAll('{{BUREAU_NAME}}', esc(bureau.name))
      .replaceAll('{{BUREAU_ADDRESS_HTML}}', bureauAddressHtml)
      .replaceAll('{{BUREAU_ADDRESS}}', bureauAddressHtml);
  }

  function prepareAuthorizationEditor(html) {
    const editor = document.getElementById('letterEditor');
    if (!editor) throw new Error('Authorization document surface is unavailable.');

    const paper = document.getElementById('paperSizeSelect');
    const margin = document.getElementById('marginSelect');
    if (paper) paper.value = 'legal';
    if (margin) margin.value = 'normal';

    Object.assign(editor.style, {
      width: '816px',
      minWidth: '816px',
      maxWidth: '816px',
      minHeight: '1344px',
      height: '1344px',
      maxHeight: '1344px',
      padding: '96px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      background: '#fff',
      position: 'fixed',
      left: '-100000px',
      top: '0',
      pointerEvents: 'none',
      opacity: '0'
    });

    editor.innerHTML = html;
    return editor;
  }

  async function addAuthorizationToPacket() {
    const html = buildAuthorizationHtml();
    prepareAuthorizationEditor(html);

    if (typeof window.insertLetterIntoPacket !== 'function') {
      throw new Error('Authorization packet insertion is unavailable.');
    }

    await window.insertLetterIntoPacket();
  }

  function installAuthorizationApplyHandler() {
    const original = document.getElementById('letterTemplateApplyBtn');
    if (!original || original.dataset.moAuthBound === 'true') return;

    const button = original.cloneNode(true);
    button.dataset.moAuthBound = 'true';
    original.replaceWith(button);

    button.addEventListener('click', async () => {
      if (!window.authorizationAddDirectlyToPacket) return;
      window.authorizationAddDirectlyToPacket = false;

      try {
        await addAuthorizationToPacket();
        closeLetterTemplateModal();
      } catch (error) {
        console.error('M&O Authorization insertion failed.', error);
        if (typeof window.toast === 'function') {
          window.toast(error?.message || 'Could not add authorization to packet', 'error');
        }
      }
    });
  }

  function removeLetterEditorSurface() {
    document.querySelector('[data-view="letterView"]')?.remove();
    document.getElementById('letterView')?.remove();
    document.getElementById('saveTemplateModal')?.remove();
  }

  function setupAuthorizationAction() {
    const mergeView = document.getElementById('mergeView');
    const mergeActions = mergeView?.querySelector('.header-actions');
    if (!mergeActions) return;

    removeLetterEditorSurface();

    let button = document.getElementById('openAuthorizationFromMergeBtn');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'openAuthorizationFromMergeBtn';
      button.className = 'btn btn-secondary';
      button.textContent = '＋ Authorization';
      button.title = 'Add Authorization to Packet';
      const compress = document.getElementById('compressPacketBtn');
      mergeActions.insertBefore(button, compress || mergeActions.lastElementChild);
    }

    if (button.dataset.moAuthorizationActionBound !== 'true') {
      button.dataset.moAuthorizationActionBound = 'true';
      button.addEventListener('click', () => {
        window.authorizationAddDirectlyToPacket = true;
        openLetterTemplateModal();
        const apply = document.getElementById('letterTemplateApplyBtn');
        if (apply) apply.textContent = 'Add Authorization to Packet';
      });
    }

    installAuthorizationApplyHandler();

    document.getElementById('letterTemplateBureau')?.addEventListener('change', updateLetterTemplateModalAddress);
    document.getElementById('letterTemplateSelect')?.addEventListener('change', updateTemplateDeleteState);
    document.getElementById('deleteSavedTemplateBtn')?.addEventListener('click', () => {
      const id = document.getElementById('letterTemplateSelect')?.value;
      if (!id || id === 'authorization-default') return;
      const template = getTemplates().find(item => item.id === id);
      if (!template) return;
      if (!window.confirm(`Delete “${template.name}”?`)) return;
      saveTemplates(getTemplates().filter(item => item.id !== id));
      renderLetterTemplateOptions();
    });

    const reset = () => {
      window.authorizationAddDirectlyToPacket = false;
      const apply = document.getElementById('letterTemplateApplyBtn');
      if (apply) apply.textContent = 'Populate Letter';
    };
    document.getElementById('letterTemplateCancelBtn')?.addEventListener('click', reset);
    document.getElementById('letterTemplateCloseBtn')?.addEventListener('click', reset);
  }

  // Override the shared authorization/template hooks so this module owns the M&O workflow.
  window.AUTH_BUREAUS = AUTH_BUREAUS;
  window.DEFAULT_AUTH_TEMPLATE = DEFAULT_AUTH_TEMPLATE;
  window.getAuthTemplates = getTemplates;
  window.saveAuthTemplates = saveTemplates;
  window.getEasternToday = getEasternToday;
  window.formatAuthDate = formatAuthDate;
  window.renderLetterTemplateOptions = renderLetterTemplateOptions;
  window.updateLetterTemplateModalAddress = updateLetterTemplateModalAddress;
  window.openLetterTemplateModal = openLetterTemplateModal;
  window.closeLetterTemplateModal = closeLetterTemplateModal;
  window.applyTemplateToLetter = async () => {
    prepareAuthorizationEditor(buildAuthorizationHtml());
    closeLetterTemplateModal();
  };
  window.updateTemplateDeleteState = updateTemplateDeleteState;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuthorizationAction, { once: true });
  } else {
    setupAuthorizationAction();
  }
})();
