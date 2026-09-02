/* TUBOL — authorization generator shell with no built-in letter template. */
(() => {
  'use strict';

  function getEasternToday() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function formatAuthDate(value) {
    if (!value) return '';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${month}/${day}/${year}` : String(value);
  }

  function getTemplates() {
    // Intentionally empty. The UI remains available, but no authorization
    // letter template is preloaded or stored by the application.
    return [];
  }

  function saveTemplates() {
    localStorage.removeItem('pdfWorkspaceAuthTemplates');
  }

  function renderTemplateOptions() {
    const select = document.getElementById('letterTemplateSelect');
    if (!select) return;

    select.innerHTML = '';
    const templates = getTemplates();

    for (const template of templates) {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    }

    select.disabled = true;

    const deleteButton = document.getElementById('deleteSavedTemplateBtn');
    if (deleteButton) deleteButton.disabled = true;
  }

  function updateBureauAddress() {
    const target = document.getElementById('letterTemplateBureauAddress');
    if (!target) return;

    const bureau = document.getElementById('letterTemplateBureau')?.value;
    const addresses = {
      experian: 'Experian, P.O. Box 4500, Allen, TX 75013',
      equifax: 'Equifax Information Services LLC, P.O. Box 740256, Atlanta, GA 30374-0256',
      transunion: 'TransUnion Consumer Relations, P.O. Box 2000, Chester, PA 19016-2000'
    };

    target.textContent = addresses[bureau] || '';
  }

  function openModal() {
    const modal = document.getElementById('letterTemplateModal');
    if (!modal) return;

    saveTemplates();
    renderTemplateOptions();

    const date = document.getElementById('letterTemplateDate');
    if (date && !date.value) date.value = getEasternToday();

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
    if (button) button.disabled = true;
  }

  function buildAuthorizationHtml() {
    // No built-in letter template: generate an intentionally blank page.
    return '';
  }

  function createPrintableHost(html) {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    Object.assign(host.style, {
      position: 'fixed',
      left: '-100000px',
      top: '0',
      width: '816px',
      minHeight: '1056px',
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
    if (typeof window.html2pdf !== 'function') {
      throw new Error('Authorization PDF engine unavailable.');
    }

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
    toast('Blank authorization page added to packet', 'success');
  }

  function deleteSelectedTemplate() {
    saveTemplates();
  }

  function setup() {
    saveTemplates();

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
        console.error('Authorization insertion failed.', error);
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
    AUTH_TEMPLATE: null,
    DEFAULT_AUTH_TEMPLATE: null,
    AUTH_BUREAUS: {},
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
    addAuthorizationToPacket
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();