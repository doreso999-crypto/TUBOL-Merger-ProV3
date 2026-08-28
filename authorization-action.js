/* M&O Authorization action.
   This file owns only the + Authorization workflow in Merge & Organize.
   It intentionally does not depend on the removed Authorization Letter editor UI.
*/
(() => {
  'use strict';

  function setupAuthorizationAction() {
    const mergeView = document.getElementById('mergeView');
    const mergeActions = mergeView?.querySelector('.header-actions');
    const templateApply = document.getElementById('letterTemplateApplyBtn');

    if (!mergeActions || !templateApply) return;

    let button = document.getElementById('openAuthorizationFromMergeBtn');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-secondary';
      button.id = 'openAuthorizationFromMergeBtn';
      button.title = 'Add Authorization to Packet';
      button.textContent = '＋ Authorization';

      const compress = document.getElementById('compressPacketBtn');
      mergeActions.insertBefore(button, compress || mergeActions.lastElementChild);
    }

    if (button.dataset.authorizationActionBound === 'true') return;
    button.dataset.authorizationActionBound = 'true';

    button.addEventListener('click', () => {
      window.authorizationAddDirectlyToPacket = true;
      templateApply.textContent = 'Add Authorization to Packet';

      if (typeof window.openLetterTemplateModal === 'function') {
        window.openLetterTemplateModal();
      } else {
        console.error('Authorization template modal is unavailable.');
        if (typeof window.toast === 'function') {
          window.toast('Authorization template is unavailable', 'error');
        }
      }
    });

    if (templateApply.dataset.authorizationActionHookBound !== 'true') {
      templateApply.dataset.authorizationActionHookBound = 'true';

      templateApply.addEventListener('click', () => {
        if (!window.authorizationAddDirectlyToPacket) return;
        window.authorizationAddDirectlyToPacket = false;

        setTimeout(async () => {
          try {
            if (typeof window.insertLetterIntoPacket !== 'function') {
              throw new Error('Authorization packet insertion is unavailable.');
            }
            await window.insertLetterIntoPacket();
          } catch (err) {
            console.error('Authorization packet insertion failed', err);
            if (typeof window.toast === 'function') {
              window.toast('Could not add authorization to packet', 'error');
            }
          } finally {
            templateApply.textContent = 'Populate Letter';
          }
        }, 0);
      });
    }

    const resetAuthorizationAction = () => {
      window.authorizationAddDirectlyToPacket = false;
      templateApply.textContent = 'Populate Letter';
    };

    document.getElementById('letterTemplateCancelBtn')?.addEventListener('click', resetAuthorizationAction, { once: false });
    document.getElementById('letterTemplateCloseBtn')?.addEventListener('click', resetAuthorizationAction, { once: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuthorizationAction, { once: true });
  } else {
    setupAuthorizationAction();
  }
})();
