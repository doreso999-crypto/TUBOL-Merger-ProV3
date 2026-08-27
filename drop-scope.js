/* Restrict PDF drag-and-drop to Merge & Organize only. */
(function () {
  const mergeActive = () => document.querySelector('#mergeView')?.classList.contains('active-view') === true;
  const fileDrag = e => !!e.dataTransfer && (Array.from(e.dataTransfer.types || []).includes('Files') || e.dataTransfer.files?.length > 0);
  const overlay = () => document.querySelector('#globalDropOverlay');
  const hide = () => { const el = overlay(); el?.classList.remove('show'); el?.setAttribute('aria-hidden','true'); };
  const show = () => { const el = overlay(); el?.classList.add('show'); el?.setAttribute('aria-hidden','false'); };
  let depth = 0;

  document.addEventListener('dragenter', e => {
    if (!fileDrag(e)) return;
    e.preventDefault();
    if (!mergeActive()) return hide();
    depth += 1; show();
  }, true);

  document.addEventListener('dragover', e => {
    if (!fileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!mergeActive()) return hide();
    e.dataTransfer.dropEffect = 'copy'; show();
  }, true);

  document.addEventListener('dragleave', e => {
    if (!fileDrag(e)) return;
    e.preventDefault();
    if (!mergeActive()) return hide();
    depth = Math.max(0, depth - 1);
    if (!depth) hide();
  }, true);

  document.addEventListener('drop', async e => {
    if (!fileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    hide();
    if (!mergeActive()) return;
    if (typeof window.addPdfFiles === 'function') await window.addPdfFiles(e.dataTransfer.files);
  }, true);

  window.addEventListener('blur', hide);
})();
