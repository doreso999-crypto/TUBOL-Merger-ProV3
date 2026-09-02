/* TUBOL — rebuilt authorization generator. */
(() => {
  'use strict';

  const AUTH_TEMPLATE_ID = 'authorization-test';
  const AUTH_TEMPLATE = {
    id: AUTH_TEMPLATE_ID,
    name: 'Authorization Test',
    html: '<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.5">Yes, it\'s generated.</div>'
  };

  function saveTemplates() {
    localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify([AUTH_TEMPLATE]));
  }

  function getTemplates() {
    saveTemplates();
    return [AUTH_TEMPLATE];
  }

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

  function renderTemplateOptions() {
    const select = document.getElementById('letterTemplateSelect');
    if (!select) return;

    select.innerHTML = '';
    for (const template of getTemplates()) {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    }

    const deleteButton = document.getElementById('deleteSavedTemplateBtn');
    if (deleteButton) deleteButton.disabled = true;
  }

  function updateBureauAddress() {
    const target = document.getElementById('letterTemplateBureauAddress');
    if (target) target.textContent = 'Template output intentionally contains no bureau address.';
  }

  function openModal() {
    const modal = document.getElementById('letterTemplateModal');
    if (!modal) return;

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
    const template = AUTH_TEMPLATE;
    return template.html;
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
    toast('Authorization added to packet', 'success');
  }

  function deleteSelectedTemplate() {
    // The rebuilt authorization generator intentionally has one fixed test template.
    return;
  }

  function setup() {
    // Clear any old authorization templates that may remain in browser storage.
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
    AUTH_TEMPLATE,
    DEFAULT_AUTH_TEMPLATE: AUTH_TEMPLATE,
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
