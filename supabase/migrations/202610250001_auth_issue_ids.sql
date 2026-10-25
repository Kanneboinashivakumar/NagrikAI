create sequence if not exists public.issue_code_seq;
do $$
declare current_year text := to_char(now(),'YYYY'); latest_id integer;
begin
  select coalesce(max(right(issue_code,6)::integer),0) into latest_id
  from public.issues where issue_code like 'NAG-'||current_year||'-%';
  perform setval('public.issue_code_seq',latest_id+1,false);
end $$;
create or replace function public.next_issue_code() returns text
language sql volatile security definer set search_path=public as $$
  select 'NAG-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.issue_code_seq')::text,6,'0')
$$;
revoke all on function public.next_issue_code() from public, anon;
grant execute on function public.next_issue_code() to authenticated;
create or replace function public.make_profile() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,nullif(trim(new.raw_user_meta_data->>'display_name'),''))
  on conflict(id) do update set display_name=coalesce(public.profiles.display_name,excluded.display_name);
  return new;
end $$;
-- Persist the reviewed AI output with the report so the impact and evidence summary
-- remain visible across reloads and realtime clients. The report remains the source record.
alter table public.issues add column if not exists ai_analysis jsonb;
