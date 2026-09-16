/* Content Studio. Demo mode NEVER connects to or writes to the live database. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('cms-workspace')) return;
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const cfg = window.HS_ORDER_CONFIG || {};
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const baseMenu = () => JSON.parse(JSON.stringify(window.HANGOVER_MENU || [])).map(section => ({
    category:section.category, group:section.group,
    items:section.items.map(item => [item[0],item[1],item[2] !== false])
  }));
  const sampleOffers = () => [
    {tag:'Shawarma Special',title:'Classic Roll · Buy 1 Get 1',price:'₹160',active:true},
    {tag:'Snack Special',title:'Panipuri Shawarma · 6 Pieces',price:'₹100',active:true}
  ];
  const groups = new Set(['chicken','meals','desserts','drinks','shakes']);
  const pricePattern = /^₹\s*\d{1,5}(?:\s*\/\s*₹\s*\d{1,5})?$/;
  const deepCopy = data => JSON.parse(JSON.stringify(data));
  let client = null, menu = [], offers = [], revision = 0, published = false, selected = 0, dirty = false, busy = false;
  const notice = text => { $('cms-notice').textContent = text; };
  function changed() { dirty = true; $('cms-version').textContent = `UNPUBLISHED EDITS · REVISION ${revision}`; $('cms-review-panel').hidden=true; }
  function sample() {
    menu=baseMenu();offers=sampleOffers();revision=0;published=false;
    $('cms-login').hidden=true;$('cms-workspace').hidden=false;
    $('cms-logout').hidden=true;$('cms-badge').textContent='● DEMO / NO LIVE ACCESS';
    $('cms-notice').classList.add('cms-demo-note');
    notice('DEMO ONLY: edit dishes and offers to explore the interface. Publish is disabled; no real website or database changes will be made.');
    $('cms-publish').disabled=true;$('cms-publish').textContent='Demo · Publishing disabled';
    render();
  }
  function render() {
    if (!menu.length) menu=[{category:'Menu',group:'meals',items:[]}];
    selected=Math.min(selected,menu.length-1);
    const category=$('cms-category');
    category.innerHTML=menu.map((s,i)=>`<option value="${i}">${escape(s.category)} (${s.items.length})</option>`).join('');
    category.value=String(selected);
    $('cms-category-name').value=menu[selected].category;
    $('cms-category-group').value=menu[selected].group;
    $('cms-remove-category').disabled=menu.length<=1;
    $('cms-item-list').innerHTML=menu[selected].items.map((item,i)=>`
      <article class="cms-item" data-item="${i}">
        <label>Dish / item name<input type="text" data-field="name" maxlength="120" required value="${escape(item[0])}"></label>
        <label>Menu price<input type="text" data-field="price" maxlength="30" required value="${escape(item[1])}"></label>
        <label class="cms-check">Available<input type="checkbox" data-field="available" ${item[2]!==false?'checked':''}></label>
        <button type="button" class="cms-delete" data-remove-item="${i}" aria-label="Delete ${escape(item[0])}">Delete</button>
      </article>`).join('') || '<p class="cms-help">No dishes in this category. Add one below.</p>';
    $('cms-offer-list').innerHTML=offers.map((offer,i)=>`
      <article class="cms-offer" data-offer="${i}">
        <label>Offer label<input data-offer-field="tag" maxlength="70" required value="${escape(offer.tag)}"></label>
        <label>Offer title<input data-offer-field="title" maxlength="100" required value="${escape(offer.title)}"></label>
        <label>Offer price / deal<input data-offer-field="price" maxlength="30" required value="${escape(offer.price)}"></label>
        <label class="cms-check">Active<input type="checkbox" data-offer-field="active" ${offer.active?'checked':''}></label>
        <button type="button" class="cms-delete" data-remove-offer="${i}" aria-label="Delete offer ${escape(offer.title)}">Delete</button>
      </article>`).join('') || '<p class="cms-help">No offers: the promotional popup will be hidden once you publish.</p>';
    if(!dirty) $('cms-version').textContent = `${published ? 'PUBLISHED' : 'DRAFT'} · REVISION ${revision}`;
  }
  function check() {
    if (!menu.length || menu.length>70) throw Error('Keep between 1 and 70 menu categories.');
    let available=0;
    for (const section of menu) {
      if (!section.category.trim() || section.category.length>80 || !groups.has(section.group) || section.items.length>150) throw Error('A category name, filter or item count is invalid.');
      for (const item of section.items) {
        if (!item[0].trim() || item[0].length>120 || !pricePattern.test(item[1].trim())) throw Error(`Invalid dish name or price in ${section.category}. Use ₹100 or ₹100 / ₹160.`);
        const prices=[...item[1].matchAll(/₹\s*(\d+)/g)];
        if (prices.some(match => Number(match[1])<1 || Number(match[1])>10000)) throw Error('Each menu price must be between ₹1 and ₹10,000.');
        if(prices.length===2 && (item[0].split(' — ')[1] || '').split(' / ').filter(Boolean).length!==2) throw Error(`Two prices require two named options for ${item[0]}. Example: Classic — Roll / Plate.`);
        if(item[2]!==false) available++;
      }
    }
    if (!available) throw Error('At least one item must be available before publishing.');
    if(offers.length>20) throw Error('Maximum 20 offers.');
    for(const offer of offers) if(!offer.title.trim() || !offer.tag.trim() || !offer.price.trim() || offer.title.length>100 || offer.tag.length>70 || offer.price.length>30) throw Error('Each offer needs a label, a title and a price or deal (max 30 characters).');
  }
  $('cms-category').addEventListener('change',event => {selected=Number(event.target.value);render();});
  $('cms-category-name').addEventListener('input',event => {menu[selected].category=event.target.value;changed();});
  $('cms-category-group').addEventListener('change',event => {menu[selected].group=event.target.value;changed();});
  $('cms-add-category').addEventListener('click',()=>{
    if(menu.length>=70){notice('Maximum 70 categories.');return;}
    menu.push({category:'New category',group:'meals',items:[]});selected=menu.length-1;changed();render();$('cms-category-name').focus();$('cms-category-name').select();
  });
  $('cms-remove-category').addEventListener('click',()=>{
    if(menu.length<=1)return;
    if(!confirm(`Delete category "${menu[selected].category}" and all its dishes from the draft?`))return;
    menu.splice(selected,1);selected=Math.max(0,selected-1);changed();render();
  });
  $('cms-item-list').addEventListener('input', event => {
    const row=event.target.closest('[data-item]');if(!row)return;
    const item=menu[selected].items[Number(row.dataset.item)];if(!item)return;
    if(event.target.dataset.field==='name')item[0]=event.target.value;
    if(event.target.dataset.field==='price')item[1]=event.target.value;
    if(event.target.dataset.field==='available')item[2]=event.target.checked;
    changed();
  });
  $('cms-item-list').addEventListener('change',event=>{
    if(event.target.dataset.field==='available'){
      const row=event.target.closest('[data-item]');menu[selected].items[Number(row.dataset.item)][2]=event.target.checked;changed();
    }
  });
  $('cms-item-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-item]');if(!button)return;
    const index=Number(button.dataset.removeItem);
    if(!confirm(`Delete "${menu[selected].items[index][0]}" from the draft?`))return;
    menu[selected].items.splice(index,1);changed();render();
  });
  $('cms-add-item').addEventListener('click',()=>{
    if(menu[selected].items.length>=150){notice('Category item limit reached.');return;}
    menu[selected].items.push(['New item','₹100',true]);changed();render();
    $('cms-item-list').querySelector('.cms-item:last-child input')?.focus();
  });
  $('cms-offer-list').addEventListener('input',event=>{
    const row=event.target.closest('[data-offer]');if(!row)return;
    const offer=offers[Number(row.dataset.offer)];if(!offer)return;
    const field=event.target.dataset.offerField;
    if(field==='active')offer.active=event.target.checked;
    else if(['tag','title','price'].includes(field))offer[field]=event.target.value;
    changed();
  });
  $('cms-offer-list').addEventListener('change',event=>{
    const row=event.target.closest('[data-offer]');if(row && event.target.dataset.offerField==='active'){
      offers[Number(row.dataset.offer)].active=event.target.checked;changed();
    }
  });
  $('cms-offer-list').addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-offer]');if(!button)return;
    const index=Number(button.dataset.removeOffer);
    if(!confirm(`Delete offer "${offers[index].title}" from the draft?`))return;
    offers.splice(index,1);changed();render();
  });
  $('cms-add-offer').addEventListener('click',()=>{
    if(offers.length>=20){notice('Maximum 20 offers.');return;}
    offers.push({tag:'Special',title:'New offer',price:'₹100',active:false});changed();render();
    $('cms-offer-list').querySelector('.cms-offer:last-child input')?.focus();
  });
  document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-tab]').forEach(other=>other.classList.toggle('active',other===button));
    $('cms-menu-panel').hidden=button.dataset.tab!=='menu';$('cms-offers-panel').hidden=button.dataset.tab!=='offers';
  }));
  $('cms-preview').addEventListener('click',()=>{
    try {check();}catch(error){notice(error.message);return;}
    const active=offers.filter(offer=>offer.active);
    const items=menu.reduce((count,section)=>count+section.items.length,0);
    const soldOut=menu.reduce((count,section)=>count+section.items.filter(item=>item[2]===false).length,0);
    $('cms-review-panel').innerHTML=`<h3>Review before publishing</h3><p><strong>${menu.length} categories · ${items} dishes · ${soldOut} sold out · ${active.length} active offers</strong></p><p>Publishing replaces the current website catalogue. Open customer screens refresh when the published revision changes. Guests must re-add items after a menu update to avoid outdated prices.</p><h4>Current active deals</h4><ul>${active.map(offer=>`<li>${escape(offer.tag)} — ${escape(offer.title)} (${escape(offer.price)})</li>`).join('')||'<li>No offers; popup will be hidden.</li>'}</ul>${demo?'<p><strong>DEMO ONLY — these changes will not be saved.</strong></p>':''}`;
    $('cms-review-panel').hidden=false;$('cms-review-panel').scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('cms-publish').addEventListener('click',async()=>{
    if(demo || !client || busy)return;
    try{check();}catch(error){notice(error.message);return;}
    if(!confirm('Publish this entire menu and all offers to the customer website? Existing customer carts will be cleared when the catalogue changes.'))return;
    busy=true;$('cms-publish').disabled=true;notice('Publishing changes securely…');
    try{
      const payload={menu:deepCopy(menu),offers:deepCopy(offers),published:true,revision:revision+1,updated_at:new Date().toISOString()};
      const {data,error}=await client.from('hs_content').update(payload).eq('id',1).eq('revision',revision).select('revision').maybeSingle();
      if(error)throw error;
      if(!data)throw Error('Content changed in another manager session or your permission was revoked. Reload before trying again; no changes were published.');
      revision=data.revision;published=true;dirty=false;render();
      notice(`Published revision ${revision}. New customer visits load these changes; currently open pages check for updates within roughly one minute.`);
    }catch(error){notice(`NOT PUBLISHED: ${error.message}`);}
    finally{busy=false;$('cms-publish').disabled=false;}
  });
  $('cms-login-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!client)return;
    const button=event.target.querySelector('button');button.disabled=true;
    $('cms-login-status').textContent='Sending email sign-in link…';
    try{
      const email=event.target.elements.email.value.trim();
      const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
      if(error)throw error;
      $('cms-login-status').textContent='Check your manager email and open the sign-in link. Your account must already have manager permissions.';
    }catch(error){$('cms-login-status').textContent=`Could not send sign-in link: ${error.message}`;}
    finally{button.disabled=false;}
  });
  $('cms-logout').addEventListener('click',async()=>{
    if(client)await client.auth.signOut();
    menu=[];offers=[];$('cms-workspace').hidden=true;$('cms-login').hidden=false;$('cms-logout').hidden=true;
    $('cms-badge').textContent='● Signed out';notice('Signed out. Changes left unpublished were discarded.');
  });
  async function start(){
    if(demo){sample();return;}
    if(!cfg.supabaseUrl || !cfg.publishableKey || !window.supabase?.createClient){
      notice('Content management is not configured. A dedicated cafe Supabase project, cms-schema.sql and publishable connection are required.');
      $('cms-login-form').querySelector('button').disabled=true;return;
    }
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,
      {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    try{
      const {data:{user},error:userError}=await client.auth.getUser();
      if(userError || !user)return;
      const role=await client.from('hs_content_editors').select('role').eq('user_id',user.id).maybeSingle();
      if(role.error)throw role.error;
      if(role.data?.role!=='manager'){notice('Signed in, but this account has no menu-editing permission. Ask the café owner to authorise your user ID.');return;}
      const response=await client.from('hs_content').select('menu,offers,published,revision').eq('id',1).single();
      if(response.error)throw response.error;
      menu=Array.isArray(response.data.menu)&&response.data.menu.length?deepCopy(response.data.menu):baseMenu();
      offers=Array.isArray(response.data.offers)&&response.data.offers.length?deepCopy(response.data.offers):sampleOffers();
      revision=response.data.revision;published=response.data.published;
      $('cms-login').hidden=true;$('cms-workspace').hidden=false;$('cms-logout').hidden=false;
      $('cms-badge').textContent='● AUTHORISED MANAGER';
      notice(published?'You are editing the last published catalogue. Publish changes once when ready.':'Initial catalogue loaded. Review all menu prices and offers before publishing for the first time.');
      render();
    }catch(error){notice(`Manager setup error: ${error.message}. Check the database schema and your permission.`);}
  }
  start();
})();
