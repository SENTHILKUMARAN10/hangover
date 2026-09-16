-- Hangover Shakes DINE-IN TABLE ORDERS: ephemeral Broadcast only; no orders table.
-- For a NEW dedicated cafe-owned Supabase project. NOT APPLIED automatically.
-- Replace ALL kitchen@example.com references with the verified email of the authorised
-- cafe kitchen screen / owner. Do not use the website developer's email by default.
-- Turn OFF 'Allow public access' under Supabase > Realtime > Settings.
-- Use ONLY the browser publishable key (never the secret/service-role key).
-- An anonymous QR link is NOT proof of physical presence; staff verify the table.
-- Do not install together with earlier, broader policies on the same topics.

-- Guests may SEND food requests to the kitchen, but may not READ other guests' orders.
create policy "hs_dinein_guest_send_orders"
on realtime.messages for insert to anon
with check (
  realtime.topic() = 'hs:orders:v1'
  and extension = 'broadcast'
);

-- Kitchen staff with this verified account are the ONLY readers of guest food requests.
create policy "hs_dinein_kitchen_receive_orders"
on realtime.messages for select to authenticated
using (
  (auth.jwt() ->> 'email') = 'kitchen@example.com'
  and realtime.topic() = 'hs:orders:v1'
  and extension = 'broadcast'
);

-- Guests may see only kitchen-online presence, not impersonate staff.
create policy "hs_dinein_guest_read_kitchen_presence"
on realtime.messages for select to anon
using (
  realtime.topic() = 'hs:owner-presence:v1'
  and extension = 'presence'
);

create policy "hs_dinein_kitchen_read_presence"
on realtime.messages for select to authenticated
using (
  (auth.jwt() ->> 'email') = 'kitchen@example.com'
  and realtime.topic() = 'hs:owner-presence:v1'
  and extension = 'presence'
);

create policy "hs_dinein_kitchen_track_presence"
on realtime.messages for insert to authenticated
with check (
  (auth.jwt() ->> 'email') = 'kitchen@example.com'
  and realtime.topic() = 'hs:owner-presence:v1'
  and extension = 'presence'
);

-- A guest can LISTEN to a specific random order-ID status topic. The UUID is a bearer
-- capability: don't put it in a shared link. This policy does not protect against a
-- user deliberately giving away their UUID; never send private details in statuses.
create policy "hs_dinein_guest_read_own_status_topic"
on realtime.messages for select to anon
using (
  realtime.topic() ~ '^hs:status:[0-9a-f-]{36}$'
  and extension = 'broadcast'
);

-- Only the authorised kitchen can SEND status updates or receipt acknowledgements.
create policy "hs_dinein_kitchen_send_order_status"
on realtime.messages for insert to authenticated
with check (
  (auth.jwt() ->> 'email') = 'kitchen@example.com'
  and realtime.topic() ~ '^hs:status:[0-9a-f-]{36}$'
  and extension = 'broadcast'
);

-- Client channels MUST use config.private=true. The Realtime Auth probe is rolled
-- back; customer orders are not saved to an app orders table by this design.
-- This is best effort only: the kitchen must remain awake/connected and manually
-- verify the table. For reliable commerce, use an authenticated session or on-site
-- server with rate limits and a recoverable order store instead.
