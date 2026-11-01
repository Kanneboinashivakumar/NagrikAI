create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create type public.issue_status as enum ('REPORTED','UNDER_REVIEW','ACKNOWLEDGED','IN_PROGRESS','REPAIR_EVIDENCE_SUBMITTED','COMMUNITY_VERIFICATION','COMMUNITY_VERIFIED_RESOLVED','OFFICIALLY_CONFIRMED','REOPENED','REJECTED');
create type public.evidence_kind as enum ('ORIGINAL','ADDITIONAL','REPAIR');
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade, display_name text, language text not null default 'English', email_notifications boolean not null default false, show_name_on_comments boolean not null default false, created_at timestamptz not null default now());
create table public.issues(
 issue_code text primary key check(issue_code ~ '^NAG-[0-9]{4}-[0-9]{6}$'), reporter_id uuid not null references auth.users(id),
 title text not null check(length(title) between 4 and 160), category text not null, description text not null check(length(description) between 4 and 5000),
 location_text text not null, location extensions.geography(point,4326), status public.issue_status not null default 'REPORTED', original_image_url text,
 severity_score smallint not null default 2 check(severity_score between 0 and 4), people_affected integer not null default 0 check(people_affected>=0),
 recurrence_count integer not null default 0 check(recurrence_count>=0), supporter_count integer not null default 0 check(supporter_count>=0), priority_score smallint not null default 0 check(priority_score between 0 and 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index issues_location_gix on public.issues using gist(location);
create index issues_status_idx on public.issues(status,created_at desc);
create or replace function public.get_public_issue_map_points() returns table(issue_code text,title text,category text,location_text text,status public.issue_status,latitude double precision,longitude double precision) language sql stable security invoker set search_path=public,extensions as $$ select i.issue_code,i.title,i.category,i.location_text,i.status,extensions.st_y(i.location::extensions.geometry),extensions.st_x(i.location::extensions.geometry) from public.issues i where i.location is not null $$;
grant execute on function public.get_public_issue_map_points() to anon,authenticated;
create table public.issue_status_history(id uuid primary key default gen_random_uuid(), issue_code text not null references public.issues(issue_code) on delete cascade, actor_id uuid references auth.users(id), status public.issue_status not null, note text check(length(note)<=1000), source text not null default 'RESIDENT', created_at timestamptz not null default now());
create table public.issue_evidence(id uuid primary key default gen_random_uuid(), issue_code text not null references public.issues(issue_code) on delete cascade, contributor_id uuid not null references auth.users(id), evidence_type public.evidence_kind not null, image_url text not null, description text check(length(description)<=2000), created_at timestamptz not null default now());
create table public.issue_support(issue_code text not null references public.issues(issue_code) on delete cascade, resident_id uuid not null references auth.users(id), created_at timestamptz not null default now(), primary key(issue_code,resident_id));
create table public.issue_follows(issue_code text not null references public.issues(issue_code) on delete cascade, resident_id uuid not null references auth.users(id), created_at timestamptz not null default now(), primary key(issue_code,resident_id));
create table public.saved_locations(id uuid primary key default gen_random_uuid(), resident_id uuid not null references auth.users(id) on delete cascade, label text not null check(length(label) between 2 and 120), location_text text not null, location extensions.geography(point,4326), created_at timestamptz not null default now(), unique(resident_id,location_text));
create table public.issue_comments(id uuid primary key default gen_random_uuid(), issue_code text not null references public.issues(issue_code) on delete cascade, author_id uuid not null references auth.users(id), body text not null check(length(body) between 1 and 2000), created_at timestamptz not null default now());
create table public.issue_relations(issue_code text not null references public.issues(issue_code) on delete cascade, related_issue_code text not null references public.issues(issue_code) on delete cascade, relation text not null default 'RECURRENCE' check(relation in ('RECURRENCE','DUPLICATE','RELATED')), created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), primary key(issue_code,related_issue_code), check(issue_code<>related_issue_code));
create table public.notifications(id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users(id) on delete cascade, issue_code text references public.issues(issue_code) on delete cascade, title text not null, body text not null, read_at timestamptz, created_at timestamptz not null default now());
create table public.user_roles(user_id uuid not null references auth.users(id) on delete cascade, role text not null check(role in ('MODERATOR','ADMIN')), primary key(user_id,role));
create or replace function public.has_role(required text) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=auth.uid() and role=required) $$;
create or replace function public.compute_issue_priority() returns trigger language plpgsql set search_path=public as $$
begin new.priority_score:=least(100,greatest(0,round(new.severity_score*12.0+least(new.people_affected,1000)/1000.0*20+least(new.supporter_count,50)/50.0*10+least(extract(epoch from(now()-new.created_at))/86400/90,1)*25+least(new.recurrence_count,5)/5.0*15)::integer)); new.updated_at:=now(); return new; end $$;
create trigger issues_priority before insert or update of severity_score,people_affected,supporter_count,recurrence_count on public.issues for each row execute function public.compute_issue_priority();
create or replace function public.protect_original_evidence() returns trigger language plpgsql as $$ begin if old.original_image_url is distinct from new.original_image_url then raise exception 'Original report evidence is immutable'; end if; return new; end $$;
create trigger immutable_original_evidence before update of original_image_url on public.issues for each row execute function public.protect_original_evidence();
create or replace function public.sync_issue_status() returns trigger language plpgsql security definer set search_path=public as $$ begin update public.issues set status=new.status,updated_at=now() where issue_code=new.issue_code; return new; end $$;
create trigger issue_status_updates after insert on public.issue_status_history for each row execute function public.sync_issue_status();
create or replace function public.notify_issue_followers() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.notifications(recipient_id,issue_code,title,body) select resident_id,new.issue_code,'Issue status updated',new.issue_code||' is now '||replace(lower(new.status::text),'_',' ') from public.issue_follows where issue_code=new.issue_code and resident_id is distinct from new.actor_id; return new; end $$;
create trigger status_followers_notification after insert on public.issue_status_history for each row execute function public.notify_issue_followers();
create or replace function public.log_repair_evidence_status() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.evidence_type='REPAIR' then insert into public.issue_status_history(issue_code,actor_id,status,note,source) values(new.issue_code,new.contributor_id,'REPAIR_EVIDENCE_SUBMITTED','Repair evidence uploaded by a resident','RESIDENT'); end if; return new; end $$;
create trigger repair_evidence_status after insert on public.issue_evidence for each row execute function public.log_repair_evidence_status();
create or replace function public.sync_support_count() returns trigger language plpgsql security definer set search_path=public as $$ begin if tg_op='INSERT' then update public.issues set supporter_count=supporter_count+1 where issue_code=new.issue_code; return new; else update public.issues set supporter_count=greatest(0,supporter_count-1) where issue_code=old.issue_code; return old; end if; end $$;
create trigger issue_support_updates after insert or delete on public.issue_support for each row execute function public.sync_support_count();
create or replace function public.make_profile() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id) values(new.id) on conflict do nothing; return new; end $$;
create trigger auth_user_profile after insert on auth.users for each row execute function public.make_profile();
create or replace function public.log_initial_status() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.issue_status_history(issue_code,actor_id,status,note,source) values(new.issue_code,new.reporter_id,new.status,'Issue submitted by a resident','RESIDENT'); return new; end $$;
create trigger issue_initial_status after insert on public.issues for each row execute function public.log_initial_status();
alter table public.profiles enable row level security;
alter table public.issues enable row level security;
alter table public.issue_status_history enable row level security;
alter table public.issue_evidence enable row level security;
alter table public.issue_support enable row level security;
alter table public.issue_follows enable row level security;
alter table public.saved_locations enable row level security;
alter table public.issue_comments enable row level security;
alter table public.issue_relations enable row level security;
alter table public.notifications enable row level security;
alter table public.user_roles enable row level security;
create policy "profiles readable by owner" on public.profiles for select to authenticated using(id=auth.uid());
create policy "profiles update by owner" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "public read issues" on public.issues for select to anon,authenticated using(true);
create policy "resident create issue" on public.issues for insert to authenticated with check(reporter_id=auth.uid() and status='REPORTED');
create policy "moderator update issue" on public.issues for update to authenticated using(public.has_role('MODERATOR') or public.has_role('ADMIN')) with check(public.has_role('MODERATOR') or public.has_role('ADMIN'));
create policy "public read status history" on public.issue_status_history for select to anon,authenticated using(true);
create policy "resident add community decision" on public.issue_status_history for insert to authenticated with check(actor_id=auth.uid() and status in ('COMMUNITY_VERIFICATION','COMMUNITY_VERIFIED_RESOLVED','REOPENED'));
create policy "moderator add status update" on public.issue_status_history for insert to authenticated with check(actor_id=auth.uid() and status <> 'OFFICIALLY_CONFIRMED' and (public.has_role('MODERATOR') or public.has_role('ADMIN')));
create policy "public read evidence" on public.issue_evidence for select to anon,authenticated using(true);
create policy "resident add evidence" on public.issue_evidence for insert to authenticated with check(contributor_id=auth.uid());
create policy "public read support totals" on public.issue_support for select to anon,authenticated using(true);
create policy "resident support once" on public.issue_support for insert to authenticated with check(resident_id=auth.uid());
create policy "resident remove own support" on public.issue_support for delete to authenticated using(resident_id=auth.uid());
create policy "resident read own follows" on public.issue_follows for select to authenticated using(resident_id=auth.uid());
create policy "resident follow once" on public.issue_follows for insert to authenticated with check(resident_id=auth.uid());
create policy "resident unfollow own" on public.issue_follows for delete to authenticated using(resident_id=auth.uid());
create policy "resident read own saved locations" on public.saved_locations for select to authenticated using(resident_id=auth.uid());
create policy "resident save own location" on public.saved_locations for insert to authenticated with check(resident_id=auth.uid());
create policy "resident remove own saved location" on public.saved_locations for delete to authenticated using(resident_id=auth.uid());
create policy "public read comments" on public.issue_comments for select to anon,authenticated using(true);
create policy "resident add comment" on public.issue_comments for insert to authenticated with check(author_id=auth.uid());
create policy "public read issue relations" on public.issue_relations for select to anon,authenticated using(true);
create policy "resident link recurrence" on public.issue_relations for insert to authenticated with check(created_by=auth.uid());
create policy "resident notifications" on public.notifications for select to authenticated using(recipient_id=auth.uid());
create policy "resident mark notification read" on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
create policy "role self read" on public.user_roles for select to authenticated using(user_id=auth.uid());
create policy "admin role management" on public.user_roles for all to authenticated using(public.has_role('ADMIN')) with check(public.has_role('ADMIN'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('issue-evidence','issue-evidence',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "public view civic evidence" on storage.objects for select to anon,authenticated using(bucket_id='issue-evidence');
create policy "upload only into own folder" on storage.objects for insert to authenticated with check(bucket_id='issue-evidence' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "delete own uploaded evidence" on storage.objects for delete to authenticated using(bucket_id='issue-evidence' and (storage.foldername(name))[1]=auth.uid()::text);
comment on column public.issues.priority_score is 'Transparent 0–100 score: severity (48 max), affected people (20), confirmations (10), unresolved age (25), recurrence (15), clamped to 100. Votes have low capped weight; refresh score on record changes.';
-- Keep public resident issue activity current in connected clients.
do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='issues') then
  alter publication supabase_realtime add table public.issues;
 end if;
end $$;
