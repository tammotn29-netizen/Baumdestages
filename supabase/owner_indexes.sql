-- BaumDesTages v0.1: zusätzliche FK-Indizes, bereits auf dem isolierten Projekt angewendet.
create index if not exists trees_owner_idx on public.trees(owner_id);
create index if not exists tree_photos_user_idx on public.tree_photos(user_id);
create index if not exists likes_user_idx on public.likes(user_id);
create index if not exists comments_user_idx on public.comments(user_id);
