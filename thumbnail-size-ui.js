/* M&O thumbnail-size control. Fixed-size cards with compact zoom labels. */
(() => {
  const SIZES = {
    normal: { label: 'Normal', width: 200 },
    '2x': { label: '2×', width: 260 },
    '3x': { label: '3×', width: 320 },
    '4x': { label: '4×', width: 380 },
  };

  function apply(size) {
    const config = SIZES[size] || SIZES.normal;
    const grid = document.getElementById('pageGrid');
    const button = document.getElementById('thumbnailSizeBtn');
    if (!grid) return;
    grid.dataset.thumbnailSize = size;
    grid.style.setProperty('--thumbnail-width', `${config.width}px`);
    if (button) button.textContent = config.label;
    localStorage.setItem('pdfWorkspaceThumbnailSize', size);
  }

  function setup() {
    const mergeView = document.getElementById('mergeView');
    const toolbar = mergeView?.querySelector('.organizer-toolbar');
    const actions = toolbar?.querySelector('.toolbar-actions');
    if (!actions || document.getElementById('thumbnailSizeWrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'thumbnailSizeWrap';
    wrap.className = 'thumbnail-size-wrap';
    wrap.innerHTML = `
      <button id="thumbnailSizeBtn" type="button" class="mini-btn thumbnail-size-btn" aria-haspopup="listbox" aria-expanded="false">Normal</button>
      <div id="thumbnailSizeMenu" class="thumbnail-size-menu" role="listbox" aria-label="Thumbnail size">
        <button type="button" role="option" data-size="normal">Normal</button>
        <button type="button" role="option" data-size="2x">2×</button>
        <button type="button" role="option" data-size="3x">3×</button>
        <button type="button" role="option" data-size="4x">4×</button>
      </div>
    `;

    // Thumbnail size belongs immediately before Rotate in the organizer controls.
    const rotateButton = document.getElementById('rotateLeftBtn');
    actions.insertBefore(wrap, rotateButton || actions.firstElementChild);

    const button = wrap.querySelector('#thumbnailSizeBtn');
    const menu = wrap.querySelector('#thumbnailSizeMenu');
    const saved = localStorage.getItem('pdfWorkspaceThumbnailSize') || 'normal';
    const safeSaved = SIZES[saved] ? saved : 'normal';

    const close = () => {
      menu.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    };

    button.addEventListener('click', e => {
      e.stopPropagation();
      menu.classList.toggle('open');
      button.setAttribute('aria-expanded', menu.classList.contains('open') ? 'true' : 'false');
    });

    menu.querySelectorAll('[data-size]').forEach(option => {
      option.addEventListener('click', () => {
        apply(option.dataset.size);
        close();
      });
    });

    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) close();
    });

    apply(safeSaved);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
