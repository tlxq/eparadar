with seed_users (id, email, username, display_name) as (
  values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'test@test.se', 'tom', 'Tom Test'),
    ('00000000-0000-4000-a000-000000000002'::uuid, 'ella@test.se', 'ella', 'Ella Ek'),
    ('00000000-0000-4000-a000-000000000003'::uuid, 'liam@test.se', 'liam', 'Liam Berg'),
    ('00000000-0000-4000-a000-000000000004'::uuid, 'saga@test.se', 'saga', 'Saga Lind'),
    ('00000000-0000-4000-a000-000000000005'::uuid, 'noah@test.se', 'noah', 'Noah Holm'),
    ('00000000-0000-4000-a000-000000000006'::uuid, 'tom@test.se', 'tlxq', 'Tom'),
    ('00000000-0000-4000-a000-000000000007'::uuid, 'moa@test.se', 'moa', 'Moa')
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
    jsonb_build_object('username', username, 'display_name', display_name),
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

insert into meetups (id, creator_id, title, vibe_emoji, lat, lng, starts_at)
values (
  '00000000-0000-4000-b000-000000000001',
  '00000000-0000-4000-a000-000000000002',
  'Cruising Södermalm', '🚜', 59.3150, 18.0710, now() - interval '1 day'
);

insert into meetup_checkins (meetup_id, user_id, checked_in_at)
select '00000000-0000-4000-b000-000000000001', user_id, now() - interval '1 day'
from unnest(array[
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000003'
]::uuid[]) as user_id;

insert into friendships (requester_id, addressee_id, status, responded_at)
values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000004', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000005', 'accepted', now()),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000003', 'accepted', now());
