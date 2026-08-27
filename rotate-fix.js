/* Visual rotation fix for Merge & Organize page thumbnails. */
(function () {
  const rotations = new Map();

  function isMergeView() {
    return document.querySelector('#mergeView')?.classList.contains('active-view') === true;
  }

  function selectedIds() {
    return Array.from(document.querySelectorAll('#pageGrid .page-card.selected'))
      .map(card => card.dataset.id)
      .filter(Boolean);
  }

  function applyVisualRotations() {
    if (!isMergeView()) return;
    document.querySelectorAll('#pageGrid .page-card').forEach(card => {
      const canvas = card.querySelector('.page-thumb canvas');
      if (!canvas) return;
      const rotation = ((rotations.get(card.dataset.id) || 0) + 360) % 360;
      canvas.style.transform = rotation ? `rotate(${rotation}deg)` : 'none';
      canvas.style.transformOrigin = 'center center';
      canvas.dataset.rotation = String(rotation);
    });
  }

  function syncAfterRender() {
    requestAnimationFrame(() => requestAnimationFrame(applyVisualRotations));
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#rotateLeftBtn');
    if (!button || !isMergeView()) return;

    // Capture selection before functions.js re-renders the board.
    const ids = selectedIds();
    ids.forEach(id => rotations.set(id, ((rotations.get(id) || 0) + 90) % 360));
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
