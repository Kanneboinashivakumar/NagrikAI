-- Include the report, its opted-in author name, date, and repair-evidence state in updates.
create or replace function public.notify_issue_followers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_title text;
  reporter_label text;
  report_created_at timestamptz;
  has_repair_image boolean;
  resolved_status boolean;
begin
  select i.title, i.created_at,
         case when p.show_name_on_comments and nullif(trim(p.display_name), '') is not null
              then p.display_name else 'Resident' end
    into report_title, report_created_at, reporter_label
  from public.issues i
  left join public.profiles p on p.id = i.reporter_id
  where i.issue_code = new.issue_code;

  select exists (
    select 1 from public.issue_evidence e
    where e.issue_code = new.issue_code and e.evidence_type = 'REPAIR'
  ) into has_repair_image;

  resolved_status := new.status in ('COMMUNITY_VERIFIED_RESOLVED', 'OFFICIALLY_CONFIRMED');

  insert into public.notifications(recipient_id, issue_code, title, body)
  select f.resident_id,
         new.issue_code,
         case when resolved_status then 'Issue marked resolved' else 'Issue status updated' end,
         format('%s (%s) was reported by %s on %s. Status: %s.%s',
           coalesce(report_title, 'Civic report'), new.issue_code, coalesce(reporter_label, 'Resident'),
           to_char(report_created_at at time zone 'Asia/Kolkata', 'DD Mon YYYY'),
           replace(lower(new.status::text), '_', ' '),
           case when resolved_status and has_repair_image then ' Repair evidence is attached.'
                when resolved_status then ' No repair evidence is attached.'
                else '' end)
  from public.issue_follows f
  where f.issue_code = new.issue_code
    and f.resident_id is distinct from new.actor_id;
  return new;
end;
$$;
