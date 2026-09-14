const paletteSheet=document.createElement('link');
paletteSheet.rel='stylesheet';
paletteSheet.href='palette.css?v=20260914';
document.head.appendChild(paletteSheet);
document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#FFD500');

const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const header=document.getElementById('site-header');
addEventListener('scroll',()=>header?.classList.toggle('scrolled',scrollY>24),{passive:true});

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

const form=document.getElementById('contact-form');
form?.addEventListener('submit',event=>{event.preventDefault();const data=new FormData(form);const text=`Enquiry for Hangover Shakes\nName: ${data.get('name')}\nEmail: ${data.get('email')||'Not provided'}\nPhone: ${data.get('phone')||'Not provided'}\n\n${data.get('message')}`;const url='https://wa.me/917708262499?text='+encodeURIComponent(text);const link=document.getElementById('whatsapp-fallback');link.href=url;link.hidden=false;window.open(url,'_blank','noopener,noreferrer');document.getElementById('form-status').textContent='Your WhatsApp draft is ready. Review it and tap Send in WhatsApp. If it did not open, use the link below.';});

const menuTools=document.querySelector('.menu-tools'),filterButtons=[...document.querySelectorAll('[data-filter]')],menuCards=[...document.querySelectorAll('.food-card[data-category]')];
let activeCategory='all';
function filterMenu(){let count=0;menuCards.forEach(card=>{const show=activeCategory==='all'||card.dataset.category===activeCategory;card.hidden=!show;if(show){count++;card.classList.add('visible')}});document.getElementById('menu-count').textContent=`${count} of ${menuCards.length} highlights`;document.querySelector('.menu-empty').hidden=count>0;}
if(menuTools){menuTools.hidden=false;filterButtons.forEach(button=>button.addEventListener('click',()=>{activeCategory=button.dataset.filter;filterButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));filterMenu()}));document.getElementById('reset-menu')?.addEventListener('click',()=>{activeCategory='all';filterButtons.forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.filter==='all')));filterMenu();filterButtons[0]?.focus()});filterMenu();}

if(!reduceMotion&&matchMedia('(pointer:fine)').matches){
 const glow=document.querySelector('.cursor-glow');
 addEventListener('pointermove',e=>{if(glow){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'}});
 document.querySelectorAll('[data-tilt]').forEach(card=>{card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(1000px) rotateY(${x*5}deg) rotateX(${-y*5}deg)`});card.addEventListener('pointerleave',()=>card.style.transform='')});
}