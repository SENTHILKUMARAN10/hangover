/* Roster only. Never creates Auth users or grants kitchen/menu privileges. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), cfg=window.HS_ORDER_CONFIG||{};
 const demo=new URLSearchParams(location.search).get('demo')==='1';
 const list=$('hs-staff-list'),form=$('hs-staff-add'),workspace=$('hs-staff-workspace'),status=$('hs-staff-notice');
 let client=null,items=[],busy=false;
 const sample=[{id:'sample-1',name:'Arun Kumar',role:'manager',shift:'Morning',active:true},{id:'sample-2',name:'Priya',role:'kitchen',shift:'Evening',active:true},{id:'sample-3',name:'Karthik',role:'service',shift:'Weekend',active:false}];
 const text=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;return el;};
 const notify=message=>{status.textContent=message;};
 const valid=record=>record.name.trim().length>0&&record.name.length<=70&&['manager','kitchen','service'].includes(record.role)&&record.shift.trim().length>0&&record.shift.length<=60;
 function render(){
  list.replaceChildren();
  if(!items.length){list.append(text('p','No staff in the roster. Add a staff member using the form.'));return;}
  for(const person of items){
   const card=document.createElement('article');card.className='hs-staff-card';
   const head=document.createElement('header');head.append(text('strong',person.name),text('span',person.active?'● Active':'○ Inactive'));card.append(head);
   const fields={};
   for(const [key,label] of [['name','Staff name'],['role','Team role'],['shift','Shift']]){
    const wrapper=document.createElement('label');wrapper.append(text('span',label));
    const input=document.createElement(key==='role'?'select':'input');input.value=person[key];input.name=key;
    if(key==='role'){for(const value of ['manager','kitchen','service']){const option=document.createElement('option');option.value=value;option.textContent=value[0].toUpperCase()+value.slice(1);input.append(option);}input.value=person.role;}
    else input.maxLength=key==='name'?70:60;
    wrapper.append(input);card.append(wrapper);fields[key]=input;
   }
   const activity=document.createElement('label');activity.className='hs-staff-activity';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=person.active;activity.append(checkbox,text('span','Active on roster'));card.append(activity);
   const actions=document.createElement('div');actions.className='hs-staff-actions';const save=text('button','Save changes');save.type='button';save.className='button';const remove=text('button','Remove staff');remove.type='button';remove.className='button hs-staff-delete';actions.append(save,remove);card.append(actions);
   card.append(text('p',demo?'Sample record only · Changes are not saved to your café.':'Roster status only · Does not grant or revoke login access.'));
   save.addEventListener('click',async()=>{
     const update={name:fields.name.value.trim(),role:fields.role.value,shift:fields.shift.value.trim(),active:checkbox.checked};
     if(!valid(update)){notify('Enter a valid name and shift (70 and 60 characters max).');return;}
     if(busy)return;busy=true;save.disabled=true;
     try{
      if(client){const {data,error}=await client.from('hs_staff_roster').update(update).eq('id',person.id).select('id').single();if(error)throw error;if(!data)throw Error('Save not authorised.');}
      Object.assign(person,update);notify(demo?'Demo record updated locally. Live website is unchanged.':'Staff roster updated. Account login permissions are unchanged.');render();
     }catch(error){notify('Unable to save roster: '+error.message);}finally{busy=false;save.disabled=false;}
   });
   remove.addEventListener('click',async()=>{
    if(busy||!confirm('Remove '+person.name+' from the roster? This will not revoke an Auth account.'))return;
    busy=true;remove.disabled=true;
    try{
     if(client){const {data,error}=await client.from('hs_staff_roster').delete().eq('id',person.id).select('id').single();if(error)throw error;if(!data)throw Error('Removal not authorised.');}
     items=items.filter(row=>row.id!==person.id);notify(demo?'Removed sample staff member.':'Removed roster entry. Revoke their Auth account separately if needed.');render();
    }catch(error){notify('Unable to remove roster entry: '+error.message);}finally{busy=false;remove.disabled=false;}
   });list.append(card);
  }
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const data=new FormData(form),row={name:String(data.get('name')||'').trim(),role:String(data.get('role')||''),shift:String(data.get('shift')||'').trim(),active:true};
  if(!valid(row)){notify('Enter a valid name, role and shift.');return;}
  busy=true;const button=form.querySelector('button');button.disabled=true;
  try{
   if(client){const result=await client.from('hs_staff_roster').insert(row).select('id,name,role,shift,active').single();if(result.error)throw result.error;items.push(result.data);}
   else items.push({...row,id:'demo-'+Date.now()+'-'+items.length});
   form.reset();notify(demo?'Sample member added for this demo only.':'Staff roster updated. To grant login access, the owner must provision an account separately.');render();
  }catch(error){notify('Could not add staff: '+error.message);}finally{busy=false;button.disabled=false;}
 });
 async function init(){
  if(demo){items=sample.map(row=>({...row}));$('hs-staff-mode').textContent='● DEMO';workspace.hidden=false;notify('Demo preview · no real staff, accounts or live database are changed.');render();return;}
  if(!cfg.supabaseUrl||!cfg.publishableKey||!window.supabase?.createClient){$('hs-staff-mode').textContent='● NOT CONFIGURED';$('hs-staff-login').hidden=false;notify('Live staff roster requires the dedicated café database and manager authentication. Use Admin HQ demo for a preview.');return;}
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  try{
   const {data:{user},error}=await client.auth.getUser();if(error||!user||!user.email_confirmed_at)throw Error('Sign in via Admin HQ first.');
   const role=await client.from('hs_content_editors').select('role').eq('user_id',user.id).maybeSingle();if(role.error||role.data?.role!=='manager')throw Error('This account is not authorised to manage the staff roster.');
   const {data,error:rosterError}=await client.from('hs_staff_roster').select('id,name,role,shift,active').order('name');if(rosterError)throw rosterError;
   items=data||[];workspace.hidden=false;$('hs-staff-mode').textContent='● AUTHORISED MANAGER';notify('Live roster connected. Roster edits do not change login privileges.');render();
  }catch(error){client=null;$('hs-staff-login').hidden=false;$('hs-staff-mode').textContent='● NO ACCESS';notify('Staff management unavailable: '+error.message);}
 }
 init();
})();