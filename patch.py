from pathlib import Path
import re

root=Path('/mnt/data/custom_theme_build')
html=(root/'index.html').read_text()
css=(root/'design.css').read_text()
js=(root/'functions.js').read_text()

# Add sidebar toggle button
html=html.replace('''<div class="top-actions">\n        <button class="btn btn-ghost" id="settingsBtn" type="button" title="Open settings">⚙ <span class="btn-label">Settings</span></button>\n      </div>''','''<div class="top-actions">\n        <button class="btn btn-ghost icon-only desktop-sidebar-toggle" id="sidebarToggleBtn" type="button" title="Toggle sidebar" aria-label="Toggle sidebar">☰</button>\n        <button class="btn btn-ghost" id="settingsBtn" type="button" title="Open settings">⚙ <span class="btn-label">Settings</span></button>\n      </div>''')

# Add custom theme setting controls before desktop icon section
needle='''          <p class="subtext">The accent color controls primary buttons and important interface text. The selection highlight changes text-selection feedback inside the letter editor.</p>\n        </div>\n        <div class="settings-section">\n          <div class="settings-section-title">Desktop icon</div>'''
insert='''          <p class="subtext">Accent affects buttons, key text, and active controls. Selection highlight uses the familiar light-blue browser-style selection by default.</p>\n          <button type="button" class="btn btn-secondary full-width" id="openCustomThemeBtn">Create Custom Theme</button>\n        </div>\n        <div class="settings-section">\n          <div class="settings-section-title">Desktop icon</div>'''
html=html.replace(needle,insert)

# Insert custom theme modal before toast
modal='''\n    <div id="customThemeModal" class="settings-modal" aria-hidden="true">\n      <div class="settings-card custom-theme-card" role="dialog" aria-modal="true" aria-labelledby="customThemeTitle">\n        <div class="panel-close-row">\n          <div><div class="eyebrow">CUSTOM THEME</div><h2 id="customThemeTitle">Create Custom Theme</h2></div>\n          <button class="preview-tool close" id="customThemeCloseBtn" title="Close">✕</button>\n        </div>\n        <div class="custom-theme-grid">\n          <label>Theme name<input id="customThemeName" type="text" maxlength="32" placeholder="My Theme"></label>\n          <label>Background<input id="customBg" type="color"></label>\n          <label>Surface<input id="customSurface" type="color"></label>\n          <label>Secondary surface<input id="customSurface2" type="color"></label>\n          <label>Border<input id="customLine" type="color"></label>\n          <label>Main text<input id="customText" type="color"></label>\n          <label>Muted text<input id="customMuted" type="color"></label>\n          <label>Button & accent<input id="customAccent" type="color"></label>\n          <label>Button hover<input id="customAccent2" type="color"></label>\n          <label>Selected page<input id="customSelected" type="color"></label>\n          <label>Text selection<input id="customHighlight" type="color"></label>\n          <label>Success<input id="customSuccess" type="color"></label>\n          <label>Error<input id="customDanger" type="color"></label>\n        </div>\n        <div class="save-export-actions"><button class="btn btn-secondary" id="customThemeResetBtn">Reset Preset</button><span></span><button class="btn btn-primary" id="customThemeSaveBtn">Save Custom Theme</button></div>\n      </div>\n    </div>\n'''
html=html.replace('''    <div id="toast" class="toast"></div>''',modal+'''    <div id="toast" class="toast"></div>''')
(root/'index.html').write_text(html)

# CSS additions
css += r'''

/* Theme-aware controls */
:root {
  --selected-page: var(--accent);
  --success: #198754;
  --danger: #c73a3a;
  --button-text: #fff;
}
.btn-primary, .mini-btn.active { background: var(--accent); color: var(--button-text); }
.page-card.selected { border-color: var(--selected-page); box-shadow: 0 0 0 2px color-mix(in srgb, var(--selected-page) 18%, transparent); }
.sidebar-item.active { color: var(--text); background: color-mix(in srgb, var(--selected-page) 14%, var(--surface)); }
.editor-toolbar button.active { background: color-mix(in srgb, var(--accent) 16%, var(--surface-2)); color: var(--accent); }
.toast.success { border-color: color-mix(in srgb, var(--success) 35%, var(--line)); }
.toast.error { border-color: color-mix(in srgb, var(--danger) 35%, var(--line)); }
.desktop-sidebar-toggle { display: inline-flex; }
.full-width { width:100%; justify-content:center; }
.custom-theme-card { width:min(720px, calc(100vw - 28px)); }
.custom-theme-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; max-height:min(54vh,520px); overflow:auto; padding:2px; }
.custom-theme-grid label { display:grid; gap:7px; font-size:11px; font-weight:700; color:var(--muted); }
.custom-theme-grid input[type=text], .custom-theme-grid input[type=color] { width:100%; }
.custom-theme-grid input[type=text] { border:1px solid var(--line); border-radius:9px; padding:10px 11px; background:var(--surface-2); color:var(--text); }
.custom-theme-grid input[type=color] { height:40px; padding:3px; border:1px solid var(--line); border-radius:8px; background:var(--surface); }
body.custom-theme-active .theme-custom-placeholder { display:none; }
body.sidebar-collapsed .sidebar { width:64px; min-width:64px; }
body.sidebar-collapsed .sidebar-item { justify-content:center; padding-inline:8px; }
body.sidebar-collapsed .sidebar-item .nav-label, body.sidebar-collapsed .sidebar-note, body.sidebar-collapsed .sidebar-divider { display:none; }
body.sidebar-collapsed .sidebar-item span:first-child { width:auto; font-size:18px; }
body.sidebar-collapsed .workspace { grid-template-columns:64px minmax(0,1fr); }
@media (max-width:900px){ .custom-theme-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:720px){
  .custom-theme-grid { grid-template-columns:1fr; }
  .desktop-sidebar-toggle { display:inline-flex; }
  .top-actions { width:auto; flex:0 0 auto; }
  .top-actions .btn { min-width:42px; }
}
@media (max-width:680px){
  body:not(.sidebar-collapsed) .sidebar-item .nav-label { display:none; }
  body:not(.sidebar-collapsed) .sidebar { width:64px; min-width:64px; }
  body:not(.sidebar-collapsed) .sidebar-item { justify-content:center; padding-inline:8px; }
  body:not(.sidebar-collapsed) .sidebar-note, body:not(.sidebar-collapsed) .sidebar-divider { display:none; }
  body:not(.sidebar-collapsed) .workspace { grid-template-columns:64px minmax(0,1fr); }
}
'''
(root/'design.css').write_text(css)

# JS replace theme functions block
start=js.index('function setTheme(mode) {')
end=js.index('function formatBytes(bytes) {')
new=r'''const THEME_DEFAULTS = {
  light:{bg:'#f6f8fb',surface:'#ffffff',surface2:'#f0f3f7',line:'#d7dee7',text:'#17202a',muted:'#66727f',accent:'#2563eb',accent2:'#1d4ed8',selected:'#2563eb',success:'#198754',danger:'#c73a3a',highlight:'#b3d7ff'},
  dark:{bg:'#2a2d31',surface:'#34383d',surface2:'#3c4147',line:'#505760',text:'#f4f5f6',muted:'#bcc2c9',accent:'#8ea2b8',accent2:'#aab8c7',selected:'#8ea2b8',success:'#4db47b',danger:'#ff7b72',highlight:'#b3d7ff'},
  aqua:{bg:'#eaf6f7',surface:'#ffffff',surface2:'#f0fbfb',line:'#c7e2e4',text:'#18363b',muted:'#5f7c81',accent:'#147d84',accent2:'#0f666c',selected:'#147d84',success:'#188a68',danger:'#b64a40',highlight:'#b7ecf0'},
  adventure:{bg:'#f2eadb',surface:'#fffaf1',surface2:'#f8f0e3',line:'#dcc8a8',text:'#3e3022',muted:'#766149',accent:'#8a6338',accent2:'#6f4e2d',selected:'#8a6338',success:'#6f7f3f',danger:'#a74b3d',highlight:'#f2d6a0'},
  zombie:{bg:'#edf1ea',surface:'#f8faf6',surface2:'#f0f3ed',line:'#cbd2c5',text:'#2f3a30',muted:'#667364',accent:'#5d6f55',accent2:'#475a41',selected:'#5d6f55',success:'#5c8a4f',danger:'#aa4d45',highlight:'#cfe5b6'},
  warm:{bg:'#f5efe8',surface:'#fffaf5',surface2:'#f3ebe2',line:'#dfd1c1',text:'#3e3128',muted:'#7b6a5c',accent:'#a05b2c',accent2:'#83491f',selected:'#a05b2c',success:'#587a51',danger:'#a74739',highlight:'#f3cfaa'},
  contrast:{bg:'#ffffff',surface:'#ffffff',surface2:'#f1f1f1',line:'#000000',text:'#000000',muted:'#333333',accent:'#000000',accent2:'#222222',selected:'#000000',success:'#0b6b3a',danger:'#8a0000',highlight:'#b3d7ff'}
};
function hexToRgb(hex){const n=parseInt(hex.slice(1),16);return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};}
function applyThemeVars(p){
  const root=document.documentElement;
  const vars={bg:p.bg,surface:p.surface,'surface-2':p.surface2,line:p.line,text:p.text,muted:p.muted,accent:p.accent,'accent-2':p.accent2,'selected-page':p.selected,success:p.success,danger:p.danger,'highlight-color':p.highlight};
  Object.entries(vars).forEach(([k,v])=>root.style.setProperty(`--${k}`,v));
  document.body.style.setProperty('--button-text', (p.accent.toLowerCase()==='#ffffff'||p.accent.toLowerCase()==='#f5f5f5') ? '#111' : '#fff');
}
function setTheme(mode) {
  const themes = Object.keys(THEME_DEFAULTS);
  const custom = localStorage.getItem('pdfWorkspaceCustomTheme');
  const chosen = mode === 'gray' ? 'dark' : (mode || 'light');
  const normalized = chosen === 'custom' && custom ? 'custom' : (themes.includes(chosen) ? chosen : 'light');
  document.body.classList.remove(...themes.filter(t=>t!=='light').map(t=>`theme-${t}`), 'theme-custom', 'custom-theme-active');
  if(normalized!=='light') document.body.classList.add(`theme-${normalized}`);
  let palette = normalized==='custom' && custom ? JSON.parse(custom) : {...THEME_DEFAULTS[normalized]};
  const accentOverride=localStorage.getItem('pdfWorkspaceAccent');
  const highlightOverride=localStorage.getItem('pdfWorkspaceHighlight');
  if(accentOverride && normalized!=='custom') palette={...palette,accent:accentOverride};
  if(highlightOverride) palette={...palette,highlight:highlightOverride};
  applyThemeVars(palette);
  localStorage.setItem('pdfWorkspaceTheme', normalized);
  const sel=$('#themeSelect'); if(sel) sel.value=normalized;
}
function openSettings(){
  const modal=$('#settingsModal'); if(!modal) return;
  const theme=localStorage.getItem('pdfWorkspaceTheme') || 'light';
  const p=theme==='custom' && localStorage.getItem('pdfWorkspaceCustomTheme') ? JSON.parse(localStorage.getItem('pdfWorkspaceCustomTheme')) : (THEME_DEFAULTS[theme] || THEME_DEFAULTS.light);
  $('#highlightColorInput').value=localStorage.getItem('pdfWorkspaceHighlight') || p.highlight;
  $('#highlightColorValue').textContent=$('#highlightColorInput').value.toUpperCase();
  $('#accentColorInput').value=localStorage.getItem('pdfWorkspaceAccent') || p.accent;
  $('#accentColorValue').textContent=$('#accentColorInput').value.toUpperCase();
  $('#themeSelect').value=theme;
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
}
function closeSettings(){const modal=$('#settingsModal'); if(!modal) return; modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');}
function applyAccentColor(value){
  const safe=/^#[0-9a-fA-F]{6}$/.test(value)?value:'#2563eb';
  const {r,g,b}=hexToRgb(safe); const mix=v=>Math.round(v*.88+255*.12); const accent2=`#${[mix(r),mix(g),mix(b)].map(v=>v.toString(16).padStart(2,'0')).join('')}`;
  localStorage.setItem('pdfWorkspaceAccent',safe); localStorage.setItem('pdfWorkspaceAccent2',accent2);
  document.documentElement.style.setProperty('--accent',safe); document.documentElement.style.setProperty('--accent-2',accent2); document.documentElement.style.setProperty('--selected-page',safe);
  $('#accentColorValue').textContent=safe.toUpperCase();
}
function resetAccentColor(){
  localStorage.removeItem('pdfWorkspaceAccent'); localStorage.removeItem('pdfWorkspaceAccent2');
  const theme=localStorage.getItem('pdfWorkspaceTheme')||'light';
  const p=theme==='custom'&&localStorage.getItem('pdfWorkspaceCustomTheme')?JSON.parse(localStorage.getItem('pdfWorkspaceCustomTheme')):(THEME_DEFAULTS[theme]||THEME_DEFAULTS.light);
  applyAccentColor(p.accent); const input=$('#accentColorInput'); if(input) input.value=p.accent;
}
function resetHighlightColor(){
  localStorage.removeItem('pdfWorkspaceHighlight');
  const theme=localStorage.getItem('pdfWorkspaceTheme')||'light';
  const p=theme==='custom'&&localStorage.getItem('pdfWorkspaceCustomTheme')?JSON.parse(localStorage.getItem('pdfWorkspaceCustomTheme')):(THEME_DEFAULTS[theme]||THEME_DEFAULTS.light);
  applyHighlightColor(p.highlight); const input=$('#highlightColorInput'); if(input) input.value=p.highlight;
}
function applyHighlightColor(value){const safe=/^#[0-9a-fA-F]{6}$/.test(value)?value:'#b3d7ff'; localStorage.setItem('pdfWorkspaceHighlight',safe); document.documentElement.style.setProperty('--highlight-color',safe); $('#highlightColorValue').textContent=safe.toUpperCase();}
function populateCustomThemeForm(){
  const theme=localStorage.getItem('pdfWorkspaceTheme')||'light';
  const saved=localStorage.getItem('pdfWorkspaceCustomTheme');
  const p=theme==='custom'&&saved?JSON.parse(saved):{...THEME_DEFAULTS[theme]||THEME_DEFAULTS.light};
  const map={customThemeName:'name',customBg:'bg',customSurface:'surface',customSurface2:'surface2',customLine:'line',customText:'text',customMuted:'muted',customAccent:'accent',customAccent2:'accent2',customSelected:'selected',customHighlight:'highlight',customSuccess:'success',customDanger:'danger'};
  Object.entries(map).forEach(([id,key])=>{const el=$('#'+id);if(el)el.value=p[key]||'';});
  $('#customThemeName').value=p.name||'My Theme';
}
function openCustomTheme(){populateCustomThemeForm(); const m=$('#customThemeModal'); m.classList.add('open');m.setAttribute('aria-hidden','false');}
function closeCustomTheme(){const m=$('#customThemeModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');}
function saveCustomTheme(){
  const p={name:$('#customThemeName').value.trim()||'My Theme',bg:$('#customBg').value,surface:$('#customSurface').value,surface2:$('#customSurface2').value,line:$('#customLine').value,text:$('#customText').value,muted:$('#customMuted').value,accent:$('#customAccent').value,accent2:$('#customAccent2').value,selected:$('#customSelected').value,highlight:$('#customHighlight').value,success:$('#customSuccess').value,danger:$('#customDanger').value};
  localStorage.setItem('pdfWorkspaceCustomTheme',JSON.stringify(p));
  const themeSelect=$('#themeSelect'); if(themeSelect && !themeSelect.querySelector('option[value="custom"]')) themeSelect.insertAdjacentHTML('beforeend','<option value="custom">Custom</option>');
  localStorage.setItem('pdfWorkspaceTheme','custom');
  localStorage.removeItem('pdfWorkspaceAccent'); localStorage.removeItem('pdfWorkspaceHighlight');
  setTheme('custom'); closeCustomTheme(); toast('Custom theme saved');
}
function resetCustomTheme(){localStorage.removeItem('pdfWorkspaceCustomTheme'); const themeSelect=$('#themeSelect'); if(themeSelect) themeSelect.value='light'; setTheme('light'); populateCustomThemeForm();}
function setupThemeSelect(){const sel=$('#themeSelect'); if(localStorage.getItem('pdfWorkspaceCustomTheme') && !sel.querySelector('option[value="custom"]')) sel.insertAdjacentHTML('beforeend','<option value="custom">Custom</option>');}

'''
js=js[:start]+new+js[end:]

# Navigation + sidebar functions augment
needle='''function setupNavigation() {\n  $$('.sidebar-item').forEach(btn => btn.addEventListener('click', () => {\n    $$('.sidebar-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');\n    $$('.view').forEach(v => v.classList.remove('active-view')); $('#' + btn.dataset.view).classList.add('active-view');\n  }));\n}\n'''
replacement='''function setupNavigation() {\n  $$('.sidebar-item').forEach(btn => btn.addEventListener('click', () => {\n    $$('.sidebar-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');\n    $$('.view').forEach(v => v.classList.remove('active-view')); $('#' + btn.dataset.view).classList.add('active-view');\n  }));\n  const toggle=$('#sidebarToggleBtn');\n  const setCollapsed=collapsed=>{document.body.classList.toggle('sidebar-collapsed',collapsed);localStorage.setItem('pdfWorkspaceSidebarCollapsed',collapsed?'1':'0');toggle?.setAttribute('aria-pressed',collapsed?'true':'false');toggle?.setAttribute('title',collapsed?'Expand sidebar':'Collapse sidebar');};\n  setCollapsed(localStorage.getItem('pdfWorkspaceSidebarCollapsed')==='1');\n  toggle?.addEventListener('click',()=>setCollapsed(!document.body.classList.contains('sidebar-collapsed')));\n}\n'''
if needle not in js: print('nav needle missing')
js=js.replace(needle,replacement)

# Update listeners near end
js=js.replace("  $('#themeSelect').addEventListener('change', e => setTheme(e.target.value));", "  setupThemeSelect();\n  $('#themeSelect').addEventListener('change', e => { setTheme(e.target.value); openSettings(); });")
js=js.replace("  $('#highlightColorInput').addEventListener('input', e => applyHighlightColor(e.target.value));", "  $('#highlightColorInput').addEventListener('input', e => applyHighlightColor(e.target.value));")
js=js.replace("  $('#highlightResetBtn')?.addEventListener('click', resetHighlightColor);", "  $('#highlightResetBtn')?.addEventListener('click', resetHighlightColor);\n  $('#openCustomThemeBtn')?.addEventListener('click', openCustomTheme);\n  $('#customThemeCloseBtn')?.addEventListener('click', closeCustomTheme);\n  $('#customThemeSaveBtn')?.addEventListener('click', saveCustomTheme);\n  $('#customThemeResetBtn')?.addEventListener('click', resetCustomTheme);\n  $('#customThemeModal')?.addEventListener('click', e => { if(e.target.id==='customThemeModal') closeCustomTheme(); });")
# init defaults: replace initial apply lines
js=js.replace("  setTheme(localStorage.getItem('pdfWorkspaceTheme') || 'light');\n  applyHighlightColor(localStorage.getItem('pdfWorkspaceHighlight') || '#fde68a');\n  applyAccentColor(localStorage.getItem('pdfWorkspaceAccent') || '#2563eb');", "  setTheme(localStorage.getItem('pdfWorkspaceTheme') || 'light');\n  const activeTheme=localStorage.getItem('pdfWorkspaceTheme')||'light';\n  const activePalette=activeTheme==='custom'&&localStorage.getItem('pdfWorkspaceCustomTheme')?JSON.parse(localStorage.getItem('pdfWorkspaceCustomTheme')):(THEME_DEFAULTS[activeTheme]||THEME_DEFAULTS.light);\n  applyHighlightColor(localStorage.getItem('pdfWorkspaceHighlight') || activePalette.highlight || '#b3d7ff');\n  if(localStorage.getItem('pdfWorkspaceAccent')) applyAccentColor(localStorage.getItem('pdfWorkspaceAccent'));\n  else applyAccentColor(activePalette.accent);")
(root/'functions.js').write_text(js)
