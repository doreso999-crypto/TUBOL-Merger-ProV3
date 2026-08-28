/* M&O-only PDF drag/drop guard. Loaded after functions.js so it can replace the global drop setup before DOMContentLoaded. */
window.setupGlobalPdfDrop = function setupGlobalPdfDrop() {
  const overlay = document.getElementById('globalDropOverlay');
  const mergeView = document.getElementById('mergeView');
  if (!overlay || !mergeView) return;

  let dragDepth = 0;
  const hasFiles = e => Array.from(e.dataTransfer?.types || []).includes('Files');
  const isMAndOActive = () => mergeView.classList.contains('active-view');
  const show = () => {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
  };
  const hide = () => {
    dragDepth = 0;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  };

  document.addEventListener('dragenter', e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (!isMAndOActive()) return hide();
    dragDepth += 1;
    show();
  });

  document.addEventListener('dragover', e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = isMAndOActive() ? 'copy' : 'none';
    if (!isMAndOActive()) return hide();
    show();
  });

  document.addEventListener('dragleave', e => {
    if (!hasFiles(e)) return;
    if (!isMAndOActive()) return hide();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) hide();
  });

  document.addEventListener('drop', async e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    const shouldAdd = isMAndOActive();
    hide();
    if (shouldAdd) await addPdfFiles(e.dataTransfer.files);
  });

  window.addEventListener('blur', hide);
};
