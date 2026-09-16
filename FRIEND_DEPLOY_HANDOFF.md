# Hangover Shakes — handoff for the friend managing www.hangovershakes.cafe

Repository: https://github.com/SENTHILKUMARAN10/hangover (`main`).
Domain: https://www.hangovershakes.cafe/ — friend manages existing hosting. Domain connectivity is NOT verified by this code repository.

## Update the existing clone without damaging your deployment

From the EXISTING Hangover Shakes checkout on your laptop:

```bash
git status
git remote -v
git fetch origin
git pull --ff-only origin main
node tests/ordering-contract.test.cjs
```

If local files are modified or the fast-forward fails, resolve them carefully; don't force reset/delete hosting settings, existing assets, other work, or DNS records. No pull request is waiting: changes were committed straight to `main`.

Redeploy the complete updated static project through the SAME host currently connected to the purchased domain. Preserve HTTPS/domain and existing configuration. `index.html` is public café marketing + QR-table guest ordering, `admin.html` is the authenticated kitchen screen, and `table-qr.html` prints physical QR signs. Check all three routes and browser developer-console asset errors.

## The actual product: ONLY guests seated INSIDE the café

1. Each table gets a printed unique URL such as `https://www.hangovershakes.cafe/?table=01` or `?table=02`, created at `/table-qr.html`. Generate only the physical table numbers needed (1–30 supported by default); scan each printed code and verify it opens the matching table number.
2. A generic visit to the homepage may browse the menu but CANNOT add food to the cart. A table QR link shows the table-number banner, cart and dine-in checkout. Customer chooses food and variants and optionally enters a name/notes; NO WhatsApp orders, customer phone number, pickup, online delivery or online payment are part of this flow.
3. Kitchen opens `/admin.html`, signs in using the café-approved kitchen/owner email, keeps the tablet awake, verifies actual occupancy of the displayed table, and works received → accepted → preparing → ready → served. Customer sees live status while the page remains open; staff physically serve food at the table.
4. A photographed/forwarded QR can be used from outside. This is NOT proof of physical location; staff MUST check that the table is occupied before accepting the order. Real enforceable on-premise validation would need a server-mediated access mechanism and rate limits.

## STOP: do not launch real orders just by deploying code

`ordering-config.js` deliberately has EMPTY `supabaseUrl` and `publishableKey`. The online order button will remain DISABLED until a new café-owned realtime service and staff Auth are configured and thoroughly tested. No WhatsApp fallback is included: guests should order directly with staff during downtime.

Follow `ORDERING_SETUP.md` to create an isolated café-controlled Supabase project (transient messages only, no orders table), authorise only the verified café kitchen email, replace all `kitchen@example.com` placeholders in the RLS SQL, disable public Realtime channels, set Auth redirect to `https://www.hangovershakes.cafe/admin.html`, and insert ONLY the public project URL/publishable key into config. NEVER commit API secret/service role, password, OTP or signing key. Do not reuse another business's project.

**Mandatory two-device end-to-end test:** kitchen tablet must show LIVE. Second phone scans table 01, selects a single-price product and a two-price variant, submits, gets acknowledgement, sees accepted/preparing/ready/served. Kitchen displays the correct table, reconstructs catalog prices, and staff verify table occupancy. Repeat with table 02, offline kitchen, incorrect authorised email, status failure, rejected request, invalid table URL, browser reload, mobile layout and duplicate/spam attempts. Check QR image scan quality and HTTPS/domain. The static CI checks are not end-to-end tests.

No orders are stored in a database, so a sleeping/closed/refreshed kitchen tab or broken connection can LOSE orders. The café needs manual contingency and may require a reliable persistent backend before taking real food orders. DO NOT promise guaranteed notifications, remote-order prevention or durable order history with this implementation.
