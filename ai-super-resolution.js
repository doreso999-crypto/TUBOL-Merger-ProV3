/* PDF Workspace — AI Super Resolution using ONNX Runtime Web + Real-ESRGAN x4. */
(() => {
  'use strict';

  const MODEL_URL = 'https://huggingface.co/SceneWorks/real-esrgan-onnx/resolve/main/real_esrgan_x4.onnx?download=true';
  const ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
  const TILE = 512;
  const PAD = 16;

  let sessionPromise = null;
  let modelBytes = null;

  const state = { files: [], busy: false };

  function toast(message, type) {
    if (typeof window.toast === 'function') return window.toast(message, type);
    const el = document.querySelector('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast ' + (type || 'info') + ' show';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  function style() {
    if (document.getElementById('ai-super-resolution-style')) return;
    const s = document.createElement('style');
    s.id = 'ai-super-resolution-style';
    s.textContent = [
      '#aiEnhanceBtn{white-space:nowrap}',
      '.ai-sr-modal{position:fixed;inset:0;z-index:170;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(15,23,42,.58)}',
      '.ai-sr-modal.open{display:flex}',
      '.ai-sr-card{width:min(760px,100%);max-height:calc(100vh - 44px);overflow:auto;background:var(--surface,#fff);color:var(--text,#17202a);border:1px solid var(--line,#d7dee7);border-radius:18px;padding:24px;box-shadow:0 24px 80px rgba(15,23,42,.28)}',
      '.ai-sr-head{display:flex;justify-content:space-between;gap:18px;margin-bottom:18px}',
      '.ai-sr-head h2{margin:2px 0 5px;font-size:23px}',
      '.ai-sr-drop{border:1.5px dashed var(--line,#d7dee7);border-radius:14px;padding:28px 20px;text-align:center;background:var(--surface-2,#f8fafc)}',
      '.ai-sr-drop.drag{border-color:var(--accent,#2563eb);background:#f0f5ff}',
      '.ai-sr-drop strong{display:block;margin-bottom:5px}',
      '.ai-sr-drop span{color:var(--muted,#66727f);font-size:13px}',
      '.ai-sr-drop .btn{margin-top:14px}',
      '.ai-sr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}',
      '.ai-sr-field{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:700}',
      '.ai-sr-field select{min-height:42px;padding:9px 10px;border-radius:10px;border:1px solid var(--line,#d7dee7);background:var(--surface,#fff);color:var(--text,#17202a)}',
      '.ai-sr-list{display:grid;gap:7px;margin-top:15px;max-height:210px;overflow:auto}',
      '.ai-sr-file{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line,#d7dee7);border-radius:10px}',
      '.ai-sr-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}',
      '.ai-sr-status{margin-top:12px;min-height:18px;color:var(--muted,#66727f);font-size:12px}',
      '.ai-sr-progress{height:6px;margin-top:12px;background:var(--surface-2,#edf1f5);border-radius:999px;overflow:hidden;display:none}',
      '.ai-sr-progress span{display:block;height:100%;width:0;background:var(--accent,#2563eb);transition:width .2s ease}',
      '.ai-sr-note{margin:12px 0 0;color:var(--muted,#66727f);font-size:11px;line-height:1.5}',
      '.ai-sr-foot{display:flex;justify-content:space-between;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line,#d7dee7)}',
      '@media(max-width:650px){.ai-sr-grid{grid-template-columns:1fr}.ai-sr-foot{flex-direction:column}.ai-sr-foot .btn{width:100%}}'
    ].join('');
    document.head.appendChild(s);
  }

  function accepted(file) {
    const n = String(file?.name || '').toLowerCase();
    return file?.type === 'image/jpeg' || file?.type === 'image/png' || /\.(jpe?g|png)$/.test(n);
  }

  function safeName(name) {
    return String(name || 'image').replace(/\.(jpe?g|png)$/i, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'image';
  }

  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch {}
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function getSession(update) {
    if (sessionPromise) return sessionPromise;
    if (!window.ort) throw new Error('ONNX Runtime Web did not load.');
    window.ort.env.wasm.wasmPaths = ORT_WASM_PATH;
    sessionPromise = (async () => {
      if (!modelBytes) {
        update('Downloading AI model (~67 MB) for first use…');
        const response = await fetch(MODEL_URL, { cache: 'force-cache' });
        if (!response.ok) throw new Error('Could not download the AI model.');
        modelBytes = await response.arrayBuffer();
      }
      update('Loading Real-ESRGAN AI model…');
      try {
        return await window.ort.InferenceSession.create(modelBytes, {
          executionProviders: ['webgpu', 'wasm'],
          graphOptimizationLevel: 'all',
        });
      } catch (gpuError) {
        console.warn('WebGPU AI inference unavailable; falling back to WASM.', gpuError);
        return await window.ort.InferenceSession.create(modelBytes, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
      }
    })();
    try { return await sessionPromise; }
    catch (e) { sessionPromise = null; throw e; }
  }

  function makeTensor(canvas, x, y, w, h) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const image = ctx.getImageData(x, y, w, h).data;
    const data = new Float32Array(3 * w * h);
    const plane = w * h;
    for (let p = 0; p < plane; p++) {
      const s = p * 4;
      data[p] = image[s] / 255;
      data[plane + p] = image[s + 1] / 255;
      data[plane * 2 + p] = image[s + 2] / 255;
    }
    return new window.ort.Tensor('float32', data, [1, 3, h, w]);
  }

  function putTile(target, result, x, y, coreW, coreH, srcX, srcY, padLeft, padTop) {
    const [_, __, outH, outW] = result.dims;
    const output = result.data;
    const scale = 4;
    const plane = outW * outH;
    const coreX = (padLeft * scale);
    const coreY = (padTop * scale);
    const destination = target.getContext('2d');
    const patch = destination.createImageData(coreW * scale, coreH * scale);
    const pd = patch.data;

    for (let yy = 0; yy < coreH * scale; yy++) {
      const sy = Math.min(outH - 1, coreY + yy);
      for (let xx = 0; xx < coreW * scale; xx++) {
        const sx = Math.min(outW - 1, coreX + xx);
        const p = sy * outW + sx;
        const d = (yy * coreW * scale + xx) * 4;
        pd[d] = Math.max(0, Math.min(255, Math.round(output[p] * 255)));
        pd[d + 1] = Math.max(0, Math.min(255, Math.round(output[plane + p] * 255)));
        pd[d + 2] = Math.max(0, Math.min(255, Math.round(output[plane * 2 + p] * 255)));
        pd[d + 3] = 255;
      }
    }
    destination.putImageData(patch, x * scale, y * scale);
  }

  async function aiUpscale(image, session, update) {
    const source = document.createElement('canvas');
    source.width = image.width;
    source.height = image.height;
    const sctx = source.getContext('2d', { alpha: false });
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(image, 0, 0);

    const target = document.createElement('canvas');
    target.width = image.width * 4;
    target.height = image.height * 4;
    const tctx = target.getContext('2d', { alpha: false });
    tctx.fillStyle = '#fff';
    tctx.fillRect(0, 0, target.width, target.height);

    const nx = Math.ceil(source.width / TILE);
    const ny = Math.ceil(source.height / TILE);
    const total = nx * ny;
    let done = 0;

    for (let ty = 0; ty < ny; ty++) {
      for (let tx = 0; tx < nx; tx++) {
        const coreX = tx * TILE;
        const coreY = ty * TILE;
        const coreW = Math.min(TILE, source.width - coreX);
        const coreH = Math.min(TILE, source.height - coreY);
        const left = Math.min(PAD, coreX);
        const top = Math.min(PAD, coreY);
        const right = Math.min(PAD, source.width - coreX - coreW);
        const bottom = Math.min(PAD, source.height - coreY - coreH);
        const sx = coreX - left;
        const sy = coreY - top;
        const tw = coreW + left + right;
        const th = coreH + top + bottom;

        const tensor = makeTensor(source, sx, sy, tw, th);
        const feeds = {};
        feeds[session.inputNames[0]] = tensor;
        const resultMap = await session.run(feeds);
        const result = resultMap[session.outputNames[0]];
        putTile(target, result, coreX, coreY, coreW, coreH, sx, sy, left, top);
        done++;
        update('AI enhancing tile ' + done + ' of ' + total + '…');
      }
    }

    return target;
  }

  function saveBlob(blob, name, format) {
    if (window.showSaveFilePicker) {
      return window.showSaveFilePicker({
        suggestedName: name,
        types: [{
          description: format === 'jpg' ? 'JPEG image' : 'PNG image',
          accept: format === 'jpg' ? { 'image/jpeg': ['.jpg'] } : { 'image/png': ['.png'] }
        }],
        excludeAcceptAllOption: true
      }).then(async handle => {
        const writer = await handle.createWritable();
        await writer.write(blob);
        await writer.close();
      }).catch(e => {
        if (e?.name === 'AbortError') return;
        throw e;
      });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
    return Promise.resolve();
  }

  function buildUi() {
    style();
    const actions = document.querySelector('.header-actions');
    if (!actions || document.getElementById('aiEnhanceBtn')) return;

    const button = document.createElement('button');
    button.id = 'aiEnhanceBtn';
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.title = 'AI image super-resolution using Real-ESRGAN';
    button.textContent = '✦ AI Enhance';
    const anchor = document.getElementById('ultraClearBtnV2') || document.getElementById('ultraClearBtn');
    if (anchor && anchor.parentElement === actions) anchor.insertAdjacentElement('afterend', button);
    else actions.insertBefore(button, actions.firstChild);

    const modal = document.createElement('div');
    modal.id = 'aiSuperResolutionModal';
    modal.className = 'ai-sr-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '<div class="ai-sr-card" role="dialog" aria-modal="true" aria-labelledby="aiSrTitle">' +
      '<div class="ai-sr-head"><div><div class="eyebrow">LOCAL AI IMAGE ENHANCEMENT</div><h2 id="aiSrTitle">AI Super Resolution</h2><p class="subtext">Real-ESRGAN x4 runs on this device through ONNX Runtime. Your image is not uploaded.</p></div><button class="preview-tool close" id="aiSrClose" type="button">✕</button></div>' +
      '<input id="aiSrInput" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple hidden>' +
      '<div id="aiSrDrop" class="ai-sr-drop"><strong>Drop JPG or PNG files here</strong><span>First use downloads the AI model once; the model can then be cached by the browser.</span><br><button class="btn btn-secondary" id="aiSrBrowse" type="button">Choose images</button></div>' +
      '<div class="ai-sr-grid"><label class="ai-sr-field">Output<select id="aiSrFormat"><option value="png" selected>PNG · lossless</option><option value="jpg">JPG · 97% quality</option></select></label><label class="ai-sr-field">AI model<select id="aiSrModel"><option selected>Real-ESRGAN x4 · general images</option></select></label></div>' +
      '<div id="aiSrList" class="ai-sr-list"></div>' +
      '<div id="aiSrStatus" class="ai-sr-status">No images selected.</div>' +
      '<div id="aiSrProgress" class="ai-sr-progress"><span></span></div>' +
      '<p class="ai-sr-note">Real-ESRGAN is designed for practical image restoration and super-resolution. The bundled model source is distributed under BSD-3-Clause. AI can reconstruct plausible detail, but it cannot guarantee recovery of text that is completely absent from the source.</p>' +
      '<div class="ai-sr-foot"><button class="btn btn-secondary" id="aiSrClear" type="button">Clear</button><button class="btn btn-primary" id="aiSrRun" type="button" disabled>AI Enhance &amp; Save</button></div>' +
      '</div>';
    document.body.appendChild(modal);

    const status = document.getElementById('aiSrStatus');
    const list = document.getElementById('aiSrList');
    const runBtn = document.getElementById('aiSrRun');

    const draw = () => {
      list.innerHTML = state.files.map((f, i) =>
        '<div class="ai-sr-file"><strong>' + (i + 1) + '</strong><div class="ai-sr-name" title="' + f.name.replace(/"/g, '&quot;') + '">' + f.name.replace(/[&<>]/g, '') + '</div><button class="mini-btn" type="button" data-ai-remove="' + i + '">Remove</button></div>'
      ).join('');
      list.querySelectorAll('[data-ai-remove]').forEach(b => b.addEventListener('click', () => {
        state.files.splice(Number(b.dataset.aiRemove), 1);
        draw();
      }));
      status.textContent = state.files.length ? state.files.length + ' image' + (state.files.length === 1 ? '' : 's') + ' selected.' : 'No images selected.';
      runBtn.disabled = state.busy || !state.files.length;
    };

    const open = () => {
      if (state.busy) return;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      draw();
    };

    const close = () => {
      if (state.busy) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      if (!document.querySelector('.converter-modal.open,.pdf-preview-modal.open,.packet-compress-panel.open,.save-export-modal.open,.ultra-clear-modal.open')) document.body.classList.remove('modal-open');
    };

    button.addEventListener('click', open);
    document.getElementById('aiSrClose').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });

    document.getElementById('aiSrBrowse').addEventListener('click', () => document.getElementById('aiSrInput').click());
    document.getElementById('aiSrInput').addEventListener('change', e => {
      state.files.push(...Array.from(e.target.files || []).filter(accepted));
      e.target.value = '';
      draw();
    });

    document.getElementById('aiSrClear').addEventListener('click', () => {
      if (state.busy) return;
      state.files = [];
      draw();
    });

    const drop = document.getElementById('aiSrDrop');
    ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => {
      state.files.push(...Array.from(e.dataTransfer?.files || []).filter(accepted));
      draw();
    });

    const update = message => {
      if (status) status.textContent = message;
      const bar = document.getElementById('aiSrProgress')?.querySelector('span');
      if (bar && state.files.length) {
        const match = message.match(/(\d+) of (\d+)/);
        if (match) bar.style.width = Math.round((Number(match[1]) / Number(match[2])) * 100) + '%';
      }
    };

    runBtn.addEventListener('click', async () => {
      if (state.busy || !state.files.length) return;
      state.busy = true;
      draw();
      const format = document.getElementById('aiSrFormat').value;
      const quality = format === 'jpg' ? .97 : 1;
      const outputs = [];
      try {
        const session = await getSession(update);
        for (let i = 0; i < state.files.length; i++) {
          const file = state.files[i];
          update('AI preparing image ' + (i + 1) + ' of ' + state.files.length + '…');
          const image = await decode(file);
          const result = await aiUpscale(image, session, update);
          if (typeof image.close === 'function') image.close();
          const blob = await new Promise((resolve, reject) => result.toBlob(b => b ? resolve(b) : reject(new Error('AI image export failed.')), format === 'jpg' ? 'image/jpeg' : 'image/png', quality));
          const ext = format === 'jpg' ? 'jpg' : 'png';
          outputs.push({ blob, name: safeName(file.name) + ' - AI x4.' + ext });
          result.width = 1;
          result.height = 1;
        }
        for (let i = 0; i < outputs.length; i++) {
          update('Saving AI image ' + (i + 1) + ' of ' + outputs.length + '…');
          await saveBlob(outputs[i].blob, outputs[i].name, format);
        }
        update('AI enhancement completed.');
        toast(outputs.length + ' AI-enhanced image' + (outputs.length === 1 ? '' : 's') + ' saved.', 'success');
      } catch (error) {
        console.error('AI super-resolution failed', error);
        update('AI enhancement failed: ' + (error?.message || 'unknown error'));
        toast('AI enhancement failed. See the status in the AI window.', 'error');
      } finally {
        state.busy = false;
        draw();
        setTimeout(() => {
          const p = document.getElementById('aiSrProgress');
          const b = p?.querySelector('span');
          if (p) p.style.display = 'none';
          if (b) b.style.width = '0';
        }, 800);
      }
    });

    draw();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUi, { once: true });
  else buildUi();
})();
