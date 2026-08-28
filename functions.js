/* TUBOL PDF Workspace loader.
   The M&O Authorization action is isolated in authorization-action.js/css.
   The Authorization Letter editor remains disabled. */

document.write(`
  <style id="tubol-authorization-editor-disabled">
    #letterView,
    [data-view="letterView"] {
      display: none !important;
    }
  </style>
  <link rel="stylesheet" href="thumbnail-size.css">
  <link rel="stylesheet" href="modal-consistency.css">
  <link rel="stylesheet" href="preview-theme.css">
  <link rel="stylesheet" href="full-content-workspace.css">
  <link rel="stylesheet" href="authorization-action.css">
  <script src="functions-core.js"><\/script>
  <script src="pdf-render-fix.js"><\/script>
  <script src="thumbnail-size-ui.js"><\/script>
  <script src="workspace-ui-fixes.js"><\/script>
  <script src="authorization-action.js"><\/script>
`);
