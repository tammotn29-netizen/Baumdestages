-- Bereits als Migration 'baumdestages_v01_minimal_table_privileges' angewandt.
revoke all privileges on public.profiles, public.trees,
  public.tree_photos, public.likes, public.comments from anon, authenticated;
grant select on public.profiles, public.trees,
  public.tree_photos, public.likes, public.comments to anon, authenticated;
grant insert, update on public.profiles, public.trees to authenticated;
grant insert, delete on public.tree_photos, public.likes, public.comments to authenticated;
