/* Hangover Shakes customer ordering. No order details are stored in a database. */
(() => {
  'use strict';
  if (!document.getElementById('full-menu-grid') || !Array.isArray(window.HANGOVER_MENU)) return;
  const cfg = window.HS_ORDER_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.publishableKey && window.supabase?.createClient);
  const currency = amount => '₹' + amount.toLocaleString('en-IN');
  const catalog = new Map();
  const cart = new Map();
  const cartKey = 'hangover-cart-v1';
  const maxQuantity = 20;
  let client, presence, ordersChannel, online = false, connected = false;
  let orderChannel, activeOrder = null, lastFocus = null, receiptTimer, sending = false;
  let toastTimer;
  const safe = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  window.HANGOVER_MENU.forEach((section, s) => section.items.forEach((item, i) => {
    const amounts = [...String(item[1]).matchAll(/₹\s*(\d+)/g)].map(m => Number(m[1]));
    if (!amounts.length || amounts.length > 2) return;
    const [base, description] = String(item[0]).split(' — ');
    const variants = description?.split(' / ').map(v => v.trim()) || [];
    amounts.forEach((price, v) => {
      if (!Number.isSafeInteger(price) || price < 1 || price > 10000) return;
      const label = amounts.length === 1 ? item[0] : `${base} · ${variants[v] || `Option ${v + 1}`}`;
      const id = `s${s}i${i}v${v}`;
      catalog.set(id, { id, label, category: section.category, price });
    });
  }));
  try {
    const stored = JSON.parse(localStorage.getItem(cartKey) || '{}');
    for (const [id, quantity] of Object.entries(stored)) {
      if (catalog.has(id) && Number.isInteger(quantity) && quantity > 0 && quantity <= maxQuantity) cart.set(id, quantity);
    }
  } catch (_) { /* Browser storage can be unavailable; ordering still works. */ }
  const saveCart = () => { try { localStorage.setItem(cartKey, JSON.stringify(Object.fromEntries(cart))); } catch (_) {} };
  const lines = () => [...cart].map(([id, quantity]) => ({ ...catalog.get(id), quantity })).filter(item => item.id && item.quantity);
  const total = () => lines().reduce((sum, item) => sum + item.price * item.quantity, 0);
  const quantity = () => [...cart.values()].reduce((sum, count) => sum + count, 0);

  /* Add buttons to the existing, already-approved menu rather than redesigning it. */
  const cards = document.querySelectorAll('#full-menu-grid .full-menu-card');
  cards.forEach((card, s) => {
    card.querySelectorAll('li').forEach((li, i) => {
      const options = [...catalog.values()].filter(item => item.id.startsWith(`s${s}i${i}v`));
      if (!options.length) return;
      const controls = document.createElement('div');
      controls.className = 'hs-menu-action';
      if (options.length > 1) {
        const select = document.createElement('select');
        select.setAttribute('aria-label', `Choose ${window.HANGOVER_MENU[s].items[i][0]} variant`);
        options.forEach(option => {
          const opt = document.createElement('option');
          opt.value = option.id;
          opt.textContent = `${option.label.split(' · ').at(-1)} · ${currency(option.price)}`;
          select.append(opt);
        });
        controls.append(select);
      }
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'hs-add';
      add.textContent = '+ Add to cart';
      add.dataset.product = options[0].id;
      add.addEventListener('click', () => {
        const id = controls.querySelector('select')?.value || add.dataset.product;
        if (!catalog.has(id)) return;
        cart.set(id, Math.min(maxQuantity, (cart.get(id) || 0) + 1));
        saveCart(); renderCart(); toast(`${catalog.get(id).label} added to cart`);
      });
      controls.append(add);
      li.append(controls);
    });
  });

  const header = document.querySelector('.header');
  const cartButton = document.createElement('button');
  cartButton.type = 'button';
  cartButton.className = 'hs-cart-launch';
  cartButton.innerHTML = '🛒 Cart <span class="hs-cart-count" id="hs-cart-count">0</span>';
  cartButton.setAttribute('aria-haspopup', 'dialog');
  cartButton.setAttribute('aria-controls', 'hs-cart-overlay');
  header?.append(cartButton);
  const nav = document.getElementById('navigation');
  const orderLink = document.createElement('a');
  orderLink.href = '#menu';
  orderLink.textContent = 'Order online';
  orderLink.addEventListener('click', () => document.getElementById('open-full-menu')?.click());
  nav?.prepend(orderLink);
  const quick = document.querySelector('.mobile-quick');
  if (quick) {
    const quickCart = document.createElement('button');
    quickCart.type = 'button';
    quickCart.textContent = '🛒 Cart';
    quickCart.addEventListener('click', openCart);
    quick.append(quickCart);
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div class="hs-overlay" id="hs-cart-overlay" aria-hidden="true">
      <section class="hs-drawer" role="dialog" aria-modal="true" aria-labelledby="hs-cart-title">
        <div class="hs-drawer-head"><div><p class="eyebrow">THE NEXT SCENE / YOUR ORDER</p><h2 id="hs-cart-title">YOUR <em>CART.</em></h2></div><button class="hs-x" id="hs-cart-close" type="button" aria-label="Close cart">×</button></div>
        <div id="hs-cart-items" class="hs-items"></div>
        <div id="hs-cart-totals" class="hs-totals" hidden></div>
        <form class="hs-checkout" id="hs-checkout" novalidate>
          <h3>Checkout · Pickup</h3>
          <label>Your name<input id="hs-name" name="name" autocomplete="name" maxlength="70" placeholder="Name for the order" required></label>
          <label>Mobile number<input id="hs-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit Indian mobile number" required></label>
          <label>Special instructions (optional)<textarea id="hs-notes" name="notes" rows="2" maxlength="300" placeholder="Less spice, no onions…"></textarea></label>
          <p class="hs-note">Pickup only · Pay at the café. No online payment or delivery is offered here. Menu availability and final bill are confirmed by staff.</p>
          <p class="hs-notice" id="hs-checkout-status" role="status" aria-live="polite"></p>
          <button type="submit" class="button" id="hs-place-order">Place pickup order ↗</button>
          <a id="hs-whatsapp-order" class="text-link" target="_blank" rel="noopener noreferrer" href="#" hidden>Send order on WhatsApp instead ↗</a>
        </form>
      </section>
    </div><div id="hs-order-status" class="hs-status-bar" hidden role="status" aria-live="polite"></div>
  `);
  const overlay = document.getElementById('hs-cart-overlay');
  const close = document.getElementById('hs-cart-close');
  const list = document.getElementById('hs-cart-items');
  const totals = document.getElementById('hs-cart-totals');
  const form = document.getElementById('hs-checkout');
  const status = document.getElementById('hs-checkout-status');
  const place = document.getElementById('hs-place-order');
  const whatsapp = document.getElementById('hs-whatsapp-order');
  const statusBar = document.getElementById('hs-order-status');

  function toast(message) {
    document.querySelector('.hs-toast')?.remove();
    const el = document.createElement('div');
    el.className = 'hs-toast'; el.setAttribute('role', 'status'); el.textContent = message;
    document.body.append(el);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.remove(), 2800);
  }
  function openCart() {
    if (window.closeFullMenu) window.closeFullMenu();
    if (window.closeOffers) window.closeOffers();
    lastFocus = document.activeElement;
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; renderCart(); close.focus();
  }
  function closeCart() {
    overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }
  cartButton.addEventListener('click', openCart);
  close.addEventListener('click', closeCart);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeCart(); });
  document.addEventListener('keydown', event => {
    if (!overlay.classList.contains('open')) return;
    if (event.key === 'Escape' && !sending) { closeCart(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...overlay.querySelectorAll('button:not(:disabled),a:not([hidden]),input,textarea,select')].filter(el => !el.closest('[hidden]'));
    if (!focusable.length) return;
    if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
    if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
  });

  function whatsappDraft() {
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const notes = form.elements.notes.value.trim();
    const summary = lines().map(item => `${item.quantity} × ${item.label} — ${currency(item.price * item.quantity)}`).join('\n');
    return `https://wa.me/919791851906?text=${encodeURIComponent(['Hangover Shakes pickup order (not yet confirmed)',`Name: ${name || '[your name]'}`,`Phone: ${phone || '[your number]'}`,summary,`Menu subtotal: ${currency(total())}`,notes ? `Notes: ${notes}` : '', 'Please confirm availability, final bill and pickup time.'].filter(Boolean).join('\n'))}`;
  }
  function syncCheckout() {
    const hasItems = quantity() > 0;
    const canSubmit = hasItems && connected && online && !sending && !activeOrder?.uncertain;
    place.disabled = !canSubmit;
    place.textContent = sending ? 'Sending to café…' : 'Place pickup order ↗';
    whatsapp.hidden = !hasItems;
    if (hasItems) whatsapp.href = whatsappDraft();
    if (activeOrder?.uncertain) status.textContent = 'Delivery could not be confirmed. Please call the café before trying again; your order might have arrived.';
    else if (!configured) status.textContent = 'Live ordering is not configured yet. Nothing can be placed online. Use WhatsApp and tap Send to contact the café.';
    else if (!connected) status.textContent = 'Connecting to the café… Online ordering is unavailable until connected. WhatsApp is an alternative.';
    else if (!online) status.textContent = 'The café order screen is offline. No order has been placed. Please use WhatsApp or call.';
    else status.textContent = 'Café order screen online. Your order will be submitted only after staff receipt is confirmed.';
  }
  function renderCart() {
    document.getElementById('hs-cart-count').textContent = quantity();
    if (!quantity()) {
      list.innerHTML = '<div class="hs-empty">🍟 The gang is waiting.<br><strong>Your cart is empty.</strong><br>Open the full menu and add something delicious.</div>';
      totals.hidden = true;
    } else {
      list.innerHTML = lines().map(item => `<div class="hs-line"><div><h3>${safe(item.label)}</h3><small>${safe(item.category)} · ${currency(item.price)} each</small></div><strong>${currency(item.price * item.quantity)}</strong><div class="hs-quantity"><button type="button" data-qty="-1" data-id="${item.id}" aria-label="Remove one ${safe(item.label)}">−</button><strong>${item.quantity}</strong><button type="button" data-qty="1" data-id="${item.id}" aria-label="Add one ${safe(item.label)}">+</button><button class="hs-remove" type="button" data-remove="${item.id}">Remove</button></div></div>`).join('');
      totals.hidden = false;
      totals.innerHTML = `<p><span>${quantity()} item${quantity() === 1 ? '' : 's'}</span><strong>${currency(total())}</strong></p><p><span>Menu subtotal</span><strong>${currency(total())}</strong></p>`;
    }
    syncCheckout();
  }
  list.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || sending || activeOrder?.uncertain) return;
    const id = button.dataset.remove || button.dataset.id;
    if (!catalog.has(id)) return;
    if (button.dataset.remove) cart.delete(id);
    else {
      const next = (cart.get(id) || 0) + Number(button.dataset.qty);
      if (next < 1) cart.delete(id); else cart.set(id, Math.min(maxQuantity, next));
    }
    saveCart(); renderCart();
  });
  form.addEventListener('input', () => { if (!whatsapp.hidden) whatsapp.href = whatsappDraft(); });
  whatsapp.addEventListener('click', event => {
    if (!quantity()) { event.preventDefault(); return; }
    status.textContent = 'WhatsApp is opening. You must review and tap Send; this website cannot confirm WhatsApp delivery.';
  });

  function ownerOnline() {
    if (!presence) return false;
    return Object.values(presence.presenceState()).flat().some(entry => entry.role === 'owner');
  }
  const waitForJoin = channel => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Connection timed out')), 10000);
    channel.subscribe((state, error) => {
      if (state === 'SUBSCRIBED') { clearTimeout(timeout); resolve(channel); }
      if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') { clearTimeout(timeout); reject(error || Error(state)); }
    });
  });
  function onStatus(message) {
    const data = message.payload || {};
    if (!activeOrder || data.id !== activeOrder.id) return;
    const allowed = ['received','confirmed','preparing','ready','completed','rejected'];
    if (!allowed.includes(data.status)) return;
    if (data.status === 'received' && !activeOrder.received) {
      activeOrder.received = true;
      clearTimeout(receiptTimer);
      cart.clear(); saveCart(); renderCart();
      closeCart(); toast(`Order #${activeOrder.id.slice(0, 8).toUpperCase()} delivered to the café!`);
    }
    const label = {received:'received by café',confirmed:'confirmed',preparing:'being prepared',ready:'READY for pickup',completed:'completed',rejected:'declined — please contact café'}[data.status];
    statusBar.hidden = false;
    statusBar.textContent = `Order #${activeOrder.id.slice(0, 8).toUpperCase()}: ${label}`;
    if (data.status === 'ready') toast('Your order is ready for pickup! 🎉');
  }
  async function connect() {
    if (!configured) { renderCart(); return; }
    try {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
      presence = client.channel(cfg.presenceTopic, { config: { private: true } });
      presence.on('presence', {event: 'sync'}, () => { online = ownerOnline(); syncCheckout(); });
      await waitForJoin(presence);
      ordersChannel = client.channel(cfg.ordersTopic, { config: { private: true, broadcast: { ack: true } } });
      await waitForJoin(ordersChannel);
      connected = true; online = ownerOnline(); syncCheckout();
      ordersChannel.on('system', {}, () => {});
    } catch (error) {
      connected = false; online = false; syncCheckout();
      console.warn('Hangover live ordering connection unavailable:', error.message);
    }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !quantity() || !configured || !connected || !online || activeOrder?.uncertain) return;
    if (!form.reportValidity()) return;
    const name = String(form.elements.name.value).trim();
    const phone = String(form.elements.phone.value).trim();
    const notes = String(form.elements.notes.value).trim();
    if (!name || !/^[6-9]\d{9}$/.test(phone)) { status.textContent = 'Enter your name and a valid 10-digit Indian mobile number.'; return; }
    const items = lines().map(item => ({id:item.id, quantity:item.quantity}));
    if (!items.length || items.length > 40 || total() > 20000) { status.textContent = 'Please split large orders and contact the café.'; return; }
    const id = activeOrder?.id || crypto.randomUUID();
    const payload = {id, name, phone, notes, fulfillment:'pickup', payment:'at-cafe', items, createdAt:new Date().toISOString()};
    sending = true; syncCheckout();
    try {
      if (!orderChannel) throw Error('Order channel unavailable');
      if (!orderChannel || !ownerOnline()) throw Error('Cafe order screen offline');
      if (orderChannel) {
        if (orderChannel !== window._unused) { /* Reserved for idempotent status channel setup. */ }
      }
      if (window.hsPendingChannel) client.removeChannel(window.hsPendingChannel);
      orderChannel = ordersChannel;
      const tracking = client.channel(`hs:status:${id}`, {config:{private:true}});
      tracking.on('broadcast', {event:'status'}, onStatus);
      await waitForJoin(tracking);
      window.hsPendingChannel = tracking;
      activeOrder = {id, received:false, uncertain:false};
      const result = await ordersChannel.send({type:'broadcast',event:'order',payload});
      if (result !== 'ok') throw Error('Message not accepted');
      status.textContent = 'Message sent. Waiting for café staff to acknowledge…';
      receiptTimer = setTimeout(() => {
        if (activeOrder && !activeOrder.received) { activeOrder.uncertain = true; status.textContent = 'Could not confirm staff receipt. Please call the café before making another order.'; syncCheckout(); }
      }, 12000);
    } catch (error) {
      console.warn('Order delivery not confirmed:', error.message);
      if (activeOrder) activeOrder.uncertain = true;
      status.textContent = 'Order not confirmed. Contact the café before trying again, to avoid duplicates.';
    } finally { sending = false; syncCheckout(); }
  });
  renderCart();
  connect();
})();
