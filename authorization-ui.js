/* M&O Authorization workflow.
   This file owns the Authorization template, modal, and packet insertion.
   It does not depend on the visible Letter Editor.
*/
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
</div>`,
  };

  window.AUTH_BUREAUS = AUTH_BUREAUS;
  window.AUTHORIZATION_DEFAULT_TEMPLATE = DEFAULT_AUTH_TEMPLATE;

  const q = (selector) => document.querySelector(selector);
  const esc = (value) => {
    const text = String(value ?? '');
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(text);
    return text.replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch]);
  };

  function getEasternToday() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function formatAuthDate(value) {
    if (!value) return '';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${month}/${day}/${year}` : String(value);
  }

  function getAuthTemplates() {
    try {
      const stored = JSON.parse(localStorage.getItem('pdfWorkspaceAuthTemplates') || 'null');
      if (Array.isArray(stored) && stored.length) {
        const migrated = stored.map((template) => template?.id === DEFAULT_AUTH_TEMPLATE.id ? DEFAULT_AUTH_TEMPLATE : template);
        localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(migrated));
        return migrated;
      }
    } catch (error) {
      console.warn('Could not read authorization templates.', error);
    }
    const seeded = [DEFAULT_AUTH_TEMPLATE];
    localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(seeded));
    return seeded;
  }

  function saveAuthTemplates(list) {
    localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(list));
  }

  window.getAuthTemplates = getAuthTemplates;
  window.saveAuthTemplates = saveAuthTemplates;
  window.getEasternToday = getEasternToday;
  window.formatAuthDate = formatAuthDate;

  function renderTemplateOptions() {
    const select = q('#letterTemplateSelect');
    if (!select) return;
    const templates = getAuthTemplates();
    select.innerHTML = '';
    templates.forEach((template) => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    });
    updateTemplateDeleteState();
  }

  function updateTemplateDeleteState() {
    const button = q('#deleteSavedTemplateBtn');
    const selectedId = q('#letterTemplateSelect')?.value;
    if (button) button.disabled = !selectedId || selectedId === DEFAULT_AUTH_TEMPLATE.id;
  }

  function updateBureauAddress() {
    const key = q('#letterTemplateBureau')?.value || 'equifax';
    const bureau = AUTH_BUREAUS[key] || AUTH_BUREAUS.equifax;
    const target = q('#letterTemplateBureauAddress');
    if (target) target.textContent = bureau.address.replace(/\n/g, ' • ');
  }

  function openLetterTemplateModal() {
    renderTemplateOptions();
    const date = q('#letterTemplateDate');
    if (date && !date.value) date.value = getEasternToday();
    const bureau = q('#letterTemplateBureau');
    if (bureau && !bureau.value) bureau.value = 'equifax';
    updateBureauAddress();
    const modal = q('#letterTemplateModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeLetterTemplateModal() {
    const modal = q('#letterTemplateModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    window.authorizationAddDirectlyToPacket = false;
  }

  window.openLetterTemplateModal = openLetterTemplateModal;
  window.closeLetterTemplateModal = closeLetterTemplateModal;

  function fillTemplate(template, name, date, bureau) {
    const addressHtml = bureau.address.split('\n').map(esc).join('<br>');
    const source = template?.html || DEFAULT_AUTH_TEMPLATE.html;
    return source
      .replaceAll('{{CLIENT_NAME}}', esc(name))
      .replaceAll('{{DATE}}', esc(date))
      .replaceAll('{{BUREAU_NAME}}', esc(bureau.name))
      .replaceAll('{{BUREAU_ADDRESS_HTML}}', addressHtml)
      .replaceAll('{{BUREAU_ADDRESS}}', addressHtml);
  }

  function createPrintableHost(html) {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-100000px';
    host.style.top = '0';
    host.style.width = '612pt';
    host.style.background = '#fff';
    host.style.padding = '72pt';
    host.style.boxSizing = 'border-box';
    host.innerHTML = html;
    document.body.appendChild(host);
    return host;
  }

  async function createAuthorizationPdfBlob(html) {
    if (typeof window.html2pdf !== 'function') throw new Error('Authorization PDF engine unavailable.');
    const host = createPrintableHost(html);
    try {
      return await window.html2pdf().set({
        margin: 0,
        filename: 'AUTHORIZATION.pdf',
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, backgroundColor: '#fff', useCORS: true },
        pagebreak: { mode: ['css', 'legacy'] },
        jsPDF: { unit: 'pt', format: 'letter', orientation: 'portrait' },
      }).from(host).outputPdf('blob');
    } finally {
      host.remove();
    }
  }

  async function addAuthorizationToPacket() {
    if (!window.PDFLib) throw new Error('PDF engine unavailable.');
    if (typeof state === 'undefined' || !Array.isArray(state.pages)) throw new Error('Packet state unavailable.');

    const templateId = q('#letterTemplateSelect')?.value;
    const template = getAuthTemplates().find((item) => item.id === templateId) || getAuthTemplates()[0];
    if (!template) throw new Error('No authorization template is available.');

    const clientName = (q('#letterTemplateClientName')?.value || '').trim() || 'Your Name';
    const rawDate = q('#letterTemplateDate')?.value || getEasternToday();
    const date = formatAuthDate(rawDate);
    const bureauKey = q('#letterTemplateBureau')?.value || 'equifax';
    const bureau = AUTH_BUREAUS[bureauKey] || AUTH_BUREAUS.equifax;
    const html = fillTemplate(template, clientName, date, bureau);

    const blob = await createAuthorizationPdfBlob(html);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const count = pdf.getPageCount();

    const existingIndex = state.pages.findIndex((entry) => entry.fileName === 'AUTHORIZATION.pdf');
    const insertIndex = existingIndex >= 0 ? existingIndex + 1 : state.pages.length;
    const entries = Array.from({ length: count }, (_, index) => ({
      id: crypto.randomUUID(),
      pdfBytes: bytes,
      sourceIndex: index,
      fileName: 'AUTHORIZATION.pdf',
      rotation: 0,
    }));

    state.pages.splice(insertIndex, 0, ...entries);
    if (typeof window.renderPageBoard === 'function') await window.renderPageBoard();
    closeLetterTemplateModal();
    if (typeof window.toast === 'function') window.toast('Authorization added to packet', 'success');
  }

  function installMOWorkflow() {
    const mergeView = q('#mergeView');
    const mergeActions = mergeView?.querySelector('.header-actions');
    const modal = q('#letterTemplateModal');
    if (!mergeActions || !modal) return;

    let button = q('#openAuthorizationFromMergeBtn');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.id = 'openAuthorizationFromMergeBtn';
      button.title = 'Add Authorization to Packet';
      button.textContent = '＋ Authorization';
      const compressButton = q('#compressPacketBtn');
      mergeActions.insertBefore(button, compressButton || mergeActions.lastElementChild);
    }

    if (button.dataset.authorizationBound !== 'true') {
      button.dataset.authorizationBound = 'true';
      button.addEventListener('click', () => {
        window.authorizationAddDirectlyToPacket = true;
        const apply = q('#letterTemplateApplyBtn');
        if (apply) apply.textContent = 'Add Authorization to Packet';
        openLetterTemplateModal();
      });
    }

    // Replace legacy handlers with one clean M&O handler.
    const apply = q('#letterTemplateApplyBtn');
    if (apply && apply.dataset.moAuthorizationBound !== 'true') {
      const replacement = apply.cloneNode(true);
      replacement.dataset.moAuthorizationBound = 'true';
      apply.replaceWith(replacement);
      replacement.addEventListener('click', async () => {
        if (!window.authorizationAddDirectlyToPacket) return;
        window.authorizationAddDirectlyToPacket = false;
        replacement.disabled = true;
        try {
          await addAuthorizationToPacket();
        } catch (error) {
          console.error('M&O Authorization insertion failed', error);
          if (typeof window.toast === 'function') window.toast(error?.message || 'Could not add authorization to packet', 'error');
        } finally {
          replacement.disabled = false;
          replacement.textContent = 'Populate Letter';
        }
      });
    }

    q('#letterTemplateCancelBtn')?.addEventListener('click', closeLetterTemplateModal);
    q('#letterTemplateCloseBtn')?.addEventListener('click', closeLetterTemplateModal);
    q('#letterTemplateBureau')?.addEventListener('change', updateBureauAddress);
    q('#letterTemplateSelect')?.addEventListener('change', updateTemplateDeleteState);
    q('#letterTemplateModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'letterTemplateModal') closeLetterTemplateModal();
    });
    q('#deleteSavedTemplateBtn')?.addEventListener('click', () => {
      const id = q('#letterTemplateSelect')?.value;
      if (!id || id === DEFAULT_AUTH_TEMPLATE.id) return;
      const templates = getAuthTemplates();
      const selected = templates.find((item) => item.id === id);
      if (!selected) return;
      if (!window.confirm(`Delete “${selected.name}”?`)) return;
      saveAuthTemplates(templates.filter((item) => item.id !== id));
      renderTemplateOptions();
      if (typeof window.toast === 'function') window.toast(`Deleted template: ${selected.name}`, 'success');
    });
  }

  function init() {
    installMOWorkflow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
