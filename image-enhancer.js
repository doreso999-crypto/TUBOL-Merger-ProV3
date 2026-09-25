/* TUBOL PDF Workspace — local JPG/PNG clarity and upscale tool. */
(() => {
  'use strict';

  const state = {
    files: [],
    busy: false,
    outputFormat: 'png',
    scale: '2',
    clarity: 'ultra',
    quality: '0.96',
  };

  const STYLE_ID = 'ultra-clear-image-styles';

  function toast(message, type) {
    if (typeof window.toast === 'function') return window.toast(message, type);
    const el = document.querySelector('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = \`toast \${type || 'info'} show\`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = \`
      #ultraClearBtn { white-space: nowrap; }
      .ultra-clear-modal { position: fixed; inset: 0; z-index: 105; display: none; align-items: center; justify-content: center; padding: 22px; background: rgba(15, 23, 42, .52); }
      .ultra-clear-modal.open { display: flex; }
      .ultra-clear-card { width: min(760px, 100%); max-height: min(820px, calc(100vh - 44px)); overflow: auto; background: var(--surface, #fff); color: var(--text, #17202a); border: 1px solid var(--line, #d7dee7); border-radius: 18px; box-shadow: 0 24px 70px rgba(15, 23, 42, .24); padding: 24px; }
      .ultra-clear-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
      .ultra-clear-head h2 { margin: 2px 0 5px; font-size: 23px; letter-spacing: -.02em; }
      .ultra-clear-drop { border: 1.5px dashed var(--line, #d7dee7); border-radius: 14px; padding: 28px 20px; text-align: center; background: var(--surface-2, #f8fafc); transition: border-color .15s, background .15s, transform .15s; }
      .ultra-clear-drop.dragover { border-color: var(--accent, #2563eb); background: color-mix(in srgb, var(--accent, #2563eb) 7%, var(--surface, #fff)); transform: translateY(-1px); }
      .ultra-clear-drop strong { display: block; font-size: 15px; margin-bottom: 5px; }
      .ultra-clear-drop span { color: var(--muted, #66727f); font-size: 13px; }
      .ultra-clear-drop .btn { margin-top: 14px; }
      .ultra-clear-options { margin-top: 16px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
      .ultra-clear-field { display: flex; flex-direction: column; gap: 7px; font-size: 12px; font-weight: 700; }
      .ultra-clear-field select { width: 100%; min-height: 42px; padding: 9px 10px; border-radius: 10px; border: 1px solid var(--line, #d7dee7); background: var(--surface, #fff); color: var(--text, #17202a); }
      .ultra-clear-list { margin-top: 15px; display: grid; gap: 7px; max-height: 230px; overflow: auto; }
      .ultra-clear-file { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border: 1px solid var(--line, #d7dee7); border-radius: 10px; background: var(--surface, #fff); }
      .ultra-clear-file-index { width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; background: var(--surface-2, #f0f3f7); color: var(--muted, #66727f); font-size: 12px; font-weight: 800; flex: 0 0 auto; }
      .ultra-clear-file-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
      .ultra-clear-file-remove { border: 0; background: transparent; color: var(--muted, #66727f); padding: 4px 7px; }
      .ultra-clear-note { margin: 12px 0 0; color: var(--muted, #66727f); font-size: 12px; line-height: 1.48; }
      .ultra-clear-progress { height: 6px; margin-top: 14px; background: var(--surface-2, #edf1f5); border-radius: 999px; overflow: hidden; display: none; }
      .ultra-clear-progress span { display: block; width: 0; height: 100%; background: var(--accent, #2563eb); transition: width .2s ease; }
      .ultra-clear-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line, #d7dee7); }
      .ultra-clear-status { color: var(--muted, #66727f); font-size: 12px; min-height: 18px; }
      .ultra-clear-actions { display: flex; gap: 8px; }
      @media (max-width: 780px) {
        .ultra-clear-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 600px) {
        .ultra-clear-card { padding: 18px; }
        .ultra-clear-footer { align-items: flex-start; flex-direction: column; }
        .ultra-clear-actions { width: 100%; }
        .ultra-clear-actions .btn { flex: 1; }
      }
    \`;
    document.head.appendChild(style);
  }

  function ensureUi() {
    if (document.getElementById('ultraClearModal')) return;
    injectStyles();

    const modal = document.createElement('div');
    modal.id = 'ultraClearModal';
    modal.className = 'ultra-clear-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = \`
      <div class="ultra-clear-card" role="dialog" aria-modal="true" aria-labelledby="ultraClearTitle">
        <div class="ultra-clear-head">
          <div>
            <div class="eyebrow">IMAGE ENHANCEMENT</div>
            <h2 id="ultraClearTitle">Ultra Clear JPG / PNG</h2>
            <p class="subtext">Upscale and improve edge definition locally on your device.</p>
          </div>
          <button class="preview-tool close" id="ultraClearCloseBtn" type="button" title="Close">✕</button>
        </div>

        <input id="ultraClearInput" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple hidden />

        <div id="ultraClearDrop" class="ultra-clear-drop">
          <strong>Drop JPG or PNG files here</strong>
          <span>Select one or more images to enhance.</span>
          <button id="ultraClearBrowseBtn" class="btn btn-secondary" type="button">Choose images</button>
        </div>

        <div class="ultra-clear-options">
          <label class="ultra-clear-field">Output
            <select id="ultraClearFormat">
              <option value="png" selected>PNG · lossless</option>
              <option value="jpg">JPG · 96% quality</option>
            </select>
          </label>
          <label class="ultra-clear-field">Upscale
            <select id="ultraClearScale">
              <option value="1">1× · original size</option>
              <option value="2" selected>2× · enlarged</option>
              <option value="3">3× · maximum</option>
            </select>
          </label>
          <label class="ultra-clear-field">Clarity
            <select id="ultraClearClarity">
              <option value="high">High</option>
              <option value="ultra" selected>Ultra</option>
              <option value="maximum">Maximum</option>
            </select>
          </label>
          <label class="ultra-clear-field">JPG quality
            <select id="ultraClearQuality">
              <option value="0.92">92%</option>
              <option value="0.96" selected>96%</option>
              <option value="0.98">98%</option>
            </select>
          </label>
        </div>

        <div id="ultraClearFileList" class="ultra-clear-list"></div>
        <p class="ultra-clear-note">The enhancement uses high-quality browser resampling plus a clarity pass. It can improve perceived sharpness and readability, but it cannot recreate detail that was never present in the source image. Large images are automatically capped to a safe working size to prevent memory failures.</p>
        <div id="ultraClearProgress" class="ultra-clear-progress"><span></span></div>

        <div class="ultra-clear-footer">
          <div class="ultra-clear-status" id="ultraClearStatus">No images selected.</div>
          <div class="ultra-clear-actions">
            <button class="btn btn-secondary" id="ultraClearClearBtn" type="button">Clear</button>
            <button class="btn btn-primary" id="ultraClearRunBtn" type="button" disabled>Enhance &amp; Save</button>
          </div>
        </div>
      </div>
    \`;
    document.body.appendChild(modal);

    const format = document.getElementById('ultraClearFormat');
    const scale = document.getElementById('ultraClearScale');
    const clarity = document.getElementById('ultraClearClarity');
    const quality = document.getElementById('ultraClearQuality');

    format?.addEventListener('change', () => {
      state.outputFormat = format.value;
      syncQualityAvailability();
    });
    scale?.addEventListener('change', () => { state.scale = scale.value; });
    clarity?.addEventListener('change', () => { state.clarity = clarity.value; });
    quality?.addEventListener('change', () => { state.quality = quality.value; });

    document.getElementById('ultraClearCloseBtn')?.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.getElementById('ultraClearBrowseBtn')?.addEventListener('click', () => document.getElementById('ultraClearInput')?.click());
    document.getElementById('ultraClearInput')?.addEventListener('change', event => {
      addFiles(event.target.files);
      event.target.value = '';
    });
    document.getElementById('ultraClearClearBtn')?.addEventListener('click', clearFiles);
    document.getElementById('ultraClearRunBtn')?.addEventListener('click', enhanceAndSave);

    const drop = document.getElementById('ultraClearDrop');
    if (drop) {
      ['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, event => {
        event.preventDefault();
        drop.classList.add('dragover');
      }));
      ['dragleave', 'drop'].forEach(type => drop.addEventListener(type, event => {
        event.preventDefault();
        drop.classList.remove('dragover');
      }));
      drop.addEventListener('drop', event => addFiles(event.dataTransfer.files));
    }

    syncQualityAvailability();
    renderFiles();
  }

  function syncQualityAvailability() {
    const select = document.getElementById('ultraClearQuality');
    if (!select) return;
    const enabled = state.outputFormat === 'jpg';
    select.disabled = !enabled;
  }

  function isAccepted(file) {
    const name = String(file?.name || '').toLowerCase();
    return file?.type === 'image/jpeg' ||
      file?.type === 'image/png' ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png');
  }

  function addFiles(fileList) {
    if (state.busy) return;
    const incoming = Array.from(fileList || []).filter(isAccepted);
    if (!incoming.length) {
      toast('Please choose JPG or PNG files only.', 'error');
      return;
    }

    const existingKeys = new Set(state.files.map(file => \`\${file.name}:\${file.size}:\${file.lastModified}\`));
    incoming.forEach(file => {
      const key = \`\${file.name}:\${file.size}:\${file.lastModified}\`;
      if (!existingKeys.has(key)) {
        state.files.push(file);
        existingKeys.add(key);
      }
    });
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
    const list = document.getElementById('ultraClearFileList');
    const status = document.getElementById('ultraClearStatus');
    const run = document.getElementById('ultraClearRunBtn');
    if (!list || !status || !run) return;

    list.innerHTML = state.files.map((file, index) => \`
      <div class="ultra-clear-file">
        <div class="ultra-clear-file-index">\${index + 1}</div>
        <div class="ultra-clear-file-name" title="\${esc(file.name)}">\${esc(file.name)}</div>
        <button class="ultra-clear-file-remove" type="button" data-index="\${index}" title="Remove">✕</button>
      </div>\`).join('');

    list.querySelectorAll('.ultra-clear-file-remove').forEach(button => {
      button.addEventListener('click', () => removeFile(Number(button.dataset.index)));
    });

    status.textContent = state.files.length
      ? \`\${state.files.length} image\${state.files.length === 1 ? '' : 's'} selected.\`
      : 'No images selected.';

    run.disabled = state.busy || !state.files.length;
  }

  function getSafeTargetSize(width, height, scale) {
    const requestedScale = Math.max(1, Number(scale) || 1);
    let targetWidth = Math.max(1, Math.round(width * requestedScale));
    let targetHeight = Math.max(1, Math.round(height * requestedScale));

    // Keep the renderer well inside normal desktop memory limits.
    const maxDimension = 9000;
    const maxPixels = 32000000;
    const dimensionRatio = Math.min(1, maxDimension / Math.max(targetWidth, targetHeight));
    const pixelRatio = Math.min(1, Math.sqrt(maxPixels / (targetWidth * targetHeight)));
    const ratio = Math.min(dimensionRatio, pixelRatio);

    targetWidth = Math.max(1, Math.round(targetWidth * ratio));
    targetHeight = Math.max(1, Math.round(targetHeight * ratio));

    return { width: targetWidth, height: targetHeight };
  }

  function getClarityConfig(name) {
    if (name === 'maximum') {
      return { contrast: 1.13, saturation: 1.055, brightness: 1.01, overlay: 0.10, sharpen: 0.13 };
    }
    if (name === 'high') {
      return { contrast: 1.07, saturation: 1.025, brightness: 1.005, overlay: 0.06, sharpen: 0.08 };
    }
    return { contrast: 1.10, saturation: 1.04, brightness: 1.008, overlay: 0.08, sharpen: 0.11 };
  }

  async function loadBitmap(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image', premultiplyAlpha: 'default' });
      } catch {
        // Fall back to HTMLImageElement below.
      }
    }

    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function enhanceBitmap(bitmap, scale, clarityName) {
    const size = getSafeTargetSize(bitmap.width, bitmap.height, scale);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('Could not create an image canvas.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const clarity = getClarityConfig(clarityName);
    ctx.filter = \`contrast(\${clarity.contrast}) saturate(\${clarity.saturation}) brightness(\${clarity.brightness})\`;
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    ctx.filter = 'none';

    // A subtle overlay pass adds local edge definition without heavy pixel-by-pixel
    // processing, keeping the tool responsive on large scanned documents.
    const overlay = document.createElement('canvas');
    overlay.width = size.width;
    overlay.height = size.height;
    const octx = overlay.getContext('2d', { alpha: false });
    if (octx && clarity.overlay > 0) {
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = 'high';
      octx.filter = 'contrast(1.04)';
      octx.drawImage(bitmap, 0, 0, size.width, size.height);
      octx.filter = 'blur(0.55px)';
      octx.globalAlpha = clarity.sharpen;
      octx.globalCompositeOperation = 'overlay';
      octx.drawImage(overlay, 0, 0);
      ctx.save();
      ctx.globalAlpha = clarity.overlay;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.drawImage(overlay, 0, 0);
      ctx.restore();
    }

    if (typeof bitmap.close === 'function') bitmap.close();
    return canvas;
  }

  function canvasToBlob(canvas, format, quality) {
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob
        ? resolve(blob)
        : reject(new Error('Could not create the enhanced image.')), mime, Number(quality) || 0.96);
    });
  }

  function baseName(name) {
    return String(name || 'image').replace(/\.(jpe?g|png)$/i, '').trim() || 'image';
  }

  function safeFileName(name) {
    return String(name || 'enhanced-image').replace(/[\\\\/:*?"<>|]+/g, '-').trim() || 'enhanced-image';
  }

  async function saveOne(blob, filename) {
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: state.outputFormat === 'jpg' ? 'JPEG image' : 'PNG image',
            accept: state.outputFormat === 'jpg'
              ? { 'image/jpeg': ['.jpg'] }
              : { 'image/png': ['.png'] },
          }],
          excludeAcceptAllOption: true,
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return 'saved';
      } catch (error) {
        if (error?.name === 'AbortError') return 'cancelled';
        console.warn('Single image save picker failed; using download fallback.', error);
      }
    }

    triggerDownload(blob, filename);
    return 'saved';
  }

  async function saveMany(blobs) {
    if (blobs.length === 1) return saveOne(blobs[0].blob, blobs[0].filename);

    if (window.showDirectoryPicker) {
      try {
        const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
        for (const item of blobs) {
          const fileHandle = await directory.getFileHandle(item.filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(item.blob);
          await writable.close();
        }
        return 'saved';
      } catch (error) {
        if (error?.name === 'AbortError') return 'cancelled';
        console.warn('Directory save failed; using download fallback.', error);
      }
    }

    blobs.forEach((item, index) => triggerDownload(item.blob, item.filename, index * 220));
    return 'saved';
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
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }, delay);
  }

  function setBusy(value) {
    state.busy = value;
    const run = document.getElementById('ultraClearRunBtn');
    const clear = document.getElementById('ultraClearClearBtn');
    if (run) {
      run.disabled = value || !state.files.length;
      run.textContent = value ? 'Enhancing…' : 'Enhance & Save';
    }
    if (clear) clear.disabled = value;
    renderFiles();
  }

  function setProgress(percent, label) {
    const progress = document.getElementById('ultraClearProgress');
    const bar = progress?.querySelector('span');
    const status = document.getElementById('ultraClearStatus');
    if (progress) progress.style.display = 'block';
    if (bar) bar.style.width = \`\${Math.max(0, Math.min(100, percent))}%\`;
    if (status && label) status.textContent = label;
  }

  async function enhanceAndSave() {
    if (state.busy || !state.files.length) return;

    const files = state.files.slice();
    const format = document.getElementById('ultraClearFormat')?.value || state.outputFormat;
    const scale = document.getElementById('ultraClearScale')?.value || state.scale;
    const clarity = document.getElementById('ultraClearClarity')?.value || state.clarity;
    const quality = document.getElementById('ultraClearQuality')?.value || state.quality;

    state.outputFormat = format;
    state.scale = scale;
    state.clarity = clarity;
    state.quality = quality;

    setBusy(true);

    try {
      const outputs = [];

      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        setProgress((index / files.length) * 100, \`Enhancing \${index + 1} of \${files.length}…\`);

        const bitmap = await loadBitmap(file);
        const canvas = enhanceBitmap(bitmap, scale, clarity);
        const blob = await canvasToBlob(canvas, format, quality);
        const extension = format === 'jpg' ? 'jpg' : 'png';
        const filename = safeFileName(\`\${baseName(file.name)} - Ultra Clear.\${extension}\`);
        outputs.push({ blob, filename });
        canvas.width = 1;
        canvas.height = 1;
      }

      setProgress(96, outputs.length === 1 ? 'Ready to save the enhanced image…' : \`Ready to save \${outputs.length} enhanced images…\`);
      const result = await saveMany(outputs);

      if (result === 'cancelled') {
        setProgress(0, 'Save cancelled.');
        toast('Image enhancement completed, but saving was cancelled.', 'info');
      } else {
        setProgress(100, outputs.length === 1
          ? 'Ultra Clear image saved successfully.'
          : \`\${outputs.length} Ultra Clear images saved successfully.\`);
        toast(outputs.length === 1 ? 'Ultra Clear image saved.' : \`\${outputs.length} Ultra Clear images saved.\`, 'success');
      }
    } catch (error) {
      console.error('Ultra Clear image enhancement failed.', error);
      setProgress(0, 'Enhancement failed.');
      toast(\`Could not enhance the selected image\${error?.message ? \`: \${error.message}\` : '.'}\`, 'error');
    } finally {
      setBusy(false);
      setTimeout(() => {
        const progress = document.getElementById('ultraClearProgress');
        const bar = progress?.querySelector('span');
        if (progress) progress.style.display = 'none';
        if (bar) bar.style.width = '0';
      }, 900);
    }
  }

  function open() {
    const modal = document.getElementById('ultraClearModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    renderFiles();
  }

  function close() {
    if (state.busy) return;
    const modal = document.getElementById('ultraClearModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.converter-modal.open, .pdf-preview-modal.open, .packet-compress-panel.open, .save-export-modal.open')) {
      document.body.classList.remove('modal-open');
    }
  }

  function init() {
    ensureUi();
    const button = document.getElementById('ultraClearBtn');
    button?.addEventListener('click', open);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.getElementById('ultraClearModal')?.classList.contains('open')) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
