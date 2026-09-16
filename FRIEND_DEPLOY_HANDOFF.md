# Hangover Shakes — handoff for the friend managing www.hangovershakes.cafe

Repo: https://github.com/SENTHILKUMARAN10/hangover (`main`). The friend manages existing hosting; connection to the paid domain has not been verified by the repo.

## Safely update the existing clone

```bash
git status
git remote -v
git fetch origin
git pull --ff-only origin main
node tests/ordering-contract.test.cjs
node tests/cms-contract.test.cjs
```

Resolve local changes carefully; DO NOT force-reset unpublished work or delete DNS, SSL or host settings. Redeploy the entire project to the same existing host. No PR approval is required for these already committed changes.

## New page structure

- `/index.html` — public café site; table QR guest flow uses `/?table=01` etc.
- `/admin.html` — SINGLE password-only Admin HQ entrance, linking to ALL operational pages.
- `/kitchen.html` — live authorised kitchen tickets (previously admin.html).
- `/manage.html` — manager-only menu, prices, offers and publishing.
- `/staff.html` — manager-only roster (name, role, shift, active), NOT account creation/revocation.
- `/table-qr.html` — QR generator. QR prints point to the real paid domain; do not print live signs until deployed and verified.
- `/demo-kitchen.html`, `/manage.html?demo=1`, `/staff.html?demo=1` — public sample-only demos, no production writes.

**For a mobile design preview:** `/admin.html` currently accepts temporary PIN **8585** in DEMO mode while backend fields are empty. It does not grant any real privilege. Anyone can inspect public demo code and discover the demo PIN. Even after live setup `/admin.html?demo=1` remains an isolated sample. Do not use 8585 as the real password.

## Mandatory café-owned backend setup

Read `ADMIN_HQ_SETUP.md` first. A real Supabase Auth email/password account (email hidden from the UI), plus real URL/publishable key and `adminLoginEmail` in `ordering-config.js`, enables PASSWORD login verified by Supabase. Use a long unique secret that is NEVER committed or emailed to developer. Apply `cms-schema.sql`, grant manager membership for the authorised account, and optionally apply `staff-schema.sql` for persistent roster data. Roster edits do not create or revoke account privileges.

Then read `ORDERING_SETUP.md` and apply the private Realtime policies, replacing ALL `kitchen@example.com` placeholders with the approved café account email. The kitchen now lives at `/kitchen.html`. Live QR checkout remains DISABLED while the config is blank; do not bypass this or remove RLS. Never reuse another project belonging to a different business.

## Required live acceptance checks

Test genuine password login and incorrect password rejection on Admin HQ, separately check manager and kitchen permissions, then scan the printed table 01 and table 02 QR on another device. Submit test orders and verify actual kitchen receipt, trusted prices and statuses from received through served. Test sold-out items, declines, offline kitchen, refresh and responsive pages. A shared QR is not proof of physical presence; staff MUST verify the diner is seated.

**Important:** Kitchen orders are ephemeral and can disappear during refresh, screen sleep and disconnect. Menu publishing can refresh kitchen/customer screens; clear all tickets before publishing. Do not take real customer orders until a secure durable backend and end-to-end test are in place, with a manual staff fallback during outages.
