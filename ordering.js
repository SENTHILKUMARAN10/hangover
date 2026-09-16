/* QR-table dine-in orders. Anonymous guests send only; the authorised kitchen receives. */
(() => {
  'use strict';
  const menu = window.HANGOVER_MENU;
  if (!Array.isArray(menu) || !document.getElementById('full-menu-grid')) return;
  const cfg = window.HS_ORDER_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const rawTable = params.get('table') || '';
  const maxTables = Number.isInteger(cfg.tableCount) && cfg.tableCount > 0 && cfg.tableCount <= 100 ? cfg.tableCount : 30;
  const tableNumber = /^\d{1,3}$/.test(rawTable) && Number(rawTable) >= 1 && Number(rawTable) <= maxTables ? Number(rawTable) : null;
  const configured = Boolean(cfg.supabaseUrl && cfg.publishableKey && window.supabase?.createClient);
  const catalog = new Map(), cart = new Map();
  const cartKey = `hangover-dinein-cart-v1-table-${tableNumber}`;
  const money = n => '₹' + n.toLocaleString('en-IN');
  const safe = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let client, presence, inbox, connected = false, kitchenOnline = false, sending = false, pending = null;
  let lastFocus = null, receiptTimer, toastTimer;
  const statuses = new Map(), statusChannels = new Map();

  menu.forEach((section, sectionIndex) => section.items.forEach((item, itemIndex) => {
    const prices = [...String(item[1]).matchAll(/₹\s*(\d+)/g)].map(match => Number(match[1]));
    if (!prices.length || prices.length > 2) return;
    const [base, suffix] = String(item[0]).split(' — ');
    const variants = suffix?.split(' / ').map(v => v.trim()) || [];
    prices.forEach((price, variantIndex) => {
      if (!Number.isSafeInteger(price) || price < 1 || price > 10000) return;
      const id = `s${sectionIndex}i${itemIndex}v${variantIndex}`;
      catalog.set(id, {id, name: prices.length === 1 ? item[0] : `${base} · ${variants[variantIndex] || 'Option ' + (variantIndex + 1)}`, category:section.category, price});
    });
  }));
  if (tableNumber) {
    try {
      const stored = JSON.parse(localStorage.getItem(cartKey) || '{}');
      for (const [id, count] of Object.entries(stored)) {
        if (catalog.has(id) && Number.isInteger(count) && count > 0 && count <= 20) cart.set(id, count);
      }
    } catch (_) { /* Cart can still be used when browser storage is unavailable. */ }
  }
  const save = () => { try {localStorage.setItem(cartKey, JSON.stringify(Object.fromEntries(cart)));} catch (_) {} };
  const rows = () => [...cart].map(([id, quantity]) => ({...catalog.get(id),quantity})).filter(row => row.id && row.quantity);
  const count = () => [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = () => rows().reduce((sum, row) => sum + row.price * row.quantity, 0);
  const canEdit = () => !sending && (!pending || pending.received);

  const note = document.createElement('div');
  note.className = 'hs-table-banner';
  if (tableNumber) {
    note.innerHTML = `<div><span class="hs-table-kicker">🍽️ DINE IN · THE GANG IS HERE</span><strong>TABLE ${String(tableNumber).padStart(2,'0')}</strong><small>Scan, order, relax. We'll bring it to your table.</small></div><button type="button" class="hs-table-cta">Explore menu ↗</button>`;
    note.querySelector('button').addEventListener('click', () => document.getElementById('open-full-menu')?.click());
  } else {
    note.innerHTML = '<div><span class="hs-table-kicker">🍽️ DINE-IN ORDERING</span><strong>Scan the QR on your table</strong><small>The regular website is for browsing. Orders can only start from a table QR link, and kitchen staff verify each table.</small></div>';
  }
  document.querySelector('.hero')?.after(note);
  // The existing Swiggy/Zomato marketing links are not this in-house ordering service.
  const delivery = document.querySelector('.delivery-buttons');
  if (delivery) delivery.hidden = true;
  const orderCopy = document.querySelector('#order .order-copy p');
  if (orderCopy) orderCopy.textContent = 'Already sitting with the gang? Scan the QR code on your table to order directly with our kitchen. We serve you right here.';
  const orderTop = document.querySelector('#order .section-top > span');
  if (orderTop) orderTop.textContent = 'Dine in. Scan. Order. We serve.';

  if (!tableNumber) return;
  document.querySelectorAll('#full-menu-grid .full-menu-card').forEach((card, s) => {
    card.querySelectorAll('li').forEach((li, i) => {
      const choices = [...catalog.values()].filter(item => item.id.startsWith(`s${s}i${i}v`));
      if (!choices.length) return;
      const controls = document.createElement('div'); controls.className = 'hs-menu-action';
      if (choices.length > 1) {
        const select = document.createElement('select');
        select.setAttribute('aria-label', `Choose ${menu[s].items[i][0]} option`);
        choices.forEach(choice => {
          const option = document.createElement('option'); option.value = choice.id;
          option.textContent = `${choice.name.split(' · ').at(-1)} · ${money(choice.price)}`;
          select.append(option);
        });
        controls.append(select);
      }
      const add = document.createElement('button'); add.type = 'button'; add.className = 'hs-add'; add.textContent = '+ Add to cart';
      add.addEventListener('click', () => {
        if (!canEdit()) return;
        const id = controls.querySelector('select')?.value || choices[0].id;
        if (!catalog.has(id)) return;
        cart.set(id, Math.min(20, (cart.get(id) || 0) + 1)); save(); render(); toast(`${catalog.get(id).name} added`);
      });
      controls.append(add); li.append(controls);
    });
  });

  const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'hs-cart-launch';
  launch.setAttribute('aria-haspopup', 'dialog'); launch.setAttribute('aria-controls','hs-cart-overlay');
  launch.innerHTML = `🛒 Table ${tableNumber} cart <span class="hs-cart-count" id="hs-cart-count">0</span>`;
  document.querySelector('.header')?.append(launch);
  const menuLink = document.createElement('a'); menuLink.href = '#menu'; menuLink.textContent = 'Order at table';
  menuLink.addEventListener('click', event => {event.preventDefault();document.getElementById('open-full-menu')?.click();});
  document.getElementById('navigation')?.prepend(menuLink);
  const mobile = document.querySelector('.mobile-quick');
  if (mobile) { const button = document.createElement('button'); button.type='button';button.textContent=`🛒 Table ${tableNumber} cart`;button.addEventListener('click',openCart);mobile.append(button); }
  document.body.insertAdjacentHTML('beforeend', `
    <div id="hs-cart-overlay" class="hs-overlay" aria-hidden="true"><section class="hs-drawer" role="dialog" aria-modal="true" aria-labelledby="hs-cart-title">
      <div class="hs-drawer-head"><div><p class="eyebrow">TABLE ${String(tableNumber).padStart(2,'0')} / YOUR NEXT SCENE</p><h2 id="hs-cart-title">YOUR <em>CART.</em></h2></div><button id="hs-cart-close" class="hs-x" type="button" aria-label="Close cart">×</button></div>
      <div id="hs-cart-items" class="hs-items"></div><div id="hs-cart-totals" class="hs-totals" hidden></div>
      <form class="hs-checkout" id="hs-checkout" novalidate>
        <h3>Dine-in order · Table ${tableNumber}</h3>
        <p class="hs-table-locked">✓ Your table is set by its QR code. Please check the number on your table before ordering.</p>
        <label>Name (optional)<input name="guestName" autocomplete="given-name" maxlength="40" placeholder="So we can find your group"></label>
        <label>Special instructions (optional)<textarea name="notes" rows="2" maxlength="300" placeholder="Less spice, no onions…"></textarea></label>
        <p class="hs-note">Dine-in only · Food will be served at your table · Pay as directed by café staff. Prices and availability are subject to kitchen confirmation.</p>
        <p id="hs-checkout-status" class="hs-notice" role="status" aria-live="polite"></p>
        <button type="submit" id="hs-place-order" class="button">Send order to kitchen ↗</button>
      </form>
    </section></div><div id="hs-order-status" class="hs-status-bar" role="status" aria-live="polite" hidden></div>
  `);
  const overlay=document.getElementById('hs-cart-overlay'), close=document.getElementById('hs-cart-close');
  const items=document.getElementById('hs-cart-items'), totals=document.getElementById('hs-cart-totals');
  const form=document.getElementById('hs-checkout'), message=document.getElementById('hs-checkout-status');
  const place=document.getElementById('hs-place-order'), orderStatus=document.getElementById('hs-order-status');

  function toast(text) {
    document.querySelector('.hs-toast')?.remove();
    const node=document.createElement('div');node.className='hs-toast';node.setAttribute('role','status');node.textContent=text;
    document.body.append(node);clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.remove(),2800);
  }
  function openCart() {
    document.getElementById('close-full-menu')?.click();document.getElementById('close-offers')?.click();
    lastFocus=document.activeElement;overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';render();close.focus();
  }
  function closeCart() {
    overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }
  launch.addEventListener('click',openCart);close.addEventListener('click',closeCart);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closeCart();});
  document.addEventListener('keydown',event=>{
    if(!overlay.classList.contains('open'))return;
    if(event.key==='Escape'&&!sending){closeCart();return;}
    if(event.key!=='Tab')return;
    const controls=[...overlay.querySelectorAll('button:not(:disabled),input,textarea,select')].filter(el=>!el.closest('[hidden]'));
    if(!controls.length)return;
    if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
  });
  function kitchenPresent() {
    return Boolean(presence&&Object.values(presence.presenceState()).flat().some(entry=>entry.role==='kitchen'));
  }
  function sync() {
    place.disabled=!count()||!configured||!connected||!kitchenOnline||!canEdit();
    place.textContent=sending?'Sending to kitchen…':'Send order to kitchen ↗';
    if (pending&&!pending.received)message.textContent='Kitchen receipt not confirmed. Please ask the staff before attempting another order to avoid duplicates.';
    else if(!configured)message.textContent='Table ordering has not been activated yet. Please order directly with café staff.';
    else if(!connected)message.textContent='The kitchen connection is unavailable. Please order with café staff.';
    else if(!kitchenOnline)message.textContent='The kitchen screen is offline. Please ask staff to take your order.';
    else message.textContent='Kitchen screen is online. Your order counts only after the kitchen acknowledges receipt.';
  }
  function render() {
    document.getElementById('hs-cart-count').textContent=count();
    if(!count()){
      items.innerHTML='<div class="hs-empty">🍟 The gang is waiting.<br><strong>Your cart is empty.</strong><br>Open the menu and add something delicious.</div>';
      totals.hidden=true;
    }else{
      items.innerHTML=rows().map(row=>`<div class="hs-line"><div><h3>${safe(row.name)}</h3><small>${safe(row.category)} · ${money(row.price)} each</small></div><strong>${money(row.price*row.quantity)}</strong><div class="hs-quantity"><button type="button" data-change="-1" data-id="${row.id}" aria-label="Remove one ${safe(row.name)}">−</button><strong>${row.quantity}</strong><button type="button" data-change="1" data-id="${row.id}" aria-label="Add one ${safe(row.name)}">+</button><button type="button" class="hs-remove" data-remove="${row.id}">Remove</button></div></div>`).join('');
      totals.hidden=false;totals.innerHTML=`<p><span>${count()} item${count()===1?'':'s'}</span><strong>${money(subtotal())}</strong></p><p><span>Menu subtotal</span><strong>${money(subtotal())}</strong></p>`;
    }
    sync();
  }
  items.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||!canEdit())return;
    const id=button.dataset.remove||button.dataset.id;if(!catalog.has(id))return;
    if(button.dataset.remove)cart.delete(id);
    else{const next=(cart.get(id)||0)+Number(button.dataset.change);if(next<1)cart.delete(id);else cart.set(id,Math.min(20,next));}
    save();render();
  });
  const join = channel => new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Connection timed out')),10000);
    channel.subscribe((state,error)=>{
      if(state==='SUBSCRIBED'){clearTimeout(timer);resolve(channel);}
      else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state)){clearTimeout(timer);reject(error||Error(state));}
    });
  });
  function receiveStatus(event) {
    const data=event.payload||{};
    if(!data.id||!statuses.has(data.id)||!['received','confirmed','preparing','ready','served','rejected'].includes(data.status))return;
    const state=statuses.get(data.id);
    state.status=data.status;
    if(pending&&data.id===pending.id&&data.status==='received'&&!pending.received){
      pending.received=true;clearTimeout(receiptTimer);cart.clear();save();render();closeCart();
      toast(`Order #${pending.id.slice(0,8).toUpperCase()} received by kitchen!`);
    }
    const labels={received:'received by kitchen',confirmed:'accepted by kitchen',preparing:'being prepared',ready:'ready — staff will serve your table',served:'served — enjoy your meal!',rejected:'declined — please speak with staff'};
    orderStatus.hidden=false;orderStatus.textContent=`Table ${tableNumber} · Order #${data.id.slice(0,8).toUpperCase()}: ${labels[data.status]}`;
    if(data.status==='ready')toast('Food is ready! Staff will bring it to your table. 🎉');
    if(['served','rejected'].includes(data.status)){
      const channel=statusChannels.get(data.id);
      if(channel)client.removeChannel(channel);
      statusChannels.delete(data.id);
    }
    sync();
  }
  async function connect() {
    if(!configured){render();return;}
    try{
      client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
      presence=client.channel(cfg.presenceTopic,{config:{private:true}});
      presence.on('presence',{event:'sync'},()=>{kitchenOnline=kitchenPresent();sync();});
      await join(presence);
      inbox=client.channel(cfg.ordersTopic,{config:{private:true,broadcast:{ack:true}}});
      await join(inbox);
      connected=true;kitchenOnline=kitchenPresent();sync();
    }catch(error){connected=false;kitchenOnline=false;sync();console.warn('Kitchen connection unavailable:',error.message);}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!count()||!configured||!connected||!kitchenOnline||!canEdit())return;
    if(!form.reportValidity())return;
    const name=String(form.elements.namedItem('guestName').value).trim();
    const notes=String(form.elements.namedItem('notes').value).trim();
    if(name.length>40||notes.length>300){message.textContent='Please shorten your name or instructions.';return;}
    const selected=rows().map(row=>({id:row.id,quantity:row.quantity}));
    if(!selected.length||selected.length>40||subtotal()>20000){message.textContent='Please ask staff to help with this large order.';return;}
    const id=crypto.randomUUID();
    const payload={id,table:tableNumber,name,notes,fulfillment:'dine-in',payment:'at-cafe',items:selected,createdAt:new Date().toISOString()};
    sending=true;sync();
    try{
      if(!inbox||!kitchenPresent())throw Error('Kitchen disconnected');
      const statusChannel=client.channel(`hs:status:${id}`,{config:{private:true}});
      statusChannel.on('broadcast',{event:'status'},receiveStatus);
      await join(statusChannel);
      statusChannels.set(id,statusChannel);
      pending={id,received:false};statuses.set(id,{status:'sending'});
      const sent=await inbox.send({type:'broadcast',event:'order',payload});
      if(sent!=='ok')throw Error('Order was not acknowledged by realtime transport');
      if(!pending.received){
        message.textContent='Sent. Waiting for a receipt from the kitchen…';
        receiptTimer=setTimeout(()=>{if(pending&&!pending.received){message.textContent='Receipt uncertain. Please ask the staff before retrying.';sync();}},12000);
      }
    }catch(error){
      if(!pending)pending={id,received:false};
      console.warn('Dine-in order delivery not confirmed:',error.message);
      message.textContent='Kitchen has not confirmed receiving this order. Please ask café staff before ordering again.';
    }finally{sending=false;sync();}
  });
  render();connect();
})();
