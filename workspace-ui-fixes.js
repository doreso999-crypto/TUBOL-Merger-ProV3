/* M&O rendering stability, rotation, and theme cleanup fixes. */
(() => {
  const pdfDocumentPromises = new WeakMap();

  function stablePdfDocument(bytes) {
    if (!bytes || !bytes.buffer) throw new Error('PDF data unavailable.');
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const key = source.buffer;

    if (pdfDocumentPromises.has(key)) return pdfDocumentPromises.get(key);

    // Give PDF.js a private copy. Its worker may transfer/detach its input buffer.
    const workerBytes = new Uint8Array(source);
    const promise = pdfjsLib.getDocument({
      data: workerBytes,
      useWorkerFetch: true,
      isEvalSupported: true,
      verbosity: 0,
      disableAutoFetch: false,
      disableStream: false,
    }).promise.catch(async err => {
      // Keep the fallback independent from the first worker buffer.
      const fallbackBytes = new Uint8Array(source);
      return pdfjsLib.getDocument({
        data: fallbackBytes,
        disableWorker: true,
        verbosity: 0,
      }).promise.catch(() => { throw err; });
    });

    pdfDocumentPromises.set(key, promise);
    return promise;
  }

  function installStablePdfDocumentLoader() {
    window.getPdfJsDocument = function getPdfJsDocumentStable(bytes) {
      return stablePdfDocument(bytes);
    };
  }

  function installRotationRenderer() {
    window.renderPageThumb = async function renderPageThumbStable(pageEntry, canvas) {
      const container = canvas?.parentElement;
      const placeholder = container?.querySelector('.thumb-loading');
      if (!container || !canvas) return;

      try {
        await new Promise(requestAnimationFrame);
        const pdf = await stablePdfDocument(pageEntry.pdfBytes);
        const page = await pdf.getPage(pageEntry.sourceIndex + 1);
        const rotation = ((pageEntry.rotation || 0) % 360 + 360) % 360;
        const width = Math.max(130, container.clientWidth || 180);
        const base = page.getViewport({ scale: 1, rotation });
        const scale = Math.min(width / base.width, 1.35);
        const viewport = page.getViewport({ scale, rotation });
        const ratio = Math.min(2, window.devicePixelRatio || 1);

        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.transform = 'none';
        canvas.style.transformOrigin = 'center center';

        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        const task = page.render({ canvasContext: ctx, viewport, intent: 'display' });
        await task.promise;
        container.classList.add('rendered');
        if (placeholder) placeholder.textContent = '';
      } catch (err) {
        console.error('PDF thumbnail render failed', err);
        if (placeholder) {
          placeholder.textContent = 'Preview unavailable';
          placeholder.style.animation = 'none';
        }
      }
    };
  }

  function removeAdventureTheme() {
    const select = document.getElementById('themeSelect');
    if (select) select.querySelector('option[value="adventure"]')?.remove();
    if (localStorage.getItem('pdfWorkspaceTheme') === 'adventure') {
      localStorage.setItem('pdfWorkspaceTheme', 'light');
    }
  }

  // functions.js is loaded near the end of <body>; installing now updates the
  // global bindings before the core DOMContentLoaded initializer runs.
  installStablePdfDocumentLoader();
  installRotationRenderer();
  removeAdventureTheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeAdventureTheme, { once: true });
  }
})();
