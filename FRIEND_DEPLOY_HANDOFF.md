# Hangover Shakes — deployment handoff for the friend managing the domain

Website: `https://www.hangovershakes.cafe/` (the domain is managed by the friend; **domain connection has not been verified by this repository**).
Repository: `https://github.com/SENTHILKUMARAN10/hangover`, branch `main`.

## Bring the cloned project up to date

From the EXISTING local Hangover Shakes project directory:

```bash
git status
git remote -v
git fetch origin
git pull --ff-only origin main
node tests/ordering-contract.test.cjs
```

If `git status` shows changes or `git pull --ff-only` fails, review them and reconcile them instead of force-resetting. Do not delete the friend's hosting configuration, domain settings, assets, or unpublished work. There is **no open pull request to approve**: changes were committed straight to `main`.

Redeploy the updated **entire** project through the hosting service already connected to the purchased domain, preserving its existing domain and SSL configuration. This is a static site; `index.html` is the public page and `admin.html` is the owner screen. Keep the admin page out of the public navigation; a hidden URL is not a substitute for authentication.

## Critical: checkout is NOT ready for customers simply because the files are deployed

- The public `ordering-config.js` has empty `supabaseUrl` and `publishableKey` by design. Until they are configured, the Place pickup order button is disabled and the cart offers a WhatsApp draft instead. A WhatsApp draft is **not sent** until a person taps Send and the café acknowledges it.
- First obtain the real café owner's authorised email, and configure a **dedicated café-controlled** Supabase project for owner authentication and private ephemeral Realtime. See `ORDERING_SETUP.md` and `supabase-realtime-policies.sql` for the exact policy and configuration process. Replace `cafe-owner@example.com` in the SQL before applying it. Never add a secret/service-role key or password to JavaScript, GitHub, or frontend hosting settings.
- In Supabase Auth configure both Site URL and allowed redirect URL for `https://www.hangovershakes.cafe/admin.html` (and the bare-domain equivalent only if the hosting configuration uses it). Protect channels with the SQL policies and disable public Realtime channels. Never reuse another business's Supabase database.
- **Two-device acceptance test:** owner signs in on one device and sees LIVE; customer on a separate device adds a menu variant, validates their phone, places a pickup order, and receives receipt → confirmed → preparing → ready → completed. Test offline owner, declined orders, refresh, small mobile viewport and WhatsApp fallback. Check the real domain's CSS, images, and browser console. Do not enable/advertise live ordering before this passes.
- This is intentionally a temporary, no-orders-database model. Orders can disappear on refresh, disconnect, or phone sleep; no push-notification guarantee, online payments or delivery are provided. For reliable customer ordering, use a persistent secured service instead.

## What is already prepared

The full menu, cart, variant selection, quantity controls, pickup form, WhatsApp fallback, owner-only order interface, status controls, shared styling, and GitHub validation checks are committed. Every push runs JavaScript syntax checks, the menu/ordering contract test, required-file checks, and HTML/local-asset reference checks. These are automated code checks, **not** a real checkout test.
