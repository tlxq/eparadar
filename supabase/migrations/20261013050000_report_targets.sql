alter table reports drop constraint reports_target_type_check;

alter table reports add constraint reports_target_type_check
  check (target_type in ('post', 'message', 'profile', 'spot', 'spot_photo', 'meetup', 'status', 'conversation'));

alter table reports drop constraint reports_reporter_id_target_type_target_id_key;

create unique index reports_reporter_target_snapshot_key
  on reports (reporter_id, target_type, target_id, md5(coalesce(snapshot, '')));

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
  target_found boolean := false;
  clean_details text := nullif(btrim(p_details), '');
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if p_reason = 'annat' and clean_details is null then
    raise exception 'Skriv kort vad det gäller.';
  end if;

  if p_target_type = 'post' then
    select author_id, coalesce(body, '') || coalesce(' [bild: ' || image_url || ']', '')
      into target_user, target_text from posts where id = p_target_id;
  elsif p_target_type = 'message' then
    select sender_id, btrim(body || coalesce(' [bild: ' || image_path || ']', ''))
      into target_user, target_text from messages where id = p_target_id;
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
  elsif p_target_type = 'status' then
    select user_id, 'Status: ' || status_text into target_user, target_text
      from locations
      where user_id = p_target_id and status_text is not null and status_expires_at > now();
  elsif p_target_type = 'conversation' then
    select true, 'Grupp: ' || coalesce(name, '(inget namn)') || coalesce(' [bild: ' || avatar_path || ']', '')
      into target_found, target_text
      from conversations where id = p_target_id and is_group;
  else
    raise exception 'Okänd typ.';
  end if;

  if target_user is null and not coalesce(target_found, false) then
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

  target_text := left(target_text, 1000);

  insert into reports (reporter_id, reported_user_id, target_type, target_id, reason, details, snapshot)
  values (caller, target_user, p_target_type, p_target_id, p_reason, clean_details, target_text)
  on conflict (reporter_id, target_type, target_id, md5(coalesce(snapshot, ''))) do nothing;
end;
$$;

revoke execute on function public.report_content(text, uuid, text, text) from public, anon;
grant execute on function public.report_content(text, uuid, text, text) to authenticated;
