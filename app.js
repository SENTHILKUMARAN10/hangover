/* Load the published catalogue BEFORE building menus, offers and the ordering catalogue. */
(async () => {
'use strict';
const loadScript = src => new Promise(resolve => {
  const script=document.createElement('script');script.src=src;
  script.onload=resolve;
  script.onerror=()=>{console.warn('Optional website dependency failed:',src);resolve();};
  document.body.append(script);
});
await loadScript('ordering-config.js');
await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.91.0');
await loadScript('cms-public.js');
if (window.HS_CMS_READY) await window.HS_CMS_READY;
if (window.HS_CONTENT_UNAVAILABLE) {
  // Fail closed: visitors may read the fallback menu but must not submit mismatched orders.
  window.HS_ORDER_CONFIG=Object.freeze({...window.HS_ORDER_CONFIG,supabaseUrl:'',publishableKey:''});
  const alert=document.createElement('p');
  alert.className='hs-admin-alert';
  alert.textContent='The café menu connection is temporarily unavailable. Browse the menu, but ordering is paused until staff restore it.';
  document.querySelector('#menu .wrap')?.prepend(alert);
}

const headerThemeSheet=document.createElement('link');
headerThemeSheet.rel='stylesheet';headerThemeSheet.href='header-static.css?v=20260915c';
document.head.appendChild(headerThemeSheet);
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reduceMotion) {
  document.body.classList.add('motion-ready');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}
  }),{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
const toggle=document.querySelector('.nav-toggle');const nav=document.getElementById('navigation');
toggle?.addEventListener('click',()=>{
  const open=toggle.getAttribute('aria-expanded')!=='true';
  toggle.setAttribute('aria-expanded',String(open));nav?.classList.toggle('open',open);
});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  toggle?.setAttribute('aria-expanded','false');nav.classList.remove('open');
}));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&nav?.classList.contains('open')){
    toggle?.setAttribute('aria-expanded','false');nav.classList.remove('open');toggle?.focus();
  }
});
const contactForm=document.getElementById('contact-form');
contactForm?.addEventListener('submit',event=>{
  event.preventDefault();const data=new FormData(contactForm);
  const text=['Enquiry for Hangover Shakes',`Name: ${data.get('name')}`,`Email: ${data.get('email')||'Not provided'}`,`Phone: ${data.get('phone')||'Not provided'}`,'',data.get('message')||''].join('\n');
  const url='https://wa.me/919791851906?text='+encodeURIComponent(text);
  const fallback=document.getElementById('whatsapp-fallback');const status=document.getElementById('form-status');
  if(fallback){fallback.href=url;fallback.hidden=false;}
  window.open(url,'_blank','noopener,noreferrer');
  if(status)status.textContent='Your WhatsApp enquiry draft is ready. Review it and tap Send in WhatsApp.';
});
document.querySelectorAll('[data-enquiry]').forEach(link=>link.addEventListener('click',()=>{
  const message=document.querySelector('textarea[name="message"]');
  if(message&&!message.value.trim())message.value=link.dataset.enquiry||'';
}));
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fullMenuGrid=document.getElementById('full-menu-grid');
if(fullMenuGrid&&Array.isArray(window.HANGOVER_MENU)){
  fullMenuGrid.innerHTML=window.HANGOVER_MENU.map(section=>`
    <article class="full-menu-card" data-menu-group="${escapeHtml(section.group)}">
      <div class="full-menu-card-head"><span class="menu-card-kicker">${escapeHtml(section.group.toUpperCase())}</span><h3>${escapeHtml(section.category)}</h3></div>
      <ul>${section.items.map(item=>`<li><span>${escapeHtml(item[0])}</span><strong>${escapeHtml(item[1])}</strong></li>`).join('')}</ul>
    </article>`).join('');
}
const fullMenuShell=document.getElementById('full-menu-shell');const fullMenuClose=document.getElementById('close-full-menu');
const fullMenuOpeners=[document.getElementById('open-full-menu'),document.getElementById('open-full-menu-mobile')].filter(Boolean);
function openFullMenu(){
  if(!fullMenuShell||!fullMenuClose)return;
  fullMenuShell.classList.add('open');fullMenuShell.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';fullMenuClose.focus();
}
function closeFullMenu(){
  if(!fullMenuShell)return;
  fullMenuShell.classList.remove('open');fullMenuShell.setAttribute('aria-hidden','true');document.body.style.overflow='';
}
fullMenuOpeners.forEach(button=>button.addEventListener('click',openFullMenu));
fullMenuClose?.addEventListener('click',closeFullMenu);
fullMenuShell?.addEventListener('click',event=>{if(event.target===fullMenuShell)closeFullMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&fullMenuShell?.classList.contains('open'))closeFullMenu();});
const fullMenuTabs=[...document.querySelectorAll('[data-full-filter]')];
fullMenuTabs.forEach(tab=>tab.addEventListener('click',()=>{
  const filter=tab.dataset.fullFilter||'all';
  fullMenuTabs.forEach(item=>item.classList.toggle('active',item===tab));
  document.querySelectorAll('.full-menu-card').forEach(card=>{card.hidden=filter!=='all'&&card.dataset.menuGroup!==filter;});
  document.querySelector('.full-menu-dialog')?.scrollTo({top:0,behavior:reduceMotion?'auto':'smooth'});
}));
const firstRibbonLabel=document.querySelector('.ribbon span');if(firstRibbonLabel)firstRibbonLabel.textContent='SHAWARMA';
const featuredShawarma=document.querySelector('#menu-results .product');
if(featuredShawarma){
  featuredShawarma.dataset.category='bites';
  const image=featuredShawarma.querySelector('.product-image img');
  const badge=featuredShawarma.querySelector('.food-label');
  const eyebrow=featuredShawarma.querySelector('.product-copy .eyebrow');
  const title=featuredShawarma.querySelector('.product-copy h3');
  const description=featuredShawarma.querySelector('.product-copy > p:last-child');
  if(image){image.src='https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1200&q=86';image.alt='Fresh shawarma wrap with meat and vegetables';image.loading='lazy';}
  if(badge)badge.textContent='ROLL. BITE. REPEAT.';
  if(eyebrow)eyebrow.textContent='01 / THE SHAWARMA STAR';
  if(title)title.textContent='Shawarma';
  if(description)description.textContent='Classic · Mexican · Peri Peri · Schezwan · more';
}
// Published offers replace the previous hard-coded promotion cards. An empty published list hides the popup.
const offers=window.HS_MANAGED_OFFERS===null?[
  {tag:'Shawarma Special',title:'Classic Roll · Buy 1 Get 1',price:'₹160'},
  {tag:'Snack Special',title:'Panipuri Shawarma · 6 Pieces',price:'₹100'}
]:window.HS_MANAGED_OFFERS;
const offerMarkup=offers.length?`
  <button class="offer-fab" type="button" id="open-offers" aria-haspopup="dialog">🔥 Hot offers</button>
  <div class="offer-popup" id="offer-popup" aria-hidden="true"><section class="offer-dialog" role="dialog" aria-modal="true" aria-labelledby="offer-title">
    <button class="offer-close" type="button" id="close-offers" aria-label="Close offers">×</button>
    <p class="offer-kicker">Hangover Shakes Specials</p><h2 id="offer-title">HOT DEALS.<br><em>NO BAD PLANS.</em></h2>
    <div class="offer-grid">${offers.map(offer=>`<article class="offer-card"><span>${escapeHtml(offer.tag)}</span><h3>${escapeHtml(offer.title)}</h3><p class="offer-price">${escapeHtml(offer.price)}</p></article>`).join('')}</div>
    <div class="offer-actions"><button class="button" type="button" id="offer-view-menu">View full menu ↗</button><button class="text-link" type="button" id="offer-not-now">Maybe later</button></div>
  </section></div>`:'';
if(offerMarkup)document.body.insertAdjacentHTML('beforeend',offerMarkup);
const offerPopup=document.getElementById('offer-popup');const offerOpen=document.getElementById('open-offers');
const offerClose=document.getElementById('close-offers');const offerLater=document.getElementById('offer-not-now');
const offerMenu=document.getElementById('offer-view-menu');let offerLastFocus=null;
function openOffers(){
  if(!offerPopup)return;
  offerLastFocus=document.activeElement;offerPopup.classList.add('open');offerPopup.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';offerClose?.focus();
  try{sessionStorage.setItem('hangoverOffersSeen','1');}catch(_){}
}
function closeOffers(){
  if(!offerPopup)return;
  offerPopup.classList.remove('open');offerPopup.setAttribute('aria-hidden','true');
  if(!fullMenuShell?.classList.contains('open'))document.body.style.overflow='';
  if(offerLastFocus instanceof HTMLElement)offerLastFocus.focus();
}
offerOpen?.addEventListener('click',openOffers);offerClose?.addEventListener('click',closeOffers);
offerLater?.addEventListener('click',closeOffers);
offerPopup?.addEventListener('click',event=>{if(event.target===offerPopup)closeOffers();});
offerMenu?.addEventListener('click',()=>{closeOffers();openFullMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&offerPopup?.classList.contains('open'))closeOffers();});
let showOffers=Boolean(offerPopup);
try{showOffers=showOffers&&!sessionStorage.getItem('hangoverOffersSeen');}catch(_){}
if(showOffers)window.setTimeout(openOffers,900);
const orderingStyles=document.createElement('link');orderingStyles.rel='stylesheet';orderingStyles.href='ordering.css';document.head.append(orderingStyles);
await loadScript('ordering.js');
})();
