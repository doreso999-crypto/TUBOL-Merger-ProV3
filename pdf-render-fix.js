/* Stable PDF.js thumbnail rendering.
   Loaded after functions.js so the existing PDF/page logic remains intact.
   The fix prevents PDF.js worker transfer from consuming the shared source
   Uint8Array and reuses one in-flight PDF document per source buffer. */
(() => {
  const documentCache = new Map();

  function getStablePdfDocument(bytes) {
    const key = bytes?.buffer;
    if (!key) return Promise.reject(new Error('PDF bytes are unavailable.'));

    const existing = documentCache.get(key);
    if (existing) return existing;

    // PDF.js may transfer the ArrayBuffer to its worker. Always give the
    // worker an independent copy so the source bytes remain reusable by
    // every page entry and by pdf-lib later in the workflow.
    const workerBytes = new Uint8Array(bytes);
    const promise = pdfjsLib.getDocument({
      data: workerBytes,
      useWorkerFetch: true,
      isEvalSupported: true,
      verbosity: 0,
      disableAutoFetch: false,
      disableStream: false,
    }).promise;

    documentCache.set(key, promise);
    promise.catch(() => documentCache.delete(key));
    return promise;
  }

  window.renderPageThumb = async function renderPageThumbStable(pageEntry, canvas) {
    const container = canvas.parentElement;
    const placeholder = container.querySelector('.thumb-loading');

    try {
      await new Promise(requestAnimationFrame);
      const pdf = await getStablePdfDocument(pageEntry.pdfBytes);
      const page = await pdf.getPage(pageEntry.sourceIndex + 1);
      const width = Math.max(130, container.clientWidth || 180);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(width / base.width, 1.35);
      const viewport = page.getViewport({ scale });
      const ratio = Math.min(2, window.devicePixelRatio || 1);

      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, viewport.width, viewport.height);

      await page.render({
        canvasContext: ctx,
        viewport,
        intent: 'display',
      }).promise;

      container.classList.add('rendered');
      if (placeholder) {
        placeholder.textContent = '';
        placeholder.style.animation = '';
      }
    } catch (err) {
      console.error('PDF thumbnail render failed', err);
      if (placeholder) {
        placeholder.textContent = 'Preview unavailable';
        placeholder.style.animation = 'none';
      }
    }
  };
})();
