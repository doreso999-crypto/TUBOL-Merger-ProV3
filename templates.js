/* TUBOL Templates workspace — consumer/account parsing, template selection, bureau fan-out, grouped letter thumbnails. */
(() => {
  const STYLE_ID = 'templatesModalStyles';
  const MODAL_ID = 'templatesModal';
  const BUTTON_ID = 'templatesBtn';
  const BOARD_ID = 'generatedLettersBoard';
  const TOAST_FALLBACK_ID = 'templatesLocalToast';

  const BUREAUS = {
    EX: 'Experian',
    EQ: 'Equifax',
    TU: 'TransUnion',
  };

  const TEMPLATES = {
    late_payments: {
      label: 'Late Payments',
      subject: 'Dispute of Late Payment Reporting — {{account}}',
      paragraphs: [
        'I am writing to dispute the accuracy and completeness of the late-payment information being reported for the account identified below.',
        'Please conduct a reasonable review of the information associated with this account, including the reported payment status and any records supporting the late-payment notation. If the information cannot be substantiated as accurate and complete, please correct or delete the disputed reporting.',
      ],
    },
    deletion: {
      label: 'Deletion',
      subject: 'Request for Deletion of Disputed Account — {{account}}',
      paragraphs: [
        'I am disputing the account identified below because the information being reported is inaccurate, incomplete, or cannot be verified from reliable records.',
        'Please review the account and the underlying records. If the disputed information cannot be verified as accurate and complete, please delete the disputed tradeline from my credit file.',
      ],
    },
    hard_inquiry: {
      label: 'Hard Inquiry',
      subject: 'Dispute of Hard Inquiry — {{account}}',
      paragraphs: [
        'I am writing to dispute the hard inquiry identified below. I do not recognize this inquiry as one that should remain on my credit file in its present form.',
        'Please investigate the source and permissible purpose associated with this inquiry. If the inquiry cannot be verified and supported by appropriate records, please remove it from my credit file.',
      ],
    },
    personal_information: {
      label: 'Personal Information',
      subject: 'Dispute of Personal Information',
      paragraphs: [
        'I am disputing the personal information identified below because the information being displayed in my credit file is inaccurate or incomplete.',
        'Please review the disputed personal information against reliable records and correct or remove any information that cannot be substantiated as accurate.',
      ],
    },
    chapter_7_bankruptcy: {
      label: 'Chapter 7 Bankruptcy',
      subject: 'Dispute of Chapter 7 Bankruptcy Information',
      paragraphs: [
        'I am writing to dispute the Chapter 7 bankruptcy information identified in my credit file. Please review the reporting for accuracy, completeness, and verifiability.',
        'If the disputed bankruptcy information cannot be verified as accurately reported, please correct or delete the disputed information from my credit file.',
      ],
    },
    chapter_13_bankruptcy: {
      label: 'Chapter 13 Bankruptcy',
      subject: 'Dispute of Chapter 13 Bankruptcy Information',
      paragraphs: [
        'I am writing to dispute the Chapter 13 bankruptcy information identified in my credit file. Please review the reporting for accuracy, completeness, and verifiability.',
        'If the disputed bankruptcy information cannot be verified as accurately reported, please correct or delete the disputed information from my credit file.',
      ],
    },
    dismissed_bankruptcy: {
      label: 'Dismissed Bankruptcy',
      subject: 'Dispute of Dismissed Bankruptcy Information',
      paragraphs: [
        'I am disputing the bankruptcy information identified below and requesting a review of how the dismissed proceeding is being reported in my credit file.',
        'Please verify the current status and the accuracy of the reported information. If the disputed reporting cannot be verified as accurate and complete, please correct or delete it.',
      ],
    },
    discharged_bankruptcy: {
      label: 'Discharged Bankruptcy',
      subject: 'Dispute of Discharged Bankruptcy Information',
      paragraphs: [
        'I am disputing the bankruptcy information identified below and requesting a review of how the discharged proceeding is being reported in my credit file.',
        'Please verify the current status and the accuracy of the reported information. If the disputed reporting cannot be verified as accurate and complete, please correct or delete it.',
      ],
    },
  };

  const generatedGroups = [];

  function cssEscape(value) {
    return window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .templates-modal{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.46);backdrop-filter:blur(4px)}
      .templates-modal.open{display:flex}
      .templates-card{width:min(980px,100%);max-height:min(900px,calc(100vh - 48px));overflow:auto;border:1px solid var(--border-color,#d7dee8);border-radius:18px;background:var(--surface,#fff);color:var(--text,#111827);box-shadow:0 24px 70px rgba(15,23,42,.24);padding:24px}
      .templates-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px}
      .templates-title-wrap{min-width:0}.templates-eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;opacity:.68;margin-bottom:6px}.templates-card h2{margin:0;font-size:24px;line-height:1.2}
      .templates-close{border:0;background:transparent;color:inherit;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:18px}.templates-close:hover{background:rgba(127,127,127,.12)}
      .templates-section{margin-top:18px}.templates-section-title{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.68;margin-bottom:8px}
      .templates-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.65fr);gap:18px}.templates-panel{border:1px solid var(--border-color,#d7dee8);border-radius:14px;padding:15px;background:rgba(127,127,127,.025)}
      .templates-textarea{width:100%;min-height:170px;resize:vertical;box-sizing:border-box;border:1px solid var(--border-color,#cbd5e1);border-radius:12px;background:transparent;color:inherit;padding:12px 14px;font:inherit;line-height:1.5;outline:none}.templates-textarea:focus,.templates-input:focus,.templates-select:focus{border-color:var(--accent,#2563eb);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
      .templates-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.templates-field{display:flex;flex-direction:column;gap:6px;min-width:0}.templates-field.full{grid-column:1/-1}.templates-field label{font-size:12px;font-weight:700;opacity:.78}
      .templates-input,.templates-select{width:100%;box-sizing:border-box;border:1px solid var(--border-color,#cbd5e1);border-radius:10px;background:transparent;color:inherit;padding:10px 12px;font:inherit;outline:none}.templates-select{cursor:pointer}
      .templates-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:12px}.templates-btn{border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer}.templates-btn.primary{background:var(--accent,#2563eb);color:#fff}.templates-btn.secondary{background:rgba(127,127,127,.1);color:inherit;border:1px solid var(--border-color,#d7dee8)}
      .templates-status{min-height:18px;margin-top:8px;font-size:12px;opacity:.68}.templates-help{font-size:12px;line-height:1.5;opacity:.68;margin-top:8px}
      .templates-account-summary{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(127,127,127,.06);font-size:12px;line-height:1.55;white-space:pre-wrap}
      .templates-footer{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}
      #${BOARD_ID}{margin-top:26px}.generated-letters-empty{border:1px dashed var(--border-color,#cbd5e1);border-radius:14px;padding:28px;text-align:center;opacity:.65}.generated-letter-group{margin-bottom:24px;border:1px solid var(--border-color,#d7dee8);border-radius:16px;padding:16px;background:rgba(127,127,127,.025)}.generated-group-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}.generated-group-title{font-weight:800;font-size:16px}.generated-group-meta{font-size:12px;opacity:.67;margin-top:3px}.generated-bureau-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}.generated-letter-card{border:1px solid var(--border-color,#d7dee8);border-radius:14px;padding:10px;background:var(--surface,#fff)}.generated-letter-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.generated-bureau{font-weight:800;font-size:13px}.generated-template-chip{font-size:11px;padding:4px 7px;border-radius:999px;background:rgba(127,127,127,.1)}.generated-letter-paper{height:270px;overflow:hidden;background:#fff;color:#111;border:1px solid #e5e7eb;border-radius:8px;padding:18px;box-sizing:border-box;font-family:Georgia,'Times New Roman',serif;font-size:8px;line-height:1.45;box-shadow:0 6px 20px rgba(15,23,42,.08)}.generated-letter-paper .letter-line{margin-bottom:7px}.generated-letter-paper .letter-title{font-weight:700;text-align:center;font-size:10px;margin:12px 0}.generated-letter-paper .letter-meta{font-family:Arial,sans-serif;font-size:7px;margin-bottom:8px}.generated-card-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.generated-merge-btn{border:0;border-radius:9px;padding:8px 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;background:var(--accent,#2563eb);color:#fff}.generated-remove-btn{border:1px solid var(--border-color,#d7dee8);background:transparent;color:inherit;border-radius:9px;padding:8px 10px;font:inherit;font-size:12px;cursor:pointer}
      .templates-local-toast{position:fixed;right:24px;bottom:24px;z-index:20000;display:none;min-width:260px;max-width:420px;padding:12px 16px;border-radius:12px;background:#111827;color:#fff;box-shadow:0 12px 34px rgba(15,23,42,.25);font-size:13px;font-weight:700}.templates-local-toast.show{display:block}.templates-local-toast.success{background:#166534}.templates-local-toast.error{background:#991b1b}
      @media(max-width:760px){.templates-grid{grid-template-columns:1fr}.templates-fields{grid-template-columns:1fr}.templates-field.full{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function showToast(message, type='info') {
    if (typeof window.toast === 'function') { window.toast(message, type); return; }
    let el = document.getElementById(TOAST_FALLBACK_ID);
    if (!el) { el = document.createElement('div'); el.id = TOAST_FALLBACK_ID; el.className = 'templates-local-toast'; document.body.appendChild(el); }
    el.textContent = message; el.className = `templates-local-toast ${type} show`;
    clearTimeout(el._timer); el._timer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;
    const modal = document.createElement('div'); modal.id = MODAL_ID; modal.className = 'templates-modal'; modal.setAttribute('aria-hidden','true');
    modal.innerHTML = `
      <div class="templates-card" role="dialog" aria-modal="true" aria-labelledby="templatesTitle">
        <div class="templates-header"><div class="templates-title-wrap"><div class="templates-eyebrow">LETTER GENERATION</div><h2 id="templatesTitle">Templates</h2></div><button class="templates-close" id="templatesCloseBtn" type="button" aria-label="Close Templates">✕</button></div>
        <div class="templates-grid">
          <section class="templates-panel">
            <div class="templates-section-title">Consumer information</div>
            <textarea id="templatesParserInput" class="templates-textarea" spellcheck="false" placeholder="Stephen Villard\n2616 Kings Gate Dr\nCarrollton TX 75006\nDOB: 06/26/1968\nSSN: 265-35-1689"></textarea>
            <div class="templates-actions"><button class="templates-btn secondary" id="templatesParseBtn" type="button">Parse Consumer</button></div>
            <div id="templatesParseStatus" class="templates-status" aria-live="polite"></div>
            <div class="templates-fields" style="margin-top:12px">
              <div class="templates-field full"><label for="templatesName">Name</label><input id="templatesName" class="templates-input" type="text"></div>
              <div class="templates-field full"><label for="templatesAddress">Address</label><input id="templatesAddress" class="templates-input" type="text"></div>
              <div class="templates-field"><label for="templatesDob">Date of birth</label><input id="templatesDob" class="templates-input" type="date"></div>
              <div class="templates-field"><label for="templatesSsn">SSN</label><input id="templatesSsn" class="templates-input" type="text" inputmode="numeric" maxlength="11"></div>
            </div>
          </section>
          <section class="templates-panel">
            <div class="templates-section-title">Letter template</div>
            <select id="templatesTemplateSelect" class="templates-select"></select>
            <div class="templates-help">Choose the template that will be generated separately for every bureau reported by each account.</div>
            <div class="templates-section" style="margin-top:20px"><div class="templates-section-title">Negative accounts</div><textarea id="templatesAccountsInput" class="templates-textarea" style="min-height:240px" spellcheck="false" placeholder="BESTEGG\nXxxxxxxxxxxx0661\n$851\n3BR- OPEN LP\n\nMISSIONLNTAB\nXxxxxxxx1605\n$1,266\nEX - TU - OPEN LP"></textarea><div class="templates-actions"><button class="templates-btn secondary" id="templatesParseAccountsBtn" type="button">Parse Accounts</button></div><div id="templatesAccountsStatus" class="templates-status" aria-live="polite"></div><div id="templatesAccountsSummary" class="templates-account-summary" hidden></div></div>
          </section>
        </div>
        <div class="templates-footer"><button class="templates-btn secondary" id="templatesClearBtn" type="button">Clear</button><button class="templates-btn primary" id="templatesGenerateBtn" type="button">Generate Letters</button></div>
      </div>`;
    document.body.appendChild(modal);
  }

  function ensureButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const actions = document.querySelector('.top-actions'); if (!actions) return;
    const button = document.createElement('button'); button.className='btn btn-ghost'; button.id=BUTTON_ID; button.type='button'; button.title='Open templates'; button.innerHTML='▤ <span class="btn-label">Templates</span>';
    actions.insertBefore(button, document.getElementById('settingsBtn') || null);
  }

  function ensureBoard() {
    if (document.getElementById(BOARD_ID)) return document.getElementById(BOARD_ID);
    const grid = document.getElementById('pageGrid'); if (!grid?.parentElement) return null;
    const board = document.createElement('section'); board.id=BOARD_ID; board.setAttribute('aria-label','Generated letters');
    board.innerHTML='<div class="templates-section-title">Generated Letters</div><div class="generated-letters-empty">Generated bureau letters will appear here.</div>';
    grid.parentElement.appendChild(board); return board;
  }

  function normalizeLines(text) { return String(text||'').replace(/\r/g,'').split('\n').map(line=>line.trim()).filter(Boolean); }

  function parseDateToInput(value) { const m=String(value||'').trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); return m?`${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`:''; }

  function parseConsumerInfo(text) {
    const lines=normalizeLines(text); const result={name:'',address:'',dob:'',ssn:''}; if(!lines.length)return result;
    result.name=lines[0]||'';
    const dobIndex=lines.findIndex(l=>/^(?:dob|date\s*of\s*birth)\s*:/i.test(l));
    const ssnIndex=lines.findIndex(l=>/^(?:ssn|social\s*security(?:\s*number)?)\s*:/i.test(l));
    const addressEnd=[dobIndex,ssnIndex].filter(i=>i>0).reduce((min,i)=>Math.min(min,i),lines.length); result.address=lines.slice(1,addressEnd).join(', ');
    if(dobIndex>=0){const m=lines[dobIndex].match(/(?:dob|date\s*of\s*birth)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i);if(m)result.dob=parseDateToInput(m[1]);}
    if(ssnIndex>=0){const m=lines[ssnIndex].match(/(?:ssn|social\s*security(?:\s*number)?)\s*[:\-]?\s*([0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{4})/i);if(m)result.ssn=m[1].replace(/\s+/g,'-');}
    return result;
  }

  function bureauCodesFromStatus(statusLine) {
    const text=String(statusLine||'').toUpperCase();
    if(/\b3BR\b/.test(text)) return ['EX','EQ','TU'];
    const codes=[]; for(const code of ['EX','EQ','TU']) if(new RegExp(`\\b${code}\\b`).test(text)) codes.push(code); return [...new Set(codes)];
  }

  function parseAccountChunk(chunk) {
    const lines=chunk.trim().split(/\n/).map(l=>l.trim()).filter(Boolean); if(lines.length<4)return null;
    const status=lines.slice(3).join(' '); const bureaus=bureauCodesFromStatus(status); if(!bureaus.length)return null;
    return { creditor:lines[0], accountNumber:lines[1], balance:lines[2], status, bureaus };
  }

  function parseAccounts(text) {
    const raw=String(text||'').replace(/\r/g,'').trim(); if(!raw)return [];
    let chunks=raw.split(/\n\s*\n+/).map(c=>c.trim()).filter(Boolean);
    if(chunks.length===1){const lines=normalizeLines(raw); if(lines.length%4===0)chunks=[]; for(let i=0;i<lines.length;i+=4)chunks.push(lines.slice(i,i+4).join('\n'));}
    return chunks.map(parseAccountChunk).filter(Boolean);
  }

  function populateConsumerFields(showSuccess=true) {
    const parsed=parseConsumerInfo(document.getElementById('templatesParserInput')?.value||'');
    document.getElementById('templatesName').value=parsed.name; document.getElementById('templatesAddress').value=parsed.address; document.getElementById('templatesDob').value=parsed.dob; document.getElementById('templatesSsn').value=parsed.ssn;
    const found=Object.values(parsed).filter(Boolean).length; const status=document.getElementById('templatesParseStatus');
    if(status)status.textContent=found===4?'Information parsed successfully.':`Parsed ${found} of 4 consumer fields.`;
    if(showSuccess && found===4)showToast('Consumer information parsed successfully.','success'); else if(showSuccess)showToast(`Parsed ${found} of 4 consumer fields.`,'info');
    return parsed;
  }

  function updateAccountsSummary(accounts) {
    const status=document.getElementById('templatesAccountsStatus'); const summary=document.getElementById('templatesAccountsSummary');
    if(status)status.textContent=accounts.length?`${accounts.length} account${accounts.length===1?'':'s'} parsed.`:'No valid accounts were found.';
    if(summary){summary.hidden=!accounts.length;summary.textContent=accounts.map(a=>`${a.creditor} — ${a.bureaus.map(b=>BUREAUS[b]).join(', ')}`).join('\n');}
  }

  function buildLetterData(account,bureau,consumer,templateKey) {
    const t=TEMPLATES[templateKey]||TEMPLATES.late_payments; return {id:crypto.randomUUID(),account,bureau,consumer,templateKey,template:t};
  }

  function formatDisplayDate(dateInput) { if(!dateInput)return ''; const [y,m,d]=dateInput.split('-'); return y&&m&&d?`${m}/${d}/${y}`:dateInput; }

  function buildLetterHtml(letter,forPdf=false) {
    const c=letter.consumer,a=letter.account,t=letter.template;
    const date=new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
    const body=t.paragraphs.map(p=>`<p>${escapeHtml(p)}</p>`).join('');
    const addressBlock=`<div class="letter-line">${escapeHtml(c.name)}</div><div class="letter-line">${escapeHtml(c.address)}</div><div class="letter-line">${escapeHtml(formatDisplayDate(c.dob))}</div>`;
    return `<div style="box-sizing:border-box;width:100%;min-height:${forPdf?'10.5in':'auto'};padding:56px 60px;background:#fff;color:#111;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.6">
      <div style="font-size:13px;margin-bottom:26px">${escapeHtml(date)}</div>
      <div style="font-family:Arial,sans-serif;font-size:13px;margin-bottom:24px"><strong>${escapeHtml(letter.bureau)}</strong><br>Credit Reporting Dispute Department</div>
      ${addressBlock}
      <div class="letter-title">Re: ${escapeHtml(t.subject.replace('{{account}}',a.creditor))}</div>
      <p>Dear Credit Reporting Agency:</p>
      ${body}
      <div style="margin-top:18px;font-family:Arial,sans-serif;font-size:12px;line-height:1.5"><strong>Disputed account</strong><br>Creditor: ${escapeHtml(a.creditor)}<br>Account: ${escapeHtml(a.accountNumber)}<br>Balance: ${escapeHtml(a.balance)}<br>Reported status: ${escapeHtml(a.status)}</div>
      <p style="margin-top:22px">Please provide the results of your review and update the credit file as appropriate based on the evidence available to you.</p>
      <p>Sincerely,</p><p>${escapeHtml(c.name)}</p>
    </div>`;
  }

  function renderBoard() {
    const board=ensureBoard(); if(!board)return;
    const existing=board.querySelector('.generated-letter-groups'); if(existing)existing.remove();
    const container=document.createElement('div'); container.className='generated-letter-groups';
    if(!generatedGroups.length){container.innerHTML='<div class="generated-letters-empty">Generated bureau letters will appear here.</div>';board.appendChild(container);return;}
    generatedGroups.forEach(group=>{
      const section=document.createElement('section'); section.className='generated-letter-group';
      section.innerHTML=`<div class="generated-group-head"><div><div class="generated-group-title">${escapeHtml(group.account.creditor)}</div><div class="generated-group-meta">${escapeHtml(group.account.accountNumber)} · ${escapeHtml(group.account.balance)} · ${escapeHtml(group.account.status)}</div></div><div class="generated-group-meta">${group.letters.length} bureau letter${group.letters.length===1?'':'s'}</div></div><div class="generated-bureau-grid"></div>`;
      const grid=section.querySelector('.generated-bureau-grid');
      group.letters.forEach(letter=>{
        const card=document.createElement('article'); card.className='generated-letter-card'; card.dataset.letterId=letter.id;
        card.innerHTML=`<div class="generated-letter-top"><span class="generated-bureau">${escapeHtml(letter.bureau)}</span><span class="generated-template-chip">${escapeHtml(letter.template.label)}</span></div><div class="generated-letter-paper">${buildLetterHtml(letter,false).replace(/^<div[^>]*>|<\/div>$/g,'').replace(/<p>/g,'<div class="letter-line">').replace(/<\/p>/g,'</div>')}</div><div class="generated-card-actions"><button class="generated-remove-btn" type="button" data-action="remove">Remove</button><button class="generated-merge-btn" type="button" data-action="merge">Merge</button></div>`;
        card.querySelector('[data-action="merge"]').addEventListener('click',()=>mergeSingleLetter(letter));
        card.querySelector('[data-action="remove"]').addEventListener('click',()=>{const gi=generatedGroups.findIndex(g=>g.id===group.id);if(gi>=0){generatedGroups[gi].letters=generatedGroups[gi].letters.filter(l=>l.id!==letter.id);if(!generatedGroups[gi].letters.length)generatedGroups.splice(gi,1);renderBoard();}});
        grid.appendChild(card);
      });
      container.appendChild(section);
    });
    board.appendChild(container);
  }

  async function mergeSingleLetter(letter) {
    if(typeof window.html2pdf==='undefined'){showToast('PDF generator is not available.','error');return;}
    const wrapper=document.createElement('div'); wrapper.innerHTML=buildLetterHtml(letter,true); wrapper.style.position='fixed';wrapper.style.left='-100000px';wrapper.style.top='0';wrapper.style.width='8.27in';document.body.appendChild(wrapper);
    try{
      const safeCreditor=letter.account.creditor.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'')||'Letter';
      const filename=`${safeCreditor} - ${letter.bureau} - ${letter.template.label}.pdf`;
      const worker=html2pdf().set({margin:0,filename,image:{type:'jpeg',quality:.96},html2canvas:{scale:2,useCORS:true,backgroundColor:'#fff'},jsPDF:{unit:'in',format:'letter',orientation:'portrait'}}).from(wrapper.firstElementChild).toPdf();
      const pdf=await worker.get('pdf'); const blob=pdf.output('blob');
      if(typeof window.saveBlobToDisk==='function') await window.saveBlobToDisk(blob,filename); else {const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
      showToast(`${letter.bureau} letter saved.`,'success');
    }catch(error){console.error('Template letter export failed',error);showToast(`Could not create ${letter.bureau} letter.`,'error');}
    finally{wrapper.remove();}
  }

  function generateLetters() {
    let consumer=populateConsumerFields(false); if(!consumer.name||!consumer.address||!consumer.dob||!consumer.ssn){showToast('Please provide all consumer information before generating letters.','error');return;}
    const accounts=parseAccounts(document.getElementById('templatesAccountsInput')?.value||''); updateAccountsSummary(accounts);
    if(!accounts.length){showToast('No valid negative account blocks were found.','error');return;}
    const templateKey=document.getElementById('templatesTemplateSelect')?.value||'late_payments';
    generatedGroups.splice(0,generatedGroups.length);
    for(const account of accounts){const letters=account.bureaus.map(code=>buildLetterData(account,BUREAUS[code],consumer,templateKey));generatedGroups.push({id:crypto.randomUUID(),account,letters});}
    renderBoard(); close(); showToast(`${generatedGroups.reduce((n,g)=>n+g.letters.length,0)} bureau letters generated.`,'success');
    document.getElementById(BOARD_ID)?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function clearAll() {
    ['templatesParserInput','templatesAccountsInput','templatesName','templatesAddress','templatesDob','templatesSsn','templatesParseStatus','templatesAccountsStatus'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    const summary=document.getElementById('templatesAccountsSummary'); if(summary)summary.hidden=true; generatedGroups.splice(0,generatedGroups.length); renderBoard();
  }

  function open() { ensureStyles();ensureModal();ensureBoard();document.getElementById(MODAL_ID).classList.add('open');document.getElementById(MODAL_ID).setAttribute('aria-hidden','false');document.body.classList.add('modal-open');document.getElementById('templatesParserInput')?.focus(); }
  function close() { const modal=document.getElementById(MODAL_ID);if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open'); }

  function bind() {
    ensureStyles();ensureButton();ensureModal();ensureBoard();
    const select=document.getElementById('templatesTemplateSelect'); if(select&&!select.options.length) Object.entries(TEMPLATES).forEach(([value,t])=>select.appendChild(new Option(t.label,value)));
    document.getElementById(BUTTON_ID)?.addEventListener('click',e=>{e.preventDefault();open();});
    document.getElementById('templatesParseBtn')?.addEventListener('click',()=>populateConsumerFields(true));
    document.getElementById('templatesParserInput')?.addEventListener('paste',()=>setTimeout(()=>populateConsumerFields(true),0));
    document.getElementById('templatesParseAccountsBtn')?.addEventListener('click',()=>{const accounts=parseAccounts(document.getElementById('templatesAccountsInput')?.value||'');updateAccountsSummary(accounts);if(accounts.length)showToast(`${accounts.length} account${accounts.length===1?'':'s'} parsed successfully.`,'success');else showToast('No valid account blocks were found.','error');});
    document.getElementById('templatesGenerateBtn')?.addEventListener('click',generateLetters);
    document.getElementById('templatesClearBtn')?.addEventListener('click',clearAll);
    document.getElementById('templatesCloseBtn')?.addEventListener('click',close);
    document.getElementById(MODAL_ID)?.addEventListener('click',e=>{if(e.target===e.currentTarget)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById(MODAL_ID)?.classList.contains('open')){e.preventDefault();close();}});
  }

  window.TUBOLTemplates={parseConsumerInfo,parseAccounts,generateLetters};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
