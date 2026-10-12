create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references profiles on delete cascade,
  reported_user_id uuid references profiles on delete set null,
  target_type text not null check (target_type in ('post', 'message', 'profile', 'spot', 'spot_photo', 'meetup')),
  target_id uuid not null,
  reason text not null check (reason in ('hat', 'sexuellt', 'hot', 'mobbning', 'spam', 'farligt', 'annat')),
  details text check (char_length(details) <= 500),
  snapshot text,
  status text not null default 'open' check (status in ('open', 'handled')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index reports_reporter_created_idx on reports (reporter_id, created_at);

alter table reports enable row level security;

revoke update, delete, truncate on reports from anon, authenticated;

create policy "people file reports as themselves"
  on reports for insert to authenticated
  with check (reporter_id = auth.uid());

create policy "people see their own reports"
  on reports for select to authenticated
  using (reporter_id = auth.uid());

create or replace function public.report_content(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target_user uuid;
  target_text text;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_type = 'post' then
    select author_id, coalesce(body, '') || coalesce(' [bild: ' || image_url || ']', '')
      into target_user, target_text from posts where id = p_target_id;
  elsif p_target_type = 'message' then
    select sender_id, body into target_user, target_text from messages where id = p_target_id;
  elsif p_target_type = 'profile' then
    select id, display_name || ' (@' || username || ')' || coalesce(' ' || bio, '')
      into target_user, target_text from profiles where id = p_target_id;
  elsif p_target_type = 'spot' then
    select creator_id, coalesce(name, warning_type) into target_user, target_text
      from spots where id = p_target_id;
  elsif p_target_type = 'spot_photo' then
    select author_id, '[bild: ' || path || ']' into target_user, target_text
      from spot_photos where id = p_target_id;
  elsif p_target_type = 'meetup' then
    select creator_id, title into target_user, target_text from meetups where id = p_target_id;
  else
    raise exception 'Okänd typ.';
  end if;

  if target_user is null then
    raise exception 'Hittade inte det du vill rapportera.';
  end if;

  if target_user = caller then
    raise exception 'Du kan inte rapportera dig själv.';
  end if;

  if (
    select count(*) from reports
    where reporter_id = caller and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Du har rapporterat mycket på kort tid. Försök igen senare.';
  end if;

  insert into reports (reporter_id, reported_user_id, target_type, target_id, reason, details, snapshot)
  values (caller, target_user, p_target_type, p_target_id, p_reason, nullif(btrim(p_details), ''), left(target_text, 1000))
  on conflict (reporter_id, target_type, target_id) do nothing;
end;
$$;

revoke execute on function public.report_content(text, uuid, text, text) from public, anon;
grant execute on function public.report_content(text, uuid, text, text) to authenticated;

create or replace function public.notify_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  secret_key text;
  function_url text;
begin
  select decrypted_secret into secret_key
  from vault.decrypted_secrets
  where name = 'edge_function_secret_key';

  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'notify_report_function_url';

  if secret_key is null or function_url is null then
    return null;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', secret_key),
    body := jsonb_build_object('report_id', new.id)
  );
  return null;
end;
$$;

revoke execute on function public.notify_report() from public, anon, authenticated;

create trigger reports_notify
  after insert on reports
  for each row
  execute function public.notify_report();
