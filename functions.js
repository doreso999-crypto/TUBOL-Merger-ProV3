/* TUBOL PDF Workspace loader.
   M&O is the live workspace. Authorization and Settings are isolated modules.
   The retired Letter Editor is no longer part of the live startup path. */

document.write(`
  <style id="tubol-live-layout-cleanup">
    /* Keep the logo visible but remove its old sidebar trigger behavior. */
    #brandSidebarToggle {
      cursor: default !important;
      pointer-events: none !important;
    }

    /* The sidebar/navigation is retired. */
    .sidebar {
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

    /* Thumbnail sizing controls are retired; page thumbnails themselves remain. */
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
  <script>
    // Prevent the retired functions-core initializer from wiring Letter Editor controls.
    (() => {
      const originalAddEventListener = document.addEventListener.bind(document);
      document.addEventListener = function(type, listener, options) {
        if (type === 'DOMContentLoaded' && typeof listener === 'function' && listener.name === 'init') return;
        return originalAddEventListener(type, listener, options);
      };
    })();
  <\/script>
  <script src="functions-core.js"><\/script>
  <script>
    // Restore the browser method immediately after the legacy core is loaded.
    document.addEventListener = Document.prototype.addEventListener.bind(document);
  <\/script>
  <script src="mdo-runtime.js"><\/script>
  <script src="pdf-render-fix.js"><\/script>
  <script src="workspace-ui-fixes.js"><\/script>
  <script src="authorization-mdo.js"><\/script>
  <script src="settings.js"><\/script>
`);
