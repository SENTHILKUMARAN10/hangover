'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.resolve(__dirname,'..');const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const boot=(config,snapshot)=>{
 const store=new Map([['hangover-dinein-cart-v1-table-1','{"s0i0v0":2}'],['hs-published-menu-revision','0']]);
 const storage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key),key:index=>[...store.keys()][index]||null,get length(){return store.size;}};
 const client={from:table=>{assert.equal(table,'hs_content');return {select:()=>({eq:()=>({maybeSingle:async()=>({data:snapshot,error:null})})})};}};
 const window={HS_ORDER_CONFIG:config,HANGOVER_MENU:[{category:'Old',group:'meals',items:[['Old item','₹100']]}],supabase:{createClient:()=>client}};
 const sandbox={window,localStorage:storage,console:{warn:()=>{}},setInterval:()=>{},location:{reload:()=>{}}};
 vm.runInNewContext(read('cms-public.js'),sandbox,{filename:'cms-public.js',timeout:1000});return {window,store};
};
(async()=>{
 const blank=boot({},null);await blank.window.HS_CMS_READY;
 assert.equal(blank.window.HS_CONTENT_UNAVAILABLE,false,'Unconfigured demo should preserve fallback menu');assert.equal(blank.window.HS_MANAGED_OFFERS,null,'No manager data means original offers stay visible');
 const published={published:true,revision:2,menu:[{category:'Brownies',group:'desserts',items:[['Hot brownie','₹80',true],['Sold out brownie','₹90',false]]},{category:'Empty',group:'meals',items:[['Unavailable','₹100',false]]}],offers:[{tag:'Fresh deal',title:'Free topping',price:'₹0',active:true},{tag:'Old',title:'Expired',price:'₹100',active:false}]};
 const live=boot({supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_example'},published);await live.window.HS_CMS_READY;
 assert.equal(live.window.HS_CONTENT_UNAVAILABLE,false);assert.equal(live.window.HANGOVER_MENU.length,1,'Empty categories must be excluded');assert.equal(live.window.HANGOVER_MENU[0].items.length,1,'Sold out items must not be orderable');assert.equal(live.window.HS_MANAGED_OFFERS.length,1,'Inactive offers must be hidden');assert.equal(live.store.has('hangover-dinein-cart-v1-table-1'),false,'Old cart IDs must be cleared on revision change');assert.equal(live.store.get('hs-published-menu-revision'),'2');
 const offline=boot({supabaseUrl:'https://example.supabase.co',publishableKey:'sb_publishable_example'},null);await offline.window.HS_CMS_READY;
 assert.equal(offline.window.HS_CONTENT_UNAVAILABLE,true,'Unpublished menu must fail closed');
 const site=read('app.js'),kitchen=read('cms-kitchen.js'),editor=read('cms-admin.js'),sql=read('cms-schema.sql');
 assert.ok(site.indexOf("loadScript('cms-public.js')")<site.lastIndexOf("loadScript('ordering.js')"));assert.match(site,/if \(window\.HS_CONTENT_UNAVAILABLE\)/,'Site must pause ordering on missing menu');assert.match(kitchen,/await window\.HS_CMS_READY/,'Kitchen must wait for same published menu');assert.match(kitchen,/if \(window\.HS_CONTENT_UNAVAILABLE\)/,'Kitchen must not accept stale orders');
 assert.match(editor,/if\(demo \|\| !client \|\| busy\)return/,'Demo must not publish');assert.match(editor,/\.eq\('revision',revision\)/,'Publishing must reject stale revisions');
 assert.match(sql,/enable row level security/g);assert.match(sql,/for update to authenticated/);assert.match(sql,/hs_content_editors e/);assert.match(sql,/for select to anon using \(published = true\)/);assert.doesNotMatch(sql,/grant (all|update|insert|delete) on public\.hs_content to anon/i,'Guests must never edit menu');assert.doesNotMatch(editor+site,/sb_secret_|SUPABASE_SERVICE_ROLE_KEY/,'No secrets in browser scripts');
 assert.match(read('admin.html'),/id="hs-hub-menu"/,'Admin must link to manager page');assert.match(read('manage.html'),/cms-admin\.js/,'Management screen must load editor');assert.match(read('staff.html'),/staff\.js/,'Staff UI missing');
 const roster=read('staff-schema.sql');assert.match(roster,/enable row level security/);assert.match(roster,/for update to authenticated/);assert.match(roster,/hs_content_editors e/);assert.doesNotMatch(roster,/grant .* on public\.hs_staff_roster to anon/,'Anonymous staff access prohibited');
 console.log('PASS: published menu, availability, offers, cart revision, fail-closed kitchen, manager access, roster and preview contracts');
})().catch(error=>{console.error(error);process.exitCode=1;});
