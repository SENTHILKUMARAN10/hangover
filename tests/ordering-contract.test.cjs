/* Dependency-free static contracts. Live two-device testing is still required. */
'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.resolve(__dirname,'..');const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const context={window:{}};vm.runInNewContext(read('menu-data.js'),context,{filename:'menu-data.js',timeout:1000});
const menu=context.window.HANGOVER_MENU;assert.ok(Array.isArray(menu)&&menu.length>10,'Complete menu missing');
const products=new Map();let itemCount=0,variantCount=0;
for(const [s,section] of menu.entries()){
 assert.ok(typeof section.category==='string'&&section.category.trim());assert.ok(Array.isArray(section.items)&&section.items.length);
 for(const [i,item] of section.items.entries()){
  assert.equal(item.length,2,`Unexpected menu tuple in ${section.category}`);assert.ok(typeof item[0]==='string'&&item[0].trim());
  const prices=[...String(item[1]).matchAll(/₹\s*(\d+)/g)].map(m=>Number(m[1]));assert.ok(prices.length>=1&&prices.length<=2,`Unorderable menu item: ${item[0]}`);
  const variants=item[0].split(' — ')[1]?.split(' / ')||[];
  if(prices.length===2){assert.equal(variants.length,2,`Two prices require two labels: ${item[0]}`);assert.ok(variants.every(v=>v.trim()));}
  for(const [v,price] of prices.entries()){
   assert.ok(Number.isSafeInteger(price)&&price>0&&price<=10000,`Invalid price: ${item[0]}`);
   const id=`s${s}i${i}v${v}`;assert.ok(!products.has(id),`Duplicate product ID: ${id}`);products.set(id,{name:item[0],price});variantCount++;
  }itemCount++;
 }
}
const pricesFor=name=>[...products.values()].filter(p=>p.name===name).map(p=>p.price);
assert.deepEqual(pricesFor('Classic — Roll / Plate'),[100,160]);assert.deepEqual(pricesFor('Scotch Oreo — Normal / Special'),[120,190]);assert.deepEqual(pricesFor('Hot Brownie'),[80]);
const customer=read('ordering.js'),kitchen=read('admin.js'),kitchenLoader=read('cms-kitchen.js'),config=read('ordering-config.js');
const policies=read('supabase-realtime-policies.sql'),setup=read('ORDERING_SETUP.md');
const adminHtml=read('admin.html'),kitchenHtml=read('kitchen.html'),qrHtml=read('table-qr.html'),qrJs=read('table-qr.js'),site=read('app.js'),hub=read('admin-hub.js');
assert.match(customer,/params\.get\('table'\)/,'Table URL not read');assert.match(customer,/table:tableNumber/,'Checkout payload missing table number');assert.match(customer,/fulfillment:'dine-in'/,'Not dine-in checkout');assert.match(customer,/cart\.set\(/,'Cart controls missing');assert.match(customer,/form\.reportValidity\(\)/,'Missing checkout validation');assert.match(customer,/pending=\{id,received:false\}/,'Missing receipt acknowledgment');assert.match(customer,/kitchenOnline/,'Kitchen online availability missing');
assert.doesNotMatch(customer,/wa\.me|whatsapp|pickup|online delivery/i,'Removed ordering flow still includes WhatsApp or pickup');assert.doesNotMatch(customer,/name="phone"|raw\.phone/,'Guest phone must not be required');
assert.match(kitchen,/function validateOrder\(raw\)/,'Kitchen order validation missing');assert.match(kitchen,/raw\.table/,'Kitchen must validate table');assert.match(kitchen,/catalog\.get\(row\?\.id\)/,'Kitchen must calculate trusted catalog prices');assert.match(kitchen,/auth\.getUser\(\)/,'Kitchen must authenticate');assert.match(kitchen,/\['served'/,'Missing served status');assert.match(kitchenLoader,/script\.src = 'admin\.js'/,'CMS-aware kitchen must load actual kitchen logic');
assert.match(kitchenHtml,/data-filter="served"/,'Kitchen served filter missing');assert.match(kitchenHtml,/noindex,nofollow,noarchive/,'Kitchen page should not be indexed');assert.match(kitchenHtml,/cms-kitchen\.js/,'Kitchen must use published menu aware implementation');
assert.match(adminHtml,/admin-hub\.js/,'Admin entrance script missing');assert.match(adminHtml,/id="hs-hub-password"/,'Password-only entry missing');assert.match(adminHtml,/href="staff\.html\?demo=1"/,'Staff page missing from admin');assert.match(hub,/signInWithPassword\(/,'Real login must verify password server side');assert.match(hub,/if\(demo\)/,'Demo PIN must not grant live access');assert.match(config,/adminLoginEmail: ''/,'Do not hardcode someone else’s staff email');assert.doesNotMatch(config,/8585|password\s*:/,'Password must not be in live config');
assert.match(qrHtml,/table-qr\.js/,'QR generator not connected');assert.match(qrJs,/https:\/\/www\.hangovershakes\.cafe\//,'QR must point to cafe domain');assert.match(qrJs,/searchParams\.set\('table'/,'Table number missing from QR');assert.match(qrJs,/new window\.QRCode/,'QR image generation missing');
assert.match(policies,/on realtime\.messages for select to authenticated/,'Staff-only private read missing');assert.match(policies,/on realtime\.messages for insert to anon/,'Guest send-only policy missing');assert.match(policies,/kitchen@example\.com/,'Staff email must be explicitly configured');
assert.match(config,/supabaseUrl: ''/,'Do not enable untested realtime');assert.match(config,/publishableKey: ''/,'Do not publish a secret or premature endpoint');assert.match(config,/tableCount: 30/,'QR generator and website table range out of sync');assert.doesNotMatch(config,/service_role|sb_secret_|SUPABASE_SERVICE_ROLE_KEY/i,'Browser secret key detected');
assert.match(setup,/two-device end-to-end test/i,'Handoff must require full kitchen test');assert.match(site,/ordering\.js/,'Customer ordering not loaded');assert.doesNotMatch(customer+kitchen,/\.from\(['"]orders['"]\)/,'Orders should not be persisted');
console.log(`PASS: ${menu.length} menu sections, ${itemCount} items, ${variantCount} variants; dine-in QR, cart, unified admin, kitchen, password auth, RLS OK.`);
