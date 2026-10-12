create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from profiles p where p.id = me),
    'birth_year', (select a.birth_year from user_ages a where a.user_id = me),
    'cars', coalesce((select jsonb_agg(to_jsonb(c)) from cars c where c.owner_id = me), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(to_jsonb(p)) from posts p where p.author_id = me), '[]'::jsonb),
    'likes', coalesce((select jsonb_agg(to_jsonb(l)) from likes l where l.user_id = me), '[]'::jsonb),
    'friendships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'with_user_id', case when f.requester_id = me then f.addressee_id else f.requester_id end,
        'status', f.status,
        'created_at', f.created_at
      ))
      from friendships f where me in (f.requester_id, f.addressee_id)
    ), '[]'::jsonb),
    'conversations', coalesce((
      select jsonb_agg(to_jsonb(cm)) from conversation_members cm where cm.user_id = me
    ), '[]'::jsonb),
    'messages_sent', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at) from messages m where m.sender_id = me
    ), '[]'::jsonb),
    'location', (select to_jsonb(l) from locations l where l.user_id = me),
    'spots', coalesce((select jsonb_agg(to_jsonb(s)) from spots s where s.creator_id = me), '[]'::jsonb),
    'spot_photos', coalesce((select jsonb_agg(to_jsonb(s)) from spot_photos s where s.author_id = me), '[]'::jsonb),
    'meetups', coalesce((select jsonb_agg(to_jsonb(m)) from meetups m where m.creator_id = me), '[]'::jsonb),
    'meetup_interests', coalesce((select jsonb_agg(to_jsonb(i)) from meetup_interests i where i.user_id = me), '[]'::jsonb),
    'meetup_checkins', coalesce((select jsonb_agg(to_jsonb(c)) from meetup_checkins c where c.user_id = me), '[]'::jsonb),
    'reports_filed', coalesce((
      select jsonb_agg(jsonb_build_object('target_type', r.target_type, 'reason', r.reason, 'details', r.details, 'created_at', r.created_at))
      from reports r where r.reporter_id = me
    ), '[]'::jsonb),
    'push_devices', coalesce((
      select jsonb_agg(jsonb_build_object('platform', t.platform, 'created_at', t.created_at))
      from push_tokens t where t.user_id = me
    ), '[]'::jsonb),
    'app_events', coalesce((
      select jsonb_agg(jsonb_build_object('event', e.event_name, 'at', e.created_at))
      from analytics_events e where e.user_id = me
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
