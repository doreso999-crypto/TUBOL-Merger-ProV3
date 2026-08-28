/* TUBOL PDF Workspace loader.
   Keep the working M&O Authorization insertion workflow, but remove the
   Authorization Letter editor surface and all editor-specific enhancement scripts. */

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
  <script src="functions-core.js"><\/script>
  <script src="pdf-render-fix.js"><\/script>
  <script src="authorization-ui.js"><\/script>
  <script src="thumbnail-size-ui.js"><\/script>
  <script src="workspace-ui-fixes.js"><\/script>
`);
