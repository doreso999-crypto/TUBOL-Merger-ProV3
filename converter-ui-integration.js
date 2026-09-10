/* TUBOL PDF Workspace — integrate PDF/JPG conversion into the packet action row. */
(() => {
  'use strict';

  function getPageFilesFromPacket() {
    const pages = Array.isArray(window.state?.pages) ? window.state.pages : [];
    if (!pages.length) return [];

    const seenBuffers = new Set();
    const files = [];

    for (const entry of pages) {
      if (!entry?.pdfBytes?.buffer || seenBuffers.has(entry.pdfBytes.buffer)) continue;
      seenBuffers.add(entry.pdfBytes.buffer);
      const filename = String(entry.fileName || 'document.pdf').toLowerCase().endsWith('.pdf')
        ? String(entry.fileName || 'document.pdf')
        : `${entry.fileName || 'document'}.pdf`;
      files.push(new File([entry.pdfBytes], filename, { type: 'application/pdf' }));
    }
    return files;
  }

  function setInputFiles(input, files) {
    if (!input) return false;
    try {
      const transfer = new DataTransfer();
      files.forEach(file => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (error) {
      console.error('Could not populate converter files.', error);
      return false;
    }
  }

  function activatePdfToJpg() {
    const modal = document.getElementById('converterModal');
    const pdfTab = document.getElementById('converterPdfToJpgTab');
    const input = document.getElementById('converterFileInput');
    if (!modal || !pdfTab || !input) return false;

    pdfTab.click();
    const files = getPageFilesFromPacket();
    if (!files.length) {
      window.toast?.('Drop PDF files into the packet first.', 'error');
      return false;
    }

    setInputFiles(input, files);
    return true;
  }

  function activateJpgToPdf() {
    const modal = document.getElementById('converterModal');
    const jpgTab = document.getElementById('converterJpgToPdfTab');
    if (!modal || !jpgTab) return false;
    jpgTab.click();
    return true;
  }

  function openConverterForPdfToJpg() {
    const oldConvertButton = document.getElementById('convertBtn');
    oldConvertButton?.remove();

    const modal = document.getElementById('converterModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    requestAnimationFrame(() => activatePdfToJpg());
  }

  function openConverterForJpgToPdf() {
    const oldConvertButton = document.getElementById('convertBtn');
    oldConvertButton?.remove();

    const modal = document.getElementById('converterModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    requestAnimationFrame(() => activateJpgToPdf());
  }

  function ensureActionButtons() {
    const actions = document.querySelector('.header-actions');
    if (!actions) return;

    document.getElementById('convertBtn')?.remove();

    const compressButton = document.getElementById('compressPacketBtn');
    const mergeButton = document.getElementById('mergeExportBtn');
    if (!compressButton || !mergeButton) return;

    let pdfButton = document.getElementById('pdfToJpgBtn');
    let jpgButton = document.getElementById('jpgToPdfBtn');

    if (!pdfButton) {
      pdfButton = document.createElement('button');
      pdfButton.id = 'pdfToJpgBtn';
      pdfButton.type = 'button';
      pdfButton.className = 'btn btn-secondary';
      pdfButton.textContent = 'PDF → JPG';
      pdfButton.title = 'Convert the PDFs currently in the packet to JPG images';
      pdfButton.addEventListener('click', openConverterForPdfToJpg);
    }

    if (!jpgButton) {
      jpgButton = document.createElement('button');
      jpgButton.id = 'jpgToPdfBtn';
      jpgButton.type = 'button';
      jpgButton.className = 'btn btn-secondary';
      jpgButton.textContent = 'JPG → PDF';
      jpgButton.title = 'Convert JPG images to a PDF';
      jpgButton.addEventListener('click', openConverterForJpgToPdf);
    }

    actions.insertBefore(pdfButton, compressButton);
    actions.insertBefore(jpgButton, compressButton);
  }

  function init() {
    ensureActionButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
