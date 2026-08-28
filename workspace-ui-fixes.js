/* M&O rotation + theme cleanup fixes. */
(() => {
  function installRotationRenderer() {
    if (typeof window.getPdfJsDocument !== 'function') return;

    window.renderPageThumb = async function renderPageThumb(pageEntry, canvas) {
      const container = canvas?.parentElement;
      const placeholder = container?.querySelector('.thumb-loading');
      if (!container || !canvas) return;

      try {
        await new Promise(requestAnimationFrame);
        const pdf = await window.getPdfJsDocument(pageEntry.pdfBytes);
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
    const option = select?.querySelector('option[value="adventure"]');
    option?.remove();

    if (localStorage.getItem('pdfWorkspaceTheme') === 'adventure') {
      localStorage.setItem('pdfWorkspaceTheme', 'light');
    }
  }

  function setup() {
    removeAdventureTheme();
    installRotationRenderer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
