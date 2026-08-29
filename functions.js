/* TUBOL PDF Workspace loader.
   M&O Authorization is isolated in authorization-mdo.js/css.
   Settings is isolated in settings.js/css.
   The visible Authorization Letter editor remains disabled.
   The logo remains visible and decorative; sidebar/thumbnail triggers are disabled. */

document.write(`
  <style id="tubol-authorization-editor-disabled">
    #letterView,
    [data-view="letterView"] {
      display: none !important;
    }

    /* Keep the logo visible, but make it purely decorative. */
    #brandSidebarToggle {
      cursor: default !important;
      pointer-events: none !important;
    }

    /* The sidebar is removed from the rendered layout; the logo is independent. */
    .sidebar,
    #brandSidebarToggle + .sidebar {
      display: none !important;
      width: 0 !important;
      min-width: 0 !important;
      max-width: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      overflow: hidden !important;
    }

    .workspace {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    #thumbnailSizeWrap,
    #thumbnailSizeBtn,
    #thumbnailSizeMenu {
      display: none !important;
    }
  </style>
  <link rel="stylesheet" href="responsive-sidebar-hidden.css">
  <link rel="stylesheet" href="modal-consistency.css">
  <link rel="stylesheet" href="preview-theme.css">
  <link rel="stylesheet" href="full-content-workspace.css">
  <link rel="stylesheet" href="authorization-mdo.css">
  <link rel="stylesheet" href="settings.css">
  <script src="functions-core.js"><\/script>
  <script src="pdf-render-fix.js"><\/script>
  <script src="workspace-ui-fixes.js"><\/script>
  <script src="authorization-mdo.js"><\/script>
  <script src="settings.js"><\/script>
`);
