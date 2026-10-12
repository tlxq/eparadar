create table admins (
  user_id uuid primary key references profiles on delete cascade,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

revoke all on admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null
    and exists (select 1 from admins where user_id = auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "admins read all reports"
  on reports for select to authenticated
  using (public.is_admin());


create or replace function public.admin_open_reports()
returns table (
  id uuid,
  target_type text,
  target_id uuid,
  reason text,
  details text,
  snapshot text,
  created_at timestamptz,
  reported_user_id uuid,
  reported_username text,
  reported_display_name text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Bara för admin.' using errcode = '42501';
  end if;

  return query
    select r.id, r.target_type, r.target_id, r.reason, r.details, r.snapshot, r.created_at,
      r.reported_user_id, p.username, p.display_name
    from reports r
    left join profiles p on p.id = r.reported_user_id
    where r.status = 'open'
    order by r.created_at desc
    limit 200;
end;
$$;

revoke execute on function public.admin_open_reports() from public, anon;
grant execute on function public.admin_open_reports() to authenticated;

create or replace function public.admin_mark_report_handled(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Bara för admin.' using errcode = '42501';
  end if;

  update reports set status = 'handled' where id = p_report_id;
  if not found then
    raise exception 'Hittade inte rapporten.';
  end if;
end;
$$;

revoke execute on function public.admin_mark_report_handled(uuid) from public, anon;
grant execute on function public.admin_mark_report_handled(uuid) to authenticated;

create or replace function public.admin_remove_reported_content(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  report reports%rowtype;
  file_path text;
  removed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Bara för admin.' using errcode = '42501';
  end if;

  select * into report from reports where id = p_report_id;
  if not found then
    raise exception 'Hittade inte rapporten.';
  end if;

  if report.target_type = 'post' then
    delete from posts where id = report.target_id returning image_url into file_path;
    removed := found;
    if file_path is not null then
      insert into storage_cleanup (bucket, path) values ('post-images', file_path) on conflict do nothing;
    end if;
  elsif report.target_type = 'message' then
    delete from messages where id = report.target_id returning image_path into file_path;
    removed := found;
    if file_path is not null then
      insert into storage_cleanup (bucket, path) values ('chat-images', file_path) on conflict do nothing;
    end if;
  elsif report.target_type = 'spot' then
    delete from spots where id = report.target_id;
    removed := found;
  elsif report.target_type = 'spot_photo' then
    delete from spot_photos where id = report.target_id;
    removed := found;
  elsif report.target_type = 'meetup' then
    delete from meetups where id = report.target_id;
    removed := found;
  elsif report.target_type = 'status' then
    update locations set status_text = null
    where user_id = report.target_id
      and status_text is not null
      and 'Status: ' || status_text = report.snapshot;
    removed := found;
  elsif report.target_type = 'conversation' then
    select avatar_path into file_path from conversations where id = report.target_id and is_group;
    update conversations set name = null, avatar_path = null
    where id = report.target_id and is_group;
    removed := found;
    if file_path is not null then
      insert into storage_cleanup (bucket, path) values ('group-avatars', file_path) on conflict do nothing;
    end if;
  else
    raise exception 'Den här typen går inte att ta bort härifrån.';
  end if;

  update reports set status = 'handled'
  where status = 'open'
    and target_type = report.target_type
    and target_id = report.target_id
    and (report.target_type not in ('status', 'conversation') or snapshot is not distinct from report.snapshot);

  return removed;
end;
$$;

revoke execute on function public.admin_remove_reported_content(uuid) from public, anon;
grant execute on function public.admin_remove_reported_content(uuid) to authenticated;

insert into admins (user_id)
select u.id
from auth.users u
join profiles p on p.id = u.id
where u.email = 'admin@example.com'
on conflict (user_id) do nothing;
