begin;

select plan(29);

insert into auth.users (id) values
  ('67000001-0000-0000-0000-000000000001'),
  ('67000002-0000-0000-0000-000000000002'),
  ('67000003-0000-0000-0000-000000000003'),
  ('67000004-0000-0000-0000-000000000004'),
  ('67000005-0000-0000-0000-000000000005'),
  ('67000006-0000-0000-0000-000000000006');

insert into public.profiles (id, username, display_name) values
  ('67000001-0000-0000-0000-000000000001', 'test-6g-alice', 'Alice'),
  ('67000002-0000-0000-0000-000000000002', 'test-6g-bob', 'Bob'),
  ('67000003-0000-0000-0000-000000000003', 'test-6g-carol', 'Carol'),
  ('67000004-0000-0000-0000-000000000004', 'test-6g-dan', 'Dan'),
  ('67000005-0000-0000-0000-000000000005', 'test-6g-eve', 'Eve'),
  ('67000006-0000-0000-0000-000000000006', 'test-6g-finn', 'Finn')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('67000001-0000-0000-0000-000000000001', '67000002-0000-0000-0000-000000000002', 'accepted'),
  ('67000001-0000-0000-0000-000000000001', '67000004-0000-0000-0000-000000000004', 'accepted'),
  ('67000001-0000-0000-0000-000000000001', '67000005-0000-0000-0000-000000000005', 'accepted'),
  ('67000001-0000-0000-0000-000000000001', '67000006-0000-0000-0000-000000000006', 'accepted');

insert into public.spots (id, creator_id, kind, warning_type, lat, lng) values
  ('67000000-0000-0000-0000-0000000000a1', '67000001-0000-0000-0000-000000000001', 'varning', 'halka', 59.3, 18.1);

insert into public.spots (id, creator_id, kind, name, lat, lng) values
  ('67000000-0000-0000-0000-0000000000a2', '67000001-0000-0000-0000-000000000001', 'ragg', 'Torget', 59.31, 18.11);

insert into public.meetups (id, creator_id, title, lat, lng, starts_at) values
  ('67000000-0000-0000-0000-0000000000b1', '67000001-0000-0000-0000-000000000001', 'Cruising', 59.3, 18.1, now() + interval '2 hours');

insert into public.conversations (id, is_group) values
  ('67000000-0000-0000-0000-0000000000c1', false),
  ('67000000-0000-0000-0000-0000000000c2', false);

insert into public.conversation_members (conversation_id, user_id) values
  ('67000000-0000-0000-0000-0000000000c1', '67000001-0000-0000-0000-000000000001'),
  ('67000000-0000-0000-0000-0000000000c1', '67000002-0000-0000-0000-000000000002'),
  ('67000000-0000-0000-0000-0000000000c2', '67000003-0000-0000-0000-000000000003'),
  ('67000000-0000-0000-0000-0000000000c2', '67000002-0000-0000-0000-000000000002');

set local role anon;

select throws_ok(
  $$select * from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', true)$$,
  '42501',
  null,
  'A logged-out caller cannot vote on a warning'
);

select throws_ok(
  $$select * from public.warning_votes('67000000-0000-0000-0000-0000000000a1')$$,
  '42501',
  null,
  'A logged-out caller cannot read warning votes'
);

select is(
  (select count(*)::int from public.spot_votes),
  0,
  'A logged-out caller sees no votes'
);

set local role authenticated;
set local request.jwt.claim.sub = '67000003-0000-0000-0000-000000000003';

select throws_ok(
  $$select * from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', true)$$,
  'P0001',
  'Varningen finns inte längre.',
  'A stranger cannot vote on a warning they cannot see'
);

select is(
  (select count(*)::int from public.warning_votes('67000000-0000-0000-0000-0000000000a1')),
  0,
  'A stranger gets no vote counts'
);

set local request.jwt.claim.sub = '67000002-0000-0000-0000-000000000002';

select is(
  (select gone from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', true)),
  1,
  'A friend can say the warning is gone'
);

select is(
  (select row(still_there, gone)::text from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', false)),
  '(1,0)',
  'Voting again replaces the earlier vote'
);

select is(
  (select my_vote from public.warning_votes('67000000-0000-0000-0000-0000000000a1')),
  false,
  'The friend sees their own vote'
);

select is(
  (select count(*)::int from public.spot_votes),
  1,
  'The friend sees their own vote row'
);

select throws_ok(
  $$select * from public.vote_on_warning('67000000-0000-0000-0000-0000000000a2', true)$$,
  'P0001',
  'Varningen finns inte längre.',
  'Only warnings can be voted on'
);

select throws_ok(
  $$insert into public.spot_votes (spot_id, user_id, gone)
    values ('67000000-0000-0000-0000-0000000000a1', '67000002-0000-0000-0000-000000000002', true)$$,
  '42501',
  null,
  'Votes cannot be written to the table directly'
);

set local request.jwt.claim.sub = '67000001-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.spot_votes),
  0,
  'The owner does not see who voted'
);

select is(
  (select row(still_there, gone)::text from public.warning_votes('67000000-0000-0000-0000-0000000000a1')),
  '(1,0)',
  'The owner sees the vote counts'
);

select is(
  (select cleared from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', true)),
  false,
  'The owner can vote too'
);

set local request.jwt.claim.sub = '67000002-0000-0000-0000-000000000002';
select * from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', true);
set local request.jwt.claim.sub = '67000004-0000-0000-0000-000000000004';
select * from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', true);
set local request.jwt.claim.sub = '67000005-0000-0000-0000-000000000005';

select is(
  (select cleared from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', true)),
  false,
  'Four gone votes keep the warning'
);

set local request.jwt.claim.sub = '67000006-0000-0000-0000-000000000006';

select is(
  (select cleared from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', true)),
  true,
  'The fifth gone vote clears the warning'
);

select is(
  (select count(*)::int from public.spots where id = '67000000-0000-0000-0000-0000000000a1'),
  0,
  'A cleared warning is gone from the map'
);

select throws_ok(
  $$select * from public.vote_on_warning('67000000-0000-0000-0000-0000000000a1', true)$$,
  'P0001',
  'Varningen finns inte längre.',
  'A cleared warning cannot be voted on'
);

set local request.jwt.claim.sub = '67000003-0000-0000-0000-000000000003';

update public.meetups set title = 'Kapad' where id = '67000000-0000-0000-0000-0000000000b1';

set local request.jwt.claim.sub = '67000002-0000-0000-0000-000000000002';

update public.meetups set title = 'Kapad' where id = '67000000-0000-0000-0000-0000000000b1';

select is(
  (select title from public.meetups where id = '67000000-0000-0000-0000-0000000000b1'),
  'Cruising',
  'Neither a stranger nor a friend can edit someone else''s meetup'
);

set local request.jwt.claim.sub = '67000001-0000-0000-0000-000000000001';

update public.meetups
  set title = 'Cruising vid torget', description = 'Vi kör runt torget.', creator_id = '67000002-0000-0000-0000-000000000002'
  where id = '67000000-0000-0000-0000-0000000000b1';

select is(
  (select row(title, description, creator_id)::text from public.meetups where id = '67000000-0000-0000-0000-0000000000b1'),
  '("Cruising vid torget","Vi kör runt torget.",67000001-0000-0000-0000-000000000001)',
  'The creator can edit the meetup but not hand it to someone else'
);

select throws_ok(
  $$update public.meetups set description = repeat('a', 301) where id = '67000000-0000-0000-0000-0000000000b1'$$,
  '23514',
  null,
  'A description is at most 300 characters'
);

select throws_ok(
  $$update public.meetups set starts_at = now() + interval '90 days' where id = '67000000-0000-0000-0000-0000000000b1'$$,
  '42501',
  null,
  'A meetup cannot be moved months ahead'
);

select is(
  (select description from public.meetups_with_stats where id = '67000000-0000-0000-0000-0000000000b1'),
  'Vi kör runt torget.',
  'The description shows in meetups_with_stats'
);

set local request.jwt.claim.sub = '67000002-0000-0000-0000-000000000002';

select lives_ok(
  $$insert into public.messages (conversation_id, sender_id, body, meetup_id)
    values ('67000000-0000-0000-0000-0000000000c1', '67000002-0000-0000-0000-000000000002', 'Kolla meeten!', '67000000-0000-0000-0000-0000000000b1')$$,
  'A friend can share a meetup they can see to a chat'
);

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body, meetup_id)
    values ('67000000-0000-0000-0000-0000000000c1', '67000002-0000-0000-0000-000000000002', '', '67000000-0000-0000-0000-0000000000b1')$$,
  '23514',
  null,
  'A shared meetup comes with text, so the message survives when the meetup is gone'
);

select ok(
  (select public.export_my_data() ?& array['warning_votes', 'post_places', 'post_reactions', 'messages_sent']),
  'The data export keeps every section'
);

set local request.jwt.claim.sub = '67000003-0000-0000-0000-000000000003';

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body, meetup_id)
    values ('67000000-0000-0000-0000-0000000000c2', '67000003-0000-0000-0000-000000000003', 'Kolla meeten!', '67000000-0000-0000-0000-0000000000b1')$$,
  '42501',
  null,
  'A stranger cannot share a meetup they cannot see'
);

set local role anon;

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body, meetup_id)
    values ('67000000-0000-0000-0000-0000000000c1', '67000002-0000-0000-0000-000000000002', 'Kolla meeten!', '67000000-0000-0000-0000-0000000000b1')$$,
  '42501',
  null,
  'A logged-out caller cannot share a meetup'
);

reset role;

delete from public.meetups where id = '67000000-0000-0000-0000-0000000000b1';

select ok(
  (select bool_and(meetup_id is null) from public.messages where conversation_id = '67000000-0000-0000-0000-0000000000c1'),
  'A shared message stays when the meetup is gone'
);

select * from finish();

rollback;
