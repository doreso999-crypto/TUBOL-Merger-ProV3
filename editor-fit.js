/* Fit the entire Letter Editor page into the visible workspace. */
(function () {
  function fitLetterPage() {
    const view = document.querySelector('#letterView');
    const page = document.querySelector('#letterEditor');
    const wrap = document.querySelector('.letter-page-wrap');
    if (!view || !page || !wrap || !view.classList.contains('active-view')) return;

    const baseWidth = 816;
    const baseHeight = page.offsetHeight || 1056;
    const horizontalSpace = Math.max(240, wrap.clientWidth - 36);

    // Reserve room for the top bar, page header, settings bar, and editor toolbar.
    const verticalSpace = Math.max(360, window.innerHeight - 245);

    const widthScale = horizontalSpace / baseWidth;
    const heightScale = verticalSpace / baseHeight;
    const scale = Math.min(1, widthScale, heightScale);

    page.style.transform = `scale(${scale})`;
    page.style.transformOrigin = 'top center';

    // Transform does not affect normal layout dimensions, so reserve exactly the
    // scaled height and keep the page centered without a nested scrollbar.
    wrap.style.minHeight = `${Math.ceil(baseHeight * scale + 36)}px`;
    wrap.style.height = 'auto';
    wrap.scrollTop = 0;
    wrap.scrollLeft = 0;
  }

  function scheduleFit() {
    requestAnimationFrame(() => requestAnimationFrame(fitLetterPage));
  }

  document.addEventListener('DOMContentLoaded', scheduleFit);
  window.addEventListener('resize', scheduleFit);

  document.addEventListener('click', event => {
    if (event.target.closest('.sidebar-item')) scheduleFit();
  });

  // Re-fit after paper-size changes or content changes that alter page height.
  const observer = new MutationObserver(() => scheduleFit());
  document.addEventListener('DOMContentLoaded', () => {
    const page = document.querySelector('#letterEditor');
    if (page) observer.observe(page, { childList: true, subtree: true, characterData: true });
  });
})();
