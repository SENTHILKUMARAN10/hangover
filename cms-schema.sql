-- Hangover Shakes CMS. Run ONLY in a dedicated cafe-owned Supabase project.
-- This stores menu and offers, not customer orders. It does NOT enable QR checkout.
create table if not exists public.hs_content (
 id smallint primary key default 1 check (id=1),
 menu jsonb not null default '[]'::jsonb check (jsonb_typeof(menu)='array' and pg_column_size(menu)<200000),
 offers jsonb not null default '[]'::jsonb check (jsonb_typeof(offers)='array' and pg_column_size(offers)<20000),
 published boolean not null default false,
 revision integer not null default 0 check (revision>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.hs_content_editors (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'manager' check (role='manager')
);
alter table public.hs_content enable row level security;
alter table public.hs_content_editors enable row level security;
revoke all on public.hs_content from public,anon,authenticated;
revoke all on public.hs_content_editors from public,anon,authenticated;
grant select on public.hs_content to anon,authenticated;
grant update on public.hs_content to authenticated;
grant select on public.hs_content_editors to authenticated;
create policy hs_content_public_read on public.hs_content
 for select to anon using (published = true);
create policy hs_content_manager_read on public.hs_content
 for select to authenticated using (
  exists (select 1 from public.hs_content_editors e
   where e.user_id=(select auth.uid()) and e.role='manager')
 );
create policy hs_content_manager_update on public.hs_content
 for update to authenticated
 using (exists (select 1 from public.hs_content_editors e
  where e.user_id=(select auth.uid()) and e.role='manager'))
 with check (id=1 and exists (select 1 from public.hs_content_editors e
  where e.user_id=(select auth.uid()) and e.role='manager'));
create policy hs_content_editor_self_read on public.hs_content_editors
 for select to authenticated using (user_id=(select auth.uid()));
insert into public.hs_content (id) values (1) on conflict(id) do nothing;

-- After a genuine cafe-owned VERIFIED email/password Auth account is provisioned,
-- copy that account's UUID from Supabase Authentication > Users and run in SQL editor:
-- insert into public.hs_content_editors (user_id,role)
-- values ('PASTE-VERIFIED-CAFE-OWNER-UUID-HERE'::uuid,'manager')
-- on conflict(user_id) do update set role=excluded.role;
-- To revoke a manager, delete their membership, revoke their Auth session/account,
-- and review kitchen permissions and existing tokens as part of the offboarding workflow.
-- Never put passwords, tokens, service-role keys or other secrets in frontend JavaScript.
