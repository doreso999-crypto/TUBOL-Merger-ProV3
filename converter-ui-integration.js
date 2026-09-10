/* TUBOL PDF Workspace — integrate one Convert action into the packet action row. */
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
      const originalName = String(entry.fileName || 'document.pdf');
      const filename = originalName.toLowerCase().endsWith('.pdf') ? originalName : `${originalName}.pdf`;
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

  function showPdfModeUi() {
    const browse = document.getElementById('converterBrowseBtn');
    const title = document.getElementById('converterDropTitle');
    const subtitle = document.getElementById('converterDropSubtitle');
    if (browse) browse.style.display = 'none';
    if (title) title.textContent = 'Convert PDFs from the packet';
    if (subtitle) subtitle.textContent = 'The PDFs already in your page board will be converted in their current packet order.';
  }

  function showJpgModeUi() {
    const browse = document.getElementById('converterBrowseBtn');
    const title = document.getElementById('converterDropTitle');
    const subtitle = document.getElementById('converterDropSubtitle');
    if (browse) browse.style.display = '';
    if (title) title.textContent = 'Drop JPG files here';
    if (subtitle) subtitle.textContent = 'Select images in the order you want them to appear in the PDF.';
  }

  function activatePdfToJpg() {
    const pdfTab = document.getElementById('converterPdfToJpgTab');
    const input = document.getElementById('converterFileInput');
    if (!pdfTab || !input) return false;

    pdfTab.click();
    showPdfModeUi();

    const files = getPageFilesFromPacket();
    if (!files.length) {
      window.toast?.('Add PDF files to the packet first.', 'error');
      return false;
    }

    return setInputFiles(input, files);
  }

  function activateJpgToPdf() {
    const jpgTab = document.getElementById('converterJpgToPdfTab');
    if (!jpgTab) return false;
    jpgTab.click();
    showJpgModeUi();
    return true;
  }

  function openConverter() {
    const modal = document.getElementById('converterModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    requestAnimationFrame(() => {
      const pdfTab = document.getElementById('converterPdfToJpgTab');
      pdfTab?.click();
      showPdfModeUi();

      const files = getPageFilesFromPacket();
      if (files.length) {
        const input = document.getElementById('converterFileInput');
        setInputFiles(input, files);
      }
    });
  }

  function ensureActionButton() {
    const actions = document.querySelector('.header-actions');
    const compressButton = document.getElementById('compressPacketBtn');
    if (!actions || !compressButton) return;

    document.getElementById('pdfToJpgBtn')?.remove();
    document.getElementById('jpgToPdfBtn')?.remove();
    document.querySelector('.top-actions #convertBtn')?.remove();

    const button = document.getElementById('convertBtn') || document.createElement('button');
    button.id = 'convertBtn';
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.textContent = 'Convert';
    button.title = 'Convert PDF ↔ JPG';

    if (!button.dataset.converterBound) {
      button.addEventListener('click', openConverter);
      button.dataset.converterBound = 'true';
    }

    actions.insertBefore(button, compressButton);
  }

  function injectNoBlurStyle() {
    const id = 'converter-no-blur-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = '.converter-modal { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }';
    document.head.appendChild(style);
  }

  function init() {
    injectNoBlurStyle();
    ensureActionButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
