/* M&O thumbnail-size control. Keeps thumbnail cards fixed-size and user-selectable. */
(() => {
  const SIZES = {
    small: { label: 'Small', width: 150 },
    medium: { label: 'Medium', width: 210 },
    large: { label: 'Large', width: 280 },
  };

  function apply(size) {
    const config = SIZES[size] || SIZES.medium;
    const grid = document.getElementById('pageGrid');
    const button = document.getElementById('thumbnailSizeBtn');
    if (!grid) return;
    grid.dataset.thumbnailSize = size;
    grid.style.setProperty('--thumbnail-width', `${config.width}px`);
    if (button) button.textContent = `Thumbnail: ${config.label}`;
    localStorage.setItem('pdfWorkspaceThumbnailSize', size);
  }

  function setup() {
    const mergeView = document.getElementById('mergeView');
    const actions = mergeView?.querySelector('.header-actions');
    if (!actions || document.getElementById('thumbnailSizeWrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'thumbnailSizeWrap';
    wrap.className = 'thumbnail-size-wrap';
    wrap.innerHTML = `
      <button id="thumbnailSizeBtn" type="button" class="btn btn-secondary thumbnail-size-btn" aria-haspopup="listbox" aria-expanded="false">Thumbnail: Medium</button>
      <div id="thumbnailSizeMenu" class="thumbnail-size-menu" role="listbox" aria-label="Thumbnail size">
        <button type="button" role="option" data-size="small">Small</button>
        <button type="button" role="option" data-size="medium">Medium</button>
        <button type="button" role="option" data-size="large">Large</button>
      </div>
    `;
    actions.insertBefore(wrap, document.getElementById('compressPacketBtn') || actions.lastElementChild);

    const button = wrap.querySelector('#thumbnailSizeBtn');
    const menu = wrap.querySelector('#thumbnailSizeMenu');
    const saved = localStorage.getItem('pdfWorkspaceThumbnailSize') || 'medium';

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

    apply(saved);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
