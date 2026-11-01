-- BaumDesTages v0.2: Eigentümer-Löschung und private Inhaltsmeldungen.
-- Im separaten Projekt BaumDesTages ausführen. Keine MyGardenAtlas-Daten verändern.
create policy "delete own trees" on public.trees
  for delete to authenticated
  using ((select auth.uid()) = owner_id);
grant delete on public.trees to authenticated;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  tree_id uuid references public.trees(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null check (reason in ('spam','privacy','copyright','abuse','other')),
  details text not null default '' check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  constraint reports_exactly_one_target check (num_nonnulls(tree_id, comment_id) = 1)
);
create unique index if not exists reports_tree_once on public.reports(reporter_id,tree_id)
  where tree_id is not null;
create unique index if not exists reports_comment_once on public.reports(reporter_id,comment_id)
  where comment_id is not null;
create index if not exists reports_created_idx on public.reports(created_at desc);
create index if not exists reports_tree_idx on public.reports(tree_id);
create index if not exists reports_comment_idx on public.reports(comment_id);
alter table public.reports enable row level security;
create policy "read own reports" on public.reports for select to authenticated
  using ((select auth.uid()) = reporter_id);
create policy "submit own report" on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id);
revoke all privileges on public.reports from anon,authenticated;
grant select,insert on public.reports to authenticated;
-- Meldungen sind für andere Nutzer und Gäste NICHT lesbar.
-- Moderation findet zunächst nur über die autorisierte Supabase-Administration statt.
