/* TUBOL PDF Workspace loader.
   M&O Authorization is isolated in authorization-mdo.js/css.
   The visible Authorization Letter editor remains disabled. */

document.write(`
  <style id="tubol-authorization-editor-disabled">
    #letterView,
    [data-view="letterView"],
    .sidebar,
    #brandSidebarToggle,
    .thumbnail-size-wrap,
    #thumbnailSizeBtn,
    #thumbnailSizeMenu {
      display: none !important;
    }
    .workspace {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  </style>
  <link rel="stylesheet" href="responsive-sidebar-hidden.css">
  <link rel="stylesheet" href="modal-consistency.css">
  <link rel="stylesheet" href="preview-theme.css">
  <link rel="stylesheet" href="full-content-workspace.css">
  <link rel="stylesheet" href="authorization-mdo.css">
  <script src="functions-core.js"><\/script>
  <script src="pdf-render-fix.js"><\/script>
  <script src="workspace-ui-fixes.js"><\/script>
  <script src="authorization-mdo.js"><\/script>
`);

(() => {
  function removeLegacyMdoControls() {
    document.querySelectorAll('.thumbnail-size-wrap, #thumbnailSizeBtn, #thumbnailSizeMenu, .sidebar, #brandSidebarToggle').forEach(el => el.remove());
    const workspace = document.querySelector('.workspace');
    if (workspace) workspace.style.setProperty('grid-template-columns', 'minmax(0, 1fr)', 'important');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeLegacyMdoControls, { once: true });
  } else {
    removeLegacyMdoControls();
  }
})();
