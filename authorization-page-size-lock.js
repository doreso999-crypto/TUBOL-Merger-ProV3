/* Authorization Letter physical-page size lock + automatic pagination. */
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
  const MARGINS = {
    narrow: '48px', compact: '72px', normal: '96px', comfortable: '120px', wide: '144px', 'extra-wide': '192px'
  };

  let paginating = false;
  let paginationTimer = 0;

  const getEditor = () => document.getElementById('letterEditor');
  const getSpec = () => SPECS[document.getElementById('paperSizeSelect')?.value || 'letter'] || SPECS.letter;
  const getMargin = () => MARGINS[document.getElementById('marginSelect')?.value || 'normal'] || MARGINS.normal;

  function pageStyle(page, spec) {
    page.classList.add('letter-page', 'authorization-page');
    page.setAttribute('contenteditable', 'true');
    page.style.setProperty('width', `${spec.w}px`, 'important');
    page.style.setProperty('min-width', `${spec.w}px`, 'important');
    page.style.setProperty('max-width', `${spec.w}px`, 'important');
    page.style.setProperty('height', `${spec.h}px`, 'important');
    page.style.setProperty('min-height', `${spec.h}px`, 'important');
    page.style.setProperty('max-height', `${spec.h}px`, 'important');
    page.style.setProperty('box-sizing', 'border-box', 'important');
    page.style.setProperty('overflow', 'hidden', 'important');
    page.style.setProperty('flex', '0 0 auto', 'important');
    page.style.setProperty('padding', getMargin(), '');
  }

  function makePage(spec) {
    const page = document.createElement('div');
    page.className = 'letter-page authorization-page';
    page.setAttribute('data-authorization-page', '');
    page.setAttribute('contenteditable', 'true');
    pageStyle(page, spec);
    return page;
  }

  function ensurePages() {
    const editor = getEditor();
    if (!editor) return [];

    const children = Array.from(editor.children);
    const pages = children.filter((node) => node.matches('.authorization-page'));
    if (pages.length && pages.length === children.length) return pages;

    const existing = Array.from(editor.childNodes);
    editor.innerHTML = '';
    const first = makePage(getSpec());
    editor.appendChild(first);
    existing.forEach((node) => first.appendChild(node));
    if (!first.childNodes.length) first.innerHTML = '<p><br></p>';
    return [first];
  }

  function allPages() {
    const editor = getEditor();
    return editor ? Array.from(editor.querySelectorAll(':scope > .authorization-page')) : [];
  }

  function selectionOffsets(root) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !root.contains(sel.anchorNode)) return null;
    const range = sel.getRangeAt(0);
    const startRange = document.createRange();
    startRange.selectNodeContents(root);
    startRange.setEnd(range.startContainer, range.startOffset);
    const endRange = document.createRange();
    endRange.selectNodeContents(root);
    endRange.setEnd(range.endContainer, range.endOffset);
    return { start: startRange.toString().length, end: endRange.toString().length };
  }

  function textPoint(root, target) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = Math.max(0, target);
    let node;
    while ((node = walker.nextNode())) {
      const len = node.nodeValue.length;
      if (remaining <= len) return { node, offset: remaining };
      remaining -= len;
    }
    const last = root.lastChild;
    if (last?.nodeType === Node.TEXT_NODE) return { node: last, offset: last.nodeValue.length };
    return { node: last || root, offset: last?.childNodes?.length || 0 };
  }

  function restoreSelection(root, saved) {
    if (!saved) return;
    try {
      const start = textPoint(root, saved.start);
      const end = textPoint(root, saved.end);
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  }

  function splitElement(block, page, nextPage, availableHeight) {
    const textLength = (block.textContent || '').length;
    if (textLength < 2) return false;

    const makeSplit = (offset) => {
      const a = block.cloneNode(true);
      const b = block.cloneNode(true);
      const aTexts = [];
      const bTexts = [];
      const aw = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
      const bw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = aw.nextNode())) aTexts.push(n);
      while ((n = bw.nextNode())) bTexts.push(n);

      let consumed = 0;
      aTexts.forEach((node, i) => {
        const len = node.nodeValue.length;
        const bNode = bTexts[i];
        if (consumed >= offset) {
          node.nodeValue = '';
        } else if (consumed + len > offset) {
          const cut = offset - consumed;
          const original = node.nodeValue;
          node.nodeValue = original.slice(0, cut);
          if (bNode) bNode.nodeValue = original.slice(cut);
        } else if (bNode) {
          bNode.nodeValue = '';
        }
        consumed += len;
      });
      return [a, b];
    };

    let low = 1;
    let high = textLength - 1;
    let best = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const [a, b] = makeSplit(mid);
      page.replaceChild(a, block);
      nextPage.insertBefore(b, nextPage.firstChild);
      const fits = page.scrollHeight <= availableHeight + 1;
      nextPage.removeChild(b);
      page.replaceChild(block, a);
      if (fits) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (!best) return false;
    const [a, b] = makeSplit(best);
    page.replaceChild(a, block);
    nextPage.insertBefore(b, nextPage.firstChild);
    return true;
  }

  function moveOverflow(page, nextPage) {
    pageStyle(page, getSpec());
    pageStyle(nextPage, getSpec());

    let guard = 0;
    while (page.scrollHeight > page.clientHeight + 1 && guard++ < 500) {
      const children = Array.from(page.children);
      if (!children.length) break;

      const last = children[children.length - 1];
      if (last.classList.contains('authorization-page-break')) {
        last.remove();
        continue;
      }

      if (children.length === 1) {
        if (splitElement(last, page, nextPage, page.clientHeight)) continue;
        page.removeChild(last);
        nextPage.insertBefore(last, nextPage.firstChild);
        continue;
      }

      page.removeChild(last);
      nextPage.insertBefore(last, nextPage.firstChild);
    }
  }

  function handleExplicitBreaks(pages, spec) {
    for (let i = 0; i < pages.length; i += 1) {
      const page = pages[i];
      const marker = Array.from(page.children).find((el) => el.classList.contains('authorization-page-break'));
      if (!marker) continue;

      let next = pages[i + 1];
      if (!next) {
        next = makePage(spec);
        page.parentNode.insertBefore(next, page.nextSibling);
        pages.splice(i + 1, 0, next);
      }

      const children = Array.from(page.children);
      const markerIndex = children.indexOf(marker);
      children.slice(markerIndex + 1).forEach((node) => next.appendChild(node));
      marker.remove();
    }
  }

  function paginate() {
    const editor = getEditor();
    if (!editor || paginating) return;
    paginating = true;

    try {
      const spec = getSpec();
      const savedSelection = selectionOffsets(editor);
      editor.classList.add('authorization-document-pages');
      editor.style.setProperty('width', `${spec.w}px`, 'important');
      editor.style.setProperty('min-width', `${spec.w}px`, 'important');
      editor.style.setProperty('max-width', `${spec.w}px`, 'important');
      editor.style.setProperty('height', 'auto', 'important');
      editor.style.setProperty('min-height', '0', 'important');
      editor.style.setProperty('max-height', 'none', 'important');
      editor.style.setProperty('overflow', 'visible', 'important');
      editor.style.setProperty('padding', '0', 'important');
      editor.style.setProperty('border', '0', 'important');
      editor.style.setProperty('box-shadow', 'none', 'important');

      let pages = ensurePages();
      pages.forEach((page) => pageStyle(page, spec));
      handleExplicitBreaks(pages, spec);

      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i];
        let next = pages[i + 1];
        if (!next) {
          next = makePage(spec);
          editor.appendChild(next);
          pages.push(next);
        }
        moveOverflow(page, next);
        if (!next.children.length && i === pages.length - 2) {
          next.remove();
          pages.pop();
        }
      }

      pages = allPages();
      pages.forEach((page, index) => {
        page.dataset.pageNumber = String(index + 1);
        pageStyle(page, spec);
      });

      restoreSelection(editor, savedSelection);
      if (typeof window.saveLetter === 'function') window.saveLetter();
    } finally {
      paginating = false;
    }
  }

  function schedulePagination() {
    clearTimeout(paginationTimer);
    paginationTimer = window.setTimeout(() => requestAnimationFrame(paginate), 40);
  }

  function overrideLetterPdfExport() {
    if (typeof window.html2pdf !== 'function' || typeof window.createLetterPdfBlob !== 'function') return;
    if (window.createLetterPdfBlob.__pagedOverride) return;

    const original = window.createLetterPdfBlob;
    const exportFn = async function () {
      paginate();
      const editor = getEditor();
      const spec = getSpec();
      const clone = editor.cloneNode(true);
      clone.style.width = `${spec.w}px`;
      clone.style.height = 'auto';
      clone.style.minHeight = '0';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.padding = '0';

      clone.querySelectorAll('.authorization-page').forEach((page) => {
        page.style.width = `${spec.w}px`;
        page.style.height = `${spec.h}px`;
        page.style.minHeight = `${spec.h}px`;
        page.style.maxHeight = `${spec.h}px`;
        page.style.overflow = 'hidden';
        page.style.margin = '0';
        page.style.boxShadow = 'none';
        page.style.border = '0';
        page.style.breakAfter = 'page';
        page.style.pageBreakAfter = 'always';
      });

      const wrapper = document.createElement('div');
      wrapper.style.background = '#fff';
      wrapper.style.padding = '0';
      wrapper.style.width = `${spec.w}px`;
      wrapper.style.height = 'auto';
      wrapper.appendChild(clone);

      const root = document.createElement('div');
      root.style.position = 'fixed';
      root.style.left = '-100000px';
      root.style.top = '0';
      root.style.width = `${spec.w}px`;
      root.style.background = '#fff';
      root.appendChild(wrapper);
      document.body.appendChild(root);

      try {
        return await window.html2pdf().set({
          margin: 0,
          filename: 'AUTHORIZATION.pdf',
          image: { type: 'jpeg', quality: .97 },
          html2canvas: { scale: 2, backgroundColor: '#fff', useCORS: true },
          pagebreak: { mode: ['css', 'legacy'] },
          jsPDF: { unit: 'pt', format: spec.pdf, orientation: 'portrait' },
        }).from(wrapper).outputPdf('blob');
      } finally {
        root.remove();
      }
    };

    exportFn.__pagedOverride = true;
    exportFn.__original = original;
    window.createLetterPdfBlob = exportFn;
  }

  function mount() {
    const editor = getEditor();
    if (!editor) return;

    paginate();
    editor.addEventListener('input', schedulePagination);
    document.getElementById('paperSizeSelect')?.addEventListener('change', schedulePagination);
    document.getElementById('marginSelect')?.addEventListener('change', schedulePagination);
    window.addEventListener('resize', schedulePagination);

    const observer = new MutationObserver(() => {
      if (!paginating) schedulePagination();
    });
    observer.observe(editor, { childList: true, subtree: true });

    window.setTimeout(overrideLetterPdfExport, 0);
    window.setTimeout(overrideLetterPdfExport, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
