/* One admin entrance. Demo PIN is NOT authorization; live auth uses Supabase password verification + RLS. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const cfg=window.HS_ORDER_CONFIG||{};
  const demo=new URLSearchParams(location.search).get('demo')==='1'||!(cfg.supabaseUrl&&cfg.publishableKey&&cfg.adminLoginEmail);
  const form=$('hs-hub-form'),field=$('hs-hub-password'),status=$('hs-hub-status');
  let client=null,failures=0,blockedUntil=0;
  const links={kitchen:$('hs-hub-kitchen'),menu:$('hs-hub-menu'),staff:$('hs-hub-staff')};
  function show(mode){
    $('hs-hub-login').hidden=true;$('hs-hub-workspace').hidden=false;
    $('hs-hub-mode').textContent=mode==='demo'?'· DEMO ONLY':'· STAFF SESSION';
    $('hs-hub-warning').textContent=mode==='demo'?'DEMO ONLY · All orders, menu edits and staff records are samples. PIN 8585 is visible in public demo code; it never grants live access. QR cards target the real domain, so do not print them for use until deployment and testing.':'Signed in. Kitchen and menu permissions are checked separately by the database. Real customer ordering remains disabled until the café backend and two-device test are complete.';
    links.kitchen.href=mode==='demo'?'demo-kitchen.html':'kitchen.html';
    links.menu.href=mode==='demo'?'manage.html?demo=1':'manage.html';
    links.staff.href=mode==='demo'?'staff.html?demo=1':'staff.html';
  }
  function lock(){
    $('hs-hub-workspace').hidden=true;$('hs-hub-login').hidden=false;field.value='';
    status.textContent=demo?'Preview mode: enter the temporary demo PIN to explore. No live data is connected.':'Enter the café admin password. No email or OTP is required on this screen.';
  }
  async function verifySession(){
    if(!client)return;
    try{
      const {data:{user},error}=await client.auth.getUser();
      if(error||!user||!user.email_confirmed_at||user.email?.toLowerCase()!==cfg.adminLoginEmail.toLowerCase())return;
      show('live');
    }catch(_){status.textContent='Could not verify your session. Try again when connected.';}
  }
  if(!demo&&window.supabase?.createClient){
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    status.textContent='Password only. The café account is verified by the authentication service.';
    verifySession();
  }else{
    status.textContent=demo?'Preview mode: enter the temporary demo PIN. No live access is enabled.':'Admin service unavailable; do not use this login for real orders.';
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(Date.now()<blockedUntil){status.textContent='Too many attempts. Try again shortly.';return;}
    const password=field.value;field.value='';
    const button=$('hs-hub-enter');button.disabled=true;
    try{
      if(demo){
        if(password!=='8585')throw Error('Wrong demo PIN.');
        failures=0;show('demo');return;
      }
      if(!client)throw Error('Live authentication is not configured.');
      if(password.length<8)throw Error('Live admin passwords must have at least 8 characters. The demo PIN cannot unlock real orders.');
      status.textContent='Verifying password…';
      const {data,error}=await client.auth.signInWithPassword({email:cfg.adminLoginEmail,password});
      if(error)throw error;
      if(!data.user?.email_confirmed_at||data.user.email?.toLowerCase()!==cfg.adminLoginEmail.toLowerCase()){
        await client.auth.signOut();throw Error('This account is not authorised for Admin HQ.');
      }
      failures=0;show('live');
    }catch(error){
      failures++;
      if(failures>=5){blockedUntil=Date.now()+30000;failures=0;}
      status.textContent=demo?'Incorrect demo PIN. Check the four digits and try again.':error.message==='Wrong demo PIN.'?'Incorrect password.':'Sign-in failed. Check the café password and backend configuration.';
    }finally{button.disabled=false;}
  });
  $('hs-hub-logout').addEventListener('click',async()=>{
    if(client)await client.auth.signOut();lock();field.focus();
  });
})();