/* TUBOL PDF Workspace loader.
   Keep the working M&O Authorization insertion workflow, but remove the
   Authorization Letter editor surface and all document-editor-only UI/scripts. */

document.write(`
  <style id="tubol-authorization-editor-disabled">
    #letterView,
    [data-view="letterView"],
    #saveTemplateModal,
    #editorSettingsBar,
    #editorToolbar,
    #letterEditor,
    #wordCount,
    #letterView + * {
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
  <script>
    (() => {
      const removeAuthorizationEditorSurface = () => {
        document.querySelector('[data-view="letterView"]')?.remove();
        document.getElementById('letterView')?.remove();
        document.getElementById('saveTemplateModal')?.remove();
        document.getElementById('editorSettingsBar')?.remove();
        document.getElementById('editorToolbar')?.remove();
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeAuthorizationEditorSurface, { once: true });
      } else {
        removeAuthorizationEditorSurface();
      }
    })();
  <\/script>
`);
