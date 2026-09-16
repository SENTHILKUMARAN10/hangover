# Hangover Shakes — manage the website without changing code

The owner and manager use ONE entrance: `/admin.html`. The form asks only for a password. After signing in, the Admin HQ links to `/kitchen.html`, `/manage.html`, `/staff.html`, `/table-qr.html` and the customer website. See **`ADMIN_HQ_SETUP.md`** for the authoritative one-time password and permission instructions.

## Demo available now

With the backend not configured, open `/admin.html`, enter **8585**, and explore the clearly labelled SAMPLE-ONLY dashboard. Menu editor `/manage.html?demo=1` and staff roster `/staff.html?demo=1` let you experiment with adding/removing products, offers and staff; nothing publishes or changes real accounts. Demo kitchen `/demo-kitchen.html` simulates orders. 8585 is a public demo PIN, not a real security credential.

## One-time live setup

1. Use a dedicated café-owned Supabase project, never an unrelated existing project; get the owner's authorisation. `ordering-config.js` currently has empty connection values by design.
2. Apply `cms-schema.sql`. Provision a verified café-owned Supabase Auth email-and-password account via the trusted backend console. Grant the correct account's Auth UUID the `manager` role in `hs_content_editors` using the SQL comment in `cms-schema.sql`.
3. Set ONLY the public project URL, publishable key and approved `adminLoginEmail` in `ordering-config.js`. Real password must stay outside all code and be supplied on the Admin HQ form over HTTPS. For real access use a long unique password; never use 8585.
4. Optionally apply `staff-schema.sql` to store the roster. Staff roster records are operational information ONLY, not Auth users, permission grants or account revocations.
5. Deploy the full project and sign in at `/admin.html`. Open Menu & Offers, confirm all original prices, and publish the verified catalog. New customer visits load published content and open visits check about once a minute. Clear all outstanding kitchen tickets before publishing; changing content can refresh pages and the kitchen queue is temporary.
6. Follow `ORDERING_SETUP.md` for private kitchen Realtime policies and the mandatory two-device test. Guest ordering stays disabled until it passes. Table QR alone cannot prove physical presence; staff must verify table occupancy.

The real CMS requires database RLS: guests may read published content, only authorised managers may edit or publish. The kitchen separately requires approved credentials and private Realtime policies. A static page password or hiding URLs is not backend security. No real order history, payment, customer location verification or login-user provisioning is implemented in this CMS.
