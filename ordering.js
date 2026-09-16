/* Customer cart + ephemeral pickup checkout. Never claim success before an owner receipt. */
(() => {
  'use strict';
  const menu = window.HANGOVER_MENU;
  if (!Array.isArray(menu) || !document.getElementById('full-menu-grid')) return;
  const cfg = window.HS_ORDER_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.publishableKey && window.supabase?.createClient);
  const catalog = new Map(), cart = new Map(), cartKey = 'hangover-cart-v1';
  const money = value => '₹' + value.toLocaleString('en-IN');
  const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client, presence, inbox, tracking, connected = false, online = false, sending = false;
  let pending = null, focused = null, receiptTimeout, toastTimeout;

  menu.forEach((section, s) => section.items.forEach((item, i) => {
    const prices = [...String(item[1]).matchAll(/₹\s*(\d+)/g)].map(match => Number(match[1]));
    if (!prices.length || prices.length > 2) return;
    const [name, options] = String(item[0]).split(' — ');
    const variants = options?.split(' / ').map(part => part.trim()) || [];
    prices.forEach((price, v) => {
      if (!Number.isSafeInteger(price) || price < 1 || price > 10000) return;
      const id = `s${s}i${i}v${v}`;
      catalog.set(id, { id, name:prices.length === 1 ? item[0] : `${name} · ${variants[v] || 'Option '+(v+1)}`, category:section.category, price });
    });
  }));
  try {
    const stored = JSON.parse(localStorage.getItem(cartKey) || '{}');
    for (const [id, count] of Object.entries(stored)) if (catalog.has(id) && Number.isInteger(count) && count > 0 && count <= 20) cart.set(id, count);
  } catch (_) { /* Browsers without storage can still use the session cart. */ }
  const save = () => { try { localStorage.setItem(cartKey, JSON.stringify(Object.fromEntries(cart))); } catch (_) {} };
  const rows = () => [...cart].map(([id, count]) => ({...catalog.get(id), count})).filter(item => item.id && item.count);
  const count = () => [...cart.values()].reduce((sum, n) => sum+n, 0);
  const subtotal = () => rows().reduce((sum, item) => sum+item.price*item.count, 0);

  document.querySelectorAll('#full-menu-grid .full-menu-card').forEach((card, s) => {
    card.querySelectorAll('li').forEach((li, i) => {
      const options = [...catalog.values()].filter(item => item.id.startsWith(`s${s}i${i}v`));
      if (!options.length) return;
      const controls = document.createElement('div'); controls.className = 'hs-menu-action';
      if (options.length > 1) {
        const select = document.createElement('select');
        select.setAttribute('aria-label', `Choose ${menu[s].items[i][0]} variant`);
        options.forEach(item => {
          const option = document.createElement('option'); option.value = item.id;
          option.textContent = `${item.name.split(' · ').at(-1)} · ${money(item.price)}`;
          select.append(option);
        });
        controls.append(select);
      }
      const add = document.createElement('button'); add.type = 'button'; add.className = 'hs-add'; add.textContent = '+ Add to cart';
      add.addEventListener('click', () => {
        if (sending || pending && !pending.received) return;
        const id = controls.querySelector('select')?.value || options[0].id;
        if (!catalog.has(id)) return;
        cart.set(id, Math.min(20, (cart.get(id)||0)+1)); save(); render(); toast(`${catalog.get(id).name} added to cart`);
      });
      controls.append(add); li.append(controls);
    });
  });

  const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'hs-cart-launch';
  launch.setAttribute('aria-haspopup', 'dialog'); launch.setAttribute('aria-controls', 'hs-cart-overlay');
  launch.innerHTML = '🛒 Cart <span class="hs-cart-count" id="hs-cart-count">0</span>';
  document.querySelector('.header')?.append(launch);
  const menuLink = document.createElement('a'); menuLink.href = '#menu'; menuLink.textContent = 'Order online';
  menuLink.addEventListener('click', event => { event.preventDefault(); document.getElementById('open-full-menu')?.click(); });
  const nav = document.getElementById('navigation'); nav?.prepend(menuLink);
  const quick = document.querySelector('.mobile-quick');
  if (quick) { const button = document.createElement('button'); button.type='button'; button.textContent='🛒 Cart'; button.addEventListener('click',openCart); quick.append(button); }

  document.body.insertAdjacentHTML('beforeend', `
    <div id="hs-cart-overlay" class="hs-overlay" aria-hidden="true"><section class="hs-drawer" role="dialog" aria-modal="true" aria-labelledby="hs-cart-title">
      <div class="hs-drawer-head"><div><p class="eyebrow">THE NEXT SCENE / YOUR ORDER</p><h2 id="hs-cart-title">YOUR <em>CART.</em></h2></div><button id="hs-cart-close" class="hs-x" type="button" aria-label="Close cart">×</button></div>
      <div id="hs-cart-items" class="hs-items"></div><div id="hs-cart-totals" class="hs-totals" hidden></div>
      <form class="hs-checkout" id="hs-checkout" novalidate>
        <h3>Checkout · Pickup</h3>
        <label>Your name<input name="name" autocomplete="name" maxlength="70" placeholder="Name for the order" required></label>
        <label>Mobile number<input name="phone" type="tel" inputmode="numeric" autocomplete="tel" pattern="[6-9][0-9]{9}" maxlength="10" placeholder="10-digit Indian mobile number" required></label>
        <label>Special instructions (optional)<textarea name="notes" rows="2" maxlength="300" placeholder="Less spice, no onions…"></textarea></label>
        <p class="hs-note">Pickup only · Pay at the café. No online payment or delivery. Staff must confirm menu availability and the final bill.</p>
        <p id="hs-checkout-status" class="hs-notice" role="status" aria-live="polite"></p>
        <button type="submit" id="hs-place-order" class="button">Place pickup order ↗</button>
        <a id="hs-whatsapp-order" class="text-link" target="_blank" rel="noopener noreferrer" href="#" hidden>Send order on WhatsApp instead ↗</a>
      </form>
    </section></div><div id="hs-order-status" class="hs-status-bar" role="status" aria-live="polite" hidden></div>
  `);
  const overlay=document.getElementById('hs-cart-overlay'), close=document.getElementById('hs-cart-close');
  const items=document.getElementById('hs-cart-items'), totals=document.getElementById('hs-cart-totals');
  const form=document.getElementById('hs-checkout'), message=document.getElementById('hs-checkout-status');
  const place=document.getElementById('hs-place-order'), whatsapp=document.getElementById('hs-whatsapp-order');
  const orderStatus=document.getElementById('hs-order-status');

  function toast(text) {
    document.querySelector('.hs-toast')?.remove();
    const node=document.createElement('div'); node.className='hs-toast'; node.setAttribute('role','status'); node.textContent=text;
    document.body.append(node); clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>node.remove(),2800);
  }
  function openCart() {
    document.getElementById('close-full-menu')?.click();
    document.getElementById('close-offers')?.click();
    focused=document.activeElement; overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden'; render(); close.focus();
  }
  function closeCart() {
    overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true');
    document.body.style.overflow=''; if (focused instanceof HTMLElement) focused.focus();
  }
  launch.addEventListener('click',openCart); close.addEventListener('click',closeCart);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closeCart();});
  document.addEventListener('keydown',event=>{
    if(!overlay.classList.contains('open'))return;
    if(event.key==='Escape' && !sending){closeCart();return;}
    if(event.key!=='Tab')return;
    const focusable=[...overlay.querySelectorAll('button:not(:disabled),a:not([hidden]),input,textarea,select')].filter(el=>!el.closest('[hidden]'));
    if(!focusable.length)return;
    if(event.shiftKey && document.activeElement===focusable[0]){event.preventDefault();focusable.at(-1).focus();}
    else if(!event.shiftKey && document.activeElement===focusable.at(-1)){event.preventDefault();focusable[0].focus();}
  });
  function whatsappLink() {
    const name=form.elements.name.value.trim()||'[your name]', phone=form.elements.phone.value.trim()||'[your number]';
    const notes=form.elements.notes.value.trim();
    const parts=['Hangover Shakes pickup order (not confirmed)',`Name: ${name}`,`Phone: ${phone}`,...rows().map(row=>`${row.count} × ${row.name} — ${money(row.price*row.count)}`),`Menu subtotal: ${money(subtotal())}`];
    if(notes)parts.push(`Instructions: ${notes}`);
    parts.push('Please confirm availability, final bill, and pickup time.');
    return 'https://wa.me/919791851906?text='+encodeURIComponent(parts.join('\n'));
  }
  function sync() {
    const hasItems=count()>0;
    place.disabled=!hasItems || !connected || !online || sending || Boolean(pending&&!pending.received);
    place.textContent=sending?'Sending to café…':'Place pickup order ↗';
    whatsapp.hidden=!hasItems;
    if(hasItems)whatsapp.href=whatsappLink();
    if(pending&&!pending.received)message.textContent='Order delivery is uncertain. Call the café before trying again to prevent duplicates.';
    else if(!configured)message.textContent='Live ordering is not configured yet. Online checkout is disabled. Use WhatsApp and tap Send instead.';
    else if(!connected)message.textContent='Cannot connect to the café. Online checkout is disabled; WhatsApp is an alternative.';
    else if(!online)message.textContent='The owner order screen is offline. Nothing has been placed. Please use WhatsApp or call.';
    else message.textContent='Café screen online. The order will only be marked received when its staff dashboard acknowledges it.';
  }
  function render() {
    document.getElementById('hs-cart-count').textContent=count();
    if(!count()){
      items.innerHTML='<div class="hs-empty">🍟 The gang is waiting.<br><strong>Your cart is empty.</strong><br>Open the full menu and add something delicious.</div>';
      totals.hidden=true;
    }else{
      items.innerHTML=rows().map(row=>`<div class="hs-line"><div><h3>${safe(row.name)}</h3><small>${safe(row.category)} · ${money(row.price)} each</small></div><strong>${money(row.price*row.count)}</strong><div class="hs-quantity"><button type="button" data-change="-1" data-id="${row.id}" aria-label="Remove one ${safe(row.name)}">−</button><strong>${row.count}</strong><button type="button" data-change="1" data-id="${row.id}" aria-label="Add one ${safe(row.name)}">+</button><button type="button" class="hs-remove" data-remove="${row.id}">Remove</button></div></div>`).join('');
      totals.hidden=false; totals.innerHTML=`<p><span>${count()} item${count()===1?'':'s'}</span><strong>${money(subtotal())}</strong></p><p><span>Menu subtotal</span><strong>${money(subtotal())}</strong></p>`;
    }
    sync();
  }
  items.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||sending||pending&&!pending.received)return;
    const id=button.dataset.remove||button.dataset.id;
    if(!catalog.has(id))return;
    if(button.dataset.remove)cart.delete(id);
    else{const next=(cart.get(id)||0)+Number(button.dataset.change);if(next<1)cart.delete(id);else cart.set(id,Math.min(20,next));}
    save();render();
  });
  form.addEventListener('input',()=>{if(!whatsapp.hidden)whatsapp.href=whatsappLink();});
  whatsapp.addEventListener('click',event=>{
    if(!count()){event.preventDefault();return;}
    message.textContent='WhatsApp opens a draft only. Review it and tap Send yourself; the café must still confirm.';
  });

  const ownerOnline=()=>Boolean(presence&&Object.values(presence.presenceState()).flat().some(entry=>entry.role==='owner'));
  function join(channel) {
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Connection timed out')),10000);
      channel.subscribe((state,error)=>{
        if(state==='SUBSCRIBED'){clearTimeout(timer);resolve(channel);}
        else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state)){clearTimeout(timer);reject(error||Error(state));}
      });
    });
  }
  function receiveStatus(event) {
    const data=event.payload||{};
    if(!pending||data.id!==pending.id||!['received','confirmed','preparing','ready','completed','rejected'].includes(data.status))return;
    if(data.status==='received'&&!pending.received){
      pending.received=true;clearTimeout(receiptTimeout);cart.clear();save();render();closeCart();
      toast(`Order #${pending.id.slice(0,8).toUpperCase()} received by the café!`);
    }
    const labels={received:'received by café',confirmed:'confirmed',preparing:'being prepared',ready:'READY for pickup',completed:'completed',rejected:'declined — contact the café'};
    orderStatus.hidden=false;
    orderStatus.textContent=`Order #${pending.id.slice(0,8).toUpperCase()}: ${labels[data.status]}`;
    if(data.status==='ready')toast('Your order is ready for pickup! 🎉');
  }
  async function connect() {
    if(!configured){render();return;}
    try{
      client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
      presence=client.channel(cfg.presenceTopic,{config:{private:true}});
      presence.on('presence',{event:'sync'},()=>{online=ownerOnline();sync();});
      await join(presence);
      inbox=client.channel(cfg.ordersTopic,{config:{private:true,broadcast:{ack:true}}});
      await join(inbox);
      connected=true;online=ownerOnline();sync();
    }catch(error){connected=false;online=false;sync();console.warn('Live cafe connection unavailable:',error.message);}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(sending||!count()||!configured||!connected||!online||pending&&!pending.received)return;
    if(!form.reportValidity())return;
    const name=String(form.elements.name.value).trim(),phone=String(form.elements.phone.value).trim(),notes=String(form.elements.notes.value).trim();
    if(!name||!/^[6-9]\d{9}$/.test(phone)){message.textContent='Enter your name and a valid 10-digit Indian mobile number.';return;}
    const selected=rows().map(row=>({id:row.id,quantity:row.count}));
    if(!selected.length||selected.length>40||subtotal()>20000){message.textContent='Please split larger orders and contact the café.';return;}
    const id=crypto.randomUUID(); // Always use a NEW ID for each distinct checkout.
    const payload={id,name,phone,notes,fulfillment:'pickup',payment:'at-cafe',items:selected,createdAt:new Date().toISOString()};
    sending=true;sync();
    try{
      if(!inbox||!ownerOnline())throw Error('Owner disconnected');
      // Subscribe to the private receipt channel BEFORE sending the order.
      const nextTracking=client.channel(`hs:status:${id}`,{config:{private:true}});
      nextTracking.on('broadcast',{event:'status'},receiveStatus);
      await join(nextTracking);
      if(tracking)client.removeChannel(tracking);
      tracking=nextTracking;
      pending={id,received:false};
      const sent=await inbox.send({type:'broadcast',event:'order',payload});
      if(sent!=='ok')throw Error('Order broadcast not accepted');
      if(!pending.received){
        message.textContent='Sent to the café. Waiting for staff receipt…';
        receiptTimeout=setTimeout(()=>{if(pending&&!pending.received){message.textContent='Receipt could not be confirmed. Please phone the café before retrying.';sync();}},12000);
      }
    }catch(error){
      if(!pending)pending={id,received:false};
      console.warn('Order delivery not confirmed:',error.message);
      message.textContent='Could not confirm order delivery. Phone the café to check before another attempt.';
    }finally{sending=false;sync();}
  });
  render();connect();
})();
