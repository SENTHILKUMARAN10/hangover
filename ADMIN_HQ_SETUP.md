# Hangover Shakes — one-password Admin HQ

## What the user sees

- `/admin.html` is now the ONE entrance. Enter a password once to see Kitchen Orders (`/kitchen.html`), Menu & Offers (`/manage.html`), Staff Management (`/staff.html`), Table QR Codes (`/table-qr.html`) and Customer Website.
- **Temporary demo PIN: 8585.** With the café's backend still unconfigured, `/admin.html` opens a clearly labeled sample-only dashboard. You can also force the demo with `/admin.html?demo=1`. Demo Kitchen is `/demo-kitchen.html`; Demo Menu Editor is `/manage.html?demo=1`; Demo Staff Roster is `/staff.html?demo=1`. Neither demo operations nor the demo PIN can access real orders or publish changes.
- The PIN is deliberately visible in publicly served demo JavaScript. DO NOT treat 8585 as a secret or the real café password. Links to demo pages are inherently public, because demo contains no private information.

## Production password setup — no email or OTP field on the Admin screen

1. Obtain the café owner's approval and use a DEDICATED café-controlled Supabase project, not an unrelated business's project. Coordinate with the person responsible for hosting `www.hangovershakes.cafe`.
2. Provision a verified Supabase Auth **email/password** account owned by the café using the backend console/approved admin process. Its email is just a public account identifier hidden from the sign-in FORM, not a secret. Choose a unique long password (at least 8 characters; 12+ recommended) and DO NOT use 8585 in production. Do not place real passwords, OTPs, tokens or secret/service-role keys in GitHub, frontend JS or browser config.
3. Configure `ordering-config.js` with ONLY `supabaseUrl`, `publishableKey` and `adminLoginEmail` (the authorised account's email). Leave the actual password out of that file; the Admin page passes user-entered credentials over HTTPS to Supabase Auth using `signInWithPassword`. The password is verified by the authentication provider, not checked in JavaScript. Without all three configured values the Admin page intentionally remains demo-only.
4. Apply `cms-schema.sql` in this dedicated project, add the correct manager's verified Auth UUID to `hs_content_editors` using the commented owner-grant statement, then apply optional `staff-schema.sql`. **Roster entries are names/shifts only**: adding or deleting one NEVER creates, promotes, disables or revokes a login. Auth provisioning and revocation remain separate owner-controlled operations.
5. For live kitchen service apply the private Realtime policies from `supabase-realtime-policies.sql` using the ACTUAL authorised café account email in place of every `kitchen@example.com` placeholder. Disable public Realtime access. Keep kitchen staff and menu-manager privileges separate; one shared login is a convenience but does not give safe per-employee auditing. Kitchen access is separately checked by server-side Realtime RLS; menu and staff access are checked by database RLS.
6. Pull the latest `main`, redeploy the WHOLE site on the existing host without changing domain/DNS settings. Test `/admin.html` password login, kitchen access via `/kitchen.html`, manager permission via `/manage.html`, staff roster via `/staff.html` and table QR printing. Confirm an invalid password and an unauthorised account fail. Confirm 8585 cannot sign in in live mode; `/admin.html?demo=1` remains sample-only.
7. Only enable live table QR ordering after all of `ORDERING_SETUP.md` and the two-device acceptance tests are completed. The current kitchen queue is TEMPORARY: refresh/offline/sleep may erase orders. A QR link is not proof of physical presence, so kitchen must verify an occupied table before accepting; production should use persistent orders and anti-abuse controls.

## Staff page scope

The live staff roster can add, edit and remove staff name, operational role, shift and active flag after optional `staff-schema.sql` is installed. This is **not account/user management**. To grant real access to a new employee, a trusted café owner must separately create/authorise that employee's Auth account and revise backend RLS policies. There is currently no safe browser-only feature to provision, reset or revoke employee passwords. Do not tell employees that roster Active grants login rights.

## Important safeguards

- Never remove kitchen/CMS database RLS to make a short password 'work'. A JavaScript-only password check, hidden route, or localStorage flag cannot secure backend access.
- The default `ordering-config.js` has blank backend fields on purpose. The repo alone does not prove the domain has been redeployed, a database has been configured, or a live order has been delivered.
- Published menu changes invalidate customer carts and can refresh the kitchen. Finish all active tickets before publishing.
