/* Local WebP conversion. No upload or external imaging dependency. */
(() => {
  'use strict';

  function init() {
    const trigger = document.getElementById('webpConvertBtn');
    if (!trigger) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'webp-dialog';
    dialog.id = 'webpConverterDialog';
    dialog.setAttribute('aria-labelledby', 'webpTitle');
    dialog.innerHTML = `
      <div class="panel-close-row"><h2 id="webpTitle">WebP to JPG / PNG</h2>
        <button class="preview-tool close" type="button" aria-label="Close WebP converter" id="webpClose">✕</button></div>
      <p class="subtext">Convert images on your device at their original dimensions. PNG keeps transparency; JPG uses a white background. Animated WebP files export the first frame.</p>
      <label>WebP files<input id="webpFiles" type="file" accept=".webp,image/webp" multiple></label>
      <label>Output format<select id="webpFormat"><option value="png">PNG · lossless with transparency</option><option value="jpg">JPG · high quality</option></select></label>
      <button id="webpRun" class="btn btn-primary" type="button" disabled>Convert images</button>
      <p id="webpStatus" role="status" aria-live="polite">Choose WebP files to begin.</p>
      <div id="webpResults" class="webp-results"></div>`;
    document.body.appendChild(dialog);
    const input = dialog.querySelector('#webpFiles');
    const format = dialog.querySelector('#webpFormat');
    const run = dialog.querySelector('#webpRun');
    const status = dialog.querySelector('#webpStatus');
    const results = dialog.querySelector('#webpResults');
    let busy = false;
    let urls = [];
    function clearResults() {
      urls.forEach(url => URL.revokeObjectURL(url));
      urls = [];
      results.replaceChildren();
    }
    trigger.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('#webpClose').addEventListener('click', () => dialog.close());
    // Keep output links available across closing/reopening, until inputs change.
    input.addEventListener('change', () => {
      clearResults();
      run.disabled = !input.files.length;
      status.textContent = input.files.length ? `${input.files.length} file(s) selected.` : 'Choose WebP files to begin.';
    });
    format.addEventListener('change', () => {
      clearResults();
      status.textContent = 'Output format changed. Convert to create new downloads.';
    });
    window.addEventListener('pagehide', clearResults);
    run.addEventListener('click', async () => {
      if (busy || !input.files.length) return;
      busy = true;
      run.disabled = input.disabled = format.disabled = true;
      clearResults();
      const files = Array.from(input.files);
      const extension = format.value;
      const mime = extension === 'jpg' ? 'image/jpeg' : 'image/png';
      let converted = 0;
      const usedNames = new Set();
      try {
        for (const [index, file] of files.entries()) {
          status.textContent = `Converting ${index + 1} of ${files.length}…`;
          let bitmap;
          let canvas;
          try {
            // Check the actual container, not just the extension or reported MIME.
            const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
            const signature = String.fromCharCode(...header);
            if (signature.slice(0, 4) !== 'RIFF' || signature.slice(8, 12) !== 'WEBP') {
              throw new Error('Not a valid WebP file.');
            }
            bitmap = await createImageBitmap(file);
            canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Image conversion is unavailable.');
            if (extension === 'jpg') {
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(bitmap, 0, 0);
            const blob = await new Promise((resolve, reject) => {
              canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not encode this image.')), mime, .95);
            });
            if (blob.type !== mime) throw new Error('The selected output format is unavailable.');
            const base = file.name.replace(/\.webp$/i, '').replace(/[\\/:*?"<>|]/g, '-') || 'image';
            let name = `${base}.${extension}`;
            let suffix = 2;
            while (usedNames.has(name.toLowerCase())) name = `${base} (${suffix++}).${extension}`;
            usedNames.add(name.toLowerCase());
            const url = URL.createObjectURL(blob);
            urls.push(url);
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            link.textContent = `Download ${name}`;
            results.appendChild(link);
            converted++;
          } catch (error) {
            const message = document.createElement('p');
            message.textContent = `${file.name}: ${error.message || 'Could not convert this image.'}`;
            results.appendChild(message);
          } finally {
            bitmap?.close();
            if (canvas) canvas.width = canvas.height = 0;
          }
        }
        status.textContent = `${converted} of ${files.length} converted. ${converted ? 'Click each download link to save.' : 'Choose valid WebP images and try again.'}`;
      } finally {
        busy = false;
        input.disabled = format.disabled = false;
        run.disabled = !input.files.length;
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
