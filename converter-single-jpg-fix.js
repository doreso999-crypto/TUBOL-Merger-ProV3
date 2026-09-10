/* TUBOL PDF Workspace — PDF → JPG must follow the current page board exactly. */
(() => {
  'use strict';

  function getBaseName(name) {
    return String(name || 'document.pdf').replace(/\.pdf$/i, '').trim() || 'document';
  }

  function getPdfDocument(bytes) {
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    return typeof window.getPdfJsDocument === 'function'
      ? window.getPdfJsDocument(source)
      : pdfjsLib.getDocument({ data: source }).promise;
  }

  async function renderBoardPageToJpg(entry, dpi, quality) {
    const bytes = entry.pdfBytes instanceof Uint8Array ? entry.pdfBytes : new Uint8Array(entry.pdfBytes);
    const pdf = await getPdfDocument(bytes);
    const page = await pdf.getPage((Number(entry.sourceIndex) || 0) + 1);
    const rotation = ((Number(entry.rotation) || 0) % 360 + 360) % 360;
    const scale = dpi / 72;
    const viewport = page.getViewport({ scale, rotation });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not create an image canvas.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, intent: 'print' }).promise;
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create JPG output.')), 'image/jpeg', quality);
    });
  }

  function triggerDownload(blob, filename, delay = 0) {
    setTimeout(() => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, delay);
  }

  async function saveSingleJpg(blob, suggestedName) {
    const safeName = String(suggestedName || 'converted.jpg').replace(/[\\/:*?"<>|]+/g, '-');
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: safeName,
          types: [{ description: 'JPEG image', accept: { 'image/jpeg': ['.jpg'] } }],
          excludeAcceptAllOption: true,
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (error) {
        if (error?.name === 'AbortError') return false;
        console.warn('JPG save picker failed; using download fallback.', error);
      }
    }
    triggerDownload(blob, safeName);
    return true;
  }

  async function convertPacketPagesToJpg() {
    const packetPages = Array.isArray(window.state?.pages) ? window.state.pages.slice() : [];
    if (!packetPages.length) throw new Error('There are no pages in the page board to convert.');

    const dpi = Number(document.getElementById('converterDpi')?.value || 200);
    const quality = Number(document.getElementById('converterQuality')?.value || 0.90);
    const output = [];

    for (let index = 0; index < packetPages.length; index++) {
      const entry = packetPages[index];
      if (!entry?.pdfBytes) throw new Error(`Page ${index + 1} in the page board has no PDF data.`);
      const blob = await renderBoardPageToJpg(entry, dpi, quality);
      const base = getBaseName(entry.fileName || 'document.pdf');
      const filename = packetPages.length === 1
        ? `${base}.jpg`
        : `${base} - Page ${index + 1}.jpg`;
      output.push({ blob, filename });
      const status = document.getElementById('converterStatus');
      if (status) status.textContent = `Rendering page ${index + 1} of ${packetPages.length}…`;
    }

    if (output.length === 1) {
      await saveSingleJpg(output[0].blob, output[0].filename);
    } else {
      // The page board is authoritative: export only the currently visible board pages,
      // in their current order. Multiple JPGs are downloaded separately rather than
      // reopening the original PDF and converting untouched pages.
      output.forEach((item, index) => triggerDownload(item.blob, item.filename, index * 250));
    }
    return output.length;
  }

  async function convertSingleSelectedPdfFileToJpg(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await getPdfDocument(bytes);
    if (pdf.numPages !== 1) return false;
    const entry = { pdfBytes: bytes, sourceIndex: 0, rotation: 0, fileName: file.name };
    const dpi = Number(document.getElementById('converterDpi')?.value || 200);
    const quality = Number(document.getElementById('converterQuality')?.value || 0.90);
    const blob = await renderBoardPageToJpg(entry, dpi, quality);
    await saveSingleJpg(blob, `${getBaseName(file.name)}.jpg`);
    return true;
  }

  function interceptPdfToJpgConversion() {
    const button = document.getElementById('converterRunBtn');
    if (!button || button.dataset.packetJpgFixBound) return;
    button.dataset.packetJpgFixBound = 'true';

    button.addEventListener('click', async event => {
      const pdfTab = document.getElementById('converterPdfToJpgTab');
      if (!pdfTab?.classList.contains('active')) return;

      const packetPages = Array.isArray(window.state?.pages) ? window.state.pages : [];
      const input = document.getElementById('converterFileInput');
      const files = Array.from(input?.files || []);

      // When PDF → JPG is launched from the PDF Workspace, the page board is always
      // the source of truth. Do not use converterFileInput for the packet conversion.
      const hasPacket = packetPages.length > 0 && packetPages.every(page => page?.pdfBytes);
      if (!hasPacket && files.length !== 1) return;
      if (hasPacket) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }

      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Converting…';

      try {
        const count = hasPacket
          ? await convertPacketPagesToJpg()
          : (await convertSingleSelectedPdfFileToJpg(files[0]) ? 1 : 0);

        const status = document.getElementById('converterStatus');
        if (status && count) status.textContent = count === 1
          ? 'JPG saved successfully.'
          : `${count} JPG files saved from the current page board.`;
      } catch (error) {
        console.error('PDF → JPG conversion failed.', error);
        if (typeof window.toast === 'function') window.toast('Could not convert the current page board to JPG.', 'error');
        const status = document.getElementById('converterStatus');
        if (status) status.textContent = 'Conversion failed.';
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    }, true);
  }

  function init() {
    interceptPdfToJpgConversion();
    const observer = new MutationObserver(interceptPdfToJpgConversion);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
