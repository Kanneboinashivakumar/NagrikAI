-- Expose contributor names only when the resident opted in through their profile setting.
create or replace function public.get_public_reporter_names(reporter_ids uuid[])
returns table(reporter_id uuid, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name
  from public.profiles p
  where p.id = any(reporter_ids)
    and p.show_name_on_comments = true
    and nullif(trim(p.display_name), '') is not null;
$$;

revoke all on function public.get_public_reporter_names(uuid[]) from public;
grant execute on function public.get_public_reporter_names(uuid[]) to anon, authenticated;
