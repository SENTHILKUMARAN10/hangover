const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window&&!reduceMotion){
  document.body.classList.add('motion-ready');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

const toggle=document.querySelector('.nav-toggle'),nav=document.getElementById('navigation');
toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav?.classList.toggle('open',open)});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{toggle?.setAttribute('aria-expanded','false');nav.classList.remove('open')}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){toggle?.setAttribute('aria-expanded','false');nav.classList.remove('open');toggle?.focus()}});

document.getElementById('contact-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  const text=`Enquiry for Hangover Shakes\nName: ${data.get('name')}\nEmail: ${data.get('email')||'Not provided'}\nPhone: ${data.get('phone')||'Not provided'}\n\n${data.get('message')}`;
  const url='https://wa.me/919791851906?text='+encodeURIComponent(text);
  const link=document.getElementById('whatsapp-fallback');
  link.href=url; link.hidden=false;
  window.open(url,'_blank','noopener,noreferrer');
  document.getElementById('form-status').textContent='Your WhatsApp draft is ready. Review it and tap Send in WhatsApp.';
});

const menuTools=document.querySelector('.menu-tools'),filterButtons=[...document.querySelectorAll('[data-filter]')],menuCards=[...document.querySelectorAll('.product[data-category]')];
let activeCategory='all';
function filterMenu(){
  let count=0;
  menuCards.forEach(card=>{const show=(activeCategory==='all'||card.dataset.category===activeCategory);card.hidden=!show;if(show){count++;card.classList.add('visible')}});
  const countEl=document.getElementById('menu-count'); if(countEl) countEl.textContent=`${count} of ${menuCards.length} menu highlights`;
  const empty=document.querySelector('.menu-empty'); if(empty) empty.hidden=count>0;
}
if(menuTools){
  menuTools.hidden=false;
  filterButtons.forEach(button=>button.addEventListener('click',()=>{activeCategory=button.dataset.filter;filterButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));filterMenu()}));
  document.getElementById('reset-menu')?.addEventListener('click',()=>{activeCategory='all';filterButtons.forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.filter==='all')));filterMenu();filterButtons[0]?.focus()});
  filterMenu();
}

document.querySelectorAll('[data-enquiry]').forEach(link=>link.addEventListener('click',()=>{
  const message=document.querySelector('textarea[name=message]');
  if(message&&!message.value.trim()) message.value=link.dataset.enquiry;
}));

const fullMenuGrid=document.getElementById('full-menu-grid');
if(fullMenuGrid&&Array.isArray(window.HANGOVER_MENU)){
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  fullMenuGrid.innerHTML=window.HANGOVER_MENU.map(section=>`<article class="full-menu-card" data-menu-group="${esc(section.group)}"><div class="full-menu-card-head"><span class="menu-card-kicker">${esc(section.group.toUpperCase())}</span><h3>${esc(section.category)}</h3></div><ul>${section.items.map(item=>`<li><span>${esc(item[0])}</span><strong>${esc(item[1])}</strong></li>`).join('')}</ul></article>`).join('');
}

const shell=document.getElementById('full-menu-shell');
const openers=[document.getElementById('open-full-menu'),document.getElementById('open-full-menu-mobile')].filter(Boolean);
const closer=document.getElementById('close-full-menu');
function openFullMenu(){
  if(!shell||!closer)return;
  shell.classList.add('open'); shell.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; closer.focus();
}
function closeFullMenu(){
  if(!shell)return;
  shell.classList.remove('open'); shell.setAttribute('aria-hidden','true'); document.body.style.overflow='';
}
openers.forEach(btn=>btn.addEventListener('click',openFullMenu));
closer?.addEventListener('click',closeFullMenu);
shell?.addEventListener('click',e=>{if(e.target===shell) closeFullMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell?.classList.contains('open')) closeFullMenu()});

const fullTabs=[...document.querySelectorAll('[data-full-filter]')];
const fullCards=[...document.querySelectorAll('.full-menu-card')];
fullTabs.forEach(tab=>tab.addEventListener('click',()=>{
  const filter=tab.dataset.fullFilter;
  fullTabs.forEach(t=>t.classList.toggle('active',t===tab));
  fullCards.forEach(card=>{card.hidden=filter!=='all'&&card.dataset.menuGroup!==filter});
  document.querySelector('.full-menu-dialog')?.scrollTo({top:0,behavior:'smooth'});
}));

/* Glass header interaction */
const siteHeader=document.querySelector('.header');
const syncHeaderGlass=()=>siteHeader?.classList.toggle('is-scrolled',scrollY>18);
syncHeaderGlass();
addEventListener('scroll',syncHeaderGlass,{passive:true});

/* Promote Shawarma in the same existing menu layout */
const firstRibbonLabel=document.querySelector('.ribbon span');
if(firstRibbonLabel) firstRibbonLabel.textContent='SHAWARMA';

const featuredShawarma=document.querySelector('#menu-results .product');
if(featuredShawarma){
  featuredShawarma.dataset.category='bites';
  const image=featuredShawarma.querySelector('.product-image img');
  const badge=featuredShawarma.querySelector('.food-label');
  const eyebrow=featuredShawarma.querySelector('.product-copy .eyebrow');
  const title=featuredShawarma.querySelector('.product-copy h3');
  const desc=featuredShawarma.querySelector('.product-copy>p:last-child');
  if(image){
    image.src='https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1200&q=86';
    image.alt='Fresh shawarma wrap with meat and vegetables';
    image.loading='lazy';
  }
  if(badge) badge.textContent='ROLL. BITE. REPEAT.';
  if(eyebrow) eyebrow.textContent='01 / THE SHAWARMA STAR';
  if(title) title.textContent='Shawarma';
  if(desc) desc.textContent='Classic · Mexican · Peri Peri · Schezwan · more';
}

/* Highlighted offers popup */
const offerMarkup=`
<button class="offer-fab" type="button" id="open-offers" aria-haspopup="dialog">🔥 Hot offers</button>
<div class="offer-popup" id="offer-popup" aria-hidden="true">
  <section class="offer-dialog" role="dialog" aria-modal="true" aria-labelledby="offer-title">
    <button class="offer-close" type="button" id="close-offers" aria-label="Close offers">×</button>
    <p class="offer-kicker">Hangover Shawarma Specials</p>
    <h2 id="offer-title">HOT DEALS.<br><em>NO BAD PLANS.</em></h2>
    <div class="offer-grid">
      <article class="offer-card">
        <span>Shawarma Special</span>
        <h3>Classic Roll<br>Buy 1 Get 1</h3>
        <p class="offer-price">₹160</p>
      </article>
      <article class="offer-card">
        <span>Snack Special</span>
        <h3>Panipuri Shawarma<br>6 Pieces</h3>
        <p class="offer-price">₹100</p>
      </article>
    </div>
    <div class="offer-actions">
      <button class="button" type="button" id="offer-view-menu">View full menu ↗</button>
      <button class="text-link" type="button" id="offer-not-now">Maybe later</button>
    </div>
  </section>
</div>`;
document.body.insertAdjacentHTML('beforeend',offerMarkup);

const offerPopup=document.getElementById('offer-popup');
const offerOpen=document.getElementById('open-offers');
const offerClose=document.getElementById('close-offers');
const offerLater=document.getElementById('offer-not-now');
const offerMenu=document.getElementById('offer-view-menu');
let offerLastFocus=null;
function openOffers(){
  if(!offerPopup)return;
  offerLastFocus=document.activeElement;
  offerPopup.classList.add('open');
  offerPopup.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  offerClose?.focus();
  try{sessionStorage.setItem('hangoverOffersSeen','1')}catch(e){}
}
function closeOffers(){
  if(!offerPopup)return;
  offerPopup.classList.remove('open');
  offerPopup.setAttribute('aria-hidden','true');
  if(!shell?.classList.contains('open')) document.body.style.overflow='';
  if(offerLastFocus instanceof HTMLElement) offerLastFocus.focus();
}
offerOpen?.addEventListener('click',openOffers);
offerClose?.addEventListener('click',closeOffers);
offerLater?.addEventListener('click',closeOffers);
offerPopup?.addEventListener('click',e=>{if(e.target===offerPopup)closeOffers()});
offerMenu?.addEventListener('click',()=>{closeOffers();openFullMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&offerPopup?.classList.contains('open'))closeOffers()});

let showOffers=true;
try{showOffers=!sessionStorage.getItem('hangoverOffersSeen')}catch(e){}
if(showOffers) setTimeout(openOffers,900);
