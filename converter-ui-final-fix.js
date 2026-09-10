/* Final converter UI guard. Keeps one Convert action and prevents legacy converter controls. */
(() => {
  'use strict';

  function getPacketFiles() {
    const pages = Array.isArray(window.state?.pages) ? window.state.pages : [];
    const seen = new Set();
    const files = [];

    for (const entry of pages) {
      if (!entry?.pdfBytes?.buffer || seen.has(entry.pdfBytes.buffer)) continue;
      seen.add(entry.pdfBytes.buffer);
      const original = String(entry.fileName || 'document.pdf');
      const name = original.toLowerCase().endsWith('.pdf') ? original : `${original}.pdf`;
      files.push(new File([entry.pdfBytes], name, { type: 'application/pdf' }));
    }
    return files;
  }

  function setInputFiles(files) {
    const input = document.getElementById('converterFileInput');
    if (!input) return;
    try {
      const transfer = new DataTransfer();
      files.forEach(file => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {
      console.error('Converter packet file setup failed.', error);
    }
  }

  function syncLegacyControls() {
    document.querySelectorAll('#pdfToJpgBtn, #jpgToPdfBtn').forEach(el => el.remove());
    const topConvert = document.querySelector('.top-actions #convertBtn');
    if (topConvert) topConvert.style.setProperty('display', 'none', 'important');
  }

  function syncPdfMode() {
    const browse = document.getElementById('converterBrowseBtn');
    if (browse) browse.style.setProperty('display', 'none', 'important');

    const title = document.getElementById('converterDropTitle');
    const subtitle = document.getElementById('converterDropSubtitle');
    if (title) title.textContent = 'Convert PDFs from the packet';
    if (subtitle) subtitle.textContent = 'The PDFs already in your page board will be converted in their current packet order.';

    const files = getPacketFiles();
    if (files.length) setInputFiles(files);
  }

  function syncJpgMode() {
    const browse = document.getElementById('converterBrowseBtn');
    if (browse) {
      browse.style.removeProperty('display');
      browse.textContent = 'Choose JPG files';
    }
  }

  function bindTabs() {
    const pdfTab = document.getElementById('converterPdfToJpgTab');
    const jpgTab = document.getElementById('converterJpgToPdfTab');
    if (!pdfTab || !jpgTab || pdfTab.dataset.finalFixBound) return;

    pdfTab.addEventListener('click', () => setTimeout(syncPdfMode, 0));
    jpgTab.addEventListener('click', () => setTimeout(syncJpgMode, 0));
    pdfTab.dataset.finalFixBound = 'true';
  }

  function routeConvertClick(event) {
    const button = event.target.closest('.header-actions #convertBtn');
    if (!button) return;

    const fallback = document.querySelector('.top-actions #convertBtn');
    if (fallback && fallback !== button) {
      event.preventDefault();
      event.stopImmediatePropagation();
      fallback.click();
    }

    setTimeout(() => {
      const modal = document.getElementById('converterModal');
      if (!modal) return;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      bindTabs();
      syncPdfMode();
    }, 0);
  }

  function enforce() {
    syncLegacyControls();
    bindTabs();
  }

  function init() {
    const style = document.createElement('style');
    style.id = 'converter-ui-final-fix-style';
    style.textContent = `
      #pdfToJpgBtn, #jpgToPdfBtn { display: none !important; }
      .top-actions #convertBtn { display: none !important; }
      .converter-modal { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
    `;
    document.head.appendChild(style);

    document.addEventListener('click', routeConvertClick, true);
    enforce();

    const observer = new MutationObserver(enforce);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
