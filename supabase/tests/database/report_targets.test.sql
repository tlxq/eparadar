begin;

select plan(17);

select tests.create_user('6e000001-0000-0000-0000-000000000001', 'test-rt-alice', 'Alice');
select tests.create_user('6e000002-0000-0000-0000-000000000002', 'test-rt-bob', 'Bob');
select tests.create_user('6e000003-0000-0000-0000-000000000003', 'test-rt-carol', 'Carol');

insert into public.friendships (requester_id, addressee_id, status) values
  ('6e000001-0000-0000-0000-000000000001', '6e000002-0000-0000-0000-000000000002', 'accepted');

insert into public.locations (user_id, lat, lng, sharing_enabled, status_text) values
  ('6e000001-0000-0000-0000-000000000001', 59.3, 18.1, true, 'Elak status');

insert into public.conversations (id, is_group, name) values
  ('6e0000c1-0000-0000-0000-000000000001', true, 'Fula gänget');

insert into public.conversation_members (conversation_id, user_id) values
  ('6e0000c1-0000-0000-0000-000000000001', '6e000001-0000-0000-0000-000000000001'),
  ('6e0000c1-0000-0000-0000-000000000001', '6e000002-0000-0000-0000-000000000002');

insert into public.messages (id, conversation_id, sender_id, body, image_path) values
  ('6e0000d1-0000-0000-0000-000000000001', '6e0000c1-0000-0000-0000-000000000001',
   '6e000001-0000-0000-0000-000000000001', '', '6e0000c1-0000-0000-0000-000000000001/bild.jpg');

insert into public.spots (id, creator_id, kind, name, lat, lng) values
  ('6e0000a1-0000-0000-0000-000000000001', '6e000001-0000-0000-0000-000000000001', 'ragg', 'Max', 59.3, 18.1);

insert into public.spot_photos (id, spot_id, author_id, path) values
  ('6e0000e1-0000-0000-0000-000000000001', '6e0000a1-0000-0000-0000-000000000001',
   '6e000001-0000-0000-0000-000000000001', '6e0000a1-0000-0000-0000-000000000001/alice.jpg');

select tests.login_anon();

select throws_ok(
  $$select public.report_content('status', '6e000001-0000-0000-0000-000000000001', 'hat')$$,
  '42501',
  null,
  'a logged-out caller cannot report a status'
);

select throws_ok(
  $$select public.report_content('conversation', '6e0000c1-0000-0000-0000-000000000001', 'hat')$$,
  '42501',
  null,
  'a logged-out caller cannot report a group'
);

select tests.login_as('6e000003-0000-0000-0000-000000000003');

select throws_ok(
  $$select public.report_content('status', '6e000001-0000-0000-0000-000000000001', 'hat')$$,
  'P0001',
  'Hittade inte det du vill rapportera.',
  'a stranger cannot report a status they cannot see'
);

select throws_ok(
  $$select public.report_content('conversation', '6e0000c1-0000-0000-0000-000000000001', 'hat')$$,
  'P0001',
  'Hittade inte det du vill rapportera.',
  'a stranger cannot report a group they are not in'
);

select throws_ok(
  $$select public.report_content('spot_photo', '6e0000e1-0000-0000-0000-000000000001', 'sexuellt')$$,
  'P0001',
  'Hittade inte det du vill rapportera.',
  'a stranger cannot report a spot photo they cannot see'
);

select is((select count(*)::int from public.reports), 0, 'the stranger filed nothing');

select tests.login_as('6e000002-0000-0000-0000-000000000002');

select throws_ok(
  $$select public.report_content('status', '6e000001-0000-0000-0000-000000000001', 'annat', '  ')$$,
  'P0001',
  'Skriv kort vad det gäller.',
  '"Något annat" needs a few words'
);

select lives_ok(
  $$select public.report_content('status', '6e000001-0000-0000-0000-000000000001', 'mobbning')$$,
  'a friend can report a status'
);

select is(
  (select snapshot || '|' || reported_user_id from public.reports where target_type = 'status'),
  'Status: Elak status|6e000001-0000-0000-0000-000000000001',
  'the status report keeps the text and the person'
);

select lives_ok(
  $$select public.report_content('conversation', '6e0000c1-0000-0000-0000-000000000001', 'annat', 'Fult namn')$$,
  'a member can report a group'
);

select is(
  (select snapshot || '|' || coalesce(reported_user_id::text, 'ingen') from public.reports where target_type = 'conversation'),
  'Grupp: Fula gänget|ingen',
  'the group report keeps the name and no person'
);

select lives_ok(
  $$select public.report_content('message', '6e0000d1-0000-0000-0000-000000000001', 'sexuellt')$$,
  'a member can report a chat picture'
);

select is(
  (select snapshot from public.reports where target_type = 'message'),
  '[bild: 6e0000c1-0000-0000-0000-000000000001/bild.jpg]',
  'the message report keeps the picture path'
);

select lives_ok(
  $$select public.report_content('spot_photo', '6e0000e1-0000-0000-0000-000000000001', 'sexuellt')$$,
  'a friend can report a spot photo'
);

select tests.logout();
update public.locations set status_text = 'Ny elak status'
  where user_id = '6e000001-0000-0000-0000-000000000001';
select tests.login_as('6e000002-0000-0000-0000-000000000002');

do $$
begin
  perform public.report_content('status', '6e000001-0000-0000-0000-000000000001', 'mobbning');
  perform public.report_content('status', '6e000001-0000-0000-0000-000000000001', 'mobbning');
end
$$;

select is(
  (select count(*)::int from public.reports where target_type = 'status'),
  2,
  'a new status can be reported again, the same one only once'
);

select tests.login_as('6e000001-0000-0000-0000-000000000001');

select throws_ok(
  $$select public.report_content('status', '6e000001-0000-0000-0000-000000000001', 'hat')$$,
  'P0001',
  'Du kan inte rapportera dig själv.',
  'the owner cannot report their own status'
);

select is((select count(*)::int from public.reports), 0, 'the reported person sees no reports');

select * from finish();

rollback;
