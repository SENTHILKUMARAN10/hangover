const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
if('IntersectionObserver' in window&&!reduceMotion){
  document.body.classList.add('motion-ready');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
}
document.getElementById('year').textContent=new Date().getFullYear();

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
  shell.classList.add('open'); shell.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; closer.focus();
}
function closeFullMenu(){
  shell.classList.remove('open'); shell.setAttribute('aria-hidden','true'); document.body.style.overflow='';
}
openers.forEach(btn=>btn.addEventListener('click',openFullMenu));
closer.addEventListener('click',closeFullMenu);
shell.addEventListener('click',e=>{if(e.target===shell) closeFullMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shell.classList.contains('open')) closeFullMenu()});

const fullTabs=[...document.querySelectorAll('[data-full-filter]')];
const fullCards=[...document.querySelectorAll('.full-menu-card')];
fullTabs.forEach(tab=>tab.addEventListener('click',()=>{
  const filter=tab.dataset.fullFilter;
  fullTabs.forEach(t=>t.classList.toggle('active',t===tab));
  fullCards.forEach(card=>{card.hidden=filter!=='all'&&card.dataset.menuGroup!==filter});
  document.querySelector('.full-menu-dialog')?.scrollTo({top:0,behavior:'smooth'});
}));
