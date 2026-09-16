-- OPTIONAL café-owned staff roster. Apply ONLY to the dedicated Hangover Shakes Supabase project AFTER cms-schema.sql.
-- This controls visible employee roster records, not access to Supabase Auth, menu publishing or kitchen orders.
-- Only previously provisioned verified manager accounts in hs_content_editors can operate the roster.
create table if not exists public.hs_staff_roster (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 1 and 70),
 role text not null check (role in ('manager','kitchen','service')),
 shift text not null check (char_length(btrim(shift)) between 1 and 60),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.hs_staff_roster enable row level security;
revoke all on public.hs_staff_roster from public, anon, authenticated;
grant select, insert, update, delete on public.hs_staff_roster to authenticated;
-- Existing hs_content_editors RLS allows a manager to see their own membership.
create policy hs_staff_manager_read on public.hs_staff_roster
 for select to authenticated using (exists (
 select 1 from public.hs_content_editors e where e.user_id = (select auth.uid()) and e.role='manager'));
create policy hs_staff_manager_insert on public.hs_staff_roster
 for insert to authenticated with check (exists (
 select 1 from public.hs_content_editors e where e.user_id = (select auth.uid()) and e.role='manager'));
create policy hs_staff_manager_update on public.hs_staff_roster
 for update to authenticated
 using (exists (select 1 from public.hs_content_editors e where e.user_id = (select auth.uid()) and e.role='manager'))
 with check (exists (select 1 from public.hs_content_editors e where e.user_id = (select auth.uid()) and e.role='manager'));
create policy hs_staff_manager_delete on public.hs_staff_roster
 for delete to authenticated using (exists (
 select 1 from public.hs_content_editors e where e.user_id = (select auth.uid()) and e.role='manager'));
-- STAFF ROSTER IS NOT AN ACCESS CONTROL LIST. Creating an entry never creates a user or grants login.
-- To grant/revoke real permissions, only the authorised owner should provision/revoke Auth accounts
-- and revise the separate kitchen Realtime policies / manager membership in a controlled admin backend.
