with seed_users (id, email, username, display_name, birth_year) as (
  values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'test@test.se', 'alva', 'Alva Sund', '2008'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'ella@test.se', 'ella', 'Ella Ek', '2009'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'liam@test.se', 'liam', 'Liam Berg', '2008'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'saga@test.se', 'saga', 'Saga Lind', '2009'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'noah@test.se', 'noah', 'Noah Holm', '2007'),
    ('00000000-0000-4000-a000-000000000006'::uuid, 'elsa@test.se', 'elsa', 'Elsa Strand', '2008'),
    ('00000000-0000-4000-a000-000000000007'::uuid, 'moa@test.se', 'moa', 'Moa Dahl', '2009'),
    ('00000000-0000-4000-a000-000000000008'::uuid, 'vilgot@test.se', 'vilgot', 'Vilgot Nyberg', '2008'),
    ('00000000-0000-4000-a000-000000000009'::uuid, 'ines@test.se', 'ines', 'Ines Kvist', '2009'),
    ('00000000-0000-4000-a000-000000000010'::uuid, 'hugo@test.se', 'hugo', 'Hugo Sjö', '2007')
),
new_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  select
    '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('testtest', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', username, 'display_name', display_name, 'birth_year', birth_year),
    now(), now(), '', '', '', ''
  from seed_users
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from new_users;

update profiles set onboarded_at = now()
where id::text like '00000000-0000-4000-a000-%';

update profiles set bio = v.bio
from (
  values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'Röd 740 och för mycket kaffe.'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'Kör hellre än går.'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'Saab-tjej. Fråga inte om rosten.'),
    ('00000000-0000-4000-a000-000000000008'::uuid, 'Skruvar mer än jag kör.')
) as v (id, bio)
where profiles.id = v.id;

insert into friendships (requester_id, addressee_id, status, responded_at)
values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000001', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000004', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000001', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000007', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000008', '00000000-0000-4000-a000-000000000001', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000005', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000003', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000006', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000006', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000009', '00000000-0000-4000-a000-000000000001', 'pending', null);

insert into cars (id, owner_id, make, model, year, nickname, color)
values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001', 'Volvo', '740 GL', 1989, 'Tegelstenen', 'silver'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000002', 'Volvo', '245', 1987, 'Kombin', 'bla'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-a000-000000000003', 'BMW', '318i', 1991, null, 'rod'),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-a000-000000000004', 'Saab', '900', 1987, 'Svarten', 'svart'),
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-a000-000000000005', 'Mercedes-Benz', '230E', 1984, null, 'silver'),
  ('00000000-0000-4000-c000-000000000007', '00000000-0000-4000-a000-000000000007', 'Volvo', '240', 1988, 'Vita damen', 'vit'),
  ('00000000-0000-4000-c000-000000000008', '00000000-0000-4000-a000-000000000008', 'Volvo', '242', 1982, null, 'gul');

insert into locations (user_id, lat, lng, sharing_enabled, approximate_enabled, heading, moving, status_text, updated_at)
values
  ('00000000-0000-4000-a000-000000000001', 59.3152, 18.0332, true, false, null, false, null, now()),
  ('00000000-0000-4000-a000-000000000002', 59.3178, 18.0395, true, false, 80, true, 'På väg till macken', now() - interval '1 minute'),
  ('00000000-0000-4000-a000-000000000003', 59.3121, 18.0468, true, false, 250, true, null, now() - interval '2 minutes'),
  ('00000000-0000-4000-a000-000000000004', 59.3109, 18.0581, true, false, null, false, 'Fika vid Tanto, kom!', now() - interval '4 minutes'),
  ('00000000-0000-4000-a000-000000000005', 59.3196, 18.0702, true, false, 170, true, null, now()),
  ('00000000-0000-4000-a000-000000000007', 59.3083, 18.0290, true, true, null, false, null, now() - interval '9 minutes'),
  ('00000000-0000-4000-a000-000000000008', 59.3140, 18.0225, true, false, null, false, 'Byter tändstift', now() - interval '6 minutes');

insert into posts (id, author_id, car_id, body, created_at)
values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000004', '00000000-0000-4000-c000-000000000004',
   'Ny avgas på Saaben! Låter som en riktig bil nu.', now() - interval '25 minutes'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-c000-000000000002',
   'Kvällsrunda runt Söder, vem hänger på?', now() - interval '1 hour'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-a000-000000000008', '00000000-0000-4000-c000-000000000008',
   'Någon som har en bakruta till en 242 över?', now() - interval '3 hours'),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-a000-000000000005', '00000000-0000-4000-c000-000000000005',
   'Tvättad och klar inför helgen.', now() - interval '20 hours');

insert into post_places (post_id, author_id, lat, lng)
values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000004', 59.3109, 18.0581),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000002', 59.3178, 18.0395);

insert into post_reactions (post_id, user_id, emoji)
values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000002', '🔥'),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000003', '🔥'),
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000005', '👍'),
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-a000-000000000004', '👍'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-a000-000000000003', '😂');

insert into meetups (id, creator_id, title, vibe, description, lat, lng, starts_at)
values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002',
   'Cruising Södermalm', 'cruising', null, 59.3150, 18.0710, now() - interval '1 day'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000004',
   'Fika vid Tanto', 'hang', 'Vi står vid parkeringen. Ta med termos.', 59.3109, 18.0581, now() + interval '40 minutes'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000003',
   'Kvällsrunda', 'cruising', 'Lugn runda runt Söder, samling vid Hornstull.', 59.3157, 18.0339, now() + interval '3 hours'),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000008',
   'Mekkväll', 'hang', 'Byter tändstift och lagar bakljus. Alla får hjälpa till.', 59.3140, 18.0225, now() + interval '1 day');

insert into meetup_interests (meetup_id, user_id)
values
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000005'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000007'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000004'),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000003');

insert into meetup_checkins (meetup_id, user_id, checked_in_at)
select '00000000-0000-4000-b000-000000000001', user_id, now() - interval '1 day'
from unnest(array[
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000003'
]::uuid[]) as user_id;

insert into spots (id, creator_id, kind, name, warning_type, lat, lng)
values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-a000-000000000004', 'ragg', 'Parkeringen vid Tanto', null, 59.3112, 18.0560),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-a000-000000000005', 'varning', null, 'vagarbete', 59.3185, 18.0510);

insert into spot_votes (spot_id, user_id, gone)
values
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-a000-000000000002', false);

insert into conversations (id, is_group, name, created_at)
values
  ('00000000-0000-4000-f000-000000000001', false, null, now() - interval '2 days'),
  ('00000000-0000-4000-f000-000000000002', true, 'Södergänget', now() - interval '5 days');

insert into conversation_members (conversation_id, user_id, role, joined_at, last_read_at)
values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-a000-000000000001', 'member', now() - interval '2 days', now() - interval '10 minutes'),
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-a000-000000000004', 'member', now() - interval '2 days', now()),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000002', 'admin', now() - interval '5 days', now()),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000001', 'member', now() - interval '5 days', now() - interval '30 minutes'),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000003', 'member', now() - interval '5 days', now()),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000004', 'member', now() - interval '5 days', now()),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000008', 'member', now() - interval '5 days', now());

insert into messages (conversation_id, sender_id, body, created_at, meetup_id)
values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-a000-000000000001', 'Kommer du ikväll?', now() - interval '50 minutes', null),
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-a000-000000000004', 'Japp! Står vid Tanto om en stund.', now() - interval '45 minutes', null),
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-a000-000000000004', 'Ta med kaffe ☕', now() - interval '5 minutes', null),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000003', 'Runda ikväll?', now() - interval '2 hours', null),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000002', 'Ja! Jag tankar först.', now() - interval '1 hour 50 minutes', null),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000003', 'Lagt upp en träff.', now() - interval '1 hour 40 minutes', '00000000-0000-4000-b000-000000000003'),
  ('00000000-0000-4000-f000-000000000002', '00000000-0000-4000-a000-000000000008', 'Jag är med om tändstiften sitter i 😅', now() - interval '20 minutes', null);

update profiles
set avatar_url = 'http://127.0.0.1:54321/storage/v1/object/public/avatars/' || id || '/avatar.jpg'
where id in (select owner_id from cars);

update cars
set photo_url = 'http://127.0.0.1:54321/storage/v1/object/public/car-photos/' || owner_id || '/car.jpg';

update posts set image_url = author_id || '/kvallsrunda.jpg' where id = '00000000-0000-4000-d000-000000000002';
update posts set image_url = author_id || '/tvattad.jpg' where id = '00000000-0000-4000-d000-000000000004';
