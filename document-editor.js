import { Editor, Extension } from 'https://esm.sh/@tiptap/core@2.11.5';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.11.5';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.11.5';
import Underline from 'https://esm.sh/@tiptap/extension-underline@2.11.5';
import Highlight from 'https://esm.sh/@tiptap/extension-highlight@2.11.5';
import Link from 'https://esm.sh/@tiptap/extension-link@2.11.5';
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@2.11.5';
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@2.11.5';

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize || null,
          renderHTML: attributes => attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}
        }
      }
    }];
  }
});

const KEY = 'tubolpro.documentStudio.v1';
const defaults = {
  title: 'Untitled Document',
  paper: 'letter',
  margin: 'normal',
  html: '<h1>Untitled Document</h1><p>Start writing here. This document is saved locally in your browser.</p><p></p>'
};

const $ = id => document.getElementById(id);
const saveState = $('saveState');
const titleInput = $('docTitle');
const editorEl = $('editor');
const paper = $('paper');
let saveTimer;
let editor;

function loadDocument() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {...defaults}; }
  catch { return {...defaults}; }
}

function saveDocument() {
  if (!editor) return;
  const data = { title: titleInput.value.trim() || 'Untitled Document', paper: $('paperSelect').value, margin: $('marginSelect').value, html: editor.getHTML() };
  localStorage.setItem(KEY, JSON.stringify(data));
  saveState.textContent = 'Saved locally';
}

function queueSave() {
  saveState.textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDocument, 450);
}

function applyPaper() {
  paper.classList.remove('letter','a4','legal','margin-narrow','margin-wide');
  paper.classList.add($('paperSelect').value);
  const margin = $('marginSelect').value;
  if (margin === 'narrow') paper.classList.add('margin-narrow');
  if (margin === 'wide') paper.classList.add('margin-wide');
}

function updateStats() {
  if (!editor) return;
  const text = editor.state.doc.textContent.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const pages = Math.max(1, Math.ceil(editorEl.scrollHeight / 960));
  $('wordCount').textContent = `${words.toLocaleString()} ${words === 1 ? 'word' : 'words'}`;
  $('charCount').textContent = `${text.length.toLocaleString()} ${text.length === 1 ? 'character' : 'characters'}`;
  $('pageInfo').textContent = `${pages} page${pages === 1 ? '' : 's'}`;
}

function openModal(id) { $(id).classList.add('open'); $(id).setAttribute('aria-hidden','false'); }
function closeModal(id) { $(id).classList.remove('open'); $(id).setAttribute('aria-hidden','true'); }
function focusEditor() { editor.commands.focus(); }
function safeFilename(name) { return name.replace(/[^a-z0-9 _.-]/gi, '').trim().replace(/\s+/g,'-') || 'document'; }
function escapeHtml(value) { return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function downloadBlob(text, filename, type) { const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

const saved = loadDocument();
$('paperSelect').value = saved.paper || defaults.paper;
$('marginSelect').value = saved.margin || defaults.margin;
titleInput.value = saved.title || defaults.title;

editor = new Editor({
  element: editorEl,
  extensions: [
    StarterKit,
    Underline,
    Highlight,
    TextStyle,
    FontSize,
    TextAlign.configure({ types: ['heading','paragraph'] }),
    Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    Placeholder.configure({ placeholder: 'Start writing…' })
  ],
  content: saved.html || defaults.html,
  onUpdate: () => { updateStats(); queueSave(); }
});

applyPaper();
updateStats();

$('toolbar').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
$('toolbar').addEventListener('click', e => {
  const button = e.target.closest('[data-cmd]');
  if (!button) return;
  const cmd = button.dataset.cmd;
  focusEditor();
  const chain = editor.chain().focus();
  if (cmd === 'undo') chain.undo().run();
  else if (cmd === 'redo') chain.redo().run();
  else if (cmd === 'bold') chain.toggleBold().run();
  else if (cmd === 'italic') chain.toggleItalic().run();
  else if (cmd === 'underline') chain.toggleUnderline().run();
  else if (cmd === 'strike') chain.toggleStrike().run();
  else if (cmd === 'highlight') chain.toggleHighlight().run();
  else if (cmd === 'alignLeft') chain.setTextAlign('left').run();
  else if (cmd === 'alignCenter') chain.setTextAlign('center').run();
  else if (cmd === 'alignRight') chain.setTextAlign('right').run();
  else if (cmd === 'alignJustify') chain.setTextAlign('justify').run();
  else if (cmd === 'bullet') chain.toggleBulletList().run();
  else if (cmd === 'ordered') chain.toggleOrderedList().run();
  else if (cmd === 'blockquote') chain.toggleBlockquote().run();
  else if (cmd === 'code') chain.toggleCodeBlock().run();
  else if (cmd === 'horizontal') chain.setHorizontalRule().run();
  else if (cmd === 'clear') chain.clearNodes().unsetAllMarks().run();
  else if (cmd === 'link') {
    const current = editor.getAttributes('link').href || '';
    const url = prompt('Enter a URL', current || 'https://');
    if (url === null) return;
    if (!url.trim()) chain.unsetLink().run(); else chain.setLink({ href: url.trim() }).run();
  }
});

$('blockSelect').addEventListener('change', e => {
  focusEditor();
  const v = e.target.value;
  if (v === 'paragraph') editor.chain().focus().setParagraph().run();
  if (v === 'heading1') editor.chain().focus().toggleHeading({level:1}).run();
  if (v === 'heading2') editor.chain().focus().toggleHeading({level:2}).run();
  if (v === 'heading3') editor.chain().focus().toggleHeading({level:3}).run();
});

$('fontSizeSelect').addEventListener('change', e => {
  focusEditor();
  editor.chain().focus().setMark('textStyle', {fontSize: `${e.target.value}px`}).run();
});

$('paperSelect').addEventListener('change', () => { applyPaper(); queueSave(); });
$('marginSelect').addEventListener('change', () => { applyPaper(); queueSave(); });
titleInput.addEventListener('input', queueSave);
$('newBtn').addEventListener('click', () => openModal('newModal'));
$('confirmNewBtn').addEventListener('click', () => {
  titleInput.value = 'Untitled Document';
  $('paperSelect').value = 'letter';
  $('marginSelect').value = 'normal';
  editor.commands.setContent(defaults.html);
  applyPaper();
  saveDocument();
  closeModal('newModal');
  focusEditor();
});

$('exportBtn').addEventListener('click', () => openModal('exportModal'));
$('printBtn').addEventListener('click', () => { closeModal('exportModal'); window.print(); });
$('htmlBtn').addEventListener('click', () => {
  const title = titleInput.value.trim() || 'Untitled Document';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;max-width:816px;margin:60px auto;padding:0 40px;line-height:1.6;color:#111}h1,h2,h3{line-height:1.2}blockquote{border-left:4px solid #ddd;padding-left:15px;color:#666}a{color:#2563eb}</style></head><body>${editor.getHTML()}</body></html>`;
  downloadBlob(html, `${safeFilename(title)}.html`, 'text/html');
  closeModal('exportModal');
});
$('jsonBtn').addEventListener('click', () => {
  saveDocument();
  const data = localStorage.getItem(KEY) || JSON.stringify(defaults);
  const title = titleInput.value.trim() || 'Untitled Document';
  downloadBlob(data, `${safeFilename(title)}.tubol.json`, 'application/json');
  closeModal('exportModal');
});

$('findBtn').addEventListener('click', () => { openModal('findModal'); setTimeout(() => $('findInput').focus(), 50); });
$('replaceAllBtn').addEventListener('click', () => {
  const find = $('findInput').value;
  const replacement = $('replaceInput').value;
  if (!find) return;
  const html = editor.getHTML();
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const next = html.replace(new RegExp(escaped, 'g'), () => replacement);
  editor.commands.setContent(next);
  queueSave();
  closeModal('findModal');
});

$('themeBtn').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('tubolpro.documentStudio.theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('tubolpro.documentStudio.theme') === 'dark') document.body.classList.add('dark');

$('outlineBtn').addEventListener('click', () => {
  $('rightPanelTitle').textContent = 'OUTLINE';
  const headings = [...editorEl.querySelectorAll('h1,h2,h3')];
  $('panelContent').innerHTML = headings.length ? headings.map((h,i) => `<button class="outline-item" data-index="${i}">${escapeHtml(h.textContent || 'Untitled heading')}</button>`).join('') : '<div class="info-card"><strong>No headings yet</strong><p>Use Heading 1, 2 or 3 styles to build an outline.</p></div>';
  openRightPanel();
  document.querySelectorAll('.outline-item').forEach(btn => btn.addEventListener('click', () => headings[Number(btn.dataset.index)]?.scrollIntoView({behavior:'smooth',block:'center'})));
});

$('templatesBtn').addEventListener('click', () => {
  $('rightPanelTitle').textContent = 'TEMPLATES';
  $('panelContent').innerHTML = '<button class="template-choice" data-template="letter"><strong>Professional Letter</strong><span>Date · recipient · subject · body · signature</span></button><button class="template-choice" data-template="memo"><strong>Business Memo</strong><span>To · From · Date · Subject · message</span></button><button class="template-choice" data-template="blank"><strong>Blank Page</strong><span>Start with a clean document</span></button>';
  openRightPanel();
  document.querySelectorAll('.template-choice').forEach(btn => btn.addEventListener('click', () => useTemplate(btn.dataset.template)));
});

function useTemplate(type) {
  const templates = {
    letter: '<p style="text-align:right">[Date]</p><p><strong>[Recipient Name]</strong><br>[Organization]<br>[Address]</p><p><strong>Subject: [Subject]</strong></p><p>Dear [Recipient Name],</p><p>Write your letter here.</p><p>Sincerely,</p><p>[Your Name]</p>',
    memo: '<h1>MEMORANDUM</h1><p><strong>TO:</strong> [Recipient]</p><p><strong>FROM:</strong> [Your Name]</p><p><strong>DATE:</strong> [Date]</p><p><strong>SUBJECT:</strong> [Subject]</p><hr><p>Write your memo here.</p>',
    blank: '<p></p>'
  };
  editor.commands.setContent(templates[type] || templates.blank);
  queueSave();
  closeRightPanel();
  focusEditor();
}

function openRightPanel() { $('rightPanel').style.display = 'block'; }
function closeRightPanel() { $('rightPanel').style.display = ''; }
$('closePanel').addEventListener('click', closeRightPanel);
$('renameBtn').addEventListener('click', () => { titleInput.focus(); titleInput.select(); });
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('mousedown', e => { if (e.target === modal) closeModal(modal.id); }));
window.addEventListener('keydown', e => {
  const meta = e.ctrlKey || e.metaKey;
  if (meta && e.key.toLowerCase() === 's') { e.preventDefault(); saveDocument(); }
  if (meta && e.key.toLowerCase() === 'f') { e.preventDefault(); openModal('findModal'); setTimeout(() => $('findInput').focus(), 50); }
});
window.addEventListener('beforeunload', saveDocument);
window.addEventListener('resize', updateStats);
