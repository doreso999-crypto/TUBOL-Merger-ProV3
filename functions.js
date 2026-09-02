/* TUBOL PDF Workspace loader. Core workspace and Settings modules. */
document.write(`
  <link rel="stylesheet" href="modal-consistency.css">
  <link rel="stylesheet" href="preview-theme.css">
  <link rel="stylesheet" href="full-content-workspace.css">
  <link rel="stylesheet" href="settings.css">
  <script>window.openSettings = window.openSettings || function(){};<\/script>
  <script src="functions-core.js"><\/script>
  <script src="pdf-render-fix.js"><\/script>
  <script src="workspace-ui-fixes.js"><\/script>
  <script src="settings.js"><\/script>
  <script>try {
    localStorage.removeItem('pdfWorkspaceAuthTemplates');
    localStorage.removeItem('pdfWorkspaceTemplates');
  } catch (e) {
    console.warn('Old template storage could not be cleared.', e);
  }<\/script>
`);
