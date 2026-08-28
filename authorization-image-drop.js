/* Authorization Letter — isolated image drop feature.
   Does not modify or replace existing editor functions. */
(function () {
  'use strict';

  function mount() {
    const editor = document.getElementById('letterEditor');
    if (!editor || editor.dataset.imageDropReady === '1') return;
    editor.dataset.imageDropReady = '1';

    const stop = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    editor.addEventListener('dragenter', (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      stop(event);
      editor.classList.add('image-drop-active');
    });

    editor.addEventListener('dragover', (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      stop(event);
      event.dataTransfer.dropEffect = 'copy';
      editor.classList.add('image-drop-active');
    });

    editor.addEventListener('dragleave', (event) => {
      if (!editor.contains(event.relatedTarget)) editor.classList.remove('image-drop-active');
    });

    editor.addEventListener('drop', (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      stop(event);
      editor.classList.remove('image-drop-active');

      const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith('image/'));
      if (!files.length) return;

      const range = document.createRange();
      const selection = window.getSelection();
      if (selection && selection.rangeCount && editor.contains(selection.anchorNode)) {
        range.setStart(selection.anchorNode, selection.anchorOffset);
        range.collapse(true);
      } else {
        range.selectNodeContents(editor);
        range.collapse(false);
      }

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = document.createElement('img');
          img.src = String(reader.result || '');
          img.alt = file.name;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
          img.style.margin = '12px 0';
          range.insertNode(img);
          range.setStartAfter(img);
          range.collapse(true);
          const next = document.createElement('p');
          next.innerHTML = '<br>';
          range.insertNode(next);
          range.setStart(next, 0);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
          editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertImage' }));
        };
        reader.readAsDataURL(file);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  window.TUBOLAuthorizationImageDrop = { mount };
})();
