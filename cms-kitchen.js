/* Kitchen tickets must use the same published product IDs and prices as guests. */
(async () => {
  'use strict';
  try {
    if (window.HS_CMS_READY) await window.HS_CMS_READY;
    if (window.HS_CONTENT_UNAVAILABLE) {
      const message = document.getElementById('hs-login-message');
      if (message) message.textContent = 'Kitchen paused: a valid published menu could not be loaded. Check CMS configuration and network before accepting orders.';
      const submit = document.getElementById('hs-login-submit');
      if (submit) submit.disabled = true;
      const pill = document.getElementById('hs-live-indicator');
      if (pill) pill.textContent = '● Menu unavailable · No orders';
      return;
    }
    const script = document.createElement('script');
    script.src = 'admin.js';
    script.onerror = () => {
      const message = document.getElementById('hs-login-message');
      if (message) message.textContent='Could not load the kitchen order interface. Do not accept orders until this is fixed.';
    };
    document.body.append(script);
  } catch (error) {
    const message=document.getElementById('hs-login-message');
    if(message) message.textContent=`Kitchen cannot load published menu: ${error.message}`;
  }
})();
