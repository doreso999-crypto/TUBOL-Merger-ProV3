const state={documents:[],editor:null,pdfFiles:new Map(),pages:[],selected:new Set(),dragId:null};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2800)};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function api(url,opts={}){const r=await fetch(url,opts);const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d}
function page(name){$$('.page').forEach(x=>x.classList.toggle('active',x.id===name));$$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===name))}
$$('.nav').forEach(x=>x.onclick=()=>page(x.dataset.page));

async function loadLibrary(){
  try{state.documents=await api('/api/documents')}catch(e){return toast(e.message)}
  const el=$('#library');el.innerHTML='';
  if(!state.documents.length){el.innerHTML='<div class="doc-card"><div><h3>No documents yet</h3><p>Create a document or open a file to begin.</p></div></div>';return}
  state.documents.forEach(d=>{const c=document.createElement('article');c.className='doc-card';c.innerHTML=`<div><h3>${esc(d.name)}</h3><p>${esc(d.fileType.toUpperCase())} · ${new Date(d.updatedAt).toLocaleString()}</p></div><div class="card-actions"><button data-open="${d.id}">Open</button><button class="secondary" data-delete="${d.id}">Delete</button></div>`;el.append(c)});
  el.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openEditor(b.dataset.open));
  el.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this document?')){await api('/api/documents/'+b.dataset.delete,{method:'DELETE'});loadLibrary()}});
}
function loadScript(src){return new Promise((resolve,reject)=>{if(window.DocsAPI)return resolve();const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Could not load ONLYOFFICE. Start Document Server first.'));document.head.append(s)})}
async function openEditor(id){
  page('editor');const d=state.documents.find(x=>x.id===id);$('#editorTitle').textContent=d?.name||'Document Editor';$('#onlyoffice').innerHTML='<div style="padding:30px">Loading ONLYOFFICE…</div>';
  try{const data=await api('/api/onlyoffice/config/'+id);await loadScript(data.onlyofficeUrl+'/web-apps/apps/api/documents/api.js');$('#onlyoffice').innerHTML='<div id="ooEditor" style="width:100%;height:100%"></div>';state.editor=new DocsAPI.DocEditor('ooEditor',data.config)}
  catch(e){$('#onlyoffice').innerHTML=`<div style="padding:30px"><strong>ONLYOFFICE is not available.</strong><p>${esc(e.message)}</p><p>Run <code>docker compose -f docker-compose.onlyoffice.yml up -d</code>, then reopen the document.</p></div>`}
}
$('#closeEditor').onclick=()=>{try{state.editor?.destroyEditor()}catch{}state.editor=null;page('documents');loadLibrary()};
$('#newDoc').onclick=async()=>{try{const d=await api('/api/documents/new',{method:'POST'});await loadLibrary();openEditor(d.id)}catch(e){toast(e.message)}};
$('#upload').onchange=async e=>{const files=[...e.target.files];if(!files.length)return;for(const f of files){try{const b=await toBase64(f),ext=f.name.split('.').pop().toLowerCase();const d=await api('/api/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,fileType:ext,base64:b})});state.documents.unshift(d)}catch(err){toast(`${f.name}: ${err.message}`)}}e.target.value='';await loadLibrary();if(files.length===1)openEditor(state.documents[0]?.id)};
function toBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(file)})}

async function addPdfs(files){
  for(const file of files){
    const id=crypto.randomUUID();
    const bytes=await file.arrayBuffer();
    try{const pdf=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:false});const count=pdf.getPageCount();state.pdfFiles.set(id,{id,file,bytes,count,name:file.name});for(let p=0;p<count;p++)state.pages.push({id:crypto.randomUUID(),sourceId:id,pageIndex:p,rotation:0})}
    catch(e){toast(`${file.name}: ${e.message||'Invalid PDF'}`)}
  }
  renderPdfBoard();toast('PDFs added');
}
$('#pdfInput').onchange=async e=>{const files=[...e.target.files];e.target.value='';if(files.length)await addPdfs(files)};
function selectedPages(){return state.pages.filter(p=>state.selected.has(p.id))}
function updateSummary(){$('#selectionSummary').textContent=`${state.pages.length} pages · ${state.selected.size} selected`}
function pageLabel(p){const s=state.pdfFiles.get(p.sourceId);return `${s?.name||'PDF'} · page ${p.pageIndex+1}`}

async function renderThumb(canvas,p){
  const s=state.pdfFiles.get(p.sourceId);if(!s)return;try{const pdf=await pdfjsLib.getDocument({data:s.bytes.slice(0)}).promise;const pg=await pdf.getPage(p.pageIndex+1);const base=pg.getViewport({scale:1});const scale=Math.min(1.05,220/base.width);const viewport=pg.getViewport({scale,rotation:p.rotation});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await pg.render({canvasContext:canvas.getContext('2d'),viewport}).promise}catch(e){canvas.replaceWith(Object.assign(document.createElement('div'),{textContent:'Preview unavailable'}))}}
function renderPdfBoard(){
  const board=$('#pdfBoard');board.innerHTML='';board.classList.toggle('empty',!state.pages.length);if(!state.pages.length){board.innerHTML='<div class="empty-card"><strong>Your page board is empty</strong><span>Add one or more PDFs to begin.</span></div>';updateSummary();return}
  state.pages.forEach((p,index)=>{const card=document.createElement('article');card.className='page-card'+(state.selected.has(p.id)?' selected':'');card.draggable=true;card.dataset.id=p.id;card.innerHTML=`<div class="thumb"><canvas></canvas><span class="badge">${index+1}</span><span class="check">${state.selected.has(p.id)?'✓':''}</span></div><div class="meta" title="${esc(pageLabel(p))}">${esc(pageLabel(p))}</div><div class="page-tools"><button data-rotate="${p.id}">↶ Rotate</button><button data-dup="${p.id}">Duplicate</button><button data-del="${p.id}" class="danger">Delete</button></div>`;board.append(card);renderThumb(card.querySelector('canvas'),p);
    card.addEventListener('click',e=>{if(e.target.closest('button'))return;toggleSelect(p.id);});
    card.addEventListener('dragstart',()=>{state.dragId=p.id;card.classList.add('dragging')});card.addEventListener('dragend',()=>{state.dragId=null;card.classList.remove('dragging')});card.addEventListener('dragover',e=>e.preventDefault());card.addEventListener('drop',e=>{e.preventDefault();reorderPage(state.dragId,p.id)});
  });
  board.querySelectorAll('[data-rotate]').forEach(b=>b.onclick=e=>{e.stopPropagation();rotatePage(b.dataset.rotate,-90)});
  board.querySelectorAll('[data-dup]').forEach(b=>b.onclick=e=>{e.stopPropagation();duplicateIds([b.dataset.dup])});
  board.querySelectorAll('[data-del]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteIds([b.dataset.del])});
  updateSummary();
}
function toggleSelect(id){state.selected.has(id)?state.selected.delete(id):state.selected.add(id);renderPdfBoard()}
function reorderPage(fromId,toId){if(!fromId||fromId===toId)return;const from=state.pages.findIndex(p=>p.id===fromId),to=state.pages.findIndex(p=>p.id===toId);if(from<0||to<0)return;const [item]=state.pages.splice(from,1);state.pages.splice(to,0,item);renderPdfBoard()}
function rotatePage(id,delta){const ids=state.selected.has(id)?[...state.selected]:[id];ids.forEach(x=>{const p=state.pages.find(p=>p.id===x);if(p)p.rotation=(p.rotation+delta+360)%360});renderPdfBoard();toast('Page rotation updated')}
function duplicateIds(ids){const additions=[];ids.forEach(id=>{const p=state.pages.find(x=>x.id===id);if(p)additions.push({...p,id:crypto.randomUUID()})});if(!additions.length)return;const last=Math.max(...ids.map(id=>state.pages.findIndex(p=>p.id===id)));state.pages.splice(last+1,0,...additions);renderPdfBoard();toast(`${additions.length} page${additions.length>1?'s':''} duplicated`)}
function deleteIds(ids){const set=new Set(ids);state.pages=state.pages.filter(p=>!set.has(p.id));ids.forEach(id=>state.selected.delete(id));renderPdfBoard();toast('Pages removed')}
$('#rotateLeft').onclick=()=>{if(!state.selected.size)return toast('Select at least one page');rotatePage([...state.selected][0],-90)};
$('#duplicatePage').onclick=()=>{if(!state.selected.size)return toast('Select at least one page');duplicateIds([...state.selected])};
$('#deletePage').onclick=()=>{if(!state.selected.size)return toast('Select at least one page');deleteIds([...state.selected])};
$('#clearPdf').onclick=()=>{if(!state.pages.length)return;state.pdfFiles.clear();state.pages=[];state.selected.clear();renderPdfBoard()};

async function buildMergedPdf(){
  if(!state.pages.length)throw Error('Add PDFs first');
  const out=await PDFLib.PDFDocument.create();
  const loaded=new Map();
  for(const p of state.pages){let src=loaded.get(p.sourceId);if(!src){const info=state.pdfFiles.get(p.sourceId);src=await PDFLib.PDFDocument.load(info.bytes);loaded.set(p.sourceId,src)}const [copy]=await out.copyPages(src,[p.pageIndex]);if(p.rotation)copy.setRotation(PDFLib.degrees(p.rotation));out.addPage(copy)}
  return out;
}
async function saveBlob(blob,name){const safe=name.replace(/[\\/:*?"<>|]/g,'-');if(window.showSaveFilePicker){try{const h=await showSaveFilePicker({suggestedName:safe,types:[{description:'PDF',accept:{'application/pdf':['.pdf']}}]});const w=await h.createWritable();await w.write(blob);await w.close();toast(`Saved ${h.name}`);return}catch(e){if(e.name==='AbortError')return}}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=safe;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('PDF download started')}
$('#mergePdf').onclick=async()=>{try{const out=await buildMergedPdf();const bytes=await out.save({useObjectStreams:true});await saveBlob(new Blob([bytes],{type:'application/pdf'}),'TUBOL-Merged.pdf')}catch(e){toast(e.message)}};
$('#compressPdf').onclick=async()=>{try{const out=await buildMergedPdf();const bytes=await out.save({useObjectStreams:true,compress:true});await saveBlob(new Blob([bytes],{type:'application/pdf'}),'TUBOL-Optimized.pdf')}catch(e){toast(e.message)}};

async function previewPdf(){
  if(!state.pages.length)return toast('Add PDFs first');
  const wrap=$('#previewPages');wrap.innerHTML='';$('#previewModal').classList.add('open');$('#previewModal').setAttribute('aria-hidden','false');$('#previewMeta').textContent=`${state.pages.length} pages`;
  for(const p of state.pages){const box=document.createElement('div');box.className='preview-page';const canvas=document.createElement('canvas');box.append(canvas);wrap.append(box);await renderThumb(canvas,p)}
}
$('#previewPdf').onclick=previewPdf;$('#closePreview').onclick=()=>{$('#previewModal').classList.remove('open');$('#previewModal').setAttribute('aria-hidden','true')};$('#previewModal').onclick=e=>{if(e.target.id==='previewModal')$('#closePreview').click()};

loadLibrary();
