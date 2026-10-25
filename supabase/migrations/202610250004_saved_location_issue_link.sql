alter table public.saved_locations
  add column if not exists issue_code text references public.issues(issue_code) on delete set null;

create index if not exists saved_locations_issue_code_idx
  on public.saved_locations(issue_code) where issue_code is not null;
