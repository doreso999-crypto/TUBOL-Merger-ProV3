/* Authorization Letter physical-page size lock.
   Keeps the visible document sheet at the selected paper dimensions.
   This does not implement pagination; overflow remains inside the sheet. */
(function () {
  'use strict';

  const SPECS = {
    letter: { w: 816, h: 1056 },
    legal: { w: 816, h: 1344 },
    a4: { w: 794, h: 1123 },
    a5: { w: 560, h: 794 },
    b5: { w: 665, h: 945 },
    executive: { w: 696, h: 1008 },
    'half-letter': { w: 528, h: 816 },
  };

  function lockPage() {
    const page = document.getElementById('letterEditor');
    if (!page) return;

    const key = document.getElementById('paperSizeSelect')?.value || 'letter';
    const spec = SPECS[key] || SPECS.letter;

    page.style.setProperty('width', `${spec.w}px`, 'important');
    page.style.setProperty('min-width', `${spec.w}px`, 'important');
    page.style.setProperty('max-width', `${spec.w}px`, 'important');
    page.style.setProperty('height', `${spec.h}px`, 'important');
    page.style.setProperty('min-height', `${spec.h}px`, 'important');
    page.style.setProperty('max-height', `${spec.h}px`, 'important');
    page.style.setProperty('box-sizing', 'border-box', 'important');
    page.style.setProperty('overflow-y', 'auto', 'important');
    page.style.setProperty('overflow-x', 'hidden', 'important');
    page.style.setProperty('flex', '0 0 auto', 'important');
  }

  function mount() {
    lockPage();

    document.getElementById('paperSizeSelect')?.addEventListener('change', () => {
      requestAnimationFrame(lockPage);
      setTimeout(lockPage, 50);
    });

    document.getElementById('marginSelect')?.addEventListener('change', () => {
      requestAnimationFrame(lockPage);
    });

    document.getElementById('letterEditor')?.addEventListener('input', () => {
      requestAnimationFrame(lockPage);
    });

    const observer = new MutationObserver(() => lockPage());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    window.addEventListener('resize', lockPage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
