-- BaumDesTages v0.1 – ausschließlich auf einer EIGENEN Supabase-Instanz ausführen.
-- In produktiven Umgebungen vor öffentlicher Freigabe Moderation, Bot-Schutz und
-- serverseitige Upload-Kontingente zusätzlich überprüfen.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check(username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default 'Baumfreund' check(char_length(display_name) <= 80),
  bio text not null default '' check(char_length(bio) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.trees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  common_name text not null check(char_length(common_name) between 1 and 100),
  species text check(species is null or char_length(species) <= 140),
  nickname text check(nickname is null or char_length(nickname) <= 100),
  description text check(description is null or char_length(description) <= 2000),
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  location_precision text not null default 'approximate'
    check(location_precision in ('approximate','exact')),
  created_at timestamptz not null default now()
);

create index if not exists trees_created_idx on public.trees(created_at desc);
create index if not exists trees_bbox_idx on public.trees(latitude,longitude);

create table if not exists public.tree_photos (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists tree_photos_tree_idx on public.tree_photos(tree_id);

create table if not exists public.likes (
  tree_id uuid not null references public.trees(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(tree_id,user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(char_length(trim(body)) between 1 and 700),
  created_at timestamptz not null default now()
);

create index if not exists comments_tree_idx on public.comments(tree_id,created_at desc);

alter table public.profiles enable row level security;
alter table public.trees enable row level security;
alter table public.tree_photos enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

create policy "public profiles" on public.profiles for select to anon,authenticated using (true);
create policy "create own profile" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "edit own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "public trees" on public.trees for select to anon,authenticated using (true);
create policy "create own trees" on public.trees for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "edit own trees" on public.trees for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "public photos" on public.tree_photos for select to anon,authenticated using (true);
create policy "attach own photos" on public.tree_photos for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and split_part(storage_path,'/',1) = (select auth.uid())::text
    and split_part(storage_path,'/',2) = tree_id::text
    and exists (select 1 from public.trees t where t.id = tree_id and t.owner_id = (select auth.uid()))
  );
create policy "delete own photo metadata" on public.tree_photos for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "public likes" on public.likes for select to anon,authenticated using (true);
create policy "like as self" on public.likes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "unlike as self" on public.likes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "public comments" on public.comments for select to anon,authenticated using (true);
create policy "comment as self" on public.comments for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "delete own comment" on public.comments for delete to authenticated
  using ((select auth.uid()) = user_id);

grant usage on schema public to anon,authenticated;
-- Standardmäßige weitgehende Berechtigungen von Supabase explizit minimieren.
revoke all privileges on public.profiles,public.trees,public.tree_photos,public.likes,public.comments
  from anon,authenticated;
grant select on public.profiles,public.trees,public.tree_photos,public.likes,public.comments to anon,authenticated;
grant insert,update on public.profiles to authenticated;
grant insert,update on public.trees to authenticated;
grant insert,delete on public.tree_photos,public.likes,public.comments to authenticated;

-- Öffentliches Fotoalbum: Fotos der Community sind bewusst öffentlich.
-- Auf einem neuen Projekt anlegen; ein vorhandener Bucket wird NICHT verändert.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('tree-photos','tree-photos',true,1000000,array['image/jpeg'])
on conflict (id) do nothing;

-- Schutz gegen triviale unbegrenzte Uploads pro Nutzer und pro Baum.
-- Die Zählung ist nicht atomar bei parallelen Anfragen. Vor öffentlichem Start
-- zwingend serverseitig mit Rate-Limit / Transaktionen ergänzen.
create schema if not exists bdt_private;
create or replace function bdt_private.may_upload_photo(p_name text)
returns boolean
language sql stable security definer
set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and (select count(*) from storage.objects o
         where o.bucket_id='tree-photos'
           and o.name like ((select auth.uid())::text || '/%')) < 100
    and (select count(*) from storage.objects o
         where o.bucket_id='tree-photos'
           and o.name like (
            (select auth.uid())::text || '/' || split_part(p_name,'/',2) || '/%')) < 5
$function$;
revoke all on function bdt_private.may_upload_photo(text) from public;
grant usage on schema bdt_private to authenticated;
grant execute on function bdt_private.may_upload_photo(text) to authenticated;

create policy "community photo reads" on storage.objects
  for select to anon,authenticated using (bucket_id = 'tree-photos');
create policy "owner photo uploads" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tree-photos'
    and split_part(name,'/',1) = (select auth.uid())::text
    and name ~ '^[0-9a-f-]+/[0-9a-f-]+/[0-9a-f-]+[.]jpg$'
    and exists (
      select 1 from public.trees t
      where t.id::text = split_part(name,'/',2)
        and t.owner_id = (select auth.uid())
    )
    and bdt_private.may_upload_photo(name)
  );
create policy "delete own photo objects" on storage.objects
  for delete to authenticated
  using (bucket_id = 'tree-photos'
    and split_part(name,'/',1) = (select auth.uid())::text);
