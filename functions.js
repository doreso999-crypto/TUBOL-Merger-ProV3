/* TUBOL PDF Workspace loader.
   The original application remains in functions-core.js.
   The renderer fix is loaded before DOMContentLoaded so every existing
   initialization path uses the stable PDF thumbnail renderer. */
document.write('<script src="functions-core.js"><\/script><script src="pdf-render-fix.js"><\/script>');
