/* Authorization Letter workspace UI.
   Keeps the existing editor/template engine while making the M&O authorization
   action a direct packet insertion workflow. */
(() => {
  function setupAuthorizationUI() {
    const mergeView = document.getElementById('mergeView');
    const letterView = document.getElementById('letterView');
    const mergeActions = mergeView?.querySelector('.header-actions');
    const letterNav = document.querySelector('[data-view="letterView"]');

    if (letterNav) {
      letterNav.title = 'Authorization Letter';
      const label = letterNav.querySelector('.nav-label');
      if (label) label.textContent = 'Authorization Letter';
    }

    if (letterView) {
      const eyebrow = letterView.querySelector('.view-header .eyebrow');
      const title = letterView.querySelector('.view-header h1');
      const header = letterView.querySelector('.view-header > div:first-child');
      const subtext = letterView.querySelector('.view-header > div:first-child .subtext');
      if (eyebrow) eyebrow.textContent = 'AUTHORIZATION LETTER';
      if (title) title.textContent = 'Authorization Letter';
      if (header && !subtext) {
        const p = document.createElement('p');
        p.className = 'subtext';
        p.textContent = 'Create, customize, save, and add your authorization letter to the PDF packet.';
        header.appendChild(p);
      }

      const useTemplate = document.getElementById('openLetterTemplateBtn');
      const saveTemplate = document.getElementById('saveLetterTemplateBtn');
      const insertLetter = document.getElementById('insertLetterBtn');
      const downloadLetter = document.getElementById('downloadLetterBtn');
      if (useTemplate) useTemplate.textContent = 'Use Authorization Template';
      if (saveTemplate) saveTemplate.textContent = 'Save Authorization Template';
      if (insertLetter) insertLetter.textContent = '＋ Add Authorization to Packet';
      if (downloadLetter) downloadLetter.textContent = 'Download Authorization PDF';

      const page = document.getElementById('letterEditor');
      if (page && !page.dataset.authorizationPromptSet) {
        page.dataset.authorizationPromptSet = 'true';
        if (!page.innerHTML.trim() || /Write your letter here/i.test(page.textContent)) {
          page.innerHTML = '<p style="text-align:right">[Date]</p>' +
            '<p><strong>To Whom It May Concern:</strong></p>' +
            '<p>This letter confirms that <strong>[Consumer Name]</strong> authorizes the processing of the accompanying dispute and related documents.</p>' +
            '<p>I authorize this dispute to be processed on my behalf. Please process the enclosed materials according to your standard dispute procedures.</p>' +
            '<p>Sincerely,</p><p>[Consumer Name]</p>';
        }
      }
    }

    if (mergeActions && !document.getElementById('openAuthorizationFromMergeBtn')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.id = 'openAuthorizationFromMergeBtn';
      button.title = 'Add Authorization to Packet';
      button.textContent = '＋ Authorization';
      const compress = document.getElementById('compressPacketBtn');
      mergeActions.insertBefore(button, compress || mergeActions.lastElementChild);

      button.addEventListener('click', () => {
        window.authorizationTemplateReturnToLetter = false;
        window.authorizationAddDirectlyToPacket = true;
        if (typeof window.openLetterTemplateModal === 'function') {
          window.openLetterTemplateModal();
        }
      });
    }

    const templateApply = document.getElementById('letterTemplateApplyBtn');
    if (templateApply && !templateApply.dataset.authorizationPacketHook) {
      templateApply.dataset.authorizationPacketHook = 'true';
      templateApply.addEventListener('click', async () => {
        if (!window.authorizationAddDirectlyToPacket) return;
        window.authorizationAddDirectlyToPacket = false;

        // The core template handler runs first and populates/saves the editor.
        // Reuse the existing PDF creation/insertion pipeline, but remain in M&O.
        setTimeout(async () => {
          try {
            if (typeof window.insertLetterIntoPacket !== 'function') {
              throw new Error('Authorization packet insertion is unavailable.');
            }
            await window.insertLetterIntoPacket();
          } catch (err) {
            console.error('Direct authorization packet insertion failed', err);
            if (typeof window.toast === 'function') window.toast('Could not add authorization to packet', 'error');
          }
        }, 0);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuthorizationUI, { once: true });
  } else {
    setupAuthorizationUI();
  }
})();
