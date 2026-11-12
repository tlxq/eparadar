begin;

select plan(5);

select tests.create_user('a2000000-0000-0000-0000-000000000021', 'test-night-alice', 'Alice');

insert into public.locations (user_id, lat, lng, sharing_enabled, heading, moving) values
  ('a2000000-0000-0000-0000-000000000021', 59.3, 18.1, true, 90, true);

select is(
  (select heading from public.locations where user_id = 'a2000000-0000-0000-0000-000000000021'),
  90::real,
  'Exact sharing keeps the heading'
);

update public.locations
  set approximate_enabled = true, heading = 180, moving = true
  where user_id = 'a2000000-0000-0000-0000-000000000021';

select is(
  (select heading from public.locations where user_id = 'a2000000-0000-0000-0000-000000000021'),
  null::real,
  'Approximate sharing never stores a heading'
);

select is(
  (select moving from public.locations where user_id = 'a2000000-0000-0000-0000-000000000021'),
  false,
  'Approximate sharing never reports moving'
);

select throws_ok(
  $$insert into public.cars (owner_id, make, model, color)
    values ('a2000000-0000-0000-0000-000000000021', 'Volvo', '240', 'hotpink')$$,
  '23514',
  null,
  'Car color must be one of the palette keys'
);

select lives_ok(
  $$insert into public.cars (owner_id, make, model, color)
    values ('a2000000-0000-0000-0000-000000000021', 'Volvo', '240', 'rod')$$,
  'A palette car color is accepted'
);

select * from finish();

rollback;
