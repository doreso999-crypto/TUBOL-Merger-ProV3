/* TUBOL PDF Workspace core — M&O packet only. */
const { PDFDocument, degrees } = PDFLib;

const state = {
  pages: [],
  selected: new Set(),
  preview: { entryId: null, scale: 1, renderedPages: [] },
  mergeExport: { blob: null, suggestedFilename: 'packet Merged.pdf' },
};

const pdfRenderCache = new Map();
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function toast(message, type) {
  const el = $('#toast');
  if (!el) return;
  const text = String(message || '');
  const inferred = type || (/failed|could not|unable|invalid|error|cannot|not found/i.test(text) ? 'error' : /saved|added|created|download|success|updated|populated/i.test(text) ? 'success' : 'info');
  el.textContent = text;
  el.className = `toast ${inferred} show`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

async function saveBlobToDisk(blob, filename) {
  const safeName = (filename || 'merged-packet.pdf').replace(/[\\/:*?"<>|]+/g, '-');
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: safeName,
        types: [{ description: 'PDF document', accept: { 'application/pdf': ['.pdf'] } }],
        excludeAcceptAllOption: true,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      toast(`Saved ${handle.name}`);
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') return false;
      console.warn('Save picker failed; using download fallback.', error);
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Download started. Your browser may ask where to save it.');
  return true;
}

function downloadBlob(blob, filename) { return saveBlobToDisk(blob, filename); }

function getDefaultMergedFilename() {
  const first = state.pages[0]?.fileName || 'packet.pdf';
  const base = first.replace(/\.pdf$/i, '').trim() || 'packet';
  return `${base} Merged.pdf`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
}

async function getPdfJsDocument(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const key = source.buffer;
  if (pdfRenderCache.has(key)) return pdfRenderCache.get(key);
  const task = pdfjsLib.getDocument({ data: new Uint8Array(source), useWorkerFetch: true, isEvalSupported: true, verbosity: 0 }).promise
    .catch(async error => pdfjsLib.getDocument({ data: new Uint8Array(source), disableWorker: true, verbosity: 0 }).promise.catch(() => { throw error; }));
  pdfRenderCache.set(key, task);
  return task;
}

async function renderPageThumb(entry, canvas) {
  const container = canvas?.parentElement;
  const placeholder = container?.querySelector('.thumb-loading');
  if (!container || !canvas) return;
  try {
    const pdf = await getPdfJsDocument(entry.pdfBytes);
    const page = await pdf.getPage(entry.sourceIndex + 1);
    const rotation = ((entry.rotation || 0) % 360 + 360) % 360;
    const width = Math.max(130, container.clientWidth || 180);
    const base = page.getViewport({ scale: 1, rotation });
    const scale = Math.min(width / base.width, 1.35);
    const viewport = page.getViewport({ scale, rotation });
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.ceil(viewport.width * ratio);
    canvas.height = Math.ceil(viewport.height * ratio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise;
    container.classList.add('rendered');
    if (placeholder) placeholder.textContent = '';
  } catch (error) {
    console.error('PDF thumbnail render failed', error);
    if (placeholder) { placeholder.textContent = 'Preview unavailable'; placeholder.style.animation = 'none'; }
  }
}

async function renderContinuousPreview(focusEntryId = null) {
  const wrap = $('#continuousPreviewCanvasWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const pages = state.pages.slice();
  if (!pages.length) {
    wrap.innerHTML = '<div class="continuous-preview-loading">No pages to preview.</div>';
    return;
  }
  const focusIndex = focusEntryId ? pages.findIndex(page => page.id === focusEntryId) : 0;
  $('#previewFileName').textContent = 'PDF Packet Preview';
  $('#previewPageLabel').textContent = `${pages.length} page${pages.length === 1 ? '' : 's'}`;
  const cardWidth = Math.max(360, Math.min(860, wrap.clientWidth - 48));
  state.preview.renderedPages = [];

  for (let index = 0; index < pages.length; index++) {
    const entry = pages[index];
    const holder = document.createElement('div');
    holder.className = 'continuous-preview-page' + (entry.id === focusEntryId ? ' active-page' : '');
    holder.dataset.id = entry.id;
    holder.innerHTML = `<div class="continuous-preview-loading">Rendering page ${index + 1}…</div><canvas aria-label="PDF page ${index + 1}"></canvas>`;
    wrap.appendChild(holder);
    try {
      const pdf = await getPdfJsDocument(entry.pdfBytes);
      const page = await pdf.getPage(entry.sourceIndex + 1);
      const rotation = entry.rotation || 0;
      const base = page.getViewport({ scale: 1, rotation });
      const fitScale = Math.max(.35, Math.min(2.4, cardWidth / base.width));
      const scale = fitScale * (state.preview.scale || 1);
      const viewport = page.getViewport({ scale, rotation });
      const ratio = Math.min(2.2, window.devicePixelRatio || 1);
      const canvas = holder.querySelector('canvas');
      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, viewport.width, viewport.height);
      await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise;
      holder.querySelector('.continuous-preview-loading')?.remove();
      state.preview.renderedPages.push({ id: entry.id, canvas, holder });
    } catch (error) {
      console.error('Continuous PDF preview failed', error);
      holder.querySelector('.continuous-preview-loading')?.replaceChildren(document.createTextNode('Preview unavailable for this page'));
    }
  }

  if (focusIndex >= 0) requestAnimationFrame(() => wrap.querySelector(`[data-id="${CSS.escape(pages[focusIndex].id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

async function openPagePreview(entryId) {
  const entry = state.pages.find(page => page.id === entryId) || state.pages[0];
  if (!entry) return;
  const modal = $('#pdfPreviewModal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  state.preview.entryId = entry.id;
  await renderContinuousPreview(entry.id);
}

function closePagePreview() {
  const modal = $('#pdfPreviewModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  state.preview.entryId = null;
  state.preview.renderedPages = [];
}

function setPreviewZoom(multiplier) {
  state.preview.scale = Math.min(2.5, Math.max(.5, (state.preview.scale || 1) * multiplier));
  $('#continuousPreviewCanvasWrap')?.style.setProperty('--preview-scale', state.preview.scale);
  renderContinuousPreview(state.preview.entryId);
}

async function addPdfFiles(files) {
  const list = Array.from(files || []).filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  if (!list.length) return toast('Please drop PDF files only', 'error');
  let added = 0;
  for (const file of list) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let count = 0;
    try { count = (await PDFDocument.load(bytes, { ignoreEncryption:true, updateMetadata:false })).getPageCount(); }
    catch {
      try { count = (await getPdfJsDocument(bytes)).numPages; }
      catch (error) { console.error('Could not open PDF', file.name, error); toast(`Could not open ${file.name}`, 'error'); continue; }
    }
    if (!count) { toast(`Could not find pages in ${file.name}`, 'error'); continue; }
    for (let index = 0; index < count; index++) state.pages.push({ id: crypto.randomUUID(), pdfBytes: bytes, sourceIndex: index, fileName: file.name, rotation: 0 });
    added++;
  }
  if (added) { await renderPageBoard(); toast(`${added} PDF${added > 1 ? 's' : ''} added`, 'success'); }
}

async function renderPageBoard() {
  const grid = $('#pageGrid');
  if (!grid) return;
  grid.innerHTML = '';
  $('#emptyState')?.classList.toggle('hidden', state.pages.length > 0);
  state.pages.forEach((entry, index) => {
    const card = document.createElement('article');
    card.className = `page-card${state.selected.has(entry.id) ? ' selected' : ''}`;
    card.draggable = true;
    card.dataset.id = entry.id;
    card.innerHTML = `<input class="page-check" type="checkbox" ${state.selected.has(entry.id) ? 'checked' : ''} aria-label="Select page ${index + 1}"><div class="page-thumb"><div class="thumb-loading">Rendering…</div><canvas aria-label="PDF page preview"></canvas><span class="page-number">${index + 1}</span><button class="preview-btn" type="button" title="Preview page" aria-label="Preview page">↗</button></div><div class="page-card-footer"><div class="page-name" title="${escapeHtml(entry.fileName)}">${escapeHtml(entry.fileName)}</div><div class="page-source">Page ${entry.sourceIndex + 1}</div></div>`;
    const checkbox = card.querySelector('.page-check');
    checkbox.addEventListener('click', event => { event.stopPropagation(); checkbox.checked ? state.selected.add(entry.id) : state.selected.delete(entry.id); renderPageBoard(); });
    card.addEventListener('click', event => { if (event.target.closest('.page-check,.preview-btn')) return; state.selected.has(entry.id) ? state.selected.delete(entry.id) : state.selected.add(entry.id); renderPageBoard(); });
    card.querySelector('.preview-btn').addEventListener('click', event => { event.stopPropagation(); openPagePreview(entry.id); });
    card.querySelector('canvas').addEventListener('dblclick', event => { event.stopPropagation(); openPagePreview(entry.id); });
    card.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', entry.id); card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', event => event.preventDefault());
    card.addEventListener('drop', event => {
      event.preventDefault();
      const fromId = event.dataTransfer.getData('text/plain');
      const from = state.pages.findIndex(page => page.id === fromId);
      const to = state.pages.findIndex(page => page.id === entry.id);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = state.pages.splice(from, 1);
      state.pages.splice(to, 0, moved);
      renderPageBoard();
    });
    grid.appendChild(card);
  });
  updateSelectionSummary();
  await new Promise(requestAnimationFrame);
  await Promise.allSettled(state.pages.map(entry => {
    const canvas = grid.querySelector(`[data-id="${CSS.escape(entry.id)}"] canvas`);
    return canvas ? renderPageThumb(entry, canvas) : Promise.resolve();
  }));
}

function updateSelectionSummary() {
  const count = state.selected.size;
  const target = $('#selectionSummary');
  if (target) target.textContent = `${count} selected · ${state.pages.length} page${state.pages.length === 1 ? '' : 's'}`;
}

async function rasterizePdfPageToPdf(out, entry) {
  const pdf = await getPdfJsDocument(entry.pdfBytes);
  const page = await pdf.getPage(entry.sourceIndex + 1);
  const rotation = entry.rotation || 0;
  const baseViewport = page.getViewport({ scale:1, rotation });
  const renderScale = Math.max(1.5, Math.min(2.25, 1800 / Math.max(baseViewport.width, baseViewport.height)));
  const viewport = page.getViewport({ scale:renderScale, rotation });
  const canvas = document.createElement('canvas');
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.ceil(viewport.width * ratio);
  canvas.height = Math.ceil(viewport.height * ratio);
  const ctx = canvas.getContext('2d', { alpha:false });
  ctx.setTransform(ratio,0,0,ratio,0,0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,viewport.width,viewport.height);
  await page.render({ canvasContext:ctx, viewport, intent:'print' }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', .96);
  const imageBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), char => char.charCodeAt(0));
  const image = await out.embedJpg(imageBytes);
  const widthPt = viewport.width / renderScale;
  const heightPt = viewport.height / renderScale;
  const outPage = out.addPage([Math.max(1,widthPt), Math.max(1,heightPt)]);
  outPage.drawImage(image, { x:0, y:0, width:widthPt, height:heightPt });
}

async function mergePages(entries) {
  if (!entries.length) return toast('Add at least one page first');
  const button = $('#mergeExportBtn');
  const original = button?.textContent || 'Merge & Download';
  if (button) { button.disabled = true; button.textContent = 'Merging…'; }
  try {
    const out = await PDFDocument.create();
    for (const entry of entries) {
      let copied = false;
      try {
        const src = await PDFDocument.load(entry.pdfBytes, { ignoreEncryption:true, updateMetadata:false });
        const [page] = await out.copyPages(src, [entry.sourceIndex]);
        if (entry.rotation) page.setRotation(degrees(entry.rotation));
        out.addPage(page);
        copied = true;
      } catch (error) {
        console.warn(`Structural merge failed for ${entry.fileName} page ${entry.sourceIndex + 1}; using render fallback.`, error);
      }
      if (!copied) await rasterizePdfPageToPdf(out, entry);
    }
    if (!out.getPageCount()) throw new Error('The merged document contains no pages.');
    const bytes = await out.save({ useObjectStreams:true, addDefaultPage:false });
    if (!bytes.length) throw new Error('The PDF library returned an empty document.');
    state.mergeExport.blob = new Blob([bytes], { type:'application/pdf' });
    state.mergeExport.suggestedFilename = getDefaultMergedFilename();
    const filename = $('#mergeFilenameInput');
    if (filename) filename.value = state.mergeExport.suggestedFilename.replace(/\.pdf$/i,'');
    openSaveExportModal();
  } catch (error) {
    console.error('Merge failed', error);
    toast(`Merge failed${error?.message ? `: ${error.message}` : ''}`);
  } finally {
    if (button) { button.disabled = false; button.textContent = original; }
  }
}

function openSaveExportModal() {
  const modal = $('#saveExportModal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  $('#mergeFilenameInput')?.focus();
  $('#mergeFilenameInput')?.select();
}
function closeSaveExportModal() {
  const modal = $('#saveExportModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  if (!$('#pdfPreviewModal')?.classList.contains('open')) document.body.classList.remove('modal-open');
}
async function confirmMergeExport() {
  if (!state.mergeExport.blob) return toast('Nothing is ready to save yet.');
  let filename = ($('#mergeFilenameInput')?.value || '').trim();
  if (!filename) filename = getDefaultMergedFilename().replace(/\.pdf$/i,'');
  if (!/\.pdf$/i.test(filename)) filename += '.pdf';
  if (await saveBlobToDisk(state.mergeExport.blob, filename)) closeSaveExportModal();
}

function getSelectedEntries() { return state.pages.filter(page => state.selected.has(page.id)); }
function rotateSelected() { const chosen = getSelectedEntries(); if (!chosen.length) return; chosen.forEach(page => page.rotation = (page.rotation + 90) % 360); renderPageBoard(); }
function deleteSelected() { if (!state.selected.size) return; state.pages = state.pages.filter(page => !state.selected.has(page.id)); state.selected.clear(); renderPageBoard(); }
function duplicateSelected() { const chosen = getSelectedEntries(); if (!chosen.length) return; const insertAt = Math.max(0, state.pages.findIndex(page => page.id === chosen[chosen.length - 1].id) + 1); state.pages.splice(insertAt,0,...chosen.map(page => ({ ...page, id:crypto.randomUUID() }))); renderPageBoard(); }

async function compressEntries(entries, profile, progressEl) {
  const out = await PDFDocument.create();
  const scale = profile === 'low' ? 1.0 : profile === 'high' ? 1.7 : 1.35;
  const quality = profile === 'low' ? .55 : profile === 'high' ? .84 : .70;
  const widthCap = profile === 'low' ? 1300 : profile === 'high' ? 2400 : 1800;
  for (let i=0; i<entries.length; i++) {
    const entry = entries[i];
    const pdf = await getPdfJsDocument(entry.pdfBytes);
    const page = await pdf.getPage(entry.sourceIndex + 1);
    const base = page.getViewport({scale:1});
    const viewport = page.getViewport({scale:Math.max(.55, Math.min(scale, widthCap / base.width))});
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d',{alpha:false}); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    await page.render({canvasContext:ctx,viewport,intent:'print'}).promise;
    const jpg = await out.embedJpg(canvas.toDataURL('image/jpeg',quality));
    const outPage = out.addPage([viewport.width,viewport.height]);
    outPage.drawImage(jpg,{x:0,y:0,width:viewport.width,height:viewport.height});
    if (entry.rotation) outPage.setRotation(degrees(entry.rotation));
    if (progressEl) progressEl.style.width = `${Math.round(((i+1)/entries.length)*100)}%`;
  }
  return out.save({useObjectStreams:true,addDefaultPage:false});
}

async function compressPacket() {
  if (!state.pages.length) return;
  const progress = $('#packetCompressProgress');
  const bar = progress?.querySelector('span');
  if (progress) progress.style.display='block';
  if (bar) bar.style.width='0';
  try {
    const bytes = await compressEntries(state.pages, $('#packetCompressionSelect')?.value || 'medium', bar);
    await downloadBlob(new Blob([bytes],{type:'application/pdf'}),'compressed-packet.pdf');
    closePacketCompressionPanel();
    toast(`Compressed packet · ${formatBytes(bytes.length)}`);
  } catch (error) { console.error(error); toast('Packet compression failed'); }
  setTimeout(()=>{ if(progress) progress.style.display='none'; if(bar) bar.style.width='0'; },500);
}
function openPacketCompressionPanel() { if (!state.pages.length) return toast('Add pages to the packet first'); $('#packetCompressMeta').textContent=`${state.pages.length} page${state.pages.length===1?'':'s'} will be rendered into a smaller PDF.`; $('#packetCompressPanel').classList.add('open'); $('#packetCompressPanel').setAttribute('aria-hidden','false'); }
function closePacketCompressionPanel() { $('#packetCompressPanel')?.classList.remove('open'); $('#packetCompressPanel')?.setAttribute('aria-hidden','true'); }

const THEME_DEFAULTS = {
  light:{bg:'#f6f8fb',surface:'#fff',surface2:'#f0f3f7',line:'#d7dee7',text:'#17202a',muted:'#66727f',accent:'#2563eb',accent2:'#1d4ed8',selected:'#2563eb',success:'#198754',danger:'#c73a3a',highlight:'#b3d7ff'},
  dark:{bg:'#2a2d31',surface:'#34383d',surface2:'#3c4147',line:'#505760',text:'#f4f5f6',muted:'#bcc2c9',accent:'#8ea2b8',accent2:'#aab8c7',selected:'#8ea2b8',success:'#4db47b',danger:'#ff7b72',highlight:'#b3d7ff'},
  aqua:{bg:'#eaf6f7',surface:'#fff',surface2:'#f0fbfb',line:'#c7e2e4',text:'#18363b',muted:'#5f7c81',accent:'#147d84',accent2:'#0f666c',selected:'#147d84',success:'#188a68',danger:'#b64a40',highlight:'#b3d7ff'},
  adventure:{bg:'#f2eadb',surface:'#fffaf1',surface2:'#f8f0e3',line:'#dcc8a8',text:'#3e3022',muted:'#766149',accent:'#8a6338',accent2:'#6f4e2d',selected:'#8a6338',success:'#6f7f3f',danger:'#a74b3d',highlight:'#b3d7ff'},
  zombie:{bg:'#edf1ea',surface:'#f8faf6',surface2:'#f0f3ed',line:'#cbd2c5',text:'#2f3a30',muted:'#667364',accent:'#5d6f55',accent2:'#475a41',selected:'#5d6f55',success:'#5c8a4f',danger:'#aa4d45',highlight:'#b3d7ff'},
  warm:{bg:'#f5efe8',surface:'#fffaf5',surface2:'#f3ebe2',line:'#dfd1c1',text:'#3e3128',muted:'#7b6a5c',accent:'#a05b2c',accent2:'#83491f',selected:'#a05b2c',success:'#587a51',danger:'#a74739',highlight:'#b3d7ff'},
  contrast:{bg:'#fff',surface:'#fff',surface2:'#f1f1f1',line:'#000',text:'#000',muted:'#333',accent:'#000',accent2:'#222',selected:'#000',success:'#0b6b3a',danger:'#8a0000',highlight:'#b3d7ff'}
};
function hexToRgb(hex){ const n=parseInt(String(hex).slice(1),16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
function applyThemeVars(p){ const root=document.documentElement; const vars={bg:p.bg,surface:p.surface,'surface-2':p.surface2,line:p.line,text:p.text,muted:p.muted,accent:p.accent,'accent-2':p.accent2,'selected-page':p.selected,success:p.success,danger:p.danger,'highlight-color':p.highlight}; Object.entries(vars).forEach(([k,v])=>{root.style.setProperty(`--${k}`,v);document.body.style.setProperty(`--${k}`,v);}); const {r,g,b}=hexToRgb(p.accent); const luminance=(.299*r+.587*g+.114*b)/255; document.body.style.setProperty('--button-text',luminance>.74?'#111':'#fff'); }
function ensureUserColorStyle(){ let style=document.getElementById('user-color-overrides'); if(!style){style=document.createElement('style');style.id='user-color-overrides';document.head.appendChild(style);} return style; }
function getActivePalette(){ return THEME_DEFAULTS[localStorage.getItem('pdfWorkspaceTheme')||'light'] || THEME_DEFAULTS.light; }
function applyAccentColor(value,persist=true){ const safe=/^#[0-9a-fA-F]{6}$/.test(value)?value:getActivePalette().accent; const {r,g,b}=hexToRgb(safe); const mix=v=>Math.round(v*.88+255*.12); const accent2=`#${[mix(r),mix(g),mix(b)].map(v=>v.toString(16).padStart(2,'0')).join('')}`; if(persist)localStorage.setItem('pdfWorkspaceAccent',safe); const luminance=(.299*r+.587*g+.114*b)/255; const root=document.documentElement; const body=document.body; [root,body].forEach(el=>{el.style.setProperty('--accent',safe);el.style.setProperty('--accent-2',accent2);el.style.setProperty('--selected-page',safe);el.style.setProperty('--button-text',luminance>.74?'#111':'#fff');}); const style=ensureUserColorStyle(); style.textContent=`.btn-primary,.top-actions .btn-primary,.mini-btn.active{background:${safe}!important;border-color:${safe}!important;color:${luminance>.74?'#111':'#fff'}!important}.btn-primary:hover,.top-actions .btn-primary:hover,.mini-btn.active:hover{background:${accent2}!important;border-color:${accent2}!important}.eyebrow,.linkish,.important-text,.accent-text{color:${safe}!important}.page-card.selected{border-color:${safe}!important;box-shadow:0 0 0 2px ${safe}22!important}.editor-toolbar button.active{color:${safe}!important;background:${safe}18!important}`; }
function resetAccentColor(){ localStorage.removeItem('pdfWorkspaceAccent'); applyAccentColor(getActivePalette().accent,false); }
function applyHighlightColor(value,persist=true){ const safe=/^#[0-9a-fA-F]{6}$/.test(value)?value:(getActivePalette().highlight||'#b3d7ff'); if(persist)localStorage.setItem('pdfWorkspaceHighlight',safe); document.documentElement.style.setProperty('--highlight-color',safe); document.body.style.setProperty('--highlight-color',safe); const style=ensureUserColorStyle(); style.textContent=style.textContent.replace(/::selection\s*\{[^}]*\}/g,'')+`\n::selection,[contenteditable="true"]::selection{background:${safe}!important;color:#111!important}`; }
function resetHighlightColor(){ localStorage.removeItem('pdfWorkspaceHighlight'); applyHighlightColor(getActivePalette().highlight,false); }
function setTheme(mode){ const theme=THEME_DEFAULTS[mode]?mode:'light'; document.body.classList.remove('theme-dark','theme-aqua','theme-adventure','theme-zombie','theme-warm','theme-contrast','theme-custom','custom-theme-active'); if(theme!=='light')document.body.classList.add(`theme-${theme}`); const palette={...THEME_DEFAULTS[theme]}; applyThemeVars(palette); applyAccentColor(localStorage.getItem('pdfWorkspaceAccent')||palette.accent,false); applyHighlightColor(localStorage.getItem('pdfWorkspaceHighlight')||palette.highlight,false); localStorage.setItem('pdfWorkspaceTheme',theme); if($('#themeSelect'))$('#themeSelect').value=theme; }
function setupThemeSelect(){ localStorage.removeItem('pdfWorkspaceCustomThemes'); localStorage.removeItem('pdfWorkspaceCustomTheme'); }
function openSettings(){ window.dispatchEvent(new CustomEvent('tubol:open-settings')); }

function init(){
  setupGlobalPdfDrop();
  $('#addPdfBtn')?.addEventListener('click',()=>$('#pdfInput')?.click());
  $('#pdfInput')?.addEventListener('change',()=>{addPdfFiles($('#pdfInput').files);$('#pdfInput').value='';});
  wireDropZone($('#dropZone'),addPdfFiles);
  $('#mergeExportBtn')?.addEventListener('click',()=>mergePages(state.pages));
  $('#saveExportCloseBtn')?.addEventListener('click',closeSaveExportModal);
  $('#saveExportCancelBtn')?.addEventListener('click',closeSaveExportModal);
  $('#saveExportConfirmBtn')?.addEventListener('click',confirmMergeExport);
  $('#saveExportModal')?.addEventListener('click',e=>{if(e.target.id==='saveExportModal')closeSaveExportModal();});
  $('#compressPacketBtn')?.addEventListener('click',openPacketCompressionPanel);
  $('#packetCompressCloseBtn')?.addEventListener('click',closePacketCompressionPanel);
  $('#packetCompressBtn')?.addEventListener('click',compressPacket);
  $('#rotateLeftBtn')?.addEventListener('click',rotateSelected);
  $('#duplicatePageBtn')?.addEventListener('click',duplicateSelected);
  $('#deletePageBtn')?.addEventListener('click',deleteSelected);
  $('#clearAllBtn')?.addEventListener('click',()=>{state.pages=[];state.selected.clear();renderPageBoard();});
  $('#previewCloseBtn')?.addEventListener('click',closePagePreview);
  $('#previewZoomOutBtn')?.addEventListener('click',()=>setPreviewZoom(.85));
  $('#previewZoomInBtn')?.addEventListener('click',()=>setPreviewZoom(1.18));
  $('#previewFitBtn')?.addEventListener('click',()=>{state.preview.scale=1.1;renderContinuousPreview(state.preview.entryId);});
  $('#pdfPreviewModal')?.addEventListener('click',e=>{if(e.target.id==='pdfPreviewModal')closePagePreview();});
  window.addEventListener('resize',()=>{if($('#pdfPreviewModal')?.classList.contains('open')&&state.preview.entryId)renderContinuousPreview(state.preview.entryId);});
  document.addEventListener('keydown',e=>{if($('#saveExportModal')?.classList.contains('open')&&e.key==='Escape')closeSaveExportModal();if($('#pdfPreviewModal')?.classList.contains('open')&&e.key==='Escape')closePagePreview();if($('#packetCompressPanel')?.classList.contains('open')&&e.key==='Escape')closePacketCompressionPanel();});
  $('#settingsBtn')?.addEventListener('click',openSettings);
  setupThemeSelect();
  setupGlobalPdfDrop();
  renderPageBoard();
}

function wireDropZone(el,handler){ if(!el)return; ['dragenter','dragover'].forEach(evt=>el.addEventListener(evt,e=>{e.preventDefault();el.classList.add('dragover');})); ['dragleave','drop'].forEach(evt=>el.addEventListener(evt,e=>{e.preventDefault();el.classList.remove('dragover');})); el.addEventListener('drop',e=>{e.stopPropagation();$('#globalDropOverlay')?.classList.remove('show');handler(e.dataTransfer.files);}); }
function setupGlobalPdfDrop(){ const overlay=$('#globalDropOverlay'); if(!overlay)return; let depth=0; const hasFiles=e=>Array.from(e.dataTransfer?.types||[]).includes('Files'); const hide=()=>{depth=0;overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');}; document.addEventListener('dragenter',e=>{if(!hasFiles(e))return;depth++;overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');}); document.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect='copy';overlay.classList.add('show');}); document.addEventListener('dragleave',e=>{if(!hasFiles(e))return;depth=Math.max(0,depth-1);if(!depth)hide();}); document.addEventListener('drop',async e=>{if(!hasFiles(e))return;e.preventDefault();hide();await addPdfFiles(e.dataTransfer.files);}); window.addEventListener('blur',hide); }

Object.assign(window,{state,toast,saveBlobToDisk,downloadBlob,getDefaultMergedFilename,escapeHtml,getPdfJsDocument,renderPageThumb,renderPageBoard,formatBytes:bytes=>{if(!bytes)return'0 B';const units=['B','KB','MB','GB'];const i=Math.floor(Math.log(bytes)/Math.log(1024));return`${(bytes/Math.pow(1024,i)).toFixed(i?1:0)} ${units[i]}`;},setTheme,getActivePalette,applyAccentColor,resetAccentColor,applyHighlightColor,resetHighlightColor});

document.addEventListener('DOMContentLoaded',init,{once:true});
