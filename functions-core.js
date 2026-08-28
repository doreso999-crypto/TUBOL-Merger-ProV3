/* PDF Workspace — local browser app */
const { PDFDocument, degrees } = PDFLib;

const state = {
  pages: [],
  selected: new Set(),
  letterHtml: localStorage.getItem('pdfWorkspaceLetter') || '',
  preview: { entryId: null, pdf: null, pageNumber: 1, scale: 1.0, renderTask: null, renderedPages: [] },
  mergeExport: { blob: null, suggestedFilename: 'packet Merged.pdf' },
};

const pdfRenderCache = new Map();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function toast(message, type) {
  const el = $('#toast');
  const text = String(message || '');
  const inferred = type || (/failed|could not|unable|invalid|error|cannot|not found/i.test(text) ? 'error' : /saved|added|created|download|success|updated|populated/i.test(text) ? 'success' : 'info');
  el.textContent = text;
  el.className = `toast ${inferred} show`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

async function saveBlobToDisk(blob, filename) {
  const safeName = (filename || 'merged-packet.pdf').replace(/[\/:*?"<>|]+/g, '-');
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
    } catch (err) {
      if (err?.name === 'AbortError') return false;
      console.warn('Save picker failed; using download fallback.', err);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Download started. Your browser may ask where to save it.');
  return true;
}

function downloadBlob(blob, filename) {
  saveBlobToDisk(blob, filename);
}

function getDefaultMergedFilename() {
  const first = state.pages[0]?.fileName || 'packet.pdf';
  const base = first.replace(/\.pdf$/i, '').trim() || 'packet';
  return `${base} Merged.pdf`;
}

const PAPER_SPECS = {
  letter: { w: 8.5, h: 11, cssW: 816, cssH: 1056, pdf: 'letter' },
  legal: { w: 8.5, h: 14, cssW: 816, cssH: 1344, pdf: 'legal' },
  a4: { w: 8.27, h: 11.69, cssW: 794, cssH: 1123, pdf: 'a4' },
  a5: { w: 5.83, h: 8.27, cssW: 560, cssH: 794, pdf: 'a5' },
  b5: { w: 6.93, h: 9.84, cssW: 665, cssH: 945, pdf: [6.93, 9.84] },
  executive: { w: 7.25, h: 10.5, cssW: 696, cssH: 1008, pdf: [7.25, 10.5] },
  'half-letter': { w: 5.5, h: 8.5, cssW: 528, cssH: 816, pdf: [5.5, 8.5] },
};


const AUTH_BUREAUS = {
  experian: { name:'Experian', address:'Experian\nP.O. Box 2002\nAllen, TX 75013' },
  equifax: { name:'Equifax Information Services LLC', address:'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374' },
  transunion: { name:'TransUnion Consumer Solutions', address:'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000' },
};
const DEFAULT_AUTH_TEMPLATE = {
  id:'authorization-default',
  name:'Authorization Dispute',
  html:`<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.5">
{{BUREAU_ADDRESS_HTML}}<br><br>
This is <strong>{{CLIENT_NAME}}</strong> and I authorize this dispute.<br><br>
Today is {{DATE}}.<br><br>
I am mailing this through a mailing company as I can’t physically go into postal office due to health issues. This is my authorization for you to process this dispute.<br><br>
This is not a third party agency or anyone else authorizing this dispute.<br><br>
Please do not deflect or not process my dispute for any such reason.<br>
Again, this is <strong>{{CLIENT_NAME}}</strong><br><br>
I authorize this dispute.
</div>`
};
function getAuthTemplates(){
  try {
    const data=JSON.parse(localStorage.getItem('pdfWorkspaceAuthTemplates')||'null');
    if(Array.isArray(data)&&data.length){
      const migrated=data.map(t=> t.id==='authorization-default' ? DEFAULT_AUTH_TEMPLATE : t);
      localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(migrated));
      return migrated;
    }
  } catch{}
  const seeded=[DEFAULT_AUTH_TEMPLATE]; localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(seeded)); return seeded;
}
function saveAuthTemplates(list){ localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(list)); }
function getEasternToday(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const map=Object.fromEntries(parts.map(p=>[p.type,p.value])); return `${map.year}-${map.month}-${map.day}`;
}
function formatAuthDate(value){ if(!value) return ''; const [y,m,d]=value.split('-'); return `${m}/${d}/${y}`; }
function renderLetterTemplateOptions(){
  const select=$('#letterTemplateSelect'); if(!select) return;
  const templates=getAuthTemplates();
  select.innerHTML='';
  templates.forEach(t=>{ const opt=document.createElement('option'); opt.value=t.id; opt.textContent=t.name; select.appendChild(opt); });
  updateTemplateDeleteState();
}
function updateLetterTemplateModalAddress(){
  const key=$('#letterTemplateBureau')?.value||'equifax';
  const bureau=AUTH_BUREAUS[key];
  if($('#letterTemplateBureauAddress')) $('#letterTemplateBureauAddress').textContent=bureau.address.replace(/\n/g,' • ');
}
function openLetterTemplateModal(){
  renderLetterTemplateOptions();
  if(!$('#letterTemplateDate').value) $('#letterTemplateDate').value=getEasternToday();
  if(!$('#letterTemplateBureau').value) $('#letterTemplateBureau').value='equifax';
  updateLetterTemplateModalAddress();
  $('#letterTemplateModal').classList.add('open'); $('#letterTemplateModal').setAttribute('aria-hidden','false');
}
function closeLetterTemplateModal(){
  $('#letterTemplateModal').classList.remove('open'); $('#letterTemplateModal').setAttribute('aria-hidden','true');
}
function applyTemplateToLetter(){
  const id=$('#letterTemplateSelect').value;
  const template=getAuthTemplates().find(t=>t.id===id);
  if(!template) return toast('Choose a template first');
  const name=($('#letterTemplateClientName').value||'').trim() || 'Your Name';
  const date=formatAuthDate($('#letterTemplateDate').value) || formatAuthDate(getEasternToday());
  const bureau=AUTH_BUREAUS[$('#letterTemplateBureau').value] || AUTH_BUREAUS.equifax;
  const bureauAddressHtml=bureau.address.split('\n').map(escapeHtml).join('<br>');
  const html=template.html || `<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.35">${escapeHtml(template.content||'').replace(/\n/g,'<br>')}</div>`;
  const filled=html
    .replaceAll('{{CLIENT_NAME}}', escapeHtml(name))
    .replaceAll('{{DATE}}', escapeHtml(date))
    .replaceAll('{{BUREAU_NAME}}', escapeHtml(bureau.name))
    .replaceAll('{{BUREAU_ADDRESS_HTML}}', bureauAddressHtml)
    .replaceAll('{{BUREAU_ADDRESS}}', bureauAddressHtml.replace(/<br>/g,'<br>'));
  const editor=$('#letterEditor');
  editor.innerHTML=filled;
  editor.style.fontFamily='Arial';
  editor.style.fontSize='20px';
  $('#fontFamilySelect').value='Arial';
  $('#fontSizeSelect').value='20';
  localStorage.setItem('pdfWorkspaceFont','Arial');
  localStorage.setItem('pdfWorkspaceFontSize','20');
  saveLetter();
  closeLetterTemplateModal();
  toast(`${template.name} populated in Letter Editor`);
  editor.focus();
}
function openSaveTemplateModal(){
  const html=($('#letterEditor')?.innerHTML||'').trim();
  if(!html) return toast('Write a letter before saving a template','error');
  const modal=$('#saveTemplateModal');
  if(!modal) return toast('Save Template dialog is unavailable','error');
  const input=$('#saveTemplateNameInput');
  if(input){ input.value=''; setTimeout(()=>{ input.focus(); input.select(); },0); }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}
function closeSaveTemplateModal(){
  const modal=$('#saveTemplateModal');
  if(!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}
function confirmSaveTemplate(){
  const html=($('#letterEditor')?.innerHTML||'').trim();
  if(!html) return toast('Write a letter before saving a template','error');
  const input=$('#saveTemplateNameInput');
  const name=(input?.value||'').trim();
  if(!name){
    input?.focus();
    toast('Enter a template name','error');
    return;
  }
  const id=(globalThis.crypto?.randomUUID?.() || `template-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const record={id, name, html};
  const list=getAuthTemplates();
  list.push(record);
  saveAuthTemplates(list);
  closeSaveTemplateModal();
  toast(`Saved template: ${record.name}`,'success');
}
function deleteSelectedLetterTemplate(){
  const id=$('#letterTemplateSelect')?.value;
  if(!id || id==='authorization-default') return toast('The default template cannot be removed','error');
  const template=getAuthTemplates().find(t=>t.id===id);
  if(!template) return;
  if(!confirm(`Delete “${template.name}”?`)) return;
  const list=getAuthTemplates().filter(t=>t.id!==id);
  saveAuthTemplates(list);
  renderLetterTemplateOptions();
  toast(`Deleted template: ${template.name}`,'success');
}
function updateTemplateDeleteState(){
  const btn=$('#deleteSavedTemplateBtn');
  const id=$('#letterTemplateSelect')?.value;
  if(btn) btn.disabled=!id || id==='authorization-default';
}
function setupLetterTemplates(){
  $('#openLetterTemplateBtn')?.addEventListener('click', openLetterTemplateModal);
  $('#saveLetterTemplateBtn')?.addEventListener('click', openSaveTemplateModal);
  $('#saveTemplateCloseBtn')?.addEventListener('click', closeSaveTemplateModal);
  $('#saveTemplateCancelBtn')?.addEventListener('click', closeSaveTemplateModal);
  $('#saveTemplateConfirmBtn')?.addEventListener('click', confirmSaveTemplate);
  $('#saveTemplateNameInput')?.addEventListener('keydown', e => { if(e.key==='Enter'){ e.preventDefault(); confirmSaveTemplate(); } });
  $('#saveTemplateModal')?.addEventListener('click', e => { if(e.target.id==='saveTemplateModal') closeSaveTemplateModal(); });
  $('#letterTemplateCloseBtn')?.addEventListener('click', closeLetterTemplateModal);
  $('#letterTemplateCancelBtn')?.addEventListener('click', closeLetterTemplateModal);
  $('#letterTemplateApplyBtn')?.addEventListener('click', applyTemplateToLetter);
  $('#saveCurrentAsTemplateBtn')?.addEventListener('click', saveCurrentLetterAsTemplate);
  $('#letterTemplateBureau')?.addEventListener('change', updateLetterTemplateModalAddress);
  $('#letterTemplateSelect')?.addEventListener('change', updateTemplateDeleteState);
  $('#deleteSavedTemplateBtn')?.addEventListener('click', deleteSelectedLetterTemplate);
  $('#letterTemplateModal')?.addEventListener('click', e=>{ if(e.target.id==='letterTemplateModal') closeLetterTemplateModal(); });
}

function getPaperSpec() { return PAPER_SPECS[$('#paperSizeSelect')?.value || 'letter']; }
function getCurrentMargin() { return ({narrow:'48px', compact:'72px', normal:'96px', comfortable:'120px', wide:'144px', 'extra-wide':'192px'})[$('#marginSelect')?.value || 'normal'] || '96px'; }
function applyPaperSize() {
  const key = $('#paperSizeSelect')?.value || 'letter';
  const spec = getPaperSpec();
  const page = $('#letterEditor');
  const wrap = $('.letter-page-wrap');
  if (!page || !spec) return;
  document.body.classList.add('paper-size-switching');
  page.style.width = `${spec.cssW}px`;
  page.style.minWidth = `${spec.cssW}px`;
  page.style.minHeight = `${spec.cssH}px`;
  page.style.setProperty('--page-pad', getCurrentMargin());
  page.style.padding = getCurrentMargin();
  wrap.dataset.paper = key;
  wrap.scrollLeft = Math.max(0, (page.offsetWidth - wrap.clientWidth) / 2);
  requestAnimationFrame(() => wrap.scrollLeft = Math.max(0, (page.offsetWidth - wrap.clientWidth) / 2));
  window.setTimeout(() => document.body.classList.remove('paper-size-switching'), 360);
  saveLetter();
}

const THEME_DEFAULTS = {
  light:{bg:'#f6f8fb',surface:'#ffffff',surface2:'#f0f3f7',line:'#d7dee7',text:'#17202a',muted:'#66727f',accent:'#2563eb',accent2:'#1d4ed8',selected:'#2563eb',success:'#198754',danger:'#c73a3a',highlight:'#b3d7ff'},
  dark:{bg:'#2a2d31',surface:'#34383d',surface2:'#3c4147',line:'#505760',text:'#f4f5f6',muted:'#bcc2c9',accent:'#8ea2b8',accent2:'#aab8c7',selected:'#8ea2b8',success:'#4db47b',danger:'#ff7b72',highlight:'#b3d7ff'},
  aqua:{bg:'#eaf6f7',surface:'#ffffff',surface2:'#f0fbfb',line:'#c7e2e4',text:'#18363b',muted:'#5f7c81',accent:'#147d84',accent2:'#0f666c',selected:'#147d84',success:'#188a68',danger:'#b64a40',highlight:'#b3d7ff'},
  adventure:{bg:'#f2eadb',surface:'#fffaf1',surface2:'#f8f0e3',line:'#dcc8a8',text:'#3e3022',muted:'#766149',accent:'#8a6338',accent2:'#6f4e2d',selected:'#8a6338',success:'#6f7f3f',danger:'#a74b3d',highlight:'#b3d7ff'},
  zombie:{bg:'#edf1ea',surface:'#f8faf6',surface2:'#f0f3ed',line:'#cbd2c5',text:'#2f3a30',muted:'#667364',accent:'#5d6f55',accent2:'#475a41',selected:'#5d6f55',success:'#5c8a4f',danger:'#aa4d45',highlight:'#b3d7ff'},
  warm:{bg:'#f5efe8',surface:'#fffaf5',surface2:'#f3ebe2',line:'#dfd1c1',text:'#3e3128',muted:'#7b6a5c',accent:'#a05b2c',accent2:'#83491f',selected:'#a05b2c',success:'#587a51',danger:'#a74739',highlight:'#b3d7ff'},
  contrast:{bg:'#ffffff',surface:'#ffffff',surface2:'#f1f1f1',line:'#000000',text:'#000000',muted:'#333333',accent:'#000000',accent2:'#222222',selected:'#000000',success:'#0b6b3a',danger:'#8a0000',highlight:'#b3d7ff'}
};
function hexToRgb(hex){const n=parseInt(hex.slice(1),16);return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
function applyThemeVars(p){
  const root=document.documentElement;
  const vars={bg:p.bg,surface:p.surface,'surface-2':p.surface2,line:p.line,text:p.text,muted:p.muted,accent:p.accent,'accent-2':p.accent2,'selected-page':p.selected,success:p.success,danger:p.danger,'highlight-color':p.highlight};
  Object.entries(vars).forEach(([k,v])=>{root.style.setProperty(`--${k}`,v); document.body.style.setProperty(`--${k}`,v);});
  const luminance=(hex)=>{const {r,g,b}=hexToRgb(hex);return (0.299*r+0.587*g+0.114*b)/255;};
  document.body.style.setProperty('--button-text', luminance(p.accent)>0.74 ? '#111' : '#fff');
}
function setTheme(mode) {
  const normalized = THEME_DEFAULTS[mode] ? mode : 'light';
  document.body.classList.remove('theme-dark','theme-aqua','theme-adventure','theme-zombie','theme-warm','theme-contrast','theme-custom','custom-theme-active');
  const palette = { ...THEME_DEFAULTS[normalized] };
  if (normalized !== 'light') document.body.classList.add(`theme-${normalized}`);
  applyThemeVars(palette);
  // Per-user overrides intentionally survive theme changes until Reset is clicked.
  const accentOverride = localStorage.getItem('pdfWorkspaceAccent');
  const highlightOverride = localStorage.getItem('pdfWorkspaceHighlight');
  if (accentOverride) applyAccentColor(accentOverride, false); else applyAccentColor(palette.accent, false, true);
  if (highlightOverride) applyHighlightColor(highlightOverride, false); else applyHighlightColor(palette.highlight, false, true);
  localStorage.setItem('pdfWorkspaceTheme', normalized);
  const sel = $('#themeSelect'); if (sel) sel.value = normalized;
}
function getActivePalette(){
  const theme = localStorage.getItem('pdfWorkspaceTheme') || 'light';
  return THEME_DEFAULTS[theme] || THEME_DEFAULTS.light;
}
function openSettings(){
  const modal=$('#settingsModal'); if(!modal) return;
  const p=getActivePalette();
  $('#highlightColorInput').value=localStorage.getItem('pdfWorkspaceHighlight')||p.highlight;
  $('#highlightColorValue').textContent=$('#highlightColorInput').value.toUpperCase();
  $('#accentColorInput').value=localStorage.getItem('pdfWorkspaceAccent')||p.accent;
  $('#accentColorValue').textContent=$('#accentColorInput').value.toUpperCase();
  $('#themeSelect').value=localStorage.getItem('pdfWorkspaceTheme')||'light';
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
}
function closeSettings(){const modal=$('#settingsModal'); if(!modal) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');}
function ensureUserColorStyle(){
  let style=document.getElementById('user-color-overrides');
  if(!style){ style=document.createElement('style'); style.id='user-color-overrides'; document.head.appendChild(style); }
  return style;
}
function applyAccentColor(value,persist=true,fromTheme=false){
  const safe=/^#[0-9a-fA-F]{6}$/.test(value)?value:getActivePalette().accent;
  const {r,g,b}=hexToRgb(safe); const mix=v=>Math.round(v*.88+255*.12); const accent2=`#${[mix(r),mix(g),mix(b)].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
  if(persist) localStorage.setItem('pdfWorkspaceAccent',safe);
  const l=(r*.299+g*.587+b*.114)/255;
  const buttonText=l>0.74?'#111':'#fff';
  const root=document.documentElement, body=document.body;
  [root,body].forEach(el=>{
    el.style.setProperty('--accent',safe);
    el.style.setProperty('--accent-2',accent2);
    el.style.setProperty('--selected-page',safe);
    el.style.setProperty('--button-text',buttonText);
  });
  const style=ensureUserColorStyle();
  style.textContent=`
    .btn-primary,.top-actions .btn-primary,.mini-btn.active { background:${safe} !important; border-color:${safe} !important; color:${buttonText} !important; }
    .btn-primary:hover,.top-actions .btn-primary:hover,.mini-btn.active:hover { background:${accent2} !important; border-color:${accent2} !important; }
    .eyebrow,.linkish,.important-text,.accent-text,.sidebar-item:hover { color:${safe} !important; }
    .sidebar-item.active { box-shadow: inset 3px 0 0 ${safe} !important; }
    .page-card.selected,.template-item.active { border-color:${safe} !important; box-shadow:0 0 0 2px ${safe}22 !important; }
    .editor-toolbar button.active { color:${safe} !important; background:${safe}18 !important; }
  `;
  const v=$('#accentColorValue'); if(v) v.textContent=safe.toUpperCase();
}
function resetAccentColor(){
  localStorage.removeItem('pdfWorkspaceAccent'); localStorage.removeItem('pdfWorkspaceAccent2');
  const p=getActivePalette(); applyAccentColor(p.accent,false,true);
  const input=$('#accentColorInput'); if(input) input.value=p.accent;
}
function resetHighlightColor(){
  localStorage.removeItem('pdfWorkspaceHighlight');
  const p=getActivePalette(); applyHighlightColor(p.highlight,false,true);
  const input=$('#highlightColorInput'); if(input) input.value=p.highlight;
}
function applyHighlightColor(value,persist=true,fromTheme=false){
  const safe=/^#[0-9a-fA-F]{6}$/.test(value)?value:(getActivePalette().highlight||'#b3d7ff');
  if(persist) localStorage.setItem('pdfWorkspaceHighlight',safe);
  document.documentElement.style.setProperty('--highlight-color',safe);
  document.body.style.setProperty('--highlight-color',safe);
  const style=ensureUserColorStyle();
  const existing=style.textContent||'';
  style.textContent=existing.replace(/::selection\s*\{[^}]*\}/g,'')+`\n::selection,[contenteditable="true"]::selection,.letter-page ::selection { background:${safe} !important; color:#111 !important; }`;
  const v=$('#highlightColorValue'); if(v) v.textContent=safe.toUpperCase();
}
function setupThemeSelect(){ localStorage.removeItem('pdfWorkspaceCustomThemes'); localStorage.removeItem('pdfWorkspaceCustomTheme'); }

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
}

async function getPdfJsDocument(bytes) {
  const key = bytes.buffer;
  if (pdfRenderCache.has(key)) return pdfRenderCache.get(key);
  const taskOptions = { data: bytes, useWorkerFetch: true, isEvalSupported: true, verbosity: 0, disableAutoFetch: false, disableStream: false };
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument(taskOptions).promise;
  } catch (err) {
    try {
      pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes), disableWorker: true, verbosity: 0 }).promise;
    } catch (fallbackErr) {
      console.error('PDF engine error', fallbackErr);
      throw err;
    }
  }
  pdfRenderCache.set(key, pdf);
  return pdf;
}

async function renderPageThumb(pageEntry, canvas) {
  const container = canvas.parentElement;
  const placeholder = container.querySelector('.thumb-loading');
  try {
    await new Promise(requestAnimationFrame);
    const pdf = await getPdfJsDocument(pageEntry.pdfBytes);
    const page = await pdf.getPage(pageEntry.sourceIndex + 1);
    const width = Math.max(130, container.clientWidth || 180);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(width / base.width, 1.35);
    const viewport = page.getViewport({ scale });
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.ceil(viewport.width * ratio);
    canvas.height = Math.ceil(viewport.height * ratio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    const task = page.render({ canvasContext: ctx, viewport, intent: 'display' });
    await task.promise;
    container.classList.add('rendered');
    if (placeholder) placeholder.textContent = '';
  } catch (err) {
    console.error('PDF thumbnail render failed', err);
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
  const indexToFocus = focusEntryId ? pages.findIndex(p => p.id === focusEntryId) : 0;
  $('#previewFileName').textContent = 'PDF Packet Preview';
  $('#previewPageLabel').textContent = `${pages.length} page${pages.length === 1 ? '' : 's'}`;

  const cardWidth = Math.max(360, Math.min(860, wrap.clientWidth - 48));
  state.preview.renderedPages = [];
  for (let i = 0; i < pages.length; i++) {
    const entry = pages[i];
    const holder = document.createElement('div');
    holder.className = 'continuous-preview-page' + (entry.id === focusEntryId ? ' active-page' : '');
    holder.dataset.id = entry.id;
    holder.innerHTML = `<div class="continuous-preview-loading">Rendering page ${i + 1}…</div><canvas aria-label="PDF page ${i + 1}"></canvas>`;
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
      const loading = holder.querySelector('.continuous-preview-loading');
      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, viewport.width, viewport.height);
      await page.render({ canvasContext: ctx, viewport, intent: 'display' }).promise;
      if (loading) loading.remove();
      state.preview.renderedPages.push({ id: entry.id, canvas, holder });
    } catch (err) {
      console.error('Continuous PDF preview failed', err);
      const loading = holder.querySelector('.continuous-preview-loading');
      if (loading) loading.textContent = 'Preview unavailable for this page';
    }
  }

  if (indexToFocus >= 0) {
    requestAnimationFrame(() => {
      const target = wrap.querySelector(`[data-id="${CSS.escape(pages[indexToFocus].id)}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

async function openPagePreview(entryId) {
  const entry = state.pages.find(p => p.id === entryId) || state.pages[0];
  if (!entry) return;
  const modal = $('#pdfPreviewModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  state.preview.entryId = entry.id;
  await renderContinuousPreview(entry.id);
}

async function renderPreviewCanvas() {
  await renderContinuousPreview(state.preview.entryId);
}

function closePagePreview() {
  $('#pdfPreviewModal').classList.remove('open');
  $('#pdfPreviewModal').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  state.preview.entryId = null;
  state.preview.pdf = null;
  state.preview.renderedPages = [];
}

function setPreviewZoom(multiplier) {
  state.preview.scale = Math.min(2.5, Math.max(.5, (state.preview.scale || 1) * multiplier));
  const wrap = $('#continuousPreviewCanvasWrap');
  if (!wrap) return;
  wrap.style.setProperty('--preview-scale', state.preview.scale);
  renderContinuousPreview(state.preview.entryId);
}

async function addPdfFiles(files) {
  const list = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  if (!list.length) return toast('Please drop PDF files only', 'error');
  let added = 0;
  for (const file of list) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let count = 0;
    try {
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      count = pdf.getPageCount();
    } catch {
      try {
        const pdf = await getPdfJsDocument(bytes);
        count = pdf.numPages;
      } catch (err) {
        console.error('Could not open PDF', file.name, err);
        toast(`Could not open ${file.name}`, 'error');
        continue;
      }
    }
    if (!count) { toast(`Could not find pages in ${file.name}`, 'error'); continue; }
    for (let i = 0; i < count; i++) {
      state.pages.push({
        id: crypto.randomUUID(),
        pdfBytes: bytes,
        sourceIndex: i,
        fileName: file.name,
        rotation: 0,
      });
    }
    added++;
  }
  if (added) {
    await renderPageBoard();
    toast(`${added} PDF${added > 1 ? 's' : ''} added`, 'success');
  }
}

async function renderPageBoard() {
  const grid = $('#pageGrid');
  grid.innerHTML = '';
  $('#emptyState').classList.toggle('hidden', state.pages.length > 0);
  state.pages.forEach((entry, index) => {
    const card = document.createElement('article');
    card.className = 'page-card' + (state.selected.has(entry.id) ? ' selected' : '');
    card.draggable = true;
    card.dataset.id = entry.id;
    card.innerHTML = `
      <input class="page-check" type="checkbox" ${state.selected.has(entry.id) ? 'checked' : ''} aria-label="Select page ${index + 1}">
      <div class="page-thumb"><div class="thumb-loading">Rendering…</div><canvas aria-label="PDF page preview"></canvas><span class="page-number">${index + 1}</span><button class="preview-btn" title="Preview page" aria-label="Preview page">↗</button></div>
      <div class="page-card-footer">
        <div class="page-name" title="${escapeHtml(entry.fileName)}">${escapeHtml(entry.fileName)}</div>
        <div class="page-source">Page ${entry.sourceIndex + 1}</div>
      </div>`;
    const checkbox = card.querySelector('.page-check');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      checkbox.checked ? state.selected.add(entry.id) : state.selected.delete(entry.id);
      renderPageBoard();
    });
    card.addEventListener('click', (e) => {
      if (e.target.closest('.page-check') || e.target.closest('.preview-btn')) return;
      if (state.selected.has(entry.id)) state.selected.delete(entry.id); else state.selected.add(entry.id);
      renderPageBoard();
    });
    card.querySelector('.preview-btn').addEventListener('click', (e) => { e.stopPropagation(); openPagePreview(entry.id); });
    card.querySelector('canvas').addEventListener('dblclick', (e) => { e.stopPropagation(); openPagePreview(entry.id); });
    card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', entry.id); card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => e.preventDefault());
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData('text/plain');
      const from = state.pages.findIndex(p => p.id === fromId);
      const to = state.pages.findIndex(p => p.id === entry.id);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = state.pages.splice(from, 1);
      state.pages.splice(to, 0, moved);
      renderPageBoard();
    });
    grid.appendChild(card);
  });
  updateSelectionSummary();
  await new Promise(requestAnimationFrame);
  const jobs = state.pages.map((entry) => {
    const card = grid.querySelector(`[data-id="${CSS.escape(entry.id)}"]`);
    const canvas = card?.querySelector('canvas');
    return canvas ? renderPageThumb(entry, canvas) : Promise.resolve();
  });
  await Promise.allSettled(jobs);
}

function updateSelectionSummary() {
  const count = state.selected.size;
  $('#selectionSummary').textContent = `${count} selected · ${state.pages.length} page${state.pages.length === 1 ? '' : 's'}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

async function rasterizePdfPageToPdf(out, entry) {
  const pdf = await getPdfJsDocument(entry.pdfBytes);
  const page = await pdf.getPage(entry.sourceIndex + 1);

  // Respect the page's existing geometry; rotate clockwise in 90° steps.
  const baseViewport = page.getViewport({ scale: 1, rotation: entry.rotation || 0 });
  const renderScale = Math.max(1.5, Math.min(2.25, 1800 / Math.max(baseViewport.width, baseViewport.height)));
  const viewport = page.getViewport({ scale: renderScale, rotation: entry.rotation || 0 });

  const canvas = document.createElement('canvas');
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.ceil(viewport.width * ratio);
  canvas.height = Math.ceil(viewport.height * ratio);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const task = page.render({ canvasContext: ctx, viewport, intent: 'print' });
  await task.promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
  const imageBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
  const image = await out.embedJpg(imageBytes);

  // Convert the rendered pixel dimensions back to PDF points.
  const widthPt = viewport.width / renderScale;
  const heightPt = viewport.height / renderScale;
  const pdfPage = out.addPage([Math.max(1, widthPt), Math.max(1, heightPt)]);
  pdfPage.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });
}

async function mergePages(entries) {
  if (!entries.length) { toast('Add at least one page first'); return; }

  const button = $('#mergeExportBtn');
  const originalLabel = button?.textContent || 'Merge & Download';
  if (button) { button.disabled = true; button.textContent = 'Merging…'; }

  try {
    const out = await PDFDocument.create();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      let structuralMergeWorked = false;

      // First choice: preserve the original PDF page exactly.
      try {
        const src = await PDFDocument.load(entry.pdfBytes, {
          ignoreEncryption: true,
          updateMetadata: false,
        });
        const [copied] = await out.copyPages(src, [entry.sourceIndex]);
        if (entry.rotation) copied.setRotation(degrees(entry.rotation));
        out.addPage(copied);
        structuralMergeWorked = true;
      } catch (parseErr) {
        console.warn(`Structural merge failed for ${entry.fileName} page ${entry.sourceIndex + 1}; using render fallback.`, parseErr);
      }

      // Fallback: PDF.js can render many PDFs that pdf-lib cannot structurally parse.
      if (!structuralMergeWorked) {
        await rasterizePdfPageToPdf(out, entry);
      }
    }

    if (out.getPageCount() === 0) throw new Error('The merged document contains no pages.');

    const bytes = await out.save({ useObjectStreams: true, addDefaultPage: false });
    if (!bytes || !bytes.length) throw new Error('The PDF library returned an empty document.');

    state.mergeExport.blob = new Blob([bytes], { type: 'application/pdf' });
    state.mergeExport.suggestedFilename = getDefaultMergedFilename();
    $('#mergeFilenameInput').value = state.mergeExport.suggestedFilename.replace(/\.pdf$/i, '');
    openSaveExportModal();
  } catch (err) {
    console.error('Merge failed', err);
    const detail = err?.message ? `: ${err.message}` : '';
    toast(`Merge failed${detail}`);
  } finally {
    if (button) { button.disabled = false; button.textContent = originalLabel; }
  }
}

function openSaveExportModal() {
  const modal = $('#saveExportModal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  $('#mergeFilenameInput').focus();
  $('#mergeFilenameInput').select();
}

function closeSaveExportModal() {
  const modal = $('#saveExportModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (!$('#pdfPreviewModal').classList.contains('open')) document.body.classList.remove('modal-open');
}

async function confirmMergeExport() {
  const blob = state.mergeExport.blob;
  if (!blob) return toast('Nothing is ready to save yet.');
  let filename = ($('#mergeFilenameInput').value || '').trim();
  if (!filename) filename = getDefaultMergedFilename().replace(/\.pdf$/i, '');
  if (!/\.pdf$/i.test(filename)) filename += '.pdf';
  const saved = await saveBlobToDisk(blob, filename);
  if (saved) closeSaveExportModal();
}

function getSelectedEntries() { return state.pages.filter(p => state.selected.has(p.id)); }

async function rotateSelected() {
  const chosen = getSelectedEntries();
  if (!chosen.length) return;
  chosen.forEach(p => p.rotation = (p.rotation + 90) % 360);
  renderPageBoard();
}

function deleteSelected() {
  if (!state.selected.size) return;
  state.pages = state.pages.filter(p => !state.selected.has(p.id));
  state.selected.clear();
  renderPageBoard();
}

function duplicateSelected() {
  const chosen = getSelectedEntries();
  if (!chosen.length) return;
  const insertAt = Math.max(0, state.pages.findIndex(p => p.id === chosen[chosen.length - 1].id) + 1);
  const copies = chosen.map(p => ({ ...p, id: crypto.randomUUID() }));
  state.pages.splice(insertAt, 0, ...copies);
  renderPageBoard();
}

async function createLetterPdfBlob() {
  if (!window.html2pdf) throw new Error('Letter PDF engine unavailable.');
  const clone = $('#letterEditor').cloneNode(true);
  const spec = getPaperSpec();
  clone.style.margin = '0'; clone.style.boxShadow = 'none'; clone.style.width = `${spec.cssW}px`; clone.style.minWidth = `${spec.cssW}px`; clone.style.minHeight = `${spec.cssH}px`;
  const wrapper = document.createElement('div');
  wrapper.style.background = '#fff'; wrapper.style.padding = '0'; wrapper.style.width = `${spec.cssW}px`; wrapper.style.minHeight = `${spec.cssH}px`;
  wrapper.appendChild(clone);
  const root = document.createElement('div');
  root.style.position='fixed'; root.style.left='-100000px'; root.style.top='0'; root.style.width=`${spec.cssW}px`; root.style.background='#fff';
  root.appendChild(wrapper); document.body.appendChild(root);
  const options = {
    margin: 0, filename:'AUTHORIZATION.pdf', image:{type:'jpeg', quality:.97}, html2canvas:{scale:2, backgroundColor:'#fff', useCORS:true}, jsPDF:{unit:'pt', format:spec.pdf, orientation:'portrait'}
  };
  try { return await window.html2pdf().set(options).from(wrapper).outputPdf('blob'); }
  finally { root.remove(); }
}

async function insertLetterIntoPacket() {
  try {
    const blob = await createLetterPdfBlob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pdf = await PDFDocument.load(bytes);
    const count = pdf.getPageCount();
    const insertIndex = Math.min(state.pages.length, state.pages.findIndex(p => p.fileName === 'AUTHORIZATION.pdf') + 1 || state.pages.length);
    const newEntries = Array.from({length: count}, (_, i) => ({ id: crypto.randomUUID(), pdfBytes: bytes, sourceIndex: i, fileName: 'AUTHORIZATION.pdf', rotation: 0 }));
    state.pages.splice(insertIndex, 0, ...newEntries);
    renderPageBoard();
    toast('Authorization added to packet', 'success');
  } catch (err) { console.error(err); toast('Could not create the letter PDF'); }
}

async function downloadLetter() {
  try {
    const blob = await createLetterPdfBlob();
    downloadBlob(blob, 'AUTHORIZATION.pdf');
  } catch (err) { console.error(err); toast('Could not create the letter PDF'); }
}

function saveLetter() {
  state.letterHtml = $('#letterEditor').innerHTML;
  localStorage.setItem('pdfWorkspaceLetter', state.letterHtml);
  updateWordCount();
}

function updateWordCount() {
  const text = ($('#letterEditor')?.innerText || '').trim();
  const words = text ? text.split(/\s+/).length : 0;
  $('#wordCount').textContent = `${words} word${words === 1 ? '' : 's'}`;
}

function parseRanges(input, max) {
  const pages = new Set();
  for (const tokenRaw of input.split(',')) {
    const token = tokenRaw.trim();
    if (!token) continue;
    if (/^\d+$/.test(token)) {
      const n = Number(token); if (n >= 1 && n <= max) pages.add(n);
    } else if (/^\d+\s*-\s*\d+$/.test(token)) {
      let [a,b] = token.split('-').map(Number); if (a > b) [a,b] = [b,a];
      for (let i = a; i <= b; i++) if (i >= 1 && i <= max) pages.add(i);
    }
  }
  return [...pages].sort((a,b) => a-b);
}

async function extractPages() {
  if (!state.extractFile) return;
  const source = await PDFDocument.load(new Uint8Array(await state.extractFile.arrayBuffer()));
  const wanted = parseRanges($('#pageRangeInput').value, source.getPageCount());
  if (!wanted.length) return toast('Enter at least one valid page number');
  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, wanted.map(n => n - 1));
  copied.forEach(p => out.addPage(p));
  const bytes = await out.save({ useObjectStreams: true });
  downloadBlob(new Blob([bytes], {type:'application/pdf'}), `${state.extractFile.name.replace(/\.pdf$/i,'')}-extracted.pdf`);
}

async function compressPdf() {
  if (!state.compressFile) return;
  const progress = $('#compressProgress');
  progress.style.display = 'block';
  progress.querySelector('span').style.width = '5%';
  try {
    const sourceBytes = new Uint8Array(await state.compressFile.arrayBuffer());
    const source = await pdfjsLib.getDocument({ data: sourceBytes }).promise;
    const out = await PDFDocument.create();
    const profile = $('#compressionSelect').value;
    const scale = profile === 'low' ? 1.0 : profile === 'high' ? 1.65 : 1.3;
    const quality = profile === 'low' ? 0.55 : profile === 'high' ? 0.84 : 0.70;
    const widthCap = profile === 'low' ? 1300 : profile === 'high' ? 2400 : 1800;

    for (let i = 1; i <= source.numPages; i++) {
      const page = await source.getPage(i);
      const baseViewport = page.getViewport({ scale: 1 });
      const effectiveScale = Math.min(scale, widthCap / baseViewport.width);
      const viewport = page.getViewport({ scale: Math.max(.55, effectiveScale) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const jpg = await out.embedJpg(dataUrl);
      const outPage = out.addPage([viewport.width, viewport.height]);
      outPage.drawImage(jpg, { x: 0, y: 0, width: viewport.width, height: viewport.height });
      progress.querySelector('span').style.width = `${10 + Math.round((i / source.numPages) * 82)}%`;
    }
    out.setTitle(''); out.setAuthor(''); out.setSubject(''); out.setKeywords([]);
    const bytes = await out.save({ useObjectStreams: true, addDefaultPage: false });
    progress.querySelector('span').style.width = '100%';
    const original = state.compressFile.size;
    const result = bytes.length;
    downloadBlob(new Blob([bytes], {type:'application/pdf'}), `${state.compressFile.name.replace(/\.pdf$/i,'')}-compressed.pdf`);
    const delta = original > 0 ? Math.round((1 - result / original) * 100) : 0;
    toast(`Created ${formatBytes(result)} · ${delta >= 0 ? delta + '% smaller' : Math.abs(delta) + '% larger'}`);
  } catch (err) { console.error(err); toast('Compression failed for this PDF'); }
  setTimeout(() => { progress.style.display = 'none'; progress.querySelector('span').style.width = '0'; }, 700);
}

function openPacketCompressionPanel() {
  if (!state.pages.length) return toast('Add pages to the packet first');
  $('#packetCompressMeta').textContent = `${state.pages.length} page${state.pages.length === 1 ? '' : 's'} will be rendered into a smaller PDF.`;
  $('#packetCompressPanel').classList.add('open'); $('#packetCompressPanel').setAttribute('aria-hidden','false');
}
function closePacketCompressionPanel() {
  $('#packetCompressPanel').classList.remove('open'); $('#packetCompressPanel').setAttribute('aria-hidden','true');
}
async function compressEntries(entries, profile, progressEl) {
  const out = await PDFDocument.create();
  const scale = profile === 'low' ? 1.0 : profile === 'high' ? 1.7 : 1.35;
  const quality = profile === 'low' ? .55 : profile === 'high' ? .84 : .70;
  const widthCap = profile === 'low' ? 1300 : profile === 'high' ? 2400 : 1800;
  for (let i=0;i<entries.length;i++) {
    const entry=entries[i]; const pdf=await getPdfJsDocument(entry.pdfBytes); const page=await pdf.getPage(entry.sourceIndex+1);
    const base=page.getViewport({scale:1}); const eff=Math.min(scale, widthCap/base.width); const viewport=page.getViewport({scale:Math.max(.55,eff)});
    const canvas=document.createElement('canvas'); canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
    const ctx=canvas.getContext('2d',{alpha:false}); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); await page.render({canvasContext:ctx,viewport,intent:'print'}).promise;
    const jpg=await out.embedJpg(canvas.toDataURL('image/jpeg',quality)); const outPage=out.addPage([viewport.width,viewport.height]); outPage.drawImage(jpg,{x:0,y:0,width:viewport.width,height:viewport.height});
    if (entry.rotation) outPage.setRotation(degrees(entry.rotation));
    if (progressEl) progressEl.style.width = `${Math.round(((i+1)/entries.length)*100)}%`;
  }
  return out.save({useObjectStreams:true, addDefaultPage:false});
}
async function compressPacket() {
  if (!state.pages.length) return;
  const progress=$('#packetCompressProgress'); const bar=progress.querySelector('span'); progress.style.display='block'; bar.style.width='0';
  try {
    const bytes=await compressEntries(state.pages,$('#packetCompressionSelect').value,bar);
    downloadBlob(new Blob([bytes],{type:'application/pdf'}),'compressed-packet.pdf');
    toast(`Compressed packet · ${formatBytes(bytes.length)}`); closePacketCompressionPanel();
  } catch(err) { console.error(err); toast('Packet compression failed'); }
  setTimeout(()=>{progress.style.display='none';bar.style.width='0';},500);
}

function exportProject() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    letterHtml: $('#letterEditor').innerHTML,
    authTemplates: getAuthTemplates(),
    note: 'PDF bytes are not embedded. Re-add source PDFs when importing this project.'
  };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'}), 'pdf-workspace-project.json');
}

function importProject(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.letterHtml) {
        $('#letterEditor').innerHTML = data.letterHtml;
        saveLetter();
      }
      if (Array.isArray(data.authTemplates) && data.authTemplates.length) { saveAuthTemplates(data.authTemplates); }
      toast('Project imported');
    } catch { toast('Invalid project file'); }
  };
  reader.readAsText(file);
}

function resetWorkspace() {
  if (!confirm('Start a new workspace? This clears the current page board.')) return;
  state.pages = []; state.selected.clear();
  renderPageBoard();
  toast('New workspace created');
}

function setupNavigation() {
  $$('.sidebar-item').forEach(btn => btn.addEventListener('click', () => {
    $$('.sidebar-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    $$('.view').forEach(v => v.classList.remove('active-view')); $('#' + btn.dataset.view).classList.add('active-view');
  }));
  const toggle=$('#brandSidebarToggle');
  const setCollapsed=collapsed=>{document.body.classList.toggle('sidebar-collapsed',collapsed);document.body.classList.toggle('sidebar-expanded',!collapsed);localStorage.setItem('pdfWorkspaceSidebarCollapsed',collapsed?'1':'0');toggle?.setAttribute('aria-pressed',collapsed?'true':'false');toggle?.setAttribute('title',collapsed?'Expand sidebar':'Collapse sidebar');};
  const stored=localStorage.getItem('pdfWorkspaceSidebarCollapsed');
  setCollapsed(stored ? stored==='1' : window.innerWidth <= 900);
  toggle?.addEventListener('click',()=>setCollapsed(!document.body.classList.contains('sidebar-collapsed')));
}

function wireDropZone(el, handler) {
  ['dragenter','dragover'].forEach(evt => el.addEventListener(evt, e => { e.preventDefault(); el.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(evt => el.addEventListener(evt, e => { e.preventDefault(); el.classList.remove('dragover'); }));
  el.addEventListener('drop', e => {
    e.stopPropagation();
    const overlay = $('#globalDropOverlay');
    overlay?.classList.remove('show');
    overlay?.setAttribute('aria-hidden','true');
    handler(e.dataTransfer.files);
  });
}

function setupGlobalPdfDrop() {
  const overlay = $('#globalDropOverlay');
  if (!overlay) return;
  let dragDepth = 0;
  const hasFiles = e => Array.from(e.dataTransfer?.types || []).includes('Files');
  const show = () => { overlay.classList.add('show'); overlay.setAttribute('aria-hidden','false'); };
  const hide = () => { dragDepth = 0; overlay.classList.remove('show'); overlay.setAttribute('aria-hidden','true'); };
  document.addEventListener('dragenter', e => {
    if (!hasFiles(e)) return;
    dragDepth++;
    show();
  });
  document.addEventListener('dragover', e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    show();
  });
  document.addEventListener('dragleave', e => {
    if (!hasFiles(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) hide();
  });
  document.addEventListener('drop', async e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    hide();
    await addPdfFiles(e.dataTransfer.files);
  });
  window.addEventListener('blur', hide);
}

function setupEditor() {
  const editor = $('#letterEditor');
  const fontSelect = $('#fontFamilySelect');
  const sizeSelect = $('#fontSizeSelect');
  const lineSpacingSelect = $('#lineSpacingSelect');
  const savedFont = localStorage.getItem('pdfWorkspaceFont') || 'Arial';
  const savedSize = localStorage.getItem('pdfWorkspaceFontSize') || '14';
  if (state.letterHtml) editor.innerHTML = state.letterHtml;
  editor.style.fontFamily = savedFont;
  editor.style.fontSize = `${savedSize}px`;
  fontSelect.value = savedFont;
  sizeSelect.value = savedSize;
  const marginSelect = $('#marginSelect');
  if (marginSelect) { marginSelect.value = localStorage.getItem('pdfWorkspaceMargin') || 'normal'; }
  applyPaperSize();
  editor.style.setProperty('--page-pad', getCurrentMargin());

  let savedRange = null;
  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) return;
    savedRange = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    if (!savedRange) return;
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange);
  };
  const applyInlineStyle = (property, value) => {
    editor.focus(); restoreSelection();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) {
      editor.style[property] = property === 'fontSize' ? `${value}px` : value;
      return;
    }
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      editor.style[property] = property === 'fontSize' ? `${value}px` : value;
      return;
    }
    const wrapper = document.createElement('span');
    wrapper.style[property] = property === 'fontSize' ? `${value}px` : value;
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    sel.addRange(newRange);
    savedRange = newRange.cloneRange();
  };
  const getSelectedBlocks = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return [];
    const blocks = new Set();
    const range = sel.getRangeAt(0);
    let node = sel.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const fallback = node?.closest?.('p,div,h1,h2,h3,blockquote,li');
    if (fallback && editor.contains(fallback)) blocks.add(fallback);
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (!/^(P|DIV|H1|H2|H3|BLOCKQUOTE|LI)$/.test(el.tagName)) continue;
      try { if (range.intersectsNode(el)) blocks.add(el); } catch {}
    }
    return [...blocks];
  };
  const applyBlockStyle = (property, value) => {
    editor.focus(); restoreSelection();
    const blocks = getSelectedBlocks();
    if (!blocks.length) { editor.style[property] = value; return; }
    blocks.forEach(block => { block.style[property] = value; });
    saveSelection(); saveLetter();
  };

  editor.addEventListener('keyup', saveSelection); editor.addEventListener('mouseup', saveSelection); editor.addEventListener('focus', saveSelection);
  editor.addEventListener('input', () => { saveSelection(); saveLetter(); });
  fontSelect?.addEventListener('mousedown', saveSelection);
  fontSelect?.addEventListener('change', () => {
    const font = fontSelect.value; localStorage.setItem('pdfWorkspaceFont', font);
    applyInlineStyle('fontFamily', font);
    editor.style.fontFamily = font; saveSelection(); saveLetter();
  });
  sizeSelect?.addEventListener('mousedown', saveSelection);
  sizeSelect?.addEventListener('change', () => {
    const size = sizeSelect.value; localStorage.setItem('pdfWorkspaceFontSize', size);
    applyInlineStyle('fontSize', size);
    editor.style.fontSize = `${size}px`; saveSelection(); saveLetter();
  });
  lineSpacingSelect?.addEventListener('mousedown', saveSelection);
  lineSpacingSelect?.addEventListener('change', () => applyBlockStyle('lineHeight', lineSpacingSelect.value));
  $$('#editorToolbar [data-command]').forEach(btn => btn.addEventListener('mousedown', saveSelection));
  $$('#editorToolbar [data-command]').forEach(btn => btn.addEventListener('click', () => {
    editor.focus(); restoreSelection();
    document.execCommand(btn.dataset.command, false, null);
    saveSelection(); saveLetter();
  }));
  $('#listStyleSelect')?.addEventListener('mousedown', saveSelection);
  $('#listStyleSelect')?.addEventListener('change', () => {
    const command = $('#listStyleSelect').value;
    if (!command) return;
    editor.focus(); restoreSelection();
    document.execCommand(command, false, null);
    $('#listStyleSelect').value = command;
    saveSelection(); saveLetter();
  });
  updateWordCount();
}

function filePicker(input, chooser, callback) {
  chooser.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) callback(input.files[0]); input.value = ''; });
}

function init() {
  setupNavigation(); setupEditor(); setupGlobalPdfDrop();
  $('#addPdfBtn').addEventListener('click', () => $('#pdfInput').click());
  $('#pdfInput').addEventListener('change', () => { addPdfFiles($('#pdfInput').files); $('#pdfInput').value=''; });
  wireDropZone($('#dropZone'), addPdfFiles);
  $('#mergeExportBtn').addEventListener('click', () => mergePages(state.pages));
  $('#saveExportCloseBtn').addEventListener('click', closeSaveExportModal);
  $('#saveExportCancelBtn').addEventListener('click', closeSaveExportModal);
  $('#saveExportConfirmBtn').addEventListener('click', confirmMergeExport);
  $('#saveExportModal').addEventListener('click', e => { if (e.target.id === 'saveExportModal') closeSaveExportModal(); });
  $('#compressPacketBtn').addEventListener('click', openPacketCompressionPanel);
  $('#packetCompressCloseBtn').addEventListener('click', closePacketCompressionPanel);
  $('#packetCompressBtn').addEventListener('click', compressPacket);
  $('#rotateLeftBtn').addEventListener('click', rotateSelected);
  $('#duplicatePageBtn').addEventListener('click', duplicateSelected);
  $('#deletePageBtn').addEventListener('click', deleteSelected);
  $('#clearAllBtn').addEventListener('click', () => { state.pages=[]; state.selected.clear(); renderPageBoard(); });
  $('#insertLetterBtn').addEventListener('click', insertLetterIntoPacket);
  $('#downloadLetterBtn').addEventListener('click', downloadLetter);
  $('#previewCloseBtn').addEventListener('click', closePagePreview);
  $('#previewZoomOutBtn').addEventListener('click', () => setPreviewZoom(0.85));
  $('#previewZoomInBtn').addEventListener('click', () => setPreviewZoom(1.18));
  $('#previewFitBtn').addEventListener('click', () => { state.preview.scale = 1.1; renderPreviewCanvas(); });
  $('#pdfPreviewModal').addEventListener('click', e => { if (e.target.id === 'pdfPreviewModal') closePagePreview(); });
  window.addEventListener('resize', () => { if ($('#pdfPreviewModal').classList.contains('open') && state.preview.entryId) { renderPreviewCanvas(); } });
  document.addEventListener('keydown', e => {
    if ($('#settingsModal').classList.contains('open') && e.key === 'Escape') { closeSettings(); return; }
    if ($('#saveExportModal').classList.contains('open') && e.key === 'Escape') { closeSaveExportModal(); return; }
    if ($('#saveTemplateModal').classList.contains('open') && e.key === 'Escape') { closeSaveTemplateModal(); return; }
    if ($('#letterTemplateModal').classList.contains('open') && e.key === 'Escape') { closeLetterTemplateModal(); return; }
    if (!$('#pdfPreviewModal').classList.contains('open')) return;
    if (e.key === 'Escape') closePagePreview();
  });

  setupLetterTemplates();
  $('#marginSelect').addEventListener('change', () => { localStorage.setItem('pdfWorkspaceMargin', $('#marginSelect').value); $('#letterEditor').style.setProperty('--page-pad', getCurrentMargin()); $('#letterEditor').style.padding = getCurrentMargin(); saveLetter(); });
  $('#paperSizeSelect').addEventListener('change', applyPaperSize);
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#settingsCloseBtn').addEventListener('click', closeSettings);
  $('#settingsDoneBtn').addEventListener('click', closeSettings);
  $('#settingsModal').addEventListener('click', e => { if(e.target.id==='settingsModal') closeSettings(); });
  setupThemeSelect();
  $('#themeSelect').addEventListener('change', e => { setTheme(e.target.value); openSettings(); });
  $('#highlightColorInput').addEventListener('input', e => applyHighlightColor(e.target.value));
  $('#accentColorInput').addEventListener('input', e => applyAccentColor(e.target.value));
  $('#accentResetBtn')?.addEventListener('click', resetAccentColor);
  $('#highlightResetBtn')?.addEventListener('click', resetHighlightColor);
  setTheme(localStorage.getItem('pdfWorkspaceTheme') || 'light');
  applyHighlightColor(localStorage.getItem('pdfWorkspaceHighlight') || getActivePalette().highlight || '#b3d7ff', false);
  applyAccentColor(localStorage.getItem('pdfWorkspaceAccent') || getActivePalette().accent, false);
  renderPageBoard();
}

document.addEventListener('DOMContentLoaded', init);
