create extension if not exists pg_cron with schema pg_catalog;

alter table locations
  alter column lat drop not null,
  alter column lng drop not null;

drop policy "owner and friends view shared locations" on locations;

create policy "owner and friends view fresh shared locations"
  on locations for select to authenticated
  using (
    auth.uid() = user_id
    or (
      sharing_enabled
      and lat is not null
      and updated_at > now() - interval '12 hours'
      and is_friend(auth.uid(), user_id)
    )
  );

create or replace function record_heat_point()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.sharing_enabled then
    delete from heat_points where user_id = new.user_id;
  elsif new.lat is not null and new.lng is not null then
    insert into heat_points (user_id, cell_lat, cell_lng, seen_at)
    values (new.user_id, round(new.lat / 0.003) * 0.003, round(new.lng / 0.003) * 0.003, now())
    on conflict (user_id, cell_lat, cell_lng) do update set seen_at = excluded.seen_at;
  end if;
  return null;
end;
$$;

drop trigger locations_record_heat on locations;

create trigger locations_record_heat
  after insert or update of lat, lng, sharing_enabled on locations
  for each row
  execute function record_heat_point();

update spots set visibility = 'friends' where visibility <> 'friends';
update spots set expires_at = now() + interval '24 hours' where expires_at is null;

alter table spots
  alter column expires_at set default now() + interval '24 hours',
  alter column expires_at set not null,
  drop constraint spots_visibility_check,
  add constraint spots_visibility_check check (visibility = 'friends');

create or replace function set_spot_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at := now();
  new.visibility := 'friends';
  if new.kind = 'varning' then
    new.expires_at := new.created_at + interval '2 hours';
  else
    new.expires_at := new.created_at + interval '24 hours';
  end if;
  return new;
end;
$$;

drop policy "people see live spots shared with them" on spots;

create policy "people see their own and friends' live spots"
  on spots for select to authenticated
  using (
    expires_at > now()
    and (creator_id = auth.uid() or is_friend(auth.uid(), creator_id))
  );

drop policy "anyone can view meetups" on meetups;

create policy "creator and friends see current meetups"
  on meetups for select to authenticated
  using (
    starts_at > now() - interval '1 day'
    and (creator_id = auth.uid() or is_friend(auth.uid(), creator_id))
  );

create table storage_cleanup (
  bucket text not null,
  path text not null,
  queued_at timestamptz not null default now(),
  primary key (bucket, path)
);

alter table storage_cleanup enable row level security;

create or replace function queue_spot_photo_file()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into storage_cleanup (bucket, path)
  values ('spot-photos', old.path)
  on conflict do nothing;
  return null;
end;
$$;

revoke execute on function public.queue_spot_photo_file() from public, anon, authenticated;

create trigger spot_photos_queue_file
  after delete on spot_photos
  for each row
  execute function queue_spot_photo_file();

create or replace function public.purge_expired_map_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update locations
  set lat = null, lng = null, heading = null, moving = false
  where lat is not null and updated_at < now() - interval '12 hours';

  update locations
  set status_text = null
  where status_text is not null and status_expires_at < now();

  delete from nearby_presence where seen_at < now() - interval '2 minutes';
  delete from heat_points where seen_at < now() - interval '12 hours';
  delete from spot_photos where expires_at < now();
  delete from spots where expires_at < now();
  delete from meetup_checkins where checked_in_at < now() - interval '12 hours';
  delete from meetups where starts_at < now() - interval '1 day';
end;
$$;

revoke execute on function public.purge_expired_map_data() from public, anon, authenticated;

create or replace function public.take_storage_cleanup()
returns table (bucket text, path text)
language sql
security definer
set search_path = public
as $$
  delete from storage_cleanup
  where (storage_cleanup.bucket, storage_cleanup.path) in (
    select s.bucket, s.path from storage_cleanup s order by s.queued_at limit 500
  )
  returning storage_cleanup.bucket, storage_cleanup.path;
$$;

revoke execute on function public.take_storage_cleanup() from public, anon, authenticated;
grant execute on function public.take_storage_cleanup() to service_role;

create or replace function public.request_storage_cleanup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  secret_key text;
  function_url text;
begin
  if not exists (select 1 from storage_cleanup) then
    return;
  end if;

  select decrypted_secret into secret_key
  from vault.decrypted_secrets
  where name = 'edge_function_secret_key';

  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'purge_storage_function_url';

  if secret_key is null or function_url is null then
    return;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', secret_key),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.request_storage_cleanup() from public, anon, authenticated;

select cron.schedule(
  'purge-expired-map-data',
  '*/10 * * * *',
  'select public.purge_expired_map_data(); select public.request_storage_cleanup();'
);
