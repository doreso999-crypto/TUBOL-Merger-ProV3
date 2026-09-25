/* Ultra Clear v2 — stronger local JPG/PNG enhancement. */
(() => {
  'use strict';

  const STYLE_ID = 'ultra-clear-v2-style';

  function toast(message, type) {
    if (typeof window.toast === 'function') return window.toast(message, type);
    const el = document.querySelector('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast ' + (type || 'info') + ' show';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#ultraClearV2Modal{position:fixed;inset:0;z-index:160;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(15,23,42,.54)}',
      '#ultraClearV2Modal.open{display:flex}',
      '.ultra-v2-card{width:min(760px,100%);max-height:calc(100vh - 44px);overflow:auto;background:var(--surface,#fff);color:var(--text,#17202a);border:1px solid var(--line,#d7dee7);border-radius:18px;padding:24px;box-shadow:0 24px 70px rgba(15,23,42,.24)}',
      '.ultra-v2-head{display:flex;justify-content:space-between;gap:18px;margin-bottom:18px}',
      '.ultra-v2-head h2{margin:2px 0 5px;font-size:23px}',
      '.ultra-v2-drop{border:1.5px dashed var(--line,#d7dee7);border-radius:14px;padding:28px 20px;text-align:center;background:var(--surface-2,#f8fafc)}',
      '.ultra-v2-drop.drag{border-color:var(--accent,#2563eb);background:#f0f5ff}',
      '.ultra-v2-drop strong{display:block;margin-bottom:5px}',
      '.ultra-v2-drop span{color:var(--muted,#66727f);font-size:13px}',
      '.ultra-v2-drop .btn{margin-top:14px}',
      '.ultra-v2-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}',
      '.ultra-v2-field{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:700}',
      '.ultra-v2-field select{min-height:42px;padding:9px 10px;border-radius:10px;border:1px solid var(--line,#d7dee7);background:var(--surface,#fff);color:var(--text,#17202a)}',
      '.ultra-v2-list{display:grid;gap:7px;margin-top:15px;max-height:220px;overflow:auto}',
      '.ultra-v2-file{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line,#d7dee7);border-radius:10px}',
      '.ultra-v2-name{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}',
      '.ultra-v2-status{margin-top:12px;min-height:18px;color:var(--muted,#66727f);font-size:12px}',
      '.ultra-v2-progress{height:6px;background:var(--surface-2,#edf1f5);border-radius:999px;overflow:hidden;margin-top:12px;display:none}',
      '.ultra-v2-progress span{display:block;height:100%;width:0;background:var(--accent,#2563eb);transition:width .2s ease}',
      '.ultra-v2-foot{display:flex;justify-content:space-between;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line,#d7dee7)}',
      '@media(max-width:650px){.ultra-v2-grid{grid-template-columns:1fr}.ultra-v2-foot{flex-direction:column}.ultra-v2-foot .btn{width:100%}}'
    ].join('');
    document.head.appendChild(style);
  }

  const state = { files: [], busy: false };

  function safeName(name) {
    return String(name || 'image').replace(/.(jpe?g|png)$/i, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'image';
  }

  function accepted(file) {
    const n = String(file?.name || '').toLowerCase();
    return file?.type === 'image/jpeg' || file?.type === 'image/png' || /\.(jpe?g|png)$/.test(n);
  }

  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    return img;
  }

  function canvasFor(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function renderScaled(source, w, h) {
    let current = canvasFor(source.width, source.height);
    let c = current.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(source, 0, 0);

    while (current.width < w || current.height < h) {
      const nw = Math.min(w, Math.max(current.width + 1, Math.round(current.width * 1.5)));
      const nh = Math.min(h, Math.max(current.height + 1, Math.round(current.height * 1.5)));
      const next = canvasFor(nw, nh);
      const nctx = next.getContext('2d');
      nctx.imageSmoothingEnabled = true;
      nctx.imageSmoothingQuality = 'high';
      nctx.drawImage(current, 0, 0, nw, nh);
      current.width = 1;
      current.height = 1;
      current = next;
    }

    if (current.width !== w || current.height !== h) {
      const next = canvasFor(w, h);
      const nctx = next.getContext('2d');
      nctx.imageSmoothingEnabled = true;
      nctx.imageSmoothingQuality = 'high';
      nctx.drawImage(current, 0, 0, w, h);
      current.width = 1;
      current.height = 1;
      current = next;
    }
    return current;
  }

  function enhanceCanvas(canvas, strength, documentMode) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const w = canvas.width, h = canvas.height;
    const frame = ctx.getImageData(0, 0, w, h);
    const src = frame.data;
    const dst = new Uint8ClampedArray(src);
    const stride = w * 4;

    for (let y = 1; y < h - 1; y++) {
      const row = y * stride;
      for (let x = 1; x < w - 1; x++) {
        const i = row + x * 4;
        let r = src[i], g = src[i + 1], b = src[i + 2];

        const n1 = i - stride, n2 = i + stride, l = i - 4, rr = i + 4;
        const blurR = (src[n1] + 2 * src[n1 + 4] + src[n1 + 8] + 2 * src[l] + 4 * r + 2 * src[rr] + src[n2 - 4] + 2 * src[n2] + src[n2 + 4]) / 16;
        const blurG = (src[n1 + 1] + 2 * src[n1 + 5] + src[n1 + 9] + 2 * src[l + 1] + 4 * g + 2 * src[rr + 1] + src[n2 - 3] + 2 * src[n2 + 1] + src[n2 + 5]) / 16;
        const blurB = (src[n1 + 2] + 2 * src[n1 + 6] + src[n1 + 10] + 2 * src[l + 2] + 4 * b + 2 * src[rr + 2] + src[n2 - 2] + 2 * src[n2 + 2] + src[n2 + 6]) / 16;

        r += Math.max(-38, Math.min(38, (r - blurR) * strength));
        g += Math.max(-38, Math.min(38, (g - blurG) * strength));
        b += Math.max(-38, Math.min(38, (b - blurB) * strength));

        const lum = .2126 * r + .7152 * g + .0722 * b;
        const local = (.2126 * (r - blurR) + .7152 * (g - blurG) + .0722 * (b - blurB));
        const lc = documentMode ? 0.18 : 0.11;

        r += local * lc;
        g += local * lc;
        b += local * lc;

        if (documentMode) {
          if (lum < 105) { r *= 1.035; g *= 1.035; b *= 1.035; }
          if (lum > 220) {
            r = 255 - (255 - r) * .92;
            g = 255 - (255 - g) * .92;
            b = 255 - (255 - b) * .92;
          }
        }

        const mean = (r + g + b) / 3;
        r = mean + (r - mean) * 1.025;
        g = mean + (g - mean) * 1.025;
        b = mean + (b - mean) * 1.025;

        dst[i] = Math.max(0, Math.min(255, r));
        dst[i + 1] = Math.max(0, Math.min(255, g));
        dst[i + 2] = Math.max(0, Math.min(255, b));
        dst[i + 3] = 255;
      }
    }
    ctx.putImageData(new ImageData(dst, w, h), 0, 0);
    return canvas;
  }

  function blob(canvas, format, quality) {
    return new Promise((resolve, reject) => {
      const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Image export failed.')), mime, quality);
    });
  }

  function download(b, name, delay) {
    setTimeout(() => {
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 2500);
    }, delay || 0);
  }

  async function saveBatch(items) {
    if (items.length === 1 && window.showSaveFilePicker) {
      const item = items[0];
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: item.name,
          types: [{
            description: item.format === 'jpg' ? 'JPEG image' : 'PNG image',
            accept: item.format === 'jpg' ? { 'image/jpeg': ['.jpg'] } : { 'image/png': ['.png'] }
          }],
          excludeAcceptAllOption: true
        });
        const writable = await handle.createWritable();
        await writable.write(item.blob);
        await writable.close();
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }

    if (items.length > 1 && window.showDirectoryPicker) {
      try {
        const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
        for (const item of items) {
          const fh = await dir.getFileHandle(item.name, { create: true });
          const w = await fh.createWritable();
          await w.write(item.blob);
          await w.close();
        }
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }

    items.forEach((item, i) => download(item.blob, item.name, i * 220));
  }

  function openModal() {
    const m = document.getElementById('ultraClearV2Modal');
    if (!m) return;
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    drawList();
  }

  function closeModal() {
    if (state.busy) return;
    const m = document.getElementById('ultraClearV2Modal');
    if (!m) return;
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.converter-modal.open,.pdf-preview-modal.open,.packet-compress-panel.open,.save-export-modal.open')) {
      document.body.classList.remove('modal-open');
    }
  }

  function drawList() {
    const list = document.getElementById('ultraClearV2List');
    const run = document.getElementById('ultraClearV2Run');
    const status = document.getElementById('ultraClearV2Status');
    if (!list || !run || !status) return;
    list.innerHTML = state.files.map((f, i) =>
      '<div class="ultra-v2-file"><strong>' + (i + 1) + '</strong><div class="ultra-v2-name" title="' + String(f.name).replace(/"/g, '&quot;') + '">' + String(f.name).replace(/[&<>]/g, '') + '</div><button class="mini-btn" type="button" data-remove="' + i + '">Remove</button></div>'
    ).join('');
    list.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
      state.files.splice(Number(b.dataset.remove), 1);
      drawList();
    }));
    status.textContent = state.files.length ? state.files.length + ' image' + (state.files.length === 1 ? '' : 's') + ' selected.' : 'No images selected.';
    run.disabled = state.busy || !state.files.length;
  }

  async function run() {
    if (state.busy || !state.files.length) return;
    state.busy = true;
    drawList();

    const scale = Number(document.getElementById('ultraClearV2Scale')?.value || 2);
    const strength = Number(document.getElementById('ultraClearV2Strength')?.value || 1.8);
    const mode = document.getElementById('ultraClearV2Mode')?.value || 'document';
    const format = document.getElementById('ultraClearV2Format')?.value || 'png';
    const quality = Number(document.getElementById('ultraClearV2Quality')?.value || .97);
    const maxPixels = 18000000;
    const progress = document.getElementById('ultraClearV2Progress');
    const bar = progress?.querySelector('span');
    const status = document.getElementById('ultraClearV2Status');

    try {
      const outputs = [];
      for (let i = 0; i < state.files.length; i++) {
        const file = state.files[i];
        if (status) status.textContent = 'Enhancing ' + (i + 1) + ' of ' + state.files.length + '…';
        if (progress) progress.style.display = 'block';

        const image = await decode(file);
        let w = Math.round(image.width * scale), h = Math.round(image.height * scale);
        if (w * h > maxPixels) {
          const ratio = Math.sqrt(maxPixels / (w * h));
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
        }

        const canvas = renderScaled(image, w, h);
        if (typeof image.close === 'function') image.close();
        enhanceCanvas(canvas, strength, mode === 'document');

        const out = await blob(canvas, format, quality);
        const ext = format === 'jpg' ? 'jpg' : 'png';
        outputs.push({ blob: out, name: safeName(file.name) + ' - Ultra Clear.' + ext, format });

        canvas.width = 1;
        canvas.height = 1;
        if (bar) bar.style.width = Math.round(((i + 1) / state.files.length) * 100) + '%';
      }

      await saveBatch(outputs);
      if (status) status.textContent = 'Ultra Clear processing completed.';
      toast('Ultra Clear image saved.', 'success');
    } catch (e) {
      console.error('Ultra Clear v2 failed', e);
      if (status) status.textContent = 'Enhancement failed: ' + (e?.message || 'unknown error');
      toast('Could not enhance the selected image.', 'error');
    } finally {
      state.busy = false;
      drawList();
      setTimeout(() => {
        if (progress) progress.style.display = 'none';
        if (bar) bar.style.width = '0';
      }, 700);
    }
  }

  function buildUi() {
    addStyle();

    const old = document.getElementById('ultraClearBtn');
    if (old) {
      const replacement = old.cloneNode(true);
      replacement.id = 'ultraClearBtnV2';
      replacement.textContent = '✦ Ultra Clear';
      old.replaceWith(replacement);
      replacement.addEventListener('click', openModal);
    }

    if (document.getElementById('ultraClearV2Modal')) return;

    const modal = document.createElement('div');
    modal.id = 'ultraClearV2Modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '<div class="ultra-v2-card" role="dialog" aria-modal="true" aria-labelledby="ultraClearV2Title">' +
      '<div class="ultra-v2-head"><div><div class="eyebrow">IMAGE ENHANCEMENT</div><h2 id="ultraClearV2Title">Ultra Clear JPG / PNG</h2><p class="subtext">Stronger enlargement, sharpening and local contrast for scans and screenshots.</p></div><button class="preview-tool close" id="ultraClearV2Close" type="button">✕</button></div>' +
      '<input id="ultraClearV2Input" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple hidden>' +
      '<div id="ultraClearV2Drop" class="ultra-v2-drop"><strong>Drop JPG or PNG files here</strong><span>For best results, use the original image rather than a compressed screenshot.</span><br><button class="btn btn-secondary" id="ultraClearV2Browse" type="button">Choose images</button></div>' +
      '<div class="ultra-v2-grid">' +
      '<label class="ultra-v2-field">Mode<select id="ultraClearV2Mode"><option value="document" selected>Document / Scan</option><option value="photo">Photo / Color</option></select></label>' +
      '<label class="ultra-v2-field">Upscale<select id="ultraClearV2Scale"><option value="1">1×</option><option value="2" selected>2×</option><option value="3">3×</option></select></label>' +
      '<label class="ultra-v2-field">Strength<select id="ultraClearV2Strength"><option value="1.2">Strong</option><option value="1.8" selected>Ultra</option><option value="2.2">Maximum</option></select></label>' +
      '</div>' +
      '<div class="ultra-v2-grid">' +
      '<label class="ultra-v2-field">Output<select id="ultraClearV2Format"><option value="png" selected>PNG · lossless</option><option value="jpg">JPG</option></select></label>' +
      '<label class="ultra-v2-field">JPG quality<select id="ultraClearV2Quality"><option value=".94">94%</option><option value=".97" selected>97%</option><option value=".99">99%</option></select></label>' +
      '<div></div></div>' +
      '<div id="ultraClearV2List" class="ultra-v2-list"></div>' +
      '<div id="ultraClearV2Status" class="ultra-v2-status">No images selected.</div>' +
      '<div id="ultraClearV2Progress" class="ultra-v2-progress"><span></span></div>' +
      '<div class="ultra-v2-foot"><button class="btn btn-secondary" id="ultraClearV2Clear" type="button">Clear</button><button class="btn btn-primary" id="ultraClearV2Run" type="button" disabled>Enhance &amp; Save</button></div>' +
      '</div>';
    document.body.appendChild(modal);

    document.getElementById('ultraClearV2Close')?.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.getElementById('ultraClearV2Browse')?.addEventListener('click', () => document.getElementById('ultraClearV2Input')?.click());
    document.getElementById('ultraClearV2Input')?.addEventListener('change', e => {
      state.files.push(...Array.from(e.target.files || []).filter(accepted));
      e.target.value = '';
      drawList();
    });
    document.getElementById('ultraClearV2Clear')?.addEventListener('click', () => {
      if (state.busy) return;
      state.files = [];
      drawList();
    });
    document.getElementById('ultraClearV2Run')?.addEventListener('click', run);

    const drop = document.getElementById('ultraClearV2Drop');
    if (drop) {
      ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
      ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
      drop.addEventListener('drop', e => {
        state.files.push(...Array.from(e.dataTransfer?.files || []).filter(accepted));
        drawList();
      });
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('ultraClearV2Modal')?.classList.contains('open')) closeModal();
    });

    drawList();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUi, { once: true });
  else buildUi();
})();
