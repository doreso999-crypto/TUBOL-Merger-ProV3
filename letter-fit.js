/* Dynamically fit the complete Letter Editor paper into the available viewport. */
(function () {
  function fitLetterPage() {
    const view = document.getElementById('letterView');
    const wrap = view?.querySelector('.letter-page-wrap');
    const page = document.getElementById('letterEditor');
    if (!view || !wrap || !page || !view.classList.contains('active-view')) return;

    const settings = view.querySelector('#editorSettingsBar');
    const toolbar = view.querySelector('#editorToolbar');
    const footer = view.querySelector('.editor-footer');
    const viewportTop = view.getBoundingClientRect().top;
    const availableWidth = Math.max(320, view.clientWidth - 20);
    const availableHeight = Math.max(420,
      window.innerHeight - viewportTop -
      (settings?.offsetHeight || 0) -
      (toolbar?.offsetHeight || 0) -
      (footer?.offsetHeight || 0) - 42
    );

    const widthScale = availableWidth / 816;
    const heightScale = availableHeight / 1056;
    const scale = Math.min(1, widthScale, heightScale);
    const pageHeight = 1056 * scale;

    view.classList.add('letter-fit-active');
    view.style.setProperty('--letter-fit-scale', String(scale));
    view.style.setProperty('--letter-fit-height', `${Math.ceil(pageHeight) + 28}px`);
  }

  function scheduleFit() {
    requestAnimationFrame(() => requestAnimationFrame(fitLetterPage));
  }

  document.addEventListener('click', e => {
    if (e.target.closest('.sidebar-item')) scheduleFit();
  });

  window.addEventListener('resize', scheduleFit);
  window.addEventListener('load', scheduleFit);

  const observer = new MutationObserver(scheduleFit);
  observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });

  scheduleFit();
})();
