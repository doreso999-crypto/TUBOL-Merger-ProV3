/* Authorization toolbar runtime cleanup.
   Removes the legacy toolbar after the existing app has initialized,
   and lets native dropdown controls open normally. */
(function () {
  'use strict';

  function cleanupLegacyToolbar() {
    const legacy = document.getElementById('editorToolbar');
    if (legacy) legacy.remove();
  }

  function protectNativeSelects() {
    document.addEventListener('mousedown', (event) => {
      const select = event.target?.closest?.('.authorization-doc-toolbar select');
      if (!select) return;
      // The document editor's toolbar previously prevented all mousedown defaults.
      // Stop the toolbar's bubbling handler without cancelling the select's native default.
      event.stopPropagation();
    }, true);
  }

  function mount() {
    protectNativeSelects();
    // Run after other DOMContentLoaded handlers so the legacy toolbar has already
    // been seen by the existing application code and the new toolbar has been built.
    queueMicrotask(cleanupLegacyToolbar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
