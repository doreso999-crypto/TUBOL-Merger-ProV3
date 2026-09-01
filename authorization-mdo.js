/* TUBOL — M&O Authorization only. */
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
I am mailing this through a mailing company as I can't physically go into postal office due to health issues. This is my authorization for you to process this dispute.<br><br>
This is not a third party agency or anyone else authorizing this dispute.<br><br>
Please do not deflect or not process my dispute for any such reason.<br>
Again, this is <strong>{{CLIENT_NAME}}</strong><br><br>
I authorize this dispute.
</div>`
  };

  const esc = value => String(value ?? '').replace(/[&<>'\"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));

  function isUsableTemplate(template) {
    return !!template && ((typeof template.html === 'string' && template.html.trim().length > 0) || (typeof template.content === 'string' && template.content.trim().length > 0));
  }

  function normalizeTemplate(template) {
    if (template?.id === DEFAULT_AUTH_TEMPLATE.id || !isUsableTemplate(template)) return DEFAULT_AUTH_TEMPLATE;
    return template;
  }

  function saveTemplates(list) {
    localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(list));
  }

  function getTemplates() {
    try {
      const stored = JSON.parse(localStorage.getItem('pdfWorkspaceAuthTemplates') || 'null');
      if (Array.isArray(stored) && stored.length) {
        const normalized = stored.map(normalizeTemplate);
        const result = normalized.some(item => item.id === DEFAULT_AUTH_TEMPLATE.id) ? normalized : [DEFAULT_AUTH_TEMPLATE, ...normalized];
        saveTemplates(result);
        return result;
      }
    } catch (error) {
      console.warn('Authorization template storage could not be read.', error);
    }
    const seeded = [DEFAULT_AUTH_TEMPLATE];
    saveTemplates(seeded);
    return seeded;
  }

  function getEasternToday() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function formatAuthDate(value) {
    if (!value) return '';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${month}/${day}/${year}` : String(value);
  }

  function renderTemplateOptions() {
    const select = document.getElementById('letterTemplateSelect');
    if (!select) return;
    select.innerHTML = '';
    getTemplates().forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    });
    updateTemplateDeleteState();
  }

  function updateBureauAddress() {
    const key = document.getElementById('letterTemplateBureau')?.value || 'equifax';
    const bureau = AUTH_BUREAUS[key] || AUTH_BUREAUS.equifax;
    const target = document.getElementById('letterTemplateBureauAddress');
    if (target) target.textContent = bureau.address.replace(/\n/g, ' • ');
  }

  function openModal() {
    const modal = document.getElementById('letterTemplateModal');
    if (!modal) return;
    renderTemplateOptions();
    const date = document.getElementById('letterTemplateDate');
    const bureau = document.getElementById('letterTemplateBureau');
    if (date && !date.value) date.value = getEasternToday();
    if (bureau && !bureau.value) bureau.value = 'equifax';
    updateBureauAddress();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    const modal = document.getElementById('letterTemplateModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function updateTemplateDeleteState() {
    const button = document.getElementById('deleteSavedTemplateBtn');
    const id = document.getElementById('letterTemplateSelect')?.value;
    if (button) button.disabled = !id || id === DEFAULT_AUTH_TEMPLATE.id;
  }

  function buildAuthorizationHtml() {
    const id = document.getElementById('letterTemplateSelect')?.value;
    const selected = getTemplates().find(item => item.id === id);
    const template = normalizeTemplate(selected);
    const name = (document.getElementById('letterTemplateClientName')?.value || '').trim() || 'Your Name';
    const date = formatAuthDate(document.getElementById('letterTemplateDate')?.value || getEasternToday());
    const bureau = AUTH_BUREAUS[document.getElementById('letterTemplateBureau')?.value] || AUTH_BUREAUS.equifax;
    const bureauAddressHtml = bureau.address.split('\n').map(esc).join('<br>');
    const templateHtml = typeof template.html === 'string' && template.html.trim()
      ? template.html
      : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.5">${esc(template.content || '').replace(/\n/g, '<br>')}</div>`;

    return templateHtml
      .replaceAll('{{CLIENT_NAME}}', esc(name))
      .replaceAll('{{DATE}}', esc(date))
      .replaceAll('{{BUREAU_NAME}}', esc(bureau.name))
      .replaceAll('{{BUREAU_ADDRESS_HTML}}', bureauAddressHtml)
      .replaceAll('{{BUREAU_ADDRESS}}', bureauAddressHtml);
  }

  function createPrintableHost(html) {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    Object.assign(host.style, {
      position: 'fixed',
      left: '-100000px',
      top: '0',
      width: '816px',
      boxSizing: 'border-box',
      padding: '96px',
      margin: '0',
      background: '#fff',
      color: '#000',
      pointerEvents: 'none',
      opacity: '1',
      visibility: 'visible',
      overflow: 'visible'
    });
    host.innerHTML = html;
    document.body.appendChild(host);
    return host;
  }

  async function createAuthorizationPdfBlob() {
    if (typeof window.html2pdf !== 'function') throw new Error('Authorization PDF engine unavailable.');
    const host = createPrintableHost(buildAuthorizationHtml());
    try {
      return await window.html2pdf().set({
        margin: 0,
        filename: 'AUTHORIZATION.pdf',
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: {
          scale: 2,
          backgroundColor: '#fff',
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 816
        },
        jsPDF: {
          unit: 'pt',
          format: 'letter',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['css', 'legacy']
        }
      }).from(host).outputPdf('blob');
    } finally {
      host.remove();
    }
  }

  async function addAuthorizationToPacket() {
    const blob = await createAuthorizationPdfBlob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const entries = Array.from({ length: pdf.getPageCount() }, (_, index) => ({
      id: crypto.randomUUID(),
      pdfBytes: bytes,
      sourceIndex: index,
      fileName: 'AUTHORIZATION.pdf',
      rotation: 0
    }));
    const existing = state.pages.findIndex(page => page.fileName === 'AUTHORIZATION.pdf');
    state.pages.splice(existing >= 0 ? existing + 1 : state.pages.length, 0, ...entries);
    await renderPageBoard();
    toast('Authorization added to packet', 'success');
  }

  function deleteSelectedTemplate() {
    const id = document.getElementById('letterTemplateSelect')?.value;
    if (!id || id === DEFAULT_AUTH_TEMPLATE.id) return;
    const template = getTemplates().find(item => item.id === id);
    if (!template) return;
    if (!window.confirm(`Delete “${template.name}”?`)) return;
    saveTemplates(getTemplates().filter(item => item.id !== id));
    renderTemplateOptions();
  }

  function setup() {
    const button = document.getElementById('openAuthorizationFromMergeBtn');
    if (button && button.dataset.bound !== 'true') {
      button.dataset.bound = 'true';
      button.addEventListener('click', openModal);
    }

    document.getElementById('letterTemplateCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('letterTemplateCancelBtn')?.addEventListener('click', closeModal);
    document.getElementById('letterTemplateApplyBtn')?.addEventListener('click', async () => {
      const apply = document.getElementById('letterTemplateApplyBtn');
      if (apply) apply.disabled = true;
      try {
        await addAuthorizationToPacket();
        closeModal();
      } catch (error) {
        console.error('M&O Authorization insertion failed.', error);
        toast(error?.message || 'Could not add authorization to packet', 'error');
      } finally {
        if (apply) apply.disabled = false;
      }
    });
    document.getElementById('letterTemplateBureau')?.addEventListener('change', updateBureauAddress);
    document.getElementById('letterTemplateSelect')?.addEventListener('change', updateTemplateDeleteState);
    document.getElementById('deleteSavedTemplateBtn')?.addEventListener('click', deleteSelectedTemplate);
    document.getElementById('letterTemplateModal')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeModal();
    });
  }

  Object.assign(window, {
    AUTH_BUREAUS,
    DEFAULT_AUTH_TEMPLATE,
    getAuthTemplates: getTemplates,
    saveAuthTemplates: saveTemplates,
    getEasternToday,
    formatAuthDate,
    renderLetterTemplateOptions: renderTemplateOptions,
    updateLetterTemplateModalAddress: updateBureauAddress,
    openLetterTemplateModal: openModal,
    closeLetterTemplateModal: closeModal,
    buildAuthorizationHtml,
    createAuthorizationPdfBlob,
    addAuthorizationToPacket,
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
