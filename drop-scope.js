/* Restrict global PDF drag-and-drop to the Merge & Organize view. */
window.setupGlobalPdfDrop = function setupGlobalPdfDrop() {
  const overlay = document.querySelector('#globalDropOverlay');
  if (!overlay) return;

  let dragDepth = 0;
  const hasFiles = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');
  const isMergeViewActive = () => document.querySelector('#mergeView')?.classList.contains('active-view') === true;

  const show = () => {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
  };

  const hide = () => {
    dragDepth = 0;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  };

  document.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    if (!isMergeViewActive()) {
      hide();
      return;
    }
    dragDepth += 1;
    show();
  });

  document.addEventListener('dragover', (event) => {
    if (!hasFiles(event)) return;

    // Prevent the browser from navigating to the dropped PDF anywhere in the app.
    event.preventDefault();

    if (!isMergeViewActive()) {
      hide();
      return;
    }

    event.dataTransfer.dropEffect = 'copy';
    show();
  });

  document.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    if (!isMergeViewActive()) {
      hide();
      return;
    }
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) hide();
  });

  document.addEventListener('drop', async (event) => {
    if (!hasFiles(event)) return;

    // PDFs dropped outside Merge & Organize are ignored.
    event.preventDefault();
    hide();

    if (!isMergeViewActive()) return;
    await addPdfFiles(event.dataTransfer.files);
  });

  window.addEventListener('blur', hide);
};
