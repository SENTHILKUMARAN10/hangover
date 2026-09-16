/* Zero-dependency checks for the temporary ordering experience.
   Run with: node tests/ordering-contract.test.cjs */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const context = {window: {}};
vm.runInNewContext(read('menu-data.js'), context, {filename: 'menu-data.js', timeout: 1000});
const menu = context.window.HANGOVER_MENU;
assert.ok(Array.isArray(menu) && menu.length > 10, 'The complete menu must be present');
const products = new Map();
let itemCount = 0;
let variantCount = 0;
for (const [s, section] of menu.entries()) {
  assert.ok(typeof section.category === 'string' && section.category.trim());
  assert.ok(Array.isArray(section.items) && section.items.length);
  for (const [i, item] of section.items.entries()) {
    assert.equal(item.length, 2, `Unexpected menu tuple in ${section.category}`);
    assert.ok(typeof item[0] === 'string' && item[0].trim());
    const prices = [...String(item[1]).matchAll(/₹\s*(\d+)/g)].map(match => Number(match[1]));
    assert.ok(prices.length >= 1 && prices.length <= 2, `Unorderable item: ${item[0]}`);
    const options = item[0].split(' — ')[1]?.split(' / ') || [];
    if (prices.length === 2) {
      assert.equal(options.length, 2, `Two prices need two named variants: ${item[0]}`);
      assert.ok(options.every(option => option.trim()), `Empty variant in ${item[0]}`);
    }
    for (const [v, price] of prices.entries()) {
      assert.ok(Number.isSafeInteger(price) && price > 0 && price <= 10000, `Invalid price: ${item[0]}`);
      const id = `s${s}i${i}v${v}`;
      assert.ok(!products.has(id), `Duplicate cart ID: ${id}`);
      products.set(id, {item: item[0], price});
      variantCount++;
    }
    itemCount++;
  }
}
const findPrices = label => [...products.values()].filter(product => product.item === label).map(product => product.price);
assert.deepEqual(findPrices('Classic — Roll / Plate'), [100, 160], 'Classic shawarma prices changed');
assert.deepEqual(findPrices('Scotch Oreo — Normal / Special'), [120, 190], 'Shake prices changed');
assert.deepEqual(findPrices('Hot Brownie'), [80], 'Dessert prices changed');
const customer = read('ordering.js');
const owner = read('admin.js');
const config = read('ordering-config.js');
const policies = read('supabase-realtime-policies.sql');
const setup = read('ORDERING_SETUP.md');
const adminHtml = read('admin.html');
const site = read('app.js');
assert.match(customer, /cart\.set\(/, 'Cart quantity controls missing');
assert.match(customer, /form\.reportValidity\(\)/, 'Customer form validation missing');
assert.match(customer, /pending=\{id,received:false\}/, 'Missing order acknowledgment tracking');
assert.match(customer, /WhatsApp opens a draft only/, 'WhatsApp must never claim an order was sent');
assert.match(owner, /function validateOrder\(raw\)/, 'Missing owner-side order validation');
assert.match(owner, /catalog\.get\(row\?\.id\)/, 'Owner must calculate trusted catalog prices');
assert.match(owner, /auth\.getUser\(\)/, 'Owner Auth check missing');
assert.match(policies, /on realtime\.messages for select to authenticated/, 'Owner-only read policy missing');
assert.match(policies, /on realtime\.messages for insert to anon/, 'Customer send-only policy missing');
assert.match(config, /supabaseUrl: ''/, 'Do not enable untested realtime at commit time');
assert.match(config, /publishableKey: ''/, 'Do not add secrets to repository');
assert.doesNotMatch(config, /service_role|sb_secret_|SUPABASE_SERVICE_ROLE_KEY/i, 'Secret key in browser config');
assert.match(adminHtml, /name="robots" content="noindex,nofollow,noarchive"/, 'Admin indexing disabled');
assert.match(setup, /two-device end-to-end test/i, 'Deployment needs end-to-end test');
assert.match(site, /ordering\.js/, 'Customer order UI not connected to website');
assert.doesNotMatch(customer + owner, /\.from\(['"]orders['"]\)/, 'Orders must not be persisted to a database table');
console.log(`PASS: ${menu.length} menu sections, ${itemCount} items, ${variantCount} purchasable variants; checkout/auth/policy/handoff contracts OK.`);
