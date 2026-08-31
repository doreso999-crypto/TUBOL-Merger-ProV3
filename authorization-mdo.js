/* TUBOL — M&O Authorization only. No dependency on the retired Letter Editor. */
(() => {
  'use strict';

  const AUTH_BUREAUS = {
    experian: { name: 'Experian', address: 'Experian\nP.O. Box 2002\nAllen, TX 75013' },
    equifax: { name: 'Equifax Information Services LLC', address: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374' },
    transunion: { name: 'TransUnion Consumer Solutions', address: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000' },
  };

  const DEFAULT_AUTH_TEMPLATE = {
    id: 'authorization-default',
    name: 'Authorization Dispute',
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.5">
{{BUREAU_ADDRESS_HTML}}<br><br>
This is <strong>{{CLIENT_NAME}}</strong> and I authorize this dispute.<br><br>
Today is {{DATE}}.<br><br>
I am mailing this through a mailing company as I can't physically go into postal office due to health issues. This is my authorization for you to process this dispute.<br><br>
This is not a third party agency or anyone else authorizing this dispute.<br><br>
Please do not deflect or not process my dispute for any such reason.<br>
Again, this is <strong>{{CLIENT_NAME}}</strong><br><br>
I authorize this dispute.
</div>`
  };

  const esc = value => String(value ?? '').replace(/[&<>'\"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));

  function isUsableTemplate(template) {
    return !!template && (typeof template.html === 'string' && template.html.trim().length > 0 || typeof template.content === 'string' && template.content.trim().length > 0);
  }

  function normalizeTemplate(template) {
    if (template?.id === DEFAULT_AUTH_TEMPLATE.id || !isUsableTemplate(template)) return DEFAULT_AUTH_TEMPLATE;
    return template;
  }

  function getTemplates() {
    try {
      const stored = JSON.parse(localStorage.getItem('pdfWorkspaceAuthTemplates') || 'null');
      if (Array.isArray(stored) && stored.length) {
        const normalized = stored.map(normalizeTemplate);
        const hasDefault = normalized.some(item => item.id === DEFAULT_AUTH_TEMPLATE.id);
        const result = hasDefault ? normalized : [DEFAULT_AUTH_TEMPLATE, ...normalized];
        saveTemplates(result);
        return result;
      }
    } catch (error) {
      console.warn('Authorization template storage could not be read.', error);
    }
    const seeded = [DEFAULT_AUTH_TEMPLATE];
    saveTemplates(seeded);
    return seeded;
  }

  function saveTemplates(list) {
    localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify(list));
  }

  function getEasternToday() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function formatAuthDate(value) {
    if (!value) return '';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${month}/${day}/${year}` : String(value);
  }

  function renderTemplateOptions() {
    const select = document.getElementById('letterTemplateSelect');
    if (!select) return;
    select.innerHTML = '';
    getTemplates().forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    });
    updateTemplateDeleteState();
  }

  function updateBureauAddress() {
    const key = document.getElementById('letterTemplateBureau')?.value || 'equifax';
    const bureau = AUTH_BUREAUS[key] || AUTH_BUREAUS.equifax;
    const target = document.getElementById('letterTemplateBureauAddress');
    if (target) target.textContent = bureau.address.replace(/\n/g, ' • ');
  }

  function openModal() {
    const modal = document.getElementById('letterTemplateModal');
    if (!modal) return;
    renderTemplateOptions();
    const date = document.getElementById('letterTemplateDate');
    const bureau = document.getElementById('letterTemplateBureau');
    if (date && !date.value) date.value = getEasternToday();
    if (bureau && !bureau.value) bureau.value = 'equifax';
    updateBureauAddress();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    const modal = document.getElementById('letterTemplateModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.getElementById('saveExportModal')?.classList.contains('open')) document.body.classList.remove('modal-open');
  }

  function updateTemplateDeleteState() {
    const button = document.getElementById('deleteSavedTemplateBtn');
    const id = document.getElementById('letterTemplateSelect')?.value;
    if (button) button.disabled = !id || id === 'authorization-default';
  }

  function buildAuthorizationHtml() {
    const id = document.getElementById('letterTemplateSelect')?.value;
    const templates = getTemplates();
    const selected = templates.find(item => item.id === id);
    const template = selected?.id === DEFAULT_AUTH_TEMPLATE.id || !isUsableTemplate(selected) ? DEFAULT_AUTH_TEMPLATE : selected;
    const name = (document.getElementById('letterTemplateClientName')?.value || '').trim() || 'Your Name';
    const date = formatAuthDate(document.getElementById('letterTemplateDate')?.value || getEasternToday());
    const bureau = AUTH_BUREAUS[document.getElementById('letterTemplateBureau')?.value] || AUTH_BUREAUS.equifax;
    const bureauAddressHtml = bureau.address.split('\n').map(esc).join('<br>');
    const templateHtml = isUsableTemplate(template) && typeof template.html === 'string'
      ? template.html
      : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.35">${esc(template.content || DEFAULT_AUTH_TEMPLATE.html).replace(/\n/g, '<br>')}</div>`;

    return templateHtml
      .replaceAll('{{CLIENT_NAME}}', esc(name))
      .replaceAll('{{DATE}}', esc(date))
      .replaceAll('{{BUREAU_NAME}}', esc(bureau.name))
      .replaceAll('{{BUREAU_ADDRESS_HTML}}', bureauAddressHtml)
      .replaceAll('{{BUREAU_ADDRESS}}', bureauAddressHtml);
  }

  function htmlToPlainText(html) {
    const container = document.createElement('div');
    container.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p\s*>/gi, '\n').replace(/<\/div\s*>/gi, '\n');
    return (container.textContent || '').replace(/\u00a0/g, ' ').replace(/\r/g, '').trim();
  }

  function normalizePdfText(text) {
    return String(text || '')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2013/g, '-')
      .replace(/\u2014/g, '--')
      .replace(/\u2026/g, '...');
  }

  function wrapPdfLine(text, font, fontSize, maxWidth) {
    const words = normalizePdfText(text).split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = word;
      if (font.widthOfTextAtSize(current, fontSize) > maxWidth) {
        let chunk = '';
        for (const ch of current) {
          const next = chunk + ch;
          if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) chunk = next;
          else { if (chunk) lines.push(chunk); chunk = ch; }
        }
        current = chunk;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  async function createAuthorizationPdfBlob() {
    if (!window.PDFLib?.PDFDocument) throw new Error('PDF engine unavailable.');
    const pdf = await PDFLib.PDFDocument.create();
    const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 72;
    const fontSize = 15;
    const lineHeight = 22;
    const maxWidth = pageWidth - (margin * 2);
    const pageText = htmlToPlainText(buildAuthorizationHtml());
    const paragraphs = pageText.split(/\n+/);
    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const paragraph of paragraphs) {
      const lines = wrapPdfLine(paragraph, font, fontSize, maxWidth);
      for (const line of lines) {
        if (y < margin + lineHeight) {
          page = pdf.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(line, { x: margin, y, size: fontSize, font });
        y -= lineHeight;
      }
      y -= lineHeight * 0.35;
    }

    const bytes = await pdf.save({ useObjectStreams:true, addDefaultPage:false });
    return new Blob([bytes], { type:'application/pdf' });
  }

  async function addAuthorizationToPacket() {
    const blob = await createAuthorizationPdfBlob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const entries = Array.from({ length:pdf.getPageCount() }, (_, index) => ({
      id:crypto.randomUUID(), pdfBytes:bytes, sourceIndex:index, fileName:'AUTHORIZATION.pdf', rotation:0
    }));
    const existing = state.pages.findIndex(page => page.fileName === 'AUTHORIZATION.pdf');
    state.pages.splice(existing >= 0 ? existing + 1 : state.pages.length, 0, ...entries);
    await renderPageBoard();
    toast('Authorization added to packet', 'success');
  }

  function deleteSelectedTemplate() {
    const id = document.getElementById('letterTemplateSelect')?.value;
    if (!id || id === 'authorization-default') return;
    const template = getTemplates().find(item => item.id === id);
    if (!template) return;
    if (!window.confirm(`Delete “${template.name}”?`)) return;
    saveTemplates(getTemplates().filter(item => item.id !== id));
    renderTemplateOptions();
  }

  function setup() {
    const mergeView = document.getElementById('mergeView');
    const actions = mergeView?.querySelector('.header-actions');
    if (!actions) return;

    let button = document.getElementById('openAuthorizationFromMergeBtn');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'openAuthorizationFromMergeBtn';
      button.className = 'btn btn-secondary';
      button.textContent = '＋ Authorization';
      button.title = 'Add Authorization to Packet';
      const compress = document.getElementById('compressPacketBtn');
      actions.insertBefore(button, compress || actions.firstChild);
    }
    if (button.dataset.bound !== 'true') {
      button.dataset.bound = 'true';
      button.addEventListener('click', openModal);
    }

    document.getElementById('letterTemplateCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('letterTemplateCancelBtn')?.addEventListener('click', closeModal);
    document.getElementById('letterTemplateApplyBtn')?.addEventListener('click', async () => {
      const apply = document.getElementById('letterTemplateApplyBtn');
      if (apply) apply.disabled = true;
      try { await addAuthorizationToPacket(); closeModal(); }
      catch (error) { console.error('M&O Authorization insertion failed.', error); toast(error?.message || 'Could not add authorization to packet', 'error'); }
      finally { if (apply) apply.disabled = false; }
    });
    document.getElementById('letterTemplateBureau')?.addEventListener('change', updateBureauAddress);
    document.getElementById('letterTemplateSelect')?.addEventListener('change', updateTemplateDeleteState);
    document.getElementById('deleteSavedTemplateBtn')?.addEventListener('click', deleteSelectedTemplate);
    document.getElementById('letterTemplateModal')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeModal();
    });
  }

  Object.assign(window, {
    AUTH_BUREAUS,
    DEFAULT_AUTH_TEMPLATE,
    getAuthTemplates:getTemplates,
    saveAuthTemplates:saveTemplates,
    getEasternToday,
    formatAuthDate,
    renderLetterTemplateOptions:renderTemplateOptions,
    updateLetterTemplateModalAddress:updateBureauAddress,
    openLetterTemplateModal:openModal,
    closeLetterTemplateModal:closeModal,
    buildAuthorizationHtml,
    createAuthorizationPdfBlob,
    addAuthorizationToPacket,
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once:true });
  else setup();
})();
