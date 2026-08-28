/* TUBOL PDF Workspace loader.
   M&O Authorization is isolated in authorization-mdo.js/css.
   The visible Authorization Letter editor remains disabled.
   The logo remains visible and decorative; sidebar/thumbnail triggers are disabled. */

document.write(`
  <style id="tubol-authorization-editor-disabled">
    #letterView,
    [data-view="letterView"] {
      display: none !important;
    }
    #thumbnailSizeWrap,
    #thumbnailSizeBtn,
    #thumbnailSizeMenu {
      display: none !important;
    }
    #brandSidebarToggle {
      cursor: default !important;
      pointer-events: none !important;
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
