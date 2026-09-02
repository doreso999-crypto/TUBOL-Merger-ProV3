/* TUBOL Templates launcher. Includes consumer information parser for template fields. */
(() => {
  const STYLE_ID = 'templatesModalStyles';
  const MODAL_ID = 'templatesModal';
  const BUTTON_ID = 'templatesBtn';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .templates-modal { position: fixed; inset: 0; z-index: 10050; display: none; align-items: center; justify-content: center; padding: 24px; background: rgba(15, 23, 42, .46); backdrop-filter: blur(4px); }
      .templates-modal.open { display: flex; }
      .templates-card { width: min(760px, 100%); max-height: min(780px, calc(100vh - 48px)); overflow: auto; border: 1px solid var(--border-color, #d7dee8); border-radius: 18px; background: var(--surface, #fff); color: var(--text, #111827); box-shadow: 0 24px 70px rgba(15, 23, 42, .24); padding: 24px; }
      .templates-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
      .templates-title-wrap { min-width: 0; }
      .templates-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .12em; opacity: .68; margin-bottom: 6px; }
      .templates-card h2 { margin: 0; font-size: 24px; line-height: 1.2; }
      .templates-close { border: 0; background: transparent; color: inherit; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; font-size: 18px; }
      .templates-close:hover { background: rgba(127, 127, 127, .12); }
      .templates-section { margin-top: 18px; }
      .templates-section-title { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; opacity: .68; margin-bottom: 8px; }
      .templates-parser-textarea { width: 100%; min-height: 150px; resize: vertical; box-sizing: border-box; border: 1px solid var(--border-color, #cbd5e1); border-radius: 12px; background: transparent; color: inherit; padding: 12px 14px; font: inherit; line-height: 1.5; outline: none; }
      .templates-parser-textarea:focus { border-color: var(--accent, #2563eb); box-shadow: 0 0 0 3px rgba(37, 99, 235, .12); }
      .templates-parse-row { display: flex; justify-content: flex-end; margin-top: 10px; }
      .templates-parse-btn, .templates-done { border: 0; border-radius: 10px; padding: 10px 16px; font: inherit; font-weight: 700; cursor: pointer; background: var(--accent, #2563eb); color: #fff; }
      .templates-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .templates-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .templates-field.full { grid-column: 1 / -1; }
      .templates-field label { font-size: 12px; font-weight: 700; opacity: .78; }
      .templates-field input { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color, #cbd5e1); border-radius: 10px; background: transparent; color: inherit; padding: 10px 12px; font: inherit; outline: none; }
      .templates-field input:focus { border-color: var(--accent, #2563eb); box-shadow: 0 0 0 3px rgba(37, 99, 235, .12); }
      .templates-status { min-height: 18px; margin-top: 8px; font-size: 12px; opacity: .68; }
      .templates-footer { display: flex; justify-content: flex-end; margin-top: 20px; }
      @media (max-width: 640px) { .templates-fields { grid-template-columns: 1fr; } .templates-field.full { grid-column: auto; } }
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'templates-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="templates-card" role="dialog" aria-modal="true" aria-labelledby="templatesTitle">
        <div class="templates-header">
          <div class="templates-title-wrap">
            <div class="templates-eyebrow">WORKSPACE</div>
            <h2 id="templatesTitle">Templates</h2>
          </div>
          <button class="templates-close" id="templatesCloseBtn" type="button" title="Close Templates" aria-label="Close Templates">✕</button>
        </div>

        <div class="templates-section">
          <div class="templates-section-title">Paste consumer information</div>
          <textarea id="templatesParserInput" class="templates-parser-textarea" spellcheck="false" placeholder="Stephen Villard\n2616 Kings Gate Dr\nCarrollton TX 75006\nDOB: 06/26/1968\nSSN: 265-35-1689"></textarea>
          <div class="templates-parse-row">
            <button class="templates-parse-btn" id="templatesParseBtn" type="button">Parse Information</button>
          </div>
          <div id="templatesParseStatus" class="templates-status" aria-live="polite"></div>
        </div>

        <div class="templates-section">
          <div class="templates-section-title">Consumer fields</div>
          <div class="templates-fields">
            <div class="templates-field full">
              <label for="templatesName">Name</label>
              <input id="templatesName" type="text" autocomplete="off">
            </div>
            <div class="templates-field full">
              <label for="templatesAddress">Address</label>
              <input id="templatesAddress" type="text" autocomplete="off">
            </div>
            <div class="templates-field">
              <label for="templatesDob">Date of birth</label>
              <input id="templatesDob" type="date" autocomplete="off">
            </div>
            <div class="templates-field">
              <label for="templatesSsn">SSN</label>
              <input id="templatesSsn" type="text" inputmode="numeric" autocomplete="off" maxlength="11">
            </div>
          </div>
        </div>

        <div class="templates-footer">
          <button class="templates-done" id="templatesDoneBtn" type="button">Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function ensureButton() {
    if (document.getElementById(BUTTON_ID)) return;
    const actions = document.querySelector('.top-actions');
    if (!actions) return;
    const button = document.createElement('button');
    button.className = 'btn btn-ghost';
    button.id = BUTTON_ID;
    button.type = 'button';
    button.title = 'Open templates';
    button.innerHTML = '▤ <span class="btn-label">Templates</span>';
    actions.insertBefore(button, document.getElementById('settingsBtn') || null);
  }

  function normalizeLines(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }

  function parseDateToInput(dateText) {
    const match = String(dateText || '').trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (!match) return '';
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    return `${match[3]}-${month}-${day}`;
  }

  function parseConsumerInfo(text) {
    const lines = normalizeLines(text);
    const result = { name: '', address: '', dob: '', ssn: '' };
    if (!lines.length) return result;

    const dobIndex = lines.findIndex(line => /^dob\s*:/i.test(line) || /\bdob\b/i.test(line));
    const ssnIndex = lines.findIndex(line => /^ssn\s*:/i.test(line) || /\bssn\b/i.test(line));

    result.name = lines[0] || '';

    const addressEnd = [dobIndex, ssnIndex]
      .filter(index => index > 0)
      .reduce((min, index) => Math.min(min, index), lines.length);
    result.address = lines.slice(1, addressEnd).join(', ');

    if (dobIndex >= 0) {
      const dobMatch = lines[dobIndex].match(/(?:dob|date\s*of\s*birth)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i);
      if (dobMatch) result.dob = parseDateToInput(dobMatch[1]);
    }

    if (ssnIndex >= 0) {
      const ssnMatch = lines[ssnIndex].match(/(?:ssn|social\s*security(?:\s*number)?)\s*[:\-]?\s*([0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{4})/i);
      if (ssnMatch) result.ssn = ssnMatch[1].replace(/\s+/g, '-').replace(/^(\d{3})-(\d{2})-(\d{4})$/, '$1-$2-$3');
    }

    return result;
  }

  function populateFields() {
    const input = document.getElementById('templatesParserInput');
    const status = document.getElementById('templatesParseStatus');
    if (!input) return;

    const parsed = parseConsumerInfo(input.value);
    const name = document.getElementById('templatesName');
    const address = document.getElementById('templatesAddress');
    const dob = document.getElementById('templatesDob');
    const ssn = document.getElementById('templatesSsn');

    if (name) name.value = parsed.name;
    if (address) address.value = parsed.address;
    if (dob) dob.value = parsed.dob;
    if (ssn) ssn.value = parsed.ssn;

    const found = ['name', 'address', 'dob', 'ssn'].filter(key => parsed[key]).length;
    if (status) {
      status.textContent = found === 4
        ? 'Information parsed successfully.'
        : `Parsed ${found} of 4 fields. You can edit any field manually.`;
    }
  }

  function clearFields() {
    ['templatesParserInput', 'templatesName', 'templatesAddress', 'templatesDob', 'templatesSsn', 'templatesParseStatus']
      .forEach(id => { const element = document.getElementById(id); if (element) element.value = ''; });
  }

  function open() {
    ensureStyles();
    ensureModal();
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.getElementById('templatesParserInput')?.focus();
  }

  function close() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function bind() {
    ensureStyles();
    ensureButton();
    ensureModal();

    document.getElementById(BUTTON_ID)?.addEventListener('click', (event) => {
      event.preventDefault();
      open();
    });
    document.getElementById('templatesParseBtn')?.addEventListener('click', populateFields);
    document.getElementById('templatesParserInput')?.addEventListener('paste', () => {
      window.setTimeout(populateFields, 0);
    });
    document.getElementById('templatesCloseBtn')?.addEventListener('click', close);
    document.getElementById('templatesDoneBtn')?.addEventListener('click', close);
    document.getElementById(MODAL_ID)?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) close();
    });
    document.addEventListener('keydown', (event) => {
      const modal = document.getElementById(MODAL_ID);
      if (event.key === 'Escape' && modal?.classList.contains('open')) {
        event.preventDefault();
        close();
      }
    });
  }

  window.TUBOLTemplates = { parseConsumerInfo };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
