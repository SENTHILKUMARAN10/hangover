/* Print-only QR generator. Numbers are public identifiers, NOT proof of being on premises. */
(() => {
  'use strict';
  const form=document.getElementById('qr-form'),grid=document.getElementById('qr-grid');
  if(!form||!grid)return;
  const error=document.getElementById('qr-error'),print=document.getElementById('print-qr');
  const site='https://www.hangovershakes.cafe/';
  function generate(event){
    event?.preventDefault();
    const first=Number(form.elements.namedItem('first').value);
    const last=Number(form.elements.namedItem('last').value);
    grid.replaceChildren();print.disabled=true;error.textContent='';
    if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last>30||first>last){
      error.textContent='Enter a valid table range from 1 to 30, with the first number before the last.';return;
    }
    if(typeof window.QRCode!=='function'){
      error.textContent='QR generator could not load. Check the connection and reload; do not print blank codes.';return;
    }
    for(let n=first;n<=last;n++){
      const url=new URL(site);url.searchParams.set('table',String(n).padStart(2,'0'));
      const card=document.createElement('article');card.className='hs-qr-ticket';
      const brand=document.createElement('span');brand.className='hs-qr-brand';brand.textContent='HANGOVER SHAKES · TIRUPPUR';
      const title=document.createElement('h2');title.textContent='SCAN. ORDER. CHILL.';
      const label=document.createElement('strong');label.textContent=`TABLE ${String(n).padStart(2,'0')}`;
      const qr=document.createElement('div');qr.className='qr';qr.setAttribute('role','img');qr.setAttribute('aria-label',`QR for table ${n}`);
      const instructions=document.createElement('p');instructions.textContent='Scan with your phone → choose food → send to kitchen. Stay at your table; we serve you.';
      const address=document.createElement('p');address.className='hs-qr-url';address.textContent=url.href;
      card.append(brand,title,label,qr,instructions,address);grid.append(card);
      new window.QRCode(qr,{text:url.href,width:148,height:148,colorDark:'#291C0E',colorLight:'#FFFFFF',correctLevel:window.QRCode.CorrectLevel.M});
    }
    print.disabled=false;
  }
  form.addEventListener('submit',generate);
  print.addEventListener('click',()=>{if(!print.disabled)window.print();});
  if(document.readyState==='complete')generate();
  else window.addEventListener('load',()=>generate(),{once:true});
})();
