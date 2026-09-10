/* TUBOL PDF Workspace — direct JPG save for a single-page PDF conversion. */
(() => {
  'use strict';

  async function saveJpgBlob(blob, suggestedName) {
    const safeName = String(suggestedName || 'converted.jpg').replace(/[\\/:*?"<>|]+/g, '-');

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: safeName,
          types: [{ description: 'JPEG image', accept: { 'image/jpeg': ['.jpg'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (error) {
        if (error?.name === 'AbortError') return false;
        console.warn('Direct JPG save picker failed; using download fallback.', error);
      }
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  }

  function getBaseName(name) {
    return String(name || 'document.pdf').replace(/\.pdf$/i, '');
  }

  async function convertSinglePagePdfToJpg(file) {
    const dpi = Number(document.getElementById('converterDpi')?.value || 200);
    const quality = Number(document.getElementById('converterQuality')?.value || 0.90);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = typeof window.getPdfJsDocument === 'function'
      ? await window.getPdfJsDocument(bytes)
      : await pdfjsLib.getDocument({ data: bytes }).promise;

    if (pdf.numPages !== 1) return false;

    const page = await pdf.getPage(1);
    const scale = dpi / 72;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not create an image canvas.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not create JPG output.')), 'image/jpeg', quality);
    });

    await saveJpgBlob(blob, `${getBaseName(file.name)}.jpg`);
    return true;
  }

  function interceptSinglePdfConversion() {
    const button = document.getElementById('converterRunBtn');
    if (!button || button.dataset.singleJpgFixBound) return;
    button.dataset.singleJpgFixBound = 'true';

    button.addEventListener('click', async event => {
      const pdfTab = document.getElementById('converterPdfToJpgTab');
      if (!pdfTab?.classList.contains('active')) return;

      const input = document.getElementById('converterFileInput');
      const files = Array.from(input?.files || []);
      if (files.length !== 1) return;

      event.stopImmediatePropagation();
      event.preventDefault();

      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Converting…';

      try {
        const handled = await convertSinglePagePdfToJpg(files[0]);
        if (!handled) return;
        document.getElementById('converterStatus')?.replaceChildren(document.createTextNode('JPG saved successfully.'));
      } catch (error) {
        console.error('Single-page PDF → JPG conversion failed.', error);
        if (typeof window.toast === 'function') window.toast('Could not convert this PDF to JPG.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    }, true);
  }

  function init() {
    interceptSinglePdfConversion();
    const observer = new MutationObserver(interceptSinglePdfConversion);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
