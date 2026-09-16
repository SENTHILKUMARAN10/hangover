# Hangover Shakes — temporary order system

The existing design remains intact. Customers can add all priced menu items (including multi-price variants), edit quantities, see a subtotal, and complete a pickup checkout. The owner dashboard is `admin.html` and uses email-link authentication plus least-privilege Supabase Realtime channel policies. The checkout never claims an order is placed until the owner dashboard sends a receipt acknowledgement. If service is not configured, the checkout is **disabled**, with an explicit WhatsApp fallback that the customer must manually send. No order data is stored in a backend table, localStorage, or an order history.

## Required before accepting live orders

1. Obtain the **actual café owner's email address** with their consent. This cannot be inferred from the web developer's account, and is the only address that should be allowed to read or action orders.
2. Use a **dedicated Supabase project** controlled by the café, with email OTP / email-link Auth enabled. This project is solely a realtime message transport and owner authentication service; **do not create an orders table**.
3. In `supabase-realtime-policies.sql`, replace every `cafe-owner@example.com` with the café owner's exact email address, then run it in that project's SQL editor. Ensure those names are not already used if reapplying (drop specific policies before re-running). For a production service, disable public Realtime channels in Realtime Settings; private channels here are explicitly required regardless.
4. Edit **only** the two public, publishable fields `supabaseUrl` and `publishableKey` in `ordering-config.js`. Never put a service-role key, secret key, password, token, or JWT signing key into GitHub or browser JavaScript.
5. Set Supabase Auth **Site URL** and **Redirect URLs** to include the final real website's `admin.html` URL. Send the owner an email link from that page. Supabase Auth must permit links to the deployed origin. The owner must use the link from their verified inbox.
6. Open `admin.html` on the café's owner device and keep the browser tab active; the status pill must show LIVE. On a separate browser/device, open the main site, add an item, enter a test name and valid phone number, and place a test pickup order. Verify the owner receives it, and confirm → preparing → ready → completed each reach the customer.
7. Do **not** enable this for paying customers without a real two-device end-to-end test, an agreement on prices, availability and pickup workflow, and a fallback plan for dropped connections.

## Deliberate limitations

- This is **pickup / pay at café only**. No payment gateway, shipping, delivery, GST or payment capture has been invented.
- This uses **ephemeral WebSocket Broadcast and Presence**. If the owner tab is shut, disconnected, phone sleeps, or the service restarts, new orders may not arrive. Refreshing the owner page wipes its in-memory queue. Acknowledgements and statuses are not recoverable after reconnect.
- Customer's basket alone is kept in **their own browser** until checkout so accidental navigation does not empty it. Customer names, phone numbers, and submitted orders are not written to browser storage by this implementation.
- The static `admin.html` URL can be found by anyone. Its **contents and ability to receive/modify orders are secured** by email Auth plus RLS; a secret URL cannot protect data. If other policies on the project accidentally allow access to the same channels, they must be audited.
- Client-submitted orders can be spammed by automated visitors. For a public commercial rollout, add rate limiting / abuse protection before submitting; a purely static site cannot enforce reliable server-side rate limits or enforce product price integrity before staff confirmation.
- The café confirms **availability, taxes/parcel charges and final amount manually**. Menu subtotal is not a guaranteed payable invoice. All displayed prices are parsed from `menu-data.js`; on the dashboard each item's label and price are recalculated from the trusted published menu, never from client-supplied prices.
- Use a persistent, access-controlled backend if the café later needs reliable notifications, order history, recovery, multi-device staff handoff, or guaranteed checkout.

## Manual tests

- Empty cart, add same item twice, max 20 quantity, decrement/remove, refresh and restore basket.
- Variant item: Shawarma Classic Roll / Plate — correct ₹100 / ₹160; shake Normal / Special — correct two prices.
- A valid Indian 10-digit phone and required name; reject invalid/empty phone, reject large orders; escape text in special instructions.
- Mobile viewport 320px / 375px / 768px, modal close/Escape and focus, keyboard-only buttons, prefers-reduced-motion.
- Owner offline: no false success; WhatsApp fallback asks user to tap Send.
- Wrong authenticated email: private orders channel denies subscription. Owner email: receives live event.
- Order acknowledgment withheld: customer sees uncertainty and is told to phone before retrying to avoid double orders.
- Owner sign-out, connection loss, and refresh: customer should not be told a new order was confirmed.

## Local syntax checks

`node --check app.js && node --check ordering.js && node --check admin.js && node --check menu-data.js`
