/* M&O runtime wiring only. Retired Letter Editor startup is intentionally not called. */
(() => {
  'use strict';

  function bind(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }

  function initMdoRuntime() {
    bind('addPdfBtn', 'click', () => document.getElementById('pdfInput')?.click());
    bind('pdfInput', 'change', () => {
      const input = document.getElementById('pdfInput');
      if (!input) return;
      addPdfFiles(input.files);
      input.value = '';
    });
    if (typeof wireDropZone === 'function' && typeof addPdfFiles === 'function') {
      const dropZone = document.getElementById('dropZone');
      if (dropZone) wireDropZone(dropZone, addPdfFiles);
    }

    bind('mergeExportBtn', 'click', () => mergePages(state.pages));
    bind('saveExportCloseBtn', 'click', closeSaveExportModal);
    bind('saveExportCancelBtn', 'click', closeSaveExportModal);
    bind('saveExportConfirmBtn', 'click', confirmMergeExport);
    bind('saveExportModal', 'click', event => {
      if (event.target.id === 'saveExportModal') closeSaveExportModal();
    });

    bind('compressPacketBtn', 'click', openPacketCompressionPanel);
    bind('packetCompressCloseBtn', 'click', closePacketCompressionPanel);
    bind('packetCompressBtn', 'click', compressPacket);

    bind('rotateLeftBtn', 'click', rotateSelected);
    bind('duplicatePageBtn', 'click', duplicateSelected);
    bind('deletePageBtn', 'click', deleteSelected);
    bind('clearAllBtn', 'click', () => {
      state.pages = [];
      state.selected.clear();
      renderPageBoard();
    });

    bind('previewCloseBtn', 'click', closePagePreview);
    bind('previewZoomOutBtn', 'click', () => setPreviewZoom(0.85));
    bind('previewZoomInBtn', 'click', () => setPreviewZoom(1.18));
    bind('previewFitBtn', 'click', () => {
      state.preview.scale = 1.1;
      renderPreviewCanvas();
    });
    bind('pdfPreviewModal', 'click', event => {
      if (event.target.id === 'pdfPreviewModal') closePagePreview();
    });

    document.addEventListener('keydown', event => {
      if (document.getElementById('saveExportModal')?.classList.contains('open') && event.key === 'Escape') {
        closeSaveExportModal();
        return;
      }
      if (document.getElementById('pdfPreviewModal')?.classList.contains('open') && event.key === 'Escape') {
        closePagePreview();
      }
    });

    setupGlobalPdfDrop();
    renderPageBoard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMdoRuntime, { once: true });
  } else {
    initMdoRuntime();
  }
})();
