/* Kitchen display: verified staff email + private ephemeral Supabase Broadcast. No order database. */
(() => {
  'use strict';
  const cfg = window.HS_ORDER_CONFIG || {};
  const panel = document.getElementById('hs-login-panel');
  if (!panel) return;
  const loginForm=document.getElementById('hs-login-form'), loginMessage=document.getElementById('hs-login-message');
  const workspace=document.getElementById('hs-admin-workspace'), notice=document.getElementById('hs-admin-notice');
  const signOut=document.getElementById('hs-sign-out'), indicator=document.getElementById('hs-live-indicator');
  const emailLabel=document.getElementById('hs-owner-email'), grid=document.getElementById('hs-admin-orders');
  const orders=new Map(), channels=new Map(), catalog=new Map();
  const maxTables=Number.isInteger(cfg.tableCount)&&cfg.tableCount>0&&cfg.tableCount<=100?cfg.tableCount:30;
  const money=n=>'₹'+n.toLocaleString('en-IN');
  const safe=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let client,presence,inbox,connected=false,connecting=false,selectedFilter='all',soundEnabled=false;
  const allowed=['received','confirmed','preparing','ready','served','rejected'];

  (window.HANGOVER_MENU||[]).forEach((section,s)=>section.items.forEach((item,i)=>{
    const prices=[...String(item[1]).matchAll(/₹\s*(\d+)/g)].map(m=>Number(m[1]));
    if(!prices.length||prices.length>2)return;
    const [base,suffix]=String(item[0]).split(' — ');
    const variants=suffix?.split(' / ')||[];
    prices.forEach((price,v)=>{
      if(!Number.isSafeInteger(price)||price<1||price>10000)return;
      const id=`s${s}i${i}v${v}`;
      catalog.set(id,{id,price,name:prices.length===1?item[0]:`${base} · ${variants[v]?.trim()||'Option '+(v+1)}`});
    });
  }));
  function setNotice(text){notice.textContent=text;}
  function connection(online){
    connected=online;
    indicator.textContent=online?'● LIVE · Kitchen open':'● OFFLINE · Do not accept QR orders';
    indicator.style.background=online?'var(--ink)':'#7d402e';
    render();
  }
  function validateOrder(raw){
    if(!raw||typeof raw!=='object'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.id))return null;
    if(!Number.isInteger(raw.table)||raw.table<1||raw.table>maxTables||typeof raw.name!=='string'||typeof raw.notes!=='string')return null;
    const name=raw.name.trim(),notes=raw.notes.trim();
    if(name.length>40||notes.length>300||raw.fulfillment!=='dine-in'||raw.payment!=='at-cafe')return null;
    if(!Array.isArray(raw.items)||raw.items.length<1||raw.items.length>40)return null;
    const seen=new Set(),items=[];
    for(const row of raw.items){
      const item=catalog.get(row?.id);
      if(!item||seen.has(row.id)||!Number.isInteger(row.quantity)||row.quantity<1||row.quantity>20)return null;
      seen.add(row.id);items.push({name:item.name,quantity:row.quantity,price:item.price});
    }
    const total=items.reduce((sum,row)=>sum+row.price*row.quantity,0);
    if(total>20000)return null;
    const date=typeof raw.createdAt==='string'&&!Number.isNaN(Date.parse(raw.createdAt))?new Date(raw.createdAt):new Date();
    return {id:raw.id,table:raw.table,name,notes,items,total,date,status:'received'};
  }
  const join=channel=>new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Realtime connection timed out')),10000);
    channel.subscribe((state,error)=>{
      if(state==='SUBSCRIBED'){clearTimeout(timeout);resolve(channel);}
      else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(state)){
        clearTimeout(timeout);connection(false);reject(error||Error(state));
      }
    });
  });
  async function statusFor(order,value){
    if(!connected||!allowed.includes(value))throw Error('Kitchen connection unavailable');
    let channel=channels.get(order.id);
    if(!channel){
      channel=client.channel(`hs:status:${order.id}`,{config:{private:true,broadcast:{ack:true}}});
      await join(channel);channels.set(order.id,channel);
    }
    const result=await channel.send({type:'broadcast',event:'status',payload:{id:order.id,status:value}});
    if(result!=='ok')throw Error('Status delivery was not acknowledged');
    return true;
  }
  async function onOrder(event){
    const ticket=validateOrder(event.payload);
    if(!ticket){console.warn('Rejected invalid dine-in event');return;}
    if(orders.has(ticket.id)){
      try{await statusFor(orders.get(ticket.id),orders.get(ticket.id).status);}catch(_){}
      return;
    }
    orders.set(ticket.id,ticket);render();
    setNotice(`🔔 NEW · TABLE ${ticket.table} · Order #${ticket.id.slice(0,8).toUpperCase()}. Verify that guests are seated before accepting.`);
    document.title=`🔔 Table ${ticket.table} order · Kitchen`;
    if(soundEnabled){
      try{
        const ctx=new(window.AudioContext||window.webkitAudioContext)();
        const oscillator=ctx.createOscillator(),gain=ctx.createGain();
        oscillator.frequency.value=720;gain.gain.value=.05;
        oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.22);
        oscillator.onended=()=>ctx.close();
      }catch(_){}
    }
    try{await statusFor(ticket,'received');}
    catch(error){setNotice(`Table ${ticket.table} order is visible but guest receipt could not be confirmed. Check directly with the table.`);console.warn(error);}
  }
  async function start(){
    if(!client||connecting||connected)return;
    connecting=true;
    try{
      const {data:{user},error}=await client.auth.getUser();
      if(error||!user||!user.email_confirmed_at){locked();return;}
      emailLabel.textContent=user.email||'';
      if(inbox)await client.removeChannel(inbox);
      if(presence)await client.removeChannel(presence);
      inbox=client.channel(cfg.ordersTopic,{config:{private:true}});
      inbox.on('broadcast',{event:'order'},onOrder);
      await join(inbox); // RLS: only the authorised verified kitchen email can read orders.
      presence=client.channel(cfg.presenceTopic,{config:{private:true,presence:{key:user.id}}});
      await join(presence);
      const tracked=await presence.track({role:'kitchen',startedAt:new Date().toISOString()});
      if(tracked!=='ok')throw Error('Kitchen online presence was not acknowledged');
      panel.hidden=true;workspace.hidden=false;signOut.hidden=false;
      setNotice('Kitchen LIVE. Check that table numbers match before accepting. Keep this screen awake; orders disappear after refresh.');
      connection(true);
    }catch(error){
      connection(false);panel.hidden=false;workspace.hidden=true;signOut.hidden=false;
      loginMessage.textContent='Kitchen access denied or live service unavailable. Check the authorised email and realtime setup.';
      console.warn('Kitchen connection error:',error.message);
      if(inbox)await client.removeChannel(inbox);
      if(presence)await client.removeChannel(presence);
      inbox=presence=null;
    }finally{connecting=false;}
  }
  function locked(){
    panel.hidden=false;workspace.hidden=true;signOut.hidden=true;emailLabel.textContent='';connection(false);
  }
  function render(){
    const list=[...orders.values()].sort((a,b)=>b.date-a.date);
    document.getElementById('hs-metric-new').textContent=list.filter(o=>o.status==='received').length;
    document.getElementById('hs-metric-active').textContent=list.filter(o=>['confirmed','preparing'].includes(o.status)).length;
    document.getElementById('hs-metric-ready').textContent=list.filter(o=>o.status==='ready').length;
    document.getElementById('hs-metric-done').textContent=list.filter(o=>['served','rejected'].includes(o.status)).length;
    const shown=list.filter(o=>selectedFilter==='all'||o.status===selectedFilter);
    if(!shown.length){grid.innerHTML='<div class="hs-admin-empty"><h3>🍟 No kitchen tickets yet.</h3><p>Scan a table QR to send a test order. Keep this page open; refreshing loses the temporary queue.</p></div>';return;}
    const next={received:[['confirmed','Accept order'],['rejected','Decline']],confirmed:[['preparing','Start preparing']],preparing:[['ready','Mark ready']],ready:[['served','Mark served']]};
    grid.innerHTML=shown.map(o=>`<article class="hs-order-card ${o.status==='received'?'is-new':''}"><div class="hs-order-top"><div><span class="hs-kitchen-table">TABLE ${String(o.table).padStart(2,'0')}</span><h3>ORDER #${o.id.slice(0,8).toUpperCase()}</h3><p class="hs-order-meta">${safe(o.name)||'Guest'} · ${o.date.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} · Dine in</p></div><span class="hs-order-badge">${safe(o.status)}</span></div><div class="hs-order-lines">${o.items.map(item=>`<p><span><strong>${item.quantity} ×</strong> ${safe(item.name)}</span><strong>${money(item.price*item.quantity)}</strong></p>`).join('')}<p><strong>Menu subtotal</strong><strong>${money(o.total)}</strong></p></div>${o.notes?`<p class="hs-order-notes"><strong>Special instructions:</strong> ${safe(o.notes)}</p>`:''}<p class="hs-kitchen-check">Verify guests are at table ${o.table} before preparing.</p><div class="hs-order-actions">${(next[o.status]||[]).map(([state,label])=>`<button type="button" data-id="${o.id}" data-state="${state}" ${connected?'':'disabled'} class="${state==='rejected'?'secondary':''}">${label} ↗</button>`).join('')}</div></article>`).join('');
  }
  grid.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-state]');
    if(!button||button.disabled||!connected)return;
    const order=orders.get(button.dataset.id),state=button.dataset.state;
    const next={received:['confirmed','rejected'],confirmed:['preparing'],preparing:['ready'],ready:['served']};
    if(!order||!next[order.status]?.includes(state))return;
    if(state==='rejected'&&!window.confirm(`Decline table ${order.table} order #${order.id.slice(0,8).toUpperCase()}?`))return;
    button.disabled=true;button.textContent='Updating…';
    try{
      await statusFor(order,state);order.status=state;document.title='Kitchen orders · Hangover Shakes';
      setNotice(`Table ${order.table} · Order #${order.id.slice(0,8).toUpperCase()}: ${state}.`);
      if(['served','rejected'].includes(state)){
        const channel=channels.get(order.id);if(channel)client.removeChannel(channel);channels.delete(order.id);
      }
    }catch(error){setNotice('Could not send the update. Check connection and try again.');console.warn(error);}
    render();
  });
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    selectedFilter=button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===button));
    render();
  }));
  document.addEventListener('click',()=>{soundEnabled=true;},{once:true});
  loginForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!client||!loginForm.reportValidity())return;
    const button=document.getElementById('hs-login-submit');button.disabled=true;
    loginMessage.textContent='Sending secure kitchen sign-in link…';
    try{
      const email=loginForm.elements.namedItem('email').value.trim();
      const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
      if(error)throw error;
      loginMessage.textContent='Open the link in the authorised staff inbox on this device. Only approved kitchen accounts can read orders.';
    }catch(error){loginMessage.textContent=`Sign-in link could not be sent: ${error.message}`;}
    finally{button.disabled=false;}
  });
  signOut.addEventListener('click',async()=>{
    if(presence)await presence.untrack().catch(()=>{});
    if(client)await client.removeAllChannels();
    orders.clear();channels.clear();inbox=presence=null;
    if(client)await client.auth.signOut();locked();render();
  });
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase?.createClient){
    loginMessage.textContent='Kitchen is not connected yet. Staff login and QR ordering stay disabled until secure realtime setup is completed.';
    loginForm.querySelector('button').disabled=true;return;
  }
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  client.auth.onAuthStateChange(type=>{
    if(type==='SIGNED_OUT'){orders.clear();channels.clear();inbox=presence=null;locked();render();}
    if(type==='SIGNED_IN')setTimeout(()=>{if(!connected)start();},0);
  });
  render();start();
})();
