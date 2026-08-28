/* Authorization Letter fixed Legal page + stable automatic pagination. */
(function () {
  'use strict';

  const SPEC = { w: 816, h: 1344, pdf: 'legal' };
  const MARGIN = '96px';
  let paginating = false;
  let paginationTimer = 0;

  const getEditor = () => document.getElementById('letterEditor');

  function pageStyle(page) {
    page.classList.add('letter-page', 'authorization-page');
    page.removeAttribute('contenteditable');
    page.style.setProperty('width', `${SPEC.w}px`, 'important');
    page.style.setProperty('min-width', `${SPEC.w}px`, 'important');
    page.style.setProperty('max-width', `${SPEC.w}px`, 'important');
    page.style.setProperty('height', `${SPEC.h}px`, 'important');
    page.style.setProperty('min-height', `${SPEC.h}px`, 'important');
    page.style.setProperty('max-height', `${SPEC.h}px`, 'important');
    page.style.setProperty('box-sizing', 'border-box', 'important');
    page.style.setProperty('overflow', 'hidden', 'important');
    page.style.setProperty('flex', '0 0 auto', 'important');
    page.style.setProperty('padding', MARGIN, 'important');
  }

  function makePage() {
    const page = document.createElement('div');
    page.className = 'letter-page authorization-page';
    page.setAttribute('data-authorization-page', '');
    pageStyle(page);
    return page;
  }

  function getPages() {
    const editor = getEditor();
    return editor ? Array.from(editor.children).filter((node) => node.matches('.authorization-page')) : [];
  }

  function extractLogicalNodes(editor) {
    const children = Array.from(editor.childNodes);
    const hasPages = children.some((node) => node.nodeType === Node.ELEMENT_NODE && node.matches('.authorization-page'));
    if (!hasPages) return children;
    const nodes = [];
    children.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.matches('.authorization-page')) {
        Array.from(node.childNodes).forEach((child) => nodes.push(child));
      } else {
        nodes.push(node);
      }
    });
    return nodes;
  }

  function selectionOffsets(root) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !root.contains(sel.anchorNode)) return null;
    try {
      const range = sel.getRangeAt(0);
      const start = document.createRange();
      start.selectNodeContents(root);
      start.setEnd(range.startContainer, range.startOffset);
      const end = document.createRange();
      end.selectNodeContents(root);
      end.setEnd(range.endContainer, range.endOffset);
      return { start: start.toString().length, end: end.toString().length };
    } catch (_) { return null; }
  }

  function restoreSelection(root, saved) {
    if (!saved) return;
    try {
      const locate = (target) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let remaining = Math.max(0, target), node;
        while ((node = walker.nextNode())) {
          const len = node.nodeValue.length;
          if (remaining <= len) return { node, offset: remaining };
          remaining -= len;
        }
        const last = root.lastChild;
        if (last?.nodeType === Node.TEXT_NODE) return { node: last, offset: last.nodeValue.length };
        return { node: last || root, offset: 0 };
      };
      const start = locate(saved.start), end = locate(saved.end);
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  }

  function setEditorShell(editor) {
    editor.classList.add('authorization-document-pages');
    editor.style.setProperty('width', `${SPEC.w}px`, 'important');
    editor.style.setProperty('min-width', `${SPEC.w}px`, 'important');
    editor.style.setProperty('max-width', `${SPEC.w}px`, 'important');
    editor.style.setProperty('height', 'auto', 'important');
    editor.style.setProperty('min-height', '0', 'important');
    editor.style.setProperty('max-height', 'none', 'important');
    editor.style.setProperty('overflow', 'visible', 'important');
    editor.style.setProperty('padding', '0', 'important');
    editor.style.setProperty('border', '0', 'important');
    editor.style.setProperty('box-shadow', 'none', 'important');
  }

  function isEmptyNode(node) {
    return node.nodeType === Node.TEXT_NODE ? !node.nodeValue.trim() : !node.textContent.trim() && !node.querySelector('img,table');
  }

  function splitElement(block, page, nextPage) {
    const textLength = (block.textContent || '').length;
    if (textLength < 2 || block.matches('table,img,hr')) return false;
    const makeSplit = (offset) => {
      const a = block.cloneNode(true), b = block.cloneNode(true);
      const aTexts = [], bTexts = [];
      const aw = document.createTreeWalker(a, NodeFilter.SHOW_TEXT), bw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = aw.nextNode())) aTexts.push(n);
      while ((n = bw.nextNode())) bTexts.push(n);
      let consumed = 0;
      aTexts.forEach((node, i) => {
        const len = node.nodeValue.length, bNode = bTexts[i];
        if (consumed >= offset) node.nodeValue = '';
        else if (consumed + len > offset) {
          const cut = offset - consumed, original = node.nodeValue;
          node.nodeValue = original.slice(0, cut);
          if (bNode) bNode.nodeValue = original.slice(cut);
        } else if (bNode) node.nodeValue = '';
        consumed += len;
      });
      return [a, b];
    };
    let low = 1, high = textLength - 1, best = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2), [a, b] = makeSplit(mid);
      page.replaceChild(a, block);
      nextPage.insertBefore(b, nextPage.firstChild);
      pageStyle(page); pageStyle(nextPage);
      const fits = page.scrollHeight <= page.clientHeight + 1;
      nextPage.removeChild(b); page.replaceChild(block, a);
      if (fits) { best = mid; low = mid + 1; } else high = mid - 1;
    }
    if (!best) return false;
    const [a, b] = makeSplit(best);
    page.replaceChild(a, block); nextPage.insertBefore(b, nextPage.firstChild);
    return true;
  }

  function fitPage(page, nextPage) {
    let guard = 0;
    while (page.scrollHeight > page.clientHeight + 1 && guard++ < 500) {
      const children = Array.from(page.childNodes);
      if (!children.length) break;
      const last = children[children.length - 1];
      if (last.nodeType === Node.TEXT_NODE) {
        if (!last.nodeValue.trim()) { last.remove(); continue; }
        break;
      }
      if (last.classList?.contains('authorization-page-break')) break;
      if (children.length === 1 && splitElement(last, page, nextPage)) continue;
      page.removeChild(last);
      nextPage.insertBefore(last, nextPage.firstChild);
    }
  }

  function paginate() {
    const editor = getEditor();
    if (!editor || paginating) return;
    paginating = true;
    try {
      const saved = selectionOffsets(editor);
      const logicalNodes = extractLogicalNodes(editor);
      setEditorShell(editor);
      editor.innerHTML = '';
      let current = makePage();
      editor.appendChild(current);
      let forceBreak = false;

      for (const originalNode of logicalNodes) {
        if (originalNode.nodeType === Node.TEXT_NODE && !originalNode.nodeValue.trim()) continue;
        const node = originalNode;

        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('authorization-page-break')) {
          current.appendChild(node);
          forceBreak = true;
          continue;
        }

        if (forceBreak) {
          current = makePage();
          editor.appendChild(current);
          forceBreak = false;
        }

        current.appendChild(node);
        pageStyle(current);
        if (current.scrollHeight <= current.clientHeight + 1) continue;

        current.removeChild(node);
        const next = makePage();
        editor.appendChild(next);

        current.appendChild(node);
        if (!(node.nodeType === Node.ELEMENT_NODE && node.matches('table,img,hr')) && splitElement(node, current, next)) {
          current = next;
          continue;
        }

        current.removeChild(node);
        next.appendChild(node);
        current = next;
        if (current.scrollHeight > current.clientHeight + 1) {
          const following = makePage();
          editor.appendChild(following);
          fitPage(current, following);
          current = following;
        }
      }

      let pages = getPages();
      while (pages.length > 1) {
        const last = pages[pages.length - 1];
        if (last.childNodes.length && !Array.from(last.childNodes).every(isEmptyNode)) break;
        last.remove();
        pages.pop();
      }
      if (!pages.length) { pages = [makePage()]; editor.appendChild(pages[0]); }
      pages.forEach((page, index) => {
        page.dataset.pageNumber = String(index + 1);
        pageStyle(page);
      });

      restoreSelection(editor, saved);
      if (typeof window.saveLetter === 'function') window.saveLetter();
    } finally {
      paginating = false;
    }
  }

  function schedulePagination() {
    clearTimeout(paginationTimer);
    paginationTimer = window.setTimeout(() => requestAnimationFrame(paginate), 80);
  }

  function logicalHtml() {
    const pages = getPages();
    return pages.length ? pages.map((page) => page.innerHTML).join('') : (getEditor()?.innerHTML || '');
  }

  function installSaveOverride() {
    if (typeof window.saveLetter === 'function' && !window.saveLetter.__authorizationLogicalOverride) {
      const originalSave = window.saveLetter;
      const wrapped = function () {
        const editor = getEditor();
        if (!editor) return originalSave.apply(this, arguments);
        const html = logicalHtml();
        window.__tubolAuthorizationLogicalHtml = html;
        try { if (typeof state !== 'undefined') state.letterHtml = html; } catch (_) {}
        localStorage.setItem('pdfWorkspaceLetter', html);
        if (typeof window.updateWordCount === 'function') window.updateWordCount();
      };
      wrapped.__authorizationLogicalOverride = true;
      wrapped.__original = originalSave;
      window.saveLetter = wrapped;
    }
  }

  function installTemplateSaveGuard() {
    if (document.documentElement.dataset.authorizationTemplateSaveGuard === '1') return;
    document.documentElement.dataset.authorizationTemplateSaveGuard = '1';
    document.addEventListener('click', (event) => {
      const button = event.target.closest?.('#saveTemplateConfirmBtn');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        const html = logicalHtml().trim();
        if (!html) return window.toast?.('Write a letter before saving a template', 'error');
        const input = document.getElementById('saveTemplateNameInput');
        const name = (input?.value || '').trim();
        if (!name) { input?.focus(); window.toast?.('Enter a template name', 'error'); return; }
        const id = globalThis.crypto?.randomUUID?.() || `template-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const list = typeof window.getAuthTemplates === 'function' ? window.getAuthTemplates() : [];
        list.push({ id, name, html });
        if (typeof window.saveAuthTemplates === 'function') window.saveAuthTemplates(list);
        if (typeof window.closeSaveTemplateModal === 'function') window.closeSaveTemplateModal();
        window.toast?.(`Saved template: ${name}`, 'success');
      } catch (error) {
        console.error('Authorization template save failed', error);
        window.toast?.('Could not save the template', 'error');
      }
    }, true);
  }

  function overridePdfExport() {
    if (typeof window.html2pdf !== 'function' || typeof window.createLetterPdfBlob !== 'function') return false;
    if (window.createLetterPdfBlob.__pagedOverride) return true;
    const original = window.createLetterPdfBlob;
    const exportFn = async function () {
      paginate();
      const editor = getEditor();
      const clone = editor.cloneNode(true);
      clone.style.width = `${SPEC.w}px`;
      clone.style.height = 'auto';
      clone.style.minHeight = '0';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.padding = '0';
      clone.querySelectorAll('.authorization-page').forEach((page) => {
        page.style.width = `${SPEC.w}px`;
        page.style.height = `${SPEC.h}px`;
        page.style.minHeight = `${SPEC.h}px`;
        page.style.maxHeight = `${SPEC.h}px`;
        page.style.overflow = 'hidden';
        page.style.margin = '0';
        page.style.boxShadow = 'none';
        page.style.border = '0';
        page.style.breakAfter = 'page';
        page.style.pageBreakAfter = 'always';
      });
      const wrapper = document.createElement('div');
      wrapper.style.background = '#fff';
      wrapper.style.width = `${SPEC.w}px`;
      wrapper.style.height = 'auto';
      wrapper.appendChild(clone);
      const root = document.createElement('div');
      root.style.position = 'fixed';
      root.style.left = '-100000px';
      root.style.top = '0';
      root.style.width = `${SPEC.w}px`;
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
          jsPDF: { unit: 'pt', format: SPEC.pdf, orientation: 'portrait' },
        }).from(wrapper).outputPdf('blob');
      } finally { root.remove(); }
    };
    exportFn.__pagedOverride = true;
    exportFn.__original = original;
    window.createLetterPdfBlob = exportFn;
    return true;
  }

  function mount() {
    const editor = getEditor();
    if (!editor || editor.dataset.authorizationPaginationMounted === '1') return;
    editor.dataset.authorizationPaginationMounted = '1';
    installSaveOverride();
    installTemplateSaveGuard();
    paginate();
    editor.addEventListener('input', schedulePagination);
    window.addEventListener('resize', schedulePagination);
    const observer = new MutationObserver(() => {
      if (!paginating) schedulePagination();
    });
    observer.observe(editor, { childList: true, subtree: true });
    overridePdfExport();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
