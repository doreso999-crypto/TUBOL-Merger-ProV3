/* M&O thumbnail-size control. Keeps thumbnail cards fixed-size and user-selectable. */
(() => {
  const SIZES = {
    small:  { label: 'Small',   width: 150 },
    normal: { label: 'Normal',  width: 200 },
    large:  { label: 'Large',   width: 260 },
    xlarge: { label: 'Extra Large', width: 320 },
  };

  function apply(size) {
    const config = SIZES[size] || SIZES.normal;
    const grid = document.getElementById('pageGrid');
    const button = document.getElementById('thumbnailSizeBtn');
    if (!grid) return;
    grid.dataset.thumbnailSize = size;
    grid.style.setProperty('--thumbnail-width', `${config.width}px`);
    if (button) button.textContent = `Thumbnails: ${config.label}`;
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
      <button id="thumbnailSizeBtn" type="button" class="mini-btn thumbnail-size-btn" aria-haspopup="listbox" aria-expanded="false">Thumbnails: Normal</button>
      <div id="thumbnailSizeMenu" class="thumbnail-size-menu" role="listbox" aria-label="Thumbnail size">
        <button type="button" role="option" data-size="small">Small</button>
        <button type="button" role="option" data-size="normal">Normal</button>
        <button type="button" role="option" data-size="large">Large</button>
        <button type="button" role="option" data-size="xlarge">Extra Large</button>
      </div>
    `;

    // Keep the thumbnail control aligned with Rotate / Duplicate / Delete / Clear all.
    actions.appendChild(wrap);

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
