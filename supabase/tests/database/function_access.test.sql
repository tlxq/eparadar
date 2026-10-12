begin;

select plan(16);

insert into auth.users (id) values
  ('ac000001-0000-0000-0000-000000000001'),
  ('ac000002-0000-0000-0000-000000000002'),
  ('ac000003-0000-0000-0000-000000000003');

insert into public.profiles (id, username, display_name) values
  ('ac000001-0000-0000-0000-000000000001', 'test-fn-alice', 'Alice'),
  ('ac000002-0000-0000-0000-000000000002', 'test-fn-bob', 'Bob'),
  ('ac000003-0000-0000-0000-000000000003', 'test-fn-carol', 'Carol')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('ac000001-0000-0000-0000-000000000001', 'ac000002-0000-0000-0000-000000000002', 'accepted');

insert into public.conversations (id, is_group, name) values
  ('ac0000aa-0000-0000-0000-000000000001', true, 'Gänget');

insert into public.conversation_members (conversation_id, user_id) values
  ('ac0000aa-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001'),
  ('ac0000aa-0000-0000-0000-000000000001', 'ac000002-0000-0000-0000-000000000002');

select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'execute')),
  0,
  'no security definer function in public can be run by a logged-out caller'
);

select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prosecdef
      and p.prorettype = 'trigger'::regtype
      and has_function_privilege('authenticated', p.oid, 'execute')),
  0,
  'security definer trigger functions cannot be called directly'
);

set local role anon;

select throws_ok(
  $$ select public.is_friend('ac000001-0000-0000-0000-000000000001', 'ac000002-0000-0000-0000-000000000002') $$,
  '42501',
  null,
  'a logged-out caller cannot ask whether two people are friends'
);

select throws_ok(
  $$ select public.is_conversation_member('ac0000aa-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'a logged-out caller cannot ask who is in a conversation'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'ac000003-0000-0000-0000-000000000003';

select is(
  public.is_friend('ac000001-0000-0000-0000-000000000001', 'ac000002-0000-0000-0000-000000000002'),
  false,
  'a stranger cannot learn that two other people are friends'
);

select is(
  public.has_any_friendship_row('ac000001-0000-0000-0000-000000000001', 'ac000002-0000-0000-0000-000000000002'),
  false,
  'a stranger cannot learn that two other people have a friendship row'
);

select is(
  public.is_blocked_between('ac000001-0000-0000-0000-000000000001', 'ac000002-0000-0000-0000-000000000002'),
  false,
  'a stranger cannot ask about blocks between two other people'
);

select is(
  public.is_conversation_member('ac0000aa-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001'),
  false,
  'a stranger cannot learn that someone else is in a conversation'
);

select is(
  public.is_group_member('ac0000aa-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001'),
  false,
  'a stranger cannot learn that someone else is in a group'
);

select is(
  public.is_blocked_direct_chat('ac0000aa-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001'),
  false,
  'a stranger cannot ask about someone else''s blocked chats'
);

set local request.jwt.claim.sub = 'ac000001-0000-0000-0000-000000000001';

select is(
  public.is_friend('ac000001-0000-0000-0000-000000000001', 'ac000002-0000-0000-0000-000000000002'),
  true,
  'is_friend still answers for the caller''s own friendships'
);

select is(
  public.is_conversation_member('ac0000aa-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001'),
  true,
  'is_conversation_member still answers for the caller'
);

select is(
  public.is_group_member('ac0000aa-0000-0000-0000-000000000001', 'ac000001-0000-0000-0000-000000000001'),
  true,
  'is_group_member still answers for the caller'
);

select throws_ok(
  'select public.record_heat_point()',
  '42501',
  null,
  'a logged-in caller cannot call the heat trigger function directly'
);

select lives_ok(
  $$ insert into public.locations (user_id, lat, lng, sharing_enabled)
     values ('ac000001-0000-0000-0000-000000000001', 59.3, 18.1, true) $$,
  'a user can still share their location'
);

reset role;

select is(
  (select count(*)::int from public.heat_points
    where user_id = 'ac000001-0000-0000-0000-000000000001'),
  1,
  'the heat trigger still fires for a role that cannot call it directly'
);

select * from finish();

rollback;
