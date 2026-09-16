/* Owner dashboard: Supabase Auth + private ephemeral Broadcast. No orders table. */
(() => {
  'use strict';
  const cfg = window.HS_ORDER_CONFIG || {};
  const panel = document.getElementById('hs-login-panel');
  if (!panel) return;
  const loginForm = document.getElementById('hs-login-form');
  const loginMessage = document.getElementById('hs-login-message');
  const workspace = document.getElementById('hs-admin-workspace');
  const notice = document.getElementById('hs-admin-notice');
  const signOut = document.getElementById('hs-sign-out');
  const indicator = document.getElementById('hs-live-indicator');
  const emailLabel = document.getElementById('hs-owner-email');
  const grid = document.getElementById('hs-admin-orders');
  const orders = new Map();
  const channels = new Map();
  const catalog = new Map();
  const money = n => '₹' + n.toLocaleString('en-IN');
  const safe = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client, presence, inbox, connected = false, currentUser, selectedFilter = 'all', soundEnabled = false;
  const validStatuses = ['received','confirmed','preparing','ready','completed','rejected'];

  (window.HANGOVER_MENU || []).forEach((section, s) => section.items.forEach((item, i) => {
    const prices = [...String(item[1]).matchAll(/₹\s*(\d+)/g)].map(m => Number(m[1]));
    if (!prices.length || prices.length > 2) return;
    const [base, suffix] = String(item[0]).split(' — ');
    const names = suffix?.split(' / ') || [];
    prices.forEach((price, v) => {
      if (!Number.isSafeInteger(price) || price < 1 || price > 10000) return;
      const id = `s${s}i${i}v${v}`;
      catalog.set(id, {id, price, name:prices.length === 1 ? item[0] : `${base} · ${names[v]?.trim() || `Option ${v + 1}`}`});
    });
  }));

  function setNotice(message) { notice.textContent = message; }
  function connection(state) {
    connected = state;
    indicator.textContent = state ? '● LIVE · Keep open' : '● Offline · Orders paused';
    indicator.style.background = state ? 'var(--ink)' : '#7d402e';
    render();
  }
  function validateOrder(raw) {
    if (!raw || typeof raw !== 'object' || !/^[\da-f-]{36}$/i.test(raw.id) || typeof raw.name !== 'string' || typeof raw.phone !== 'string') return null;
    const name = raw.name.trim(), phone = raw.phone.trim(), notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';
    if (!name || name.length > 70 || !/^[6-9]\d{9}$/.test(phone) || notes.length > 300 || !Array.isArray(raw.items) || !raw.items.length || raw.items.length > 40) return null;
    if (raw.fulfillment !== 'pickup' || raw.payment !== 'at-cafe') return null;
    const items = [];
    for (const row of raw.items) {
      const item = catalog.get(row?.id);
      if (!item || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 20) return null;
      items.push({name:item.name, quantity:row.quantity, price:item.price});
    }
    const total = items.reduce((sum, row) => sum + row.price * row.quantity, 0);
    if (total > 20000) return null;
    const date = typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt)) ? new Date(raw.createdAt) : new Date();
    return {id:raw.id, name, phone, notes, items, total, date, status:'received'};
  }
  const join = channel => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Connection timed out')), 10000);
    channel.subscribe((state, err) => {
      if (state === 'SUBSCRIBED') { clearTimeout(timeout); resolve(channel); }
      if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state)) { clearTimeout(timeout); reject(err || Error(state)); }
    });
  });
  async function statusFor(order, value) {
    if (!connected || !validStatuses.includes(value)) return false;
    let channel = channels.get(order.id);
    if (!channel) {
      channel = client.channel(`hs:status:${order.id}`, {config:{private:true,broadcast:{ack:true}}});
      await join(channel);
      channels.set(order.id, channel);
    }
    const result = await channel.send({type:'broadcast',event:'status',payload:{id:order.id,status:value}});
    if (result !== 'ok') throw Error('Realtime did not acknowledge status');
    return true;
  }
  async function onOrder(event) {
    const ticket = validateOrder(event.payload);
    if (!ticket) { console.warn('Ignored invalid order message'); return; }
    if (orders.has(ticket.id)) {
      try { await statusFor(orders.get(ticket.id), orders.get(ticket.id).status); } catch (_) {}
      return;
    }
    orders.set(ticket.id, ticket);
    render();
    setNotice(`🔔 New order #${ticket.id.slice(0, 8).toUpperCase()} · ${ticket.name}. Confirm it to start preparing.`);
    document.title = `🔔 New order · Hangover Shakes`;
    if (soundEnabled) {
      try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.frequency.value = 720; gain.gain.value = .04; osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .18); osc.onended = () => ctx.close(); } catch (_) {}
    }
    try { await statusFor(ticket, 'received'); }
    catch (error) { setNotice('Order is visible but the receipt acknowledgment failed. Call the customer to avoid an uncertain order.'); console.warn(error); }
  }
  async function start() {
    if (!client) return;
    const {data:{user}, error} = await client.auth.getUser();
    if (error || !user || !user.email_confirmed_at) { locked(); return; }
    currentUser = user;
    emailLabel.textContent = user.email || '';
    inbox = client.channel(cfg.ordersTopic, {config:{private:true}});
    inbox.on('broadcast',{event:'order'}, onOrder);
    try {
      await join(inbox); // RLS permits this only for the authorised owner's email.
      presence = client.channel(cfg.presenceTopic,{config:{private:true,presence:{key:user.id}}});
      await join(presence);
      const tracked = await presence.track({role:'owner',startedAt:new Date().toISOString()});
      if (tracked !== 'ok') throw Error('Owner presence could not start');
      panel.hidden = true; workspace.hidden = false; signOut.hidden = false;
      setNotice('You are live. Keep this page open. Orders disappear on refresh or connection loss; no database stores them.');
      connection(true);
    } catch (error) {
      connection(false);
      panel.hidden = false; workspace.hidden = true; signOut.hidden = false;
      loginMessage.textContent = 'This account is not authorised as the café owner, or the live service is not configured. Contact the website administrator.';
      console.warn('Owner access denied or connection failed:', error.message);
      if (inbox) client.removeChannel(inbox);
      if (presence) client.removeChannel(presence);
      inbox = presence = null;
    }
  }
  function locked() {
    panel.hidden = false; workspace.hidden = true; signOut.hidden = true; emailLabel.textContent = '';
    connection(false);
  }
  function render() {
    const list = [...orders.values()].sort((a,b) => b.date - a.date);
    document.getElementById('hs-metric-new').textContent = list.filter(o => o.status === 'received').length;
    document.getElementById('hs-metric-active').textContent = list.filter(o => ['confirmed','preparing'].includes(o.status)).length;
    document.getElementById('hs-metric-ready').textContent = list.filter(o => o.status === 'ready').length;
    document.getElementById('hs-metric-done').textContent = list.filter(o => ['completed','rejected'].includes(o.status)).length;
    const shown = list.filter(o => selectedFilter === 'all' || o.status === selectedFilter);
    if (!shown.length) { grid.innerHTML = '<div class="hs-admin-empty"><h3>🍟 No orders in this scene.</h3><p>Keep this tab open for incoming tickets. This temporary queue does not contain past orders.</p></div>'; return; }
    const next = {received:[['confirmed','Confirm order'],['rejected','Decline']],confirmed:[['preparing','Start preparing']],preparing:[['ready','Mark ready']],ready:[['completed','Complete pickup']]};
    grid.innerHTML = shown.map(o => `<article class="hs-order-card ${o.status === 'received' ? 'is-new' : ''}"><div class="hs-order-top"><div><h3>#${o.id.slice(0, 8).toUpperCase()}</h3><p class="hs-order-meta">${safe(o.name)} · ${o.date.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</p><p class="hs-order-meta"><a href="tel:+91${o.phone}">📞 +91 ${o.phone}</a> · Pickup · Pay at café</p></div><span class="hs-order-badge">${safe(o.status)}</span></div><div class="hs-order-lines">${o.items.map(item=>`<p><span>${item.quantity} × ${safe(item.name)}</span><strong>${money(item.price*item.quantity)}</strong></p>`).join('')}<p><strong>Menu subtotal</strong><strong>${money(o.total)}</strong></p></div>${o.notes ? `<p class="hs-order-notes"><strong>Notes:</strong> ${safe(o.notes)}</p>` : ''}<div class="hs-order-actions">${(next[o.status] || []).map(([state,label])=>`<button type="button" data-id="${o.id}" data-state="${state}" ${connected ? '' : 'disabled'} class="${state==='rejected' ? 'secondary' : ''}">${label} ↗</button>`).join('')}</div></article>`).join('');
  }
  grid.addEventListener('click', async event => {
    const button = event.target.closest('button[data-state]');
    if (!button || button.disabled || !connected) return;
    const order = orders.get(button.dataset.id), state = button.dataset.state;
    const next = {received:['confirmed','rejected'],confirmed:['preparing'],preparing:['ready'],ready:['completed']};
    if (!order || !next[order.status]?.includes(state)) return;
    if (state === 'rejected' && !window.confirm(`Decline order #${order.id.slice(0,8).toUpperCase()}?`)) return;
    button.disabled = true; button.textContent = 'Updating…';
    try {
      await statusFor(order, state);
      order.status = state; document.title = 'Owner orders · Hangover Shakes';
      setNotice(`Order #${order.id.slice(0,8).toUpperCase()} updated to ${state}.`);
    } catch (err) { setNotice('Could not deliver the status update. Check connection and try again.'); console.warn(err); }
    render();
  });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    selectedFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button));
    render();
  }));
  document.addEventListener('click', () => {soundEnabled = true;}, {once:true});
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!client || !loginForm.reportValidity()) return;
    const button = document.getElementById('hs-login-submit'); button.disabled = true;
    loginMessage.textContent = 'Sending secure sign-in email…';
    try {
      const email = loginForm.elements.email.value.trim();
      const {error} = await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
      if (error) throw error;
      loginMessage.textContent = 'Check the owner email inbox and use the sign-in link on this device. Only the authorised email is allowed to read orders.';
    } catch (error) {loginMessage.textContent = `Sign-in link could not be sent: ${error.message}`;}
    finally {button.disabled = false;}
  });
  signOut.addEventListener('click', async () => {
    if (presence) await presence.untrack().catch(()=>{});
    if (client) await client.removeAllChannels();
    orders.clear(); channels.clear(); currentUser = null;
    if (client) await client.auth.signOut();
    locked(); render();
  });
  if (!cfg.supabaseUrl || !cfg.publishableKey || !window.supabase?.createClient) {
    loginMessage.textContent = 'Live ordering is not configured. The owner cannot sign in or receive orders until the secure realtime service is connected.';
    loginForm.querySelector('button').disabled = true;
    return;
  }
  client = window.supabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  client.auth.onAuthStateChange((type) => {
    if (type === 'SIGNED_OUT') { orders.clear(); channels.clear(); locked(); render(); }
    if (type === 'SIGNED_IN') setTimeout(() => { if (!connected) start(); }, 0);
  });
  render();
  start();
})();
