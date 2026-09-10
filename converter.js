/* TUBOL PDF Workspace — PDF/JPG conversion tool. */
(() => {
  'use strict';

  const state = {
    mode: 'pdf-to-jpg',
    files: [],
    busy: false,
  };

  const STYLE_ID = 'converter-workspace-styles';

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function toast(message, type) {
    if (typeof window.toast === 'function') return window.toast(message, type);
    const el = document.querySelector('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = `toast ${type || 'info'} show`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #convertBtn { white-space: nowrap; }
      .converter-modal { position: fixed; inset: 0; z-index: 100; display: none; align-items: center; justify-content: center; padding: 22px; background: rgba(15, 23, 42, .54); backdrop-filter: blur(5px); }
      .converter-modal.open { display: flex; }
      .converter-card { width: min(720px, 100%); max-height: min(760px, calc(100vh - 44px)); overflow: auto; background: var(--surface, #fff); color: var(--text, #17202a); border: 1px solid var(--line, #d7dee7); border-radius: 18px; box-shadow: 0 24px 70px rgba(15, 23, 42, .24); padding: 24px; }
      .converter-card h2 { margin: 2px 0 5px; font-size: 23px; }
      .converter-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 20px; }
      .converter-close { flex: 0 0 auto; }
      .converter-mode { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; padding: 5px; border: 1px solid var(--line, #d7dee7); background: var(--surface-2, #f0f3f7); border-radius: 12px; }
      .converter-mode button { border: 0; border-radius: 9px; padding: 11px 14px; background: transparent; color: var(--muted, #66727f); font-weight: 700; }
      .converter-mode button.active { background: var(--surface, #fff); color: var(--text, #17202a); box-shadow: 0 1px 4px rgba(15,23,42,.12); }
      .converter-drop { border: 1.5px dashed var(--line, #d7dee7); border-radius: 14px; padding: 28px 20px; text-align: center; background: var(--surface-2, #f8fafc); transition: border-color .15s, background .15s; }
      .converter-drop.dragover { border-color: var(--accent, #2563eb); background: color-mix(in srgb, var(--accent, #2563eb) 7%, var(--surface, #fff)); }
      .converter-drop strong { display: block; font-size: 15px; margin-bottom: 5px; }
      .converter-drop span { color: var(--muted, #66727f); font-size: 13px; }
      .converter-drop .btn { margin-top: 14px; }
      .converter-options { margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .converter-field { display: flex; flex-direction: column; gap: 7px; font-size: 13px; font-weight: 700; }
      .converter-field select { width: 100%; min-height: 42px; padding: 9px 11px; border-radius: 10px; border: 1px solid var(--line, #d7dee7); background: var(--surface, #fff); color: var(--text, #17202a); }
      .converter-list { margin-top: 15px; display: grid; gap: 7px; max-height: 220px; overflow: auto; }
      .converter-file { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: 1px solid var(--line, #d7dee7); border-radius: 10px; background: var(--surface, #fff); }
      .converter-file-index { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; background: var(--surface-2, #f0f3f7); color: var(--muted, #66727f); font-size: 12px; font-weight: 800; }
      .converter-file-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
      .converter-file-remove { border: 0; background: transparent; color: var(--muted, #66727f); padding: 4px 7px; }
      .converter-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line, #d7dee7); }
      .converter-status { color: var(--muted, #66727f); font-size: 12px; min-height: 18px; }
      .converter-actions { display: flex; gap: 8px; }
      .converter-note { margin: 11px 0 0; color: var(--muted, #66727f); font-size: 12px; line-height: 1.45; }
      @media (max-width: 700px) { .converter-options { grid-template-columns: 1fr; } .converter-card { padding: 18px; } .converter-footer { align-items: flex-start; flex-direction: column; } .converter-actions { width: 100%; } .converter-actions .btn { flex: 1; } }
    `;
    document.head.appendChild(style);
  }

  function ensureUi() {
    if (document.getElementById('converterModal')) return;
    injectStyles();

    const button = document.createElement('button');
    button.id = 'convertBtn';
    button.type = 'button';
    button.className = 'btn btn-ghost';
    button.title = 'Convert PDF and JPG files';
    button.textContent = 'Convert';

    const topActions = document.querySelector('.top-actions');
    if (topActions) topActions.insertBefore(button, topActions.firstChild);

    const modal = document.createElement('div');
    modal.id = 'converterModal';
    modal.className = 'converter-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="converter-card" role="dialog" aria-modal="true" aria-labelledby="converterTitle">
        <div class="converter-head">
          <div><div class="eyebrow">FILE CONVERSION</div><h2 id="converterTitle">PDF / JPG Converter</h2><p class="subtext">Convert locally on your device. Your files are not uploaded.</p></div>
          <button class="preview-tool close converter-close" id="converterCloseBtn" type="button" title="Close">✕</button>
        </div>
        <div class="converter-mode" role="tablist" aria-label="Conversion direction">
          <button id="converterPdfToJpgTab" class="active" type="button">PDF → JPG</button>
          <button id="converterJpgToPdfTab" type="button">JPG → PDF</button>
        </div>
        <input id="converterFileInput" type="file" hidden>
        <div id="converterDrop" class="converter-drop">
          <strong id="converterDropTitle">Drop PDF files here</strong>
          <span id="converterDropSubtitle">You can select one or more PDFs. Every page will become a JPG.</span>
          <button id="converterBrowseBtn" class="btn btn-secondary" type="button">Choose files</button>
        </div>
        <div id="converterOptions" class="converter-options"></div>
        <div id="converterFileList" class="converter-list"></div>
        <p class="converter-note" id="converterNote">For multi-page PDFs, the JPGs are packaged into one ZIP so you only have to save one file.</p>
        <div class="converter-footer">
          <div class="converter-status" id="converterStatus">No files selected.</div>
          <div class="converter-actions"><button class="btn btn-secondary" id="converterClearBtn" type="button">Clear</button><button class="btn btn-primary" id="converterRunBtn" type="button" disabled>Convert &amp; Save</button></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    button.addEventListener('click', open);
    document.getElementById('converterCloseBtn')?.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.getElementById('converterPdfToJpgTab')?.addEventListener('click', () => setMode('pdf-to-jpg'));
    document.getElementById('converterJpgToPdfTab')?.addEventListener('click', () => setMode('jpg-to-pdf'));
    document.getElementById('converterBrowseBtn')?.addEventListener('click', () => document.getElementById('converterFileInput')?.click());
    document.getElementById('converterFileInput')?.addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
    document.getElementById('converterClearBtn')?.addEventListener('click', clearFiles);
    document.getElementById('converterRunBtn')?.addEventListener('click', runConversion);

    const drop = document.getElementById('converterDrop');
    if (drop) {
      ['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add('dragover'); }));
      ['dragleave', 'drop'].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove('dragover'); }));
      drop.addEventListener('drop', event => addFiles(event.dataTransfer.files));
    }

    setMode(state.mode);
  }

  function open() {
    const modal = document.getElementById('converterModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function close() {
    const modal = document.getElementById('converterModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function setMode(mode) {
    state.mode = mode;
    state.files = [];
    const pdfMode = mode === 'pdf-to-jpg';
    const pdfTab = document.getElementById('converterPdfToJpgTab');
    const jpgTab = document.getElementById('converterJpgToPdfTab');
    pdfTab?.classList.toggle('active', pdfMode);
    jpgTab?.classList.toggle('active', !pdfMode);

    const input = document.getElementById('converterFileInput');
    if (input) {
      input.accept = pdfMode ? '.pdf,application/pdf' : '.jpg,.jpeg,image/jpeg';
      input.multiple = true;
    }

    const title = document.getElementById('converterDropTitle');
    const subtitle = document.getElementById('converterDropSubtitle');
    const note = document.getElementById('converterNote');
    if (pdfMode) {
      if (title) title.textContent = 'Drop PDF files here';
      if (subtitle) subtitle.textContent = 'You can select one or more PDFs. Every page will become a JPG.';
      if (note) note.textContent = 'For multi-page PDFs, the JPGs are packaged into one ZIP so you only have to save one file.';
    } else {
      if (title) title.textContent = 'Drop JPG files here';
      if (subtitle) subtitle.textContent = 'Select images in the order you want them to appear in the PDF.';
      if (note) note.textContent = 'The default Letter setting fits each image to a page while preserving its aspect ratio.';
    }

    renderOptions();
    renderFiles();
  }

  function renderOptions() {
    const options = document.getElementById('converterOptions');
    if (!options) return;
    if (state.mode === 'pdf-to-jpg') {
      options.innerHTML = `
        <label class="converter-field">JPG resolution
          <select id="converterDpi"><option value="150">150 DPI · smaller files</option><option value="200" selected>200 DPI · balanced</option><option value="300">300 DPI · higher detail</option></select>
        </label>
        <label class="converter-field">JPG quality
          <select id="converterQuality"><option value="0.82">82% · smaller</option><option value="0.90" selected>90% · balanced</option><option value="0.96">96% · higher quality</option></select>
        </label>`;
    } else {
      options.innerHTML = `
        <label class="converter-field">PDF page size
          <select id="converterPageSize"><option value="letter" selected>US Letter · 8.5 × 11 in</option><option value="a4">A4 · 210 × 297 mm</option><option value="image">Image size · 96 DPI</option></select>
        </label>
        <label class="converter-field">Margins
          <select id="converterMargin"><option value="18">Small · 0.25 in</option><option value="36" selected>Normal · 0.5 in</option><option value="0">None</option></select>
        </label>`;
    }
  }

  function isAccepted(file) {
    const name = String(file?.name || '').toLowerCase();
    if (state.mode === 'pdf-to-jpg') return file.type === 'application/pdf' || name.endsWith('.pdf');
    return file.type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
  }

  function addFiles(fileList) {
    if (state.busy) return;
    const incoming = Array.from(fileList || []).filter(isAccepted);
    if (!incoming.length) {
      toast(state.mode === 'pdf-to-jpg' ? 'Please choose PDF files only.' : 'Please choose JPG/JPEG files only.', 'error');
      return;
    }
    state.files.push(...incoming);
    renderFiles();
  }

  function removeFile(index) {
    if (state.busy) return;
    state.files.splice(index, 1);
    renderFiles();
  }

  function clearFiles() {
    if (state.busy) return;
    state.files = [];
    renderFiles();
  }

  function renderFiles() {
    const list = document.getElementById('converterFileList');
    const status = document.getElementById('converterStatus');
    const run = document.getElementById('converterRunBtn');
    if (!list || !status || !run) return;
    list.innerHTML = state.files.map((file, index) => `
      <div class="converter-file">
        <div class="converter-file-index">${index + 1}</div>
        <div class="converter-file-name" title="${esc(file.name)}">${esc(file.name)}</div>
        <button class="converter-file-remove" type="button" data-index="${index}" title="Remove">✕</button>
      </div>`).join('');
    list.querySelectorAll('.converter-file-remove').forEach(button => button.addEventListener('click', () => removeFile(Number(button.dataset.index))));
    status.textContent = state.files.length ? `${state.files.length} file${state.files.length === 1 ? '' : 's'} selected.` : 'No files selected.';
    run.disabled = state.busy || !state.files.length;
  }

  async function renderPdfPageToJpg(file, sourceIndex, dpi, quality) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await (typeof window.getPdfJsDocument === 'function' ? window.getPdfJsDocument(bytes) : pdfjsLib.getDocument({ data: bytes }).promise);
    const page = await pdf.getPage(sourceIndex);
    const scale = Math.max(1, dpi / 72);
    const viewport = page.getViewport({ scale });
    const maxPixels = 12_000_000;
    const pixels = viewport.width * viewport.height;
    const safeScale = pixels > maxPixels ? scale * Math.sqrt(maxPixels / pixels) : scale;
    const finalViewport = safeScale === scale ? viewport : page.getViewport({ scale: safeScale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(finalViewport.width);
    canvas.height = Math.ceil(finalViewport.height);
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport: finalViewport, intent: 'print' }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const binary = atob(dataUrl.split(',')[1]);
    const output = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) output[i] = binary.charCodeAt(i);
    return output;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function u16(value) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
  function u32(value) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }

  function concatBytes(parts) {
    const size = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { output.set(part, offset); offset += part.length; }
    return output;
  }

  function createZip(entries) {
    const locals = [];
    const central = [];
    let offset = 0;
    const encoder = new TextEncoder();
    for (const entry of entries) {
      const nameBytes = encoder.encode(entry.name);
      const data = entry.bytes;
      const crc = crc32(data);
      const local = concatBytes([
        new Uint8Array([0x50,0x4b,0x03,0x04]), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data
      ]);
      const record = concatBytes([
        new Uint8Array([0x50,0x4b,0x01,0x02]), new Uint8Array([20,0,20,0,0,0,0,0,0,0,0,0]), u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes
      ]);
      locals.push(local);
      central.push(record);
      offset += local.length;
    }
    const centralBytes = concatBytes(central);
    const localBytes = concatBytes(locals);
    const end = concatBytes([
      new Uint8Array([0x50,0x4b,0x05,0x06]), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(centralBytes.length), u32(localBytes.length), u16(0)
    ]);
    return concatBytes([localBytes, centralBytes, end]);
  }

  async function saveConvertedBlob(blob, filename, typeDescription, mime, extensions) {
    const safeName = String(filename || 'converted').replace(/[\\/:*?"<>|]+/g, '-');
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: safeName,
          types: [{ description: typeDescription, accept: { [mime]: extensions } }],
          excludeAcceptAllOption: true,
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast(`Saved ${handle.name}`, 'success');
        return true;
      } catch (error) {
        if (error?.name === 'AbortError') return false;
        console.warn('Native save picker failed; using download fallback.', error);
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    toast('Download started.', 'success');
    return true;
  }

  function baseName(name) {
    return String(name || 'document').replace(/\.(pdf|jpe?g)$/i, '').trim() || 'document';
  }

  function jpgToData(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Could not read ${file.name}.`)); };
      image.src = url;
    });
  }

  async function createImagePdf(files) {
    const { PDFDocument } = PDFLib;
    const pdf = await PDFDocument.create();
    const size = document.getElementById('converterPageSize')?.value || 'letter';
    const margin = Number(document.getElementById('converterMargin')?.value || 36);
    const pageSizes = { letter: [612, 792], a4: [595.28, 841.89] };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updateStatus(`Preparing image ${i + 1} of ${files.length}…`);
      const image = await jpgToData(file);
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
      const binary = atob(dataUrl.split(',')[1]);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      const embedded = await pdf.embedJpg(bytes);

      let pageWidth;
      let pageHeight;
      if (size === 'image') {
        pageWidth = image.naturalWidth * 72 / 96 + margin * 2;
        pageHeight = image.naturalHeight * 72 / 96 + margin * 2;
      } else {
        [pageWidth, pageHeight] = pageSizes[size] || pageSizes.letter;
      }
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const boxRatio = maxWidth / maxHeight;
      let drawWidth = maxWidth;
      let drawHeight = maxWidth / imageRatio;
      if (drawHeight > maxHeight) { drawHeight = maxHeight; drawWidth = maxHeight * imageRatio; }
      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;
      const page = pdf.addPage([pageWidth, pageHeight]);
      page.drawImage(embedded, { x, y, width: drawWidth, height: drawHeight });
      void boxRatio;
    }
    return new Blob([await pdf.save({ useObjectStreams: true, addDefaultPage: false })], { type: 'application/pdf' });
  }

  function updateStatus(message) {
    const status = document.getElementById('converterStatus');
    if (status) status.textContent = message;
  }

  async function convertPdfToJpg(files) {
    const dpi = Number(document.getElementById('converterDpi')?.value || 200);
    const quality = Number(document.getElementById('converterQuality')?.value || 0.9);
    const output = [];
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      updateStatus(`Opening ${file.name}…`);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await (typeof window.getPdfJsDocument === 'function' ? window.getPdfJsDocument(bytes) : pdfjsLib.getDocument({ data: bytes }).promise);
      for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
        updateStatus(`Rendering ${file.name} · page ${pageIndex} of ${pdf.numPages}…`);
        const jpgBytes = await renderPdfPageToJpg(file, pageIndex, dpi, quality);
        output.push({ name: `${baseName(file.name)}-page-${String(pageIndex).padStart(3, '0')}.jpg`, bytes: jpgBytes });
      }
    }
    if (output.length === 1) {
      await saveConvertedBlob(new Blob([output[0].bytes], { type: 'image/jpeg' }), output[0].name, 'JPEG image', 'image/jpeg', ['.jpg']);
      return;
    }
    updateStatus('Packaging JPGs…');
    const zip = createZip(output);
    const suggested = files.length === 1 ? `${baseName(files[0].name)} JPGs.zip` : 'converted-jpgs.zip';
    await saveConvertedBlob(new Blob([zip], { type: 'application/zip' }), suggested, 'ZIP archive', 'application/zip', ['.zip']);
  }

  async function runConversion() {
    if (state.busy || !state.files.length) return;
    state.busy = true;
    const run = document.getElementById('converterRunBtn');
    const clear = document.getElementById('converterClearBtn');
    if (run) { run.disabled = true; run.textContent = 'Converting…'; }
    if (clear) clear.disabled = true;
    try {
      if (state.mode === 'pdf-to-jpg') await convertPdfToJpg(state.files.slice());
      else await createAndSaveImagePdf(state.files.slice());
      updateStatus('Conversion complete.');
    } catch (error) {
      console.error('PDF/JPG conversion failed.', error);
      updateStatus('Conversion failed.');
      toast(error?.message || 'Conversion failed.', 'error');
    } finally {
      state.busy = false;
      if (run) { run.disabled = !state.files.length; run.textContent = 'Convert & Save'; }
      if (clear) clear.disabled = false;
    }
  }

  async function createAndSaveImagePdf(files) {
    const blob = await createImagePdf(files);
    const suggested = files.length === 1 ? `${baseName(files[0].name)}.pdf` : 'converted-images.pdf';
    await saveConvertedBlob(blob, suggested, 'PDF document', 'application/pdf', ['.pdf']);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureUi, { once: true });
  else ensureUi();
})();
