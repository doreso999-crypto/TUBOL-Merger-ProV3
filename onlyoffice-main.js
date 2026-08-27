const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const APP_DIR = path.join(ROOT, 'onlyoffice-workspace');
const DATA_DIR = path.join(app.getPath('userData'), 'tubol-documents');
const PORT = Number(process.env.TUBOL_PORT || 8787);
const ONLYOFFICE_URL = (process.env.TUBOL_ONLYOFFICE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8'
};

const safeId = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
const json = (res, status, body) => { const data = Buffer.from(JSON.stringify(body)); res.writeHead(status, {'Content-Type': MIME['.json'], 'Content-Length': data.length}); res.end(data); };

async function ensureData() { await fsp.mkdir(path.join(DATA_DIR, 'files'), {recursive:true}); }
async function readManifest(){ try{return JSON.parse(await fsp.readFile(path.join(DATA_DIR,'manifest.json'),'utf8'));}catch{return[];} }
async function writeManifest(list){await fsp.writeFile(path.join(DATA_DIR,'manifest.json'),JSON.stringify(list,null,2));}

function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return(c^0xffffffff)>>>0;}
function zipStore(entries){const locals=[],centrals=[];let offset=0;for(const [name,content] of entries){const n=Buffer.from(name),d=Buffer.isBuffer(content)?content:Buffer.from(content),crc=crc32(d);const local=Buffer.alloc(30+n.length);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt32LE(crc,14);local.writeUInt32LE(d.length,18);local.writeUInt32LE(d.length,22);local.writeUInt16LE(n.length,26);n.copy(local,30);locals.push(local,d);const central=Buffer.alloc(46+n.length);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(d.length,20);central.writeUInt32LE(d.length,24);central.writeUInt16LE(n.length,28);central.writeUInt32LE(offset,42);n.copy(central,46);centrals.push(central);offset+=local.length+d.length;}const body=Buffer.concat(locals),cd=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(body.length,16);return Buffer.concat([body,cd,end]);}
function makeBlankDocx(){const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';const rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';const doc='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>TUBOL Document</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>';return zipStore([('[Content_Types].xml',types),('_rels/.rels',rels),('word/document.xml',doc)]);}

async function createDocument(name,fileType,bytes){const id=crypto.randomUUID(),cleanName=path.basename(name).replace(/[^a-zA-Z0-9._ -]/g,'_')||`Document.${fileType}`;await fsp.writeFile(path.join(DATA_DIR,'files',`${id}.${fileType}`),bytes);const item={id,name:cleanName,fileType,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};const list=await readManifest();list.unshift(item);await writeManifest(list);return item;}
async function getDocument(id){return(await readManifest()).find(x=>x.id===id);}
async function updateDocument(id){const list=await readManifest(),i=list.findIndex(x=>x.id===id);if(i<0)return null;list[i].updatedAt=new Date().toISOString();await writeManifest(list);return list[i];}
async function fetchAndSaveCallback(id,remoteUrl){const response=await fetch(remoteUrl);if(!response.ok)throw new Error(`ONLYOFFICE save download failed: ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer()),item=await getDocument(id);if(!item)throw new Error('Document no longer exists.');await fsp.writeFile(path.join(DATA_DIR,'files',`${id}.${item.fileType}`),bytes);await updateDocument(id);}
function readJson(req){return new Promise((resolve,reject)=>{let data='';req.setEncoding('utf8');req.on('data',c=>{data+=c;if(data.length>50*1024*1024)req.destroy(new Error('Payload too large'));});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'));}catch(e){reject(e);}});req.on('error',reject);});}
function serveStatic(res,file,forcedType){fs.stat(file,(err,stat)=>{if(err||!stat.isFile())return json(res,404,{error:'Not found'});res.writeHead(200,{'Content-Type':forcedType||MIME[path.extname(file).toLowerCase()]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});}

async function handle(req,res){const url=new URL(req.url,`http://127.0.0.1:${PORT}`),pathname=decodeURIComponent(url.pathname);
 if(req.method==='GET'&&pathname==='/')return serveStatic(res,path.join(APP_DIR,'index.html'));
 if(req.method==='GET'&&pathname.startsWith('/static/')){const file=path.resolve(APP_DIR,pathname.slice(8));if(!file.startsWith(path.resolve(APP_DIR)))return json(res,403,{error:'Forbidden'});return serveStatic(res,file);}
 if(req.method==='GET'&&pathname==='/api/documents')return json(res,200,await readManifest());
 const docMatch=pathname.match(/^\/api\/documents\/([a-zA-Z0-9_-]+)$/),contentMatch=pathname.match(/^\/api\/documents\/([a-zA-Z0-9_-]+)\/content$/),configMatch=pathname.match(/^\/api\/onlyoffice\/config\/([a-zA-Z0-9_-]+)$/),callbackMatch=pathname.match(/^\/api\/onlyoffice\/callback\/([a-zA-Z0-9_-]+)$/);
 if(req.method==='GET'&&contentMatch){const item=await getDocument(safeId(contentMatch[1]));if(!item)return json(res,404,{error:'Document not found'});return serveStatic(res,path.join(DATA_DIR,'files',`${item.id}.${item.fileType}`),MIME[`.${item.fileType}`]);}
 if(req.method==='GET'&&configMatch){const item=await getDocument(safeId(configMatch[1]));if(!item)return json(res,404,{error:'Document not found'});const publicHost=process.env.TUBOL_PUBLIC_HOST||`http://host.docker.internal:${PORT}`;const config={documentType:['xlsx','xls','ods','csv'].includes(item.fileType)?'cell':['pptx','ppt','odp'].includes(item.fileType)?'slide':['pdf'].includes(item.fileType)?'pdf':'word',type:'desktop',document:{fileType:item.fileType,key:`${item.id}-${item.updatedAt.replace(/[^0-9]/g,'')}`,title:item.name,url:`${publicHost}/api/documents/${item.id}/content`,permissions:{edit:true,download:true,print:true,comment:true,review:true,fillForms:true}},editorConfig:{mode:'edit',callbackUrl:`${publicHost}/api/onlyoffice/callback/${item.id}`,customization:{compactHeader:true,autosave:true}}};return json(res,200,{config,onlyofficeUrl:ONLYOFFICE_URL});}
 if(req.method==='POST'&&callbackMatch){try{const body=await readJson(req);if([2,6].includes(Number(body.status))&&body.url)await fetchAndSaveCallback(safeId(callbackMatch[1]),body.url);return json(res,200,{error:0});}catch(e){console.error(e);return json(res,500,{error:1});}}
 if(req.method==='POST'&&pathname==='/api/documents/new')return json(res,201,await createDocument('Untitled Document.docx','docx',makeBlankDocx()));
 if(req.method==='POST'&&pathname==='/api/documents'){try{const body=await readJson(req),fileType=String(body.fileType||'').toLowerCase().replace(/[^a-z0-9]/g,''),allowed=['docx','xlsx','pptx','pdf','txt'];if(!allowed.includes(fileType))return json(res,400,{error:'Unsupported file type'});const bytes=Buffer.from(String(body.base64||''),'base64');if(!bytes.length)return json(res,400,{error:'Empty document'});return json(res,201,await createDocument(body.name||`New Document.${fileType}`,fileType,bytes));}catch(e){return json(res,400,{error:e.message});}}
 if(req.method==='DELETE'&&docMatch){const item=await getDocument(safeId(docMatch[1]));if(!item)return json(res,404,{error:'Document not found'});await fsp.rm(path.join(DATA_DIR,'files',`${item.id}.${item.fileType}`),{force:true});await writeManifest((await readManifest()).filter(x=>x.id!==item.id));return json(res,200,{ok:true});}
 return json(res,404,{error:'Not found'});
}

async function createWindow(){await ensureData();const server=http.createServer((req,res)=>handle(req,res).catch(e=>{console.error(e);json(res,500,{error:'Internal server error'});}));await new Promise(resolve=>server.listen(PORT,'127.0.0.1',resolve));const win=new BrowserWindow({width:1600,height:1000,minWidth:1000,minHeight:700,title:'TUBOL Document Workspace',backgroundColor:'#111827',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});win.removeMenu();await win.loadURL(`http://127.0.0.1:${PORT}/`);win.on('closed',()=>server.close());}
app.whenReady().then(createWindow);app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
