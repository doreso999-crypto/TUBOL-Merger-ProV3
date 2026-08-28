/* Authorization Letter image interactions.
   Isolated feature: does not modify the existing application functions. */
(function () {
  'use strict';

  const MIN_SIZE = 48;
  const MAX_SIZE = 900;
  const HANDLE_SIZE = 10;
  let selected = null;
  let mode = 'select';
  let drag = null;

  const isImageFile = (file) => !!file && ((file.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || ''));

  function stop(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function getPoint(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function createHandle(className, cursor, action) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `tubol-image-handle ${className}`;
    el.dataset.action = action;
    el.style.cursor = cursor;
    el.setAttribute('aria-label', action);
    return el;
  }

  function ensureOverlay(object) {
    let overlay = object.querySelector(':scope > .tubol-image-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('span');
    overlay.className = 'tubol-image-overlay';
    overlay.setAttribute('contenteditable', 'false');

    const handles = [
      ['nw', 'nwse-resize'], ['n', 'ns-resize'], ['ne', 'nesw-resize'],
      ['w', 'ew-resize'], ['e', 'ew-resize'],
      ['sw', 'nesw-resize'], ['s', 'ns-resize'], ['se', 'nwse-resize']
    ];
    handles.forEach(([name, cursor]) => overlay.appendChild(createHandle(`tubol-image-handle-${name}`, cursor, `resize-${name}`)));

    object.appendChild(overlay);
    return overlay;
  }

  function positionOverlay(object) {
    const overlay = ensureOverlay(object);
    overlay.style.width = '100%';
    overlay.style.height = '100%';
  }

  function removeTransientUI(object) {
    if (!object) return;
    object.classList.remove('tubol-image-selected', 'tubol-image-cropping');
    const overlay = object.querySelector(':scope > .tubol-image-overlay');
    overlay?.remove();
  }

  function deselect() {
    removeTransientUI(selected);
    selected = null;
    mode = 'select';
  }

  function getEditor() {
    return document.getElementById('letterEditor');
  }

  function getObjectFromTarget(target) {
    return target?.closest?.('.tubol-image-object') || null;
  }

  function readGeometry(object) {
    const img = object.querySelector(':scope > img');
    return {
      objectW: parseFloat(object.dataset.objectW || object.offsetWidth || img?.offsetWidth || 0),
      objectH: parseFloat(object.dataset.objectH || object.offsetHeight || img?.offsetHeight || 0),
      imageW: parseFloat(object.dataset.imageW || img?.offsetWidth || 0),
      imageH: parseFloat(object.dataset.imageH || img?.offsetHeight || 0),
      imageX: parseFloat(object.dataset.imageX || 0),
      imageY: parseFloat(object.dataset.imageY || 0),
    };
  }

  function writeGeometry(object, g) {
    const img = object.querySelector(':scope > img');
    const w = Math.max(MIN_SIZE, Math.min(MAX_SIZE, g.objectW));
    const h = Math.max(MIN_SIZE, Math.min(MAX_SIZE, g.objectH));
    object.dataset.objectW = String(w);
    object.dataset.objectH = String(h);
    object.dataset.imageW = String(g.imageW);
    object.dataset.imageH = String(g.imageH);
    object.dataset.imageX = String(g.imageX);
    object.dataset.imageY = String(g.imageY);
    object.style.width = `${w}px`;
    object.style.height = `${h}px`;
    img.style.width = `${g.imageW}px`;
    img.style.height = `${g.imageH}px`;
    img.style.left = `${g.imageX}px`;
    img.style.top = `${g.imageY}px`;
  }

  function ensureObjectState(object) {
    const img = object.querySelector(':scope > img');
    if (!img) return;
    if (object.dataset.imageReady === '1') return;

    object.dataset.imageReady = '1';
    object.setAttribute('contenteditable', 'false');
    object.classList.add('tubol-image-object');

    const naturalW = img.naturalWidth || img.width || 640;
    const naturalH = img.naturalHeight || img.height || 480;
    const maxW = 420;
    const scale = Math.min(1, maxW / naturalW);
    const w = Math.max(MIN_SIZE, naturalW * scale);
    const h = Math.max(MIN_SIZE, naturalH * scale);

    img.draggable = false;
    img.style.position = 'absolute';
    img.style.display = 'block';
    img.style.margin = '0';
    img.style.maxWidth = 'none';
    img.style.width = `${w}px`;
    img.style.height = `${h}px`;
    img.style.left = '0px';
    img.style.top = '0px';

    writeGeometry(object, { objectW: w, objectH: h, imageW: w, imageH: h, imageX: 0, imageY: 0 });
    object.style.verticalAlign = 'middle';
  }

  function upgradeExistingImages(editor) {
    editor.querySelectorAll('img').forEach((img) => {
      if (img.closest('.tubol-image-object')) return;
      const object = document.createElement('span');
      object.className = 'tubol-image-object';
      object.setAttribute('contenteditable', 'false');
      img.parentNode.insertBefore(object, img);
      object.appendChild(img);
      const spacer = document.createElement('span');
      spacer.innerHTML = '<br>';
      object.parentNode.insertBefore(spacer, object.nextSibling);
      ensureObjectState(object);
    });
  }

  function selectObject(object) {
    if (!object) return;
    if (selected && selected !== object) removeTransientUI(selected);
    selected = object;
    mode = 'select';
    selected.classList.add('tubol-image-selected');
    positionOverlay(selected);
  }

  function enterCrop(object) {
    selectObject(object);
    mode = 'crop';
    object.classList.add('tubol-image-cropping');
    positionOverlay(object);
  }

  function constrainImageInsideCrop(object) {
    const g = readGeometry(object);
    const minX = Math.min(0, g.objectW - g.imageW);
    const minY = Math.min(0, g.objectH - g.imageH);
    const maxX = Math.max(0, g.objectW - g.imageW);
    const maxY = Math.max(0, g.objectH - g.imageH);
    g.imageX = Math.min(maxX, Math.max(minX, g.imageX));
    g.imageY = Math.min(maxY, Math.max(minY, g.imageY));
    writeGeometry(object, g);
  }

  function beginMove(event, object) {
    const p = getPoint(event);
    const g = readGeometry(object);
    drag = { type: 'move', object, start: p, base: g };
    stop(event);
    object.setPointerCapture?.(event.pointerId);
  }

  function beginCropMove(event, object) {
    const p = getPoint(event);
    const g = readGeometry(object);
    drag = { type: 'crop-move', object, start: p, base: g };
    stop(event);
    object.setPointerCapture?.(event.pointerId);
  }

  function beginResize(event, object, handle) {
    const p = getPoint(event);
    const g = readGeometry(object);
    drag = { type: 'resize', object, handle, start: p, base: g };
    stop(event);
    object.setPointerCapture?.(event.pointerId);
  }

  function applyResize(event) {
    const d = drag;
    const dx = event.clientX - d.start.x;
    const dy = event.clientY - d.start.y;
    const base = d.base;
    const ratio = base.objectW / Math.max(1, base.objectH);
    let w = base.objectW;
    let h = base.objectH;
    let x = base.imageX;
    let y = base.imageY;

    const handle = d.handle;
    if (handle.includes('e')) w = base.objectW + dx;
    if (handle.includes('w')) w = base.objectW - dx;
    if (handle.includes('s')) h = base.objectH + dy;
    if (handle.includes('n')) h = base.objectH - dy;

    if (handle.length === 2) {
      if (Math.abs(dx) > Math.abs(dy)) h = w / ratio;
      else w = h * ratio;
    }

    w = Math.max(MIN_SIZE, Math.min(MAX_SIZE, w));
    h = Math.max(MIN_SIZE, Math.min(MAX_SIZE, h));

    if (handle.includes('w')) x += base.objectW - w;
    if (handle.includes('n')) y += base.objectH - h;

    const sx = w / base.objectW;
    const sy = h / base.objectH;
    x *= sx;
    y *= sy;
    const imageW = base.imageW * sx;
    const imageH = base.imageH * sy;

    writeGeometry(d.object, { objectW: w, objectH: h, imageW, imageH, imageX: x, imageY: y });
    constrainImageInsideCrop(d.object);
  }

  function applyCropResize(event) {
    const d = drag;
    const dx = event.clientX - d.start.x;
    const dy = event.clientY - d.start.y;
    const base = d.base;
    let w = base.objectW;
    let h = base.objectH;
    let x = base.imageX;
    let y = base.imageY;

    if (d.handle.includes('e')) w = base.objectW + dx;
    if (d.handle.includes('w')) { w = base.objectW - dx; x += dx; }
    if (d.handle.includes('s')) h = base.objectH + dy;
    if (d.handle.includes('n')) { h = base.objectH - dy; y += dy; }

    const minW = 24;
    const minH = 24;
    w = Math.max(minW, w);
    h = Math.max(minH, h);

    if (d.handle.includes('w')) x = base.imageX + (base.objectW - w) * 0.5;
    if (d.handle.includes('n')) y = base.imageY + (base.objectH - h) * 0.5;

    writeGeometry(d.object, { objectW: w, objectH: h, imageW: base.imageW, imageH: base.imageH, imageX: x, imageY: y });
    constrainImageInsideCrop(d.object);
  }

  function handlePointerMove(event) {
    if (!drag) return;
    if (drag.type === 'move') {
      // Moving an inline image follows the user's pointer; the object remains in document flow.
      const editor = getEditor();
      if (!editor) return;
      const rect = drag.object.getBoundingClientRect();
      const current = event.clientX;
      const delta = current - drag.start.x;
      if (Math.abs(delta) < 2) return;
      const range = document.createRange();
      range.selectNode(drag.object);
      const after = range.cloneRange();
      after.collapse(false);
      const target = document.caretRangeFromPoint?.(event.clientX, event.clientY) || document.caretPositionFromPoint?.(event.clientX, event.clientY);
      if (target) {
        try {
          if (target.startContainer) {
            target.startContainer.parentNode?.insertBefore(drag.object, target.startContainer.parentNode.childNodes[target.startOffset] || null);
          }
        } catch {}
      }
      void rect;
    } else if (drag.type === 'crop-move') {
      const dx = event.clientX - drag.start.x;
      const dy = event.clientY - drag.start.y;
      const base = drag.base;
      writeGeometry(drag.object, {
        objectW: base.objectW,
        objectH: base.objectH,
        imageW: base.imageW,
        imageH: base.imageH,
        imageX: base.imageX + dx,
        imageY: base.imageY + dy,
      });
      constrainImageInsideCrop(drag.object);
    } else if (drag.type === 'resize') {
      mode === 'crop' ? applyCropResize(event) : applyResize(event);
    }
  }

  function endDrag() {
    drag = null;
    if (selected) {
      const editor = getEditor();
      editor?.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertImage' }));
    }
  }

  function setupEditor(editor) {
    upgradeExistingImages(editor);

    editor.addEventListener('click', (event) => {
      const object = getObjectFromTarget(event.target);
      if (object) {
        selectObject(object);
        event.stopPropagation();
        return;
      }
      deselect();
    });

    editor.addEventListener('dblclick', (event) => {
      const object = getObjectFromTarget(event.target);
      if (!object) return;
      enterCrop(object);
      stop(event);
    });

    editor.addEventListener('pointerdown', (event) => {
      const object = getObjectFromTarget(event.target);
      if (!object) return;
      const handle = event.target.closest('.tubol-image-handle');
      if (handle) {
        const action = handle.dataset.action || '';
        beginResize(event, object, action.replace('resize-', ''));
        return;
      }
      if (mode === 'crop' && event.target.closest('img')) {
        beginCropMove(event, object);
        return;
      }
      if (event.target.closest('img')) {
        beginMove(event, object);
      }
    });

    editor.addEventListener('pointermove', handlePointerMove);
    editor.addEventListener('pointerup', endDrag);
    editor.addEventListener('pointercancel', endDrag);
    editor.addEventListener('mousedown', (event) => {
      if (getObjectFromTarget(event.target)) event.preventDefault();
    });

    editor.addEventListener('dragenter', (event) => {
      if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
      stop(event);
      editor.classList.add('image-drop-active');
    });
    editor.addEventListener('dragover', (event) => {
      if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
      stop(event);
      event.dataTransfer.dropEffect = 'copy';
    });
    editor.addEventListener('dragleave', (event) => {
      if (!editor.contains(event.relatedTarget)) editor.classList.remove('image-drop-active');
    });
    editor.addEventListener('drop', (event) => {
      if (!Array.from(event.dataTransfer?.types || []).includes('Files')) return;
      stop(event);
      editor.classList.remove('image-drop-active');
      const files = Array.from(event.dataTransfer.files || []).filter(isImageFile);
      if (!files.length) return;

      const range = document.caretRangeFromPoint?.(event.clientX, event.clientY) || null;
      files.forEach((file) => insertImageFile(editor, file, range));
    });

    document.addEventListener('pointerdown', (event) => {
      if (!editor.contains(event.target) && !event.target.closest('.tubol-image-object')) deselect();
    });
  }

  function insertImageFile(editor, file, range) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.src = String(reader.result || '');
      img.alt = file.name;
      img.addEventListener('load', () => {
        const object = document.createElement('span');
        object.className = 'tubol-image-object';
        object.setAttribute('contenteditable', 'false');
        object.appendChild(img);
        const spacer = document.createElement('p');
        spacer.innerHTML = '<br>';

        const insertion = range && editor.contains(range.startContainer) ? range.cloneRange() : (() => {
          const fallback = document.createRange();
          fallback.selectNodeContents(editor);
          fallback.collapse(false);
          return fallback;
        })();

        insertion.deleteContents();
        insertion.insertNode(object);
        insertion.setStartAfter(object);
        insertion.collapse(true);
        insertion.insertNode(spacer);
        ensureObjectState(object);
        selectObject(object);
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertImage' }));
      }, { once: true });
      if (img.complete) img.dispatchEvent(new Event('load'));
    };
    reader.readAsDataURL(file);
  }

  function mount() {
    const editor = getEditor();
    if (!editor || editor.dataset.imageEditingReady === '1') return;
    editor.dataset.imageEditingReady = '1';
    setupEditor(editor);
    window.TUBOLAuthorizationImageDrop = { mount, selectObject, enterCrop };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
