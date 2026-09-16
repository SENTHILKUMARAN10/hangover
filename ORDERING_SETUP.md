# Hangover Shakes — QR dine-in ordering setup

This is ONLY for guests seated in the café. A table has its own QR, e.g. `https://www.hangovershakes.cafe/?table=01`. A guest views the menu, chooses variants and quantity, places an order, and the kitchen checks table occupancy, accepts, prepares, marks ready and serves it. There is no WhatsApp food ordering, pickup, delivery, online payment or mandatory phone number.

**Critical limitation:** The QR identifies the table but does not prove that a guest is physically in the café. A photographed/shared QR can be used remotely. The kitchen MUST check table occupancy before accepting; production location enforcement needs server-side on-site validation and rate limiting.

## One-time setup — before enabling real orders

1. Use a dedicated café-owned Supabase project approved by the owner, not an unrelated developer/business database. The project's public URL, publishable key and the owner-approved login email are public configuration fields; passwords and any secret/service-role keys must NEVER be committed.
2. Read `ADMIN_HQ_SETUP.md`. Provision a verified café Auth account with a long UNIQUE password, not demo PIN 8585. Set `supabaseUrl`, `publishableKey`, `adminLoginEmail` in `ordering-config.js`. Staff enter ONLY their password at `/admin.html`, where it is verified by Supabase Auth. `8585` is for an isolated sample-only demonstration and cannot unlock live orders.
3. In `supabase-realtime-policies.sql`, replace every `kitchen@example.com` placeholder with the authorised real café account email, and apply SQL ONLY to that dedicated project. Disable Realtime public access and review any conflicting broad policies. Anonymous guests can send food-request events but must not read the kitchen inbox or impersonate kitchen status.
4. Apply `cms-schema.sql`, authorise the correct manager account's Auth UUID, and publish the verified menu in `/manage.html`. `staff-schema.sql` is optional and controls only staff roster details, never login access. The guest and kitchen use the same published product IDs and prices; do not edit the catalog while cooking live tickets.
5. Safely pull `main` and redeploy all files through the EXISTING domain host. Check HTTPS, JS/CSS/images, `/admin.html` (single password entrance), `/kitchen.html` (authenticated live queue), `/manage.html`, `/staff.html`, and `/table-qr.html`. The default config is deliberately EMPTY; checkout stays disabled until configured and tested.
6. Generate one table QR per physical table at `/table-qr.html`, print and SCAN every actual card to verify the correct table number and full customer menu open on the real paid domain. Only display printed codes after deployment/testing.
7. **Mandatory two-device end-to-end test:** Staff sign in at `/admin.html` and open Kitchen Orders (`/kitchen.html`) on a tablet, keep it awake and verify LIVE. On another phone scan Table 01, add a single-price item and a two-price variant, check quantity/subtotal and send a test order. Verify kitchen table/guest/items/trusted price, guest receipt, and statuses accepted → preparing → ready → served. Repeat Table 02, an invalid/forwarded table link, rejected order, wrong admin password, unauthorised manager, sold-out and deleted item, network disconnection, tablet refresh and small mobile widths.
8. Until this test passes, do NOT accept live QR orders. During downtime staff must take orders directly and never assume an unacknowledged QR request arrived.

## Limitations requiring a production upgrade

The kitchen order queue is ephemeral browser memory, NOT a durable orders database. Refresh, sleep, disconnect or server restart can lose tickets and statuses. Customer cart is only browser-local, guests cannot safely retry uncertain orders, and a displayed subtotal is not a tax invoice. No guaranteed notifications, order history, server-side table-location checks, rate-limits, online payments or offline recovery. A durable server-validated backend with idempotency and abuse prevention is recommended before the café relies on it operationally.

## Automated checks

`node tests/ordering-contract.test.cjs` and `node tests/cms-contract.test.cjs` exercise static contracts. GitHub Actions checks JS syntax and HTML asset references. These checks do not prove that the real domain, Supabase configuration, auth, physical-location restrictions, QR scanning or real order delivery work.
