-- Hangover Shakes CMS. Run in a DEDICATED cafe-owned Supabase project.
-- This does not store customer orders and does not enable QR checkout.
-- Run once, then sign in at manage.html and add the manager's auth UUID below.
create table if not exists public.hs_content (
  id smallint primary key default 1 check (id = 1),
  menu jsonb not null default '[]'::jsonb check (jsonb_typeof(menu) = 'array' and pg_column_size(menu) < 200000),
  offers jsonb not null default '[]'::jsonb check (jsonb_typeof(offers) = 'array' and pg_column_size(offers) < 20000),
  published boolean not null default false,
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.hs_content_editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'manager' check (role = 'manager')
);
alter table public.hs_content enable row level security;
alter table public.hs_content_editors enable row level security;
revoke all on public.hs_content from public, anon, authenticated;
revoke all on public.hs_content_editors from public, anon, authenticated;
grant select on public.hs_content to anon, authenticated;
grant update on public.hs_content to authenticated;
grant select on public.hs_content_editors to authenticated;

-- Anonymous users see ONLY published content. This is not a staff privilege.
create policy hs_content_public_read on public.hs_content
  for select to anon using (published = true);
-- Managers can read draft content and the current revision.
create policy hs_content_manager_read on public.hs_content
  for select to authenticated using (
    exists (select 1 from public.hs_content_editors e
      where e.user_id = (select auth.uid()) and e.role = 'manager')
  );
-- The UPDATE predicate and post-update check both require manager membership.
create policy hs_content_manager_update on public.hs_content
  for update to authenticated
  using (exists (select 1 from public.hs_content_editors e
    where e.user_id = (select auth.uid()) and e.role = 'manager'))
  with check (id = 1 and exists (select 1 from public.hs_content_editors e
    where e.user_id = (select auth.uid()) and e.role = 'manager'));
-- Each signed-in person sees their own membership; only SQL administrators grant roles.
create policy hs_content_editor_self_read on public.hs_content_editors
  for select to authenticated using (user_id = (select auth.uid()));
insert into public.hs_content (id) values (1) on conflict (id) do nothing;

-- AFTER the genuine cafe owner signs in with a verified email magic link,
-- copy their UUID from Supabase Authentication > Users and run this in SQL Editor:
-- insert into public.hs_content_editors (user_id, role)
-- values ('PASTE-VERIFIED-CAFE-OWNER-UUID-HERE'::uuid, 'manager')
-- on conflict (user_id) do update set role = excluded.role;
-- To revoke a former manager immediately: delete from public.hs_content_editors
-- where user_id = 'FORMER-MANAGER-UUID'::uuid;
-- NEVER add the service-role key, owner password, or auth token to browser code.
-- Review existing table and Realtime policies for accidental grants before going live.
