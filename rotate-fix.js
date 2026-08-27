/* Visual rotation fix for Merge & Organize page thumbnails. */
(function () {
  const rotations = new Map();
  const processed = new WeakMap();

  function isMergeView() {
    return document.querySelector('#mergeView')?.classList.contains('active-view') === true;
  }

  function selectedIds() {
    return Array.from(document.querySelectorAll('#pageGrid .page-card.selected'))
      .map(card => card.dataset.id)
      .filter(Boolean);
  }

  function rotateCanvasBitmap(canvas, degrees) {
    const normalized = ((degrees % 360) + 360) % 360;
    if (!canvas || !normalized) return;
    if (processed.get(canvas) === normalized) return;

    const source = document.createElement('canvas');
    source.width = canvas.width;
    source.height = canvas.height;
    const sourceCtx = source.getContext('2d');
    sourceCtx.drawImage(canvas, 0, 0);

    const swap = normalized === 90 || normalized === 270;
    const width = swap ? source.height : source.width;
    const height = swap ? source.width : source.height;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.save();
    if (normalized === 90) {
      ctx.translate(width, 0);
      ctx.rotate(Math.PI / 2);
    } else if (normalized === 180) {
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
    } else if (normalized === 270) {
      ctx.translate(0, height);
      ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(source, 0, 0);
    ctx.restore();

    // Let the thumbnail fit its box after 90°/270° rotation without clipping.
    canvas.style.transform = 'none';
    canvas.style.width = 'auto';
    canvas.style.height = 'auto';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    canvas.dataset.rotation = String(normalized);
    processed.set(canvas, normalized);
  }

  function applyVisualRotations() {
    if (!isMergeView()) return;
    document.querySelectorAll('#pageGrid .page-card').forEach(card => {
      const canvas = card.querySelector('.page-thumb canvas');
      if (!canvas) return;
      rotateCanvasBitmap(canvas, rotations.get(card.dataset.id) || 0);
    });
  }

  function syncAfterRender() {
    requestAnimationFrame(() => requestAnimationFrame(applyVisualRotations));
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#rotateLeftBtn');
    if (!button || !isMergeView()) return;

    // Capture selection before functions.js re-renders the board.
    selectedIds().forEach(id => {
      rotations.set(id, ((rotations.get(id) || 0) + 90) % 360);
    });
    syncAfterRender();
  }, true);

  document.addEventListener('click', event => {
    if (!event.target.closest('.sidebar-item')) return;
    syncAfterRender();
  });

  const grid = document.querySelector('#pageGrid');
  if (grid) {
    new MutationObserver(syncAfterRender).observe(grid, { childList: true });
  }

  window.addEventListener('load', syncAfterRender);
})();
