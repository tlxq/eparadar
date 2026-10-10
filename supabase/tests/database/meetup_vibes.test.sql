begin;

select plan(3);

insert into auth.users (id) values ('a6000000-0000-0000-0000-000000000061');

insert into public.profiles (id, username, display_name) values
  ('a6000000-0000-0000-0000-000000000061', 'test-vibe-alice', 'Alice')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.meetups (id, creator_id, title, lat, lng, starts_at) values
  ('a6000000-0000-0000-0000-0000000000b1', 'a6000000-0000-0000-0000-000000000061', 'Runda', 59.3, 18.1, now() + interval '1 hour');

select is(
  (select vibe from public.meetups where id = 'a6000000-0000-0000-0000-0000000000b1'),
  'cruising',
  'A meetup defaults to the Cruising vibe'
);

select is(
  (select vibe from public.meetups_with_stats where id = 'a6000000-0000-0000-0000-0000000000b1'),
  'cruising',
  'The meetups view exposes the vibe'
);

select throws_ok(
  $$insert into public.meetups (creator_id, title, vibe, lat, lng, starts_at)
    values ('a6000000-0000-0000-0000-000000000061', 'Fel', '🔥', 59.3, 18.1, now())$$,
  '23514',
  null,
  'Only the four named vibes are allowed'
);

select * from finish();

rollback;
