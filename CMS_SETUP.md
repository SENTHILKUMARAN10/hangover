# Hangover Shakes — no-code menu & offers management

**Status:** The editor UI and database schema are committed. The café's real project, manager permissions and live two-device tests are **not configured or verified**. The two Supabase projects visible in the connected account belong to other work; do not install this schema in either without explicit confirmation they belong to Hangover Shakes. `ordering-config.js` deliberately contains empty public connection values. Do not hand out active QR cards or invite real customers to order yet.

## Pages

- `admin.html` — authenticated kitchen tickets; contains a link to the manager studio.
- `manage.html` — manager-only sign-in, category & item management, sold-out toggles, prices, promotions, review and publish. Editor permissions are enforced **by database RLS**, not by hiding the URL. Kitchen-only staff must not automatically receive editing rights.
- `manage.html?demo=1` — interactive front-end demo. No sign-in, no database access and **Publish disabled**. Anybody can view this demo without obtaining admin rights.
- `index.html?table=1` — customer dine-in flow, still requires the separate secure kitchen Realtime setup to place orders.

## One-time installation (café owner and hosting operator)

1. Create or designate a dedicated, café-controlled Supabase project. **Never use a different client's or the developer's existing project.** Review pricing and ownership with the owner before project creation.
2. Run `cms-schema.sql` in its SQL editor. It creates a singleton catalogue, staff-editor membership table, restricted grants and RLS. It does **not** store customer order data and it does **not** enable checkout.
3. Put only the project's public URL and **publishable** key in `ordering-config.js`; never commit passwords, secret keys or service-role keys.
4. In Authentication URL configuration, allow `https://www.hangovershakes.cafe/manage.html` and `https://www.hangovershakes.cafe/admin.html` as appropriate. Configure email-link authentication. The manager signs in once through their own verified mailbox.
5. Find the **correct user's auth UUID** in Authentication > Users, then execute the commented `insert into public.hs_content_editors ...` statement from `cms-schema.sql` in SQL Editor with that UUID. Only authorised café management may grant/revoke manager rights. Do not give roles to every kitchen employee automatically.
6. Manager reopens `manage.html`, reviews every menu price, item and offer, and presses **Publish to website**. Until the first valid publication the connected customer's ordering is deliberately paused. Existing public fallback menu is still visible for browsing.
7. Finish the separate `ORDERING_SETUP.md` kitchen account, private Realtime policies and physical QR verification steps. Run a **two-device end-to-end test**: guest sees published prices and offers, adds a normal item and variant, sends a request, kitchen displays matching table/name/price and acknowledges, then staff serves it. Also test sold-out and deleted products, expired offers, unauthorised staff, wrong project, offline kitchen, page refresh and phone-width layouts.

## Manager workflow after setup

Open `manage.html`, sign in using the manager's email link, choose **Menu & prices** or **Offers**, edit categories and products or use Add/Delete and Available checkboxes, tap **Review changes**, then **Publish to website**. Offers have Active checkboxes; zero active offers hides the popup. Changes are stored in the café database rather than requiring another GitHub commit. A newly opened website fetches the published catalogue; open customer screens check for updates about once per minute. Changes invalidate old cart contents so customers cannot accidentally order a different product at a shifted ID.

**Operational warning:** The kitchen order queue still uses ephemeral Realtime, not a persistent orders database. Publishing a catalogue update makes open pages refresh; kitchen refresh loses any tickets still in memory. Publish only after staff finish outstanding tickets and temporarily pause dine-in QR ordering. Do not publish during a rush. For production reliability, replace ephemeral tickets with durable orders, role-scoped staff accounts and server-side validation/rate limits. Changing an advertised price or offer also requires staff agreement on honouring previously submitted orders.

## Security and limitations

- Customer can read **published** catalogue only; only a manager UUID in `hs_content_editors` can read drafts or update. No public insertion, deletion, or staff role-granting policies.
- Staff email-link logins require an actual café project and verified owner/staff inbox. No demo credential grants real access.
- Menu prices and offer terms must be confirmed by café management. The current kitchen validates catalogue price against the published menu loaded at startup; restart the kitchen screen after changing menu prices (only after clearing current tickets).
- No photo upload, tax/GST invoice, card payment, table presence verification or persistent order history is implemented by this CMS. Product names and price variants are text-based. The review screen checks formatting but cannot verify the café's commercial accuracy.
