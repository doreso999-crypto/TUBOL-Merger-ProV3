/* TUBOL — authorization letter generator. */
(() => {
  'use strict';

  const AUTH_TEMPLATE_ID = 'authorization-standard-v2';
  const AUTH_TEMPLATE = {
    id: AUTH_TEMPLATE_ID,
    name: 'Authorization Letter',
    text: [
      '{{BUREAU}}',
      '{{BUREAU_ADDRESS_LINE_1}}',
      '{{BUREAU_ADDRESS_LINE_2}}',
      '',
      'This is {{CLIENT_NAME}} and I authorize this dispute.',
      '',
      'Today is {{DATE}}.',
      '',
      'I am submitting this correspondence through a mailing service for document handling and delivery purposes. This letter serves as my authorization for you to receive and process this dispute on my behalf.',
      '',
      'This is not a third party agency or any other individual authorizing this dispute.',
      '',
      'Please do not delay, redirect, or decline processing for any such reason. Again, this is {{CLIENT_NAME}}',
      '',
      'I authorize this dispute.'
    ]
  };

  const BUREAU_ADDRESSES = {
    experian: ['Experian', 'P.O. Box 2002', 'Allen, TX 75013'],
    equifax: ['Equifax Information Services LLC', 'P.O. Box 740256', 'Atlanta, GA 30374-0256'],
    transunion: ['TransUnion Consumer Relations', 'P.O. Box 2000', 'Chester, PA 19016-2000']
  };

  function getEasternToday() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function formatAuthDate(value) {
    if (!value) return '';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${month}/${day}/${year}` : String(value);
  }

  function getTemplates() {
    return [AUTH_TEMPLATE];
  }

  function saveTemplates() {
    localStorage.setItem('pdfWorkspaceAuthTemplates', JSON.stringify([AUTH_TEMPLATE]));
  }

  function renderTemplateOptions() {
    const select = document.getElementById('letterTemplateSelect');
    if (!select) return;
    select.innerHTML = '';
    for (const template of getTemplates()) {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    }
    select.disabled = false;
    const deleteButton = document.getElementById('deleteSavedTemplateBtn');
    if (deleteButton) deleteButton.disabled = true;
  }

  function updateBureauAddress() {
    const target = document.getElementById('letterTemplateBureauAddress');
    if (!target) return;
    const bureau = document.getElementById('letterTemplateBureau')?.value || 'experian';
    const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.experian;
    target.innerHTML = `${escapeHtml(address[0])}<br>${escapeHtml(address[1])}<br>${escapeHtml(address[2])}`;
  }

  function openModal() {
    const modal = document.getElementById('letterTemplateModal');
    if (!modal) return;
    saveTemplates();
    renderTemplateOptions();
    const date = document.getElementById('letterTemplateDate');
    if (date && !date.value) date.value = getEasternToday();
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
    document.body.classList.remove('modal-open');
  }

  function updateTemplateDeleteState() {
    const button = document.getElementById('deleteSavedTemplateBtn');
    if (button) button.disabled = true;
  }

  function getSelectedTemplate() {
    const selectedId = document.getElementById('letterTemplateSelect')?.value;
    return getTemplates().find(template => template.id === selectedId) || AUTH_TEMPLATE;
  }

  function buildAuthorizationText() {
    const clientName = document.getElementById('letterTemplateClientName')?.value?.trim() || '';
    const date = formatAuthDate(document.getElementById('letterTemplateDate')?.value || '');
    const bureau = document.getElementById('letterTemplateBureau')?.value || 'experian';
    const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.experian;
    return getSelectedTemplate().text.map(line => line
      .replaceAll('{{CLIENT_NAME}}', clientName)
      .replaceAll('{{DATE}}', date)
      .replaceAll('{{BUREAU}}', address[0])
      .replaceAll('{{BUREAU_ADDRESS_LINE_1}}', address[1])
      .replaceAll('{{BUREAU_ADDRESS_LINE_2}}', address[2])
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function wrapText(text, font, size, maxWidth) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawMixedLine(page, parts, x, y, regularFont, boldFont, size) {
    let cursorX = x;
    for (const part of parts) {
      const font = part.bold ? boldFont : regularFont;
      page.drawText(part.text, { x: cursorX, y, size, font, color: PDFLib.rgb(0, 0, 0) });
      cursorX += font.widthOfTextAtSize(part.text, size);
    }
  }

  async function createAuthorizationPdfBlob() {
    if (!window.PDFLib) throw new Error('Authorization PDF engine unavailable.');

    const pdfDoc = await PDFLib.PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const regularFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

    const clientName = document.getElementById('letterTemplateClientName')?.value?.trim() || '';
    const date = formatAuthDate(document.getElementById('letterTemplateDate')?.value || '');
    const bureau = document.getElementById('letterTemplateBureau')?.value || 'experian';
    const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.experian;

    const left = 72;
    const maxWidth = 468;
    const size = 12;
    const lineHeight = 19;
    let y = 720;

    page.drawText(address[0], { x: left, y, size, font: regularFont, color: PDFLib.rgb(0, 0, 0) });
    y -= lineHeight;
    page.drawText(address[1], { x: left, y, size, font: regularFont, color: PDFLib.rgb(0, 0, 0) });
    y -= lineHeight;
    page.drawText(address[2], { x: left, y, size, font: regularFont, color: PDFLib.rgb(0, 0, 0) });
    y -= 38;

    drawMixedLine(page, [
      { text: 'This is ', bold: false },
      { text: clientName, bold: true },
      { text: ' and I authorize this dispute.', bold: false }
    ], left, y, regularFont, boldFont, size);
    y -= 38;

    drawMixedLine(page, [
      { text: 'Today is ', bold: false },
      { text: date, bold: true },
      { text: '.', bold: false }
    ], left, y, regularFont, boldFont, size);
    y -= 38;

    const paragraphs = [
      'I am submitting this correspondence through a mailing service for document handling and delivery purposes. This letter serves as my authorization for you to receive and process this dispute on my behalf.',
      'This is not a third party agency or any other individual authorizing this dispute.'
    ];

    for (const paragraph of paragraphs) {
      for (const line of wrapText(paragraph, regularFont, size, maxWidth)) {
        page.drawText(line, { x: left, y, size, font: regularFont, color: PDFLib.rgb(0, 0, 0) });
        y -= lineHeight;
      }
      y -= 19;
    }

    const finalParagraph = `Please do not delay, redirect, or decline processing for any such reason. Again, this is ${clientName}`;
    for (const line of wrapText(finalParagraph, regularFont, size, maxWidth)) {
      if (clientName && line.endsWith(clientName)) {
        const regularPart = line.slice(0, -clientName.length);
        drawMixedLine(page, [
          { text: regularPart, bold: false },
          { text: clientName, bold: true }
        ], left, y, regularFont, boldFont, size);
      } else {
        page.drawText(line, { x: left, y, size, font: regularFont, color: PDFLib.rgb(0, 0, 0) });
      }
      y -= lineHeight;
    }
    y -= 19;
    page.drawText('I authorize this dispute.', { x: left, y, size, font: regularFont, color: PDFLib.rgb(0, 0, 0) });

    const bytes = await pdfDoc.save();
    return new Blob([bytes], { type: 'application/pdf' });
  }

  async function addAuthorizationToPacket() {
    const blob = await createAuthorizationPdfBlob();
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // Replace any previous authorization entry instead of stacking duplicates.
    state.pages = state.pages.filter(page => page.fileName !== 'AUTHORIZATION.pdf');
    state.pages.push({
      id: crypto.randomUUID(),
      pdfBytes: bytes,
      sourceIndex: 0,
      fileName: 'AUTHORIZATION.pdf',
      rotation: 0
    });

    await renderPageBoard();
    toast('Authorization added to packet', 'success');
  }

  function deleteSelectedTemplate() {
    renderTemplateOptions();
  }

  function setup() {
    saveTemplates();
    const button = document.getElementById('openAuthorizationFromMergeBtn');
    if (button && button.dataset.bound !== 'true') {
      button.dataset.bound = 'true';
      button.addEventListener('click', openModal);
    }
    document.getElementById('letterTemplateCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('letterTemplateCancelBtn')?.addEventListener('click', closeModal);
    document.getElementById('letterTemplateApplyBtn')?.addEventListener('click', async () => {
      const apply = document.getElementById('letterTemplateApplyBtn');
      if (apply) apply.disabled = true;
      try {
        await addAuthorizationToPacket();
        closeModal();
      } catch (error) {
        console.error('Authorization insertion failed.', error);
        toast(error?.message || 'Could not add authorization to packet', 'error');
      } finally {
        if (apply) apply.disabled = false;
      }
    });
    document.getElementById('letterTemplateBureau')?.addEventListener('change', updateBureauAddress);
    document.getElementById('letterTemplateSelect')?.addEventListener('change', updateTemplateDeleteState);
    document.getElementById('deleteSavedTemplateBtn')?.addEventListener('click', deleteSelectedTemplate);
    document.getElementById('letterTemplateModal')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeModal();
    });
  }

  Object.assign(window, {
    AUTH_TEMPLATE,
    DEFAULT_AUTH_TEMPLATE: AUTH_TEMPLATE,
    AUTH_BUREAUS: BUREAU_ADDRESSES,
    getAuthTemplates: getTemplates,
    saveAuthTemplates: saveTemplates,
    getEasternToday,
    formatAuthDate,
    renderLetterTemplateOptions: renderTemplateOptions,
    updateLetterTemplateModalAddress: updateBureauAddress,
    openLetterTemplateModal: openModal,
    closeLetterTemplateModal: closeModal,
    buildAuthorizationHtml: buildAuthorizationText,
    createAuthorizationPdfBlob,
    addAuthorizationToPacket
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
