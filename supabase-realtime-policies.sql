-- Hangover Shakes: EPHEMERAL ORDER EVENTS. No orders table is created.
-- IMPORTANT: Replace cafe-owner@example.com with the ACTUAL cafe owner's verified
-- Supabase Auth email BEFORE running this SQL on a dedicated project.
-- Never use the developer's email unless the developer truly owns the cafe.
-- Run in the dedicated project's SQL editor. Use a unique project for the cafe.
-- Realtime policies are scoped to the hs: namespace; they don't grant access to others.

-- Anonymous customers may SEND order events but may NEVER READ the orders channel.
create policy "hs_customers_submit_only"
on realtime.messages for insert to anon
with check (
  realtime.topic() = 'hs:orders:v1'
  and extension = 'broadcast'
);

-- The authenticated, verified cafe owner is the ONLY account allowed to READ orders.
create policy "hs_owner_receives_orders"
on realtime.messages for select to authenticated
using (
  (auth.jwt() ->> 'email') = 'cafe-owner@example.com'
  and realtime.topic() = 'hs:orders:v1'
  and extension = 'broadcast'
);

-- Anonymous customers may observe only owner-online presence. They cannot impersonate
-- the cafe, publish presence events or read any customer order data.
create policy "hs_customers_see_owner_online"
on realtime.messages for select to anon
using (
  realtime.topic() = 'hs:owner-presence:v1'
  and extension = 'presence'
);

create policy "hs_owner_sees_owner_presence"
on realtime.messages for select to authenticated
using (
  (auth.jwt() ->> 'email') = 'cafe-owner@example.com'
  and realtime.topic() = 'hs:owner-presence:v1'
  and extension = 'presence'
);

create policy "hs_owner_publishes_presence"
on realtime.messages for insert to authenticated
with check (
  (auth.jwt() ->> 'email') = 'cafe-owner@example.com'
  and realtime.topic() = 'hs:owner-presence:v1'
  and extension = 'presence'
);

-- Only whoever possesses a random order ID can listen to the status for that ID.
-- Random order IDs must be generated using cryptographically secure UUIDs.
create policy "hs_customer_receives_private_order_status"
on realtime.messages for select to anon
using (
  realtime.topic() ~ '^hs:status:[0-9a-f-]{36}$'
  and extension = 'broadcast'
);

-- ONLY the authenticated owner can publish confirmations, cooking and ready alerts.
create policy "hs_owner_updates_order_status"
on realtime.messages for insert to authenticated
with check (
  (auth.jwt() ->> 'email') = 'cafe-owner@example.com'
  and realtime.topic() ~ '^hs:status:[0-9a-f-]{36}$'
  and extension = 'broadcast'
);

-- The authenticated owner can join status topics to publish updates.
-- No owner read policy on status topics is needed for their write-only channel.
-- Auth email ownership is established by Supabase's verified email-link sign-in.
-- All channels use config.private=true, and no websocket event is saved as an order.
