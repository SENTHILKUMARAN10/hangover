# Hangover Shakes — handoff for the friend managing www.hangovershakes.cafe

Repository: https://github.com/SENTHILKUMARAN10/hangover (`main`).
Domain: https://www.hangovershakes.cafe/ — friend manages existing hosting. Domain connectivity has NOT been verified by this repository.

## Update the existing clone safely

In your EXISTING Hangover Shakes project folder:

```bash
git status
git remote -v
git fetch origin
git pull --ff-only origin main
node tests/ordering-contract.test.cjs
node tests/cms-contract.test.cjs
```

If local files are modified or fast-forward fails, resolve them rather than force-resetting. Preserve DNS, HTTPS, assets, hosting config and the friend's unpublished work. No pull request is pending: commits already went to `main`.

Redeploy the **entire project** on the SAME host connected to the paid domain. Check `index.html` public site, `admin.html` kitchen, `manage.html` manager content editor and `table-qr.html` QR print page. Confirm CSS and images load on phone widths. Do not advertise live ordering until the service setup and end-to-end tests pass.

## What the website now includes

- Each physical table gets a unique printed QR URL, e.g. `https://www.hangovershakes.cafe/?table=01`. The guest orders using the full menu and cart. There is no WhatsApp food order, takeaway checkout, delivery or payment gateway.
- Kitchen uses `admin.html` to view the table, verify the diner is actually seated, accept, prepare, mark ready, then mark served. A shared QR does not prove physical presence.
- Manager uses `manage.html` to add/remove dishes, change category, prices or sold-out state, manage offers, review, then publish. **Only a granted manager UUID can save changes**, enforced by database row-level policies, not a hidden URL.
- `manage.html?demo=1` gives a no-login interactive preview, with publishing disabled and no real database writes.
- After publication, the customer website loads menu and offers from the café database at page load and checks for changes about every minute. Changed menu revision invalidates old guest carts. Kitchen must also reload to use matching product IDs and prices.

## Important: one-time secure setup remains

`ordering-config.js` intentionally has empty `supabaseUrl` and `publishableKey`; checkout and real editing are not enabled just by deploying. The available linked Supabase projects appear to belong to other work. Do NOT configure the café against an unrelated project. Obtain a dedicated café-owned project and explicit owner approval first.

Follow **`CMS_SETUP.md`**: run `cms-schema.sql`, enable email-link Auth redirect for `https://www.hangovershakes.cafe/manage.html`, grant genuine manager UUID through the SQL editor, set ONLY public URL/publishable key, review actual café prices/promotions and publish the initial catalogue. The content table stores menu and offers, not customer order history. No staff password, OTP, JWT, signing key, secret key or service-role key belongs in browser JS or GitHub.

Follow **`ORDERING_SETUP.md`** separately for kitchen authentication and private Realtime policies, replacing email placeholders only with the café's verified kitchen/owner email. Set Auth redirect to `https://www.hangovershakes.cafe/admin.html`. No unauthorised staff may read tickets or edit prices.

**MANDATORY REAL-DEVICE TEST:** Kitchen tablet signs in and shows LIVE; another device scans Table 01 QR, sees the published catalogue and offers, adds a single-price and two-price item, places a dine-in request, and kitchen receives table/name/quantities with matching prices and sends acknowledgement → accepted → preparing → ready → served. Repeat for Table 02, unavailable/deleted items, expired offers, staff lacking manager membership, offline kitchen, page reload, faulty connection and mobile widths. Physical QR scan quality and actual SSL/domain routing must be verified. CI checks alone do not test a real Supabase service.

**Operational stop sign:** Current kitchen tickets are ephemeral and can disappear if its tab sleeps, disconnects or refreshes. Menu publishing causes existing screens to refresh, so do it only after the kitchen clears outstanding tickets and pauses table ordering. Do not promise reliable production orders before a persistent, securely validated order backend replaces this temporary mechanism. Staff should have an offline/manual contingency.
