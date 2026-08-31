/* M&O-only PDF drag/drop handling. */
(() => {
  function bindPdfDrop() {
    if (window.__tubolPdfDropBound) return;

    const overlay = document.getElementById('globalDropOverlay');
    const mergeView = document.getElementById('mergeView');
    const dropZone = document.getElementById('dropZone');
    const pdfInput = document.getElementById('pdfInput');

    if (!overlay || !mergeView || typeof window.addPdfFiles !== 'function') return;

    window.__tubolPdfDropBound = true;

    let dragDepth = 0;
    const hasFiles = event => {
      const types = Array.from(event.dataTransfer?.types || []);
      return types.includes('Files') || Boolean(event.dataTransfer?.files?.length);
    };
    const isMAndOActive = () => mergeView.classList.contains('active-view');
    const showOverlay = () => {
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden', 'false');
    };
    const hideOverlay = () => {
      dragDepth = 0;
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      dropZone?.classList.remove('dragover');
    };
    const acceptDrop = async files => {
      if (!files?.length || !isMAndOActive()) return;
      await window.addPdfFiles(files);
    };

    if (dropZone) {
      dropZone.addEventListener('click', event => {
        if (event.target.closest('button, input, select, a')) return;
        pdfInput?.click();
      });

      dropZone.addEventListener('dragenter', event => {
        if (!hasFiles(event) || !isMAndOActive()) return;
        event.preventDefault();
        event.stopPropagation();
        dragDepth += 1;
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragover', event => {
        if (!hasFiles(event) || !isMAndOActive()) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
        dropZone.classList.add('dragover');
      });

      dropZone.addEventListener('dragleave', event => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth = Math.max(0, dragDepth - 1);
        if (!dragDepth) dropZone.classList.remove('dragover');
      });

      dropZone.addEventListener('drop', async event => {
        if (!hasFiles(event) || !isMAndOActive()) return;
        event.preventDefault();
        event.stopPropagation();
        const files = event.dataTransfer.files;
        hideOverlay();
        await acceptDrop(files);
      });
    }

    document.addEventListener('dragenter', event => {
      if (!hasFiles(event)) return;
      if (!isMAndOActive()) {
        hideOverlay();
        return;
      }
      event.preventDefault();
      dragDepth += 1;
      showOverlay();
    }, true);

    document.addEventListener('dragover', event => {
      if (!hasFiles(event)) return;
      if (!isMAndOActive()) {
        hideOverlay();
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      showOverlay();
    }, true);

    document.addEventListener('dragleave', event => {
      if (!hasFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) hideOverlay();
    }, true);

    document.addEventListener('drop', async event => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const files = event.dataTransfer.files;
      const shouldAdd = isMAndOActive();
      hideOverlay();
      if (shouldAdd) await acceptDrop(files);
    }, true);

    window.addEventListener('blur', hideOverlay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindPdfDrop, { once: true });
  } else {
    bindPdfDrop();
  }
})();
