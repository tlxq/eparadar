begin;

select plan(9);

select tests.create_user('ad000001-0000-0000-0000-000000000001', 'test-anon-alice', 'AnonAlice');
select tests.create_user('ad000002-0000-0000-0000-000000000002', 'test-anon-bob', 'AnonBob');

select is(
  (select count(*)::int from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'p', 'v', 'm')
      and (has_table_privilege('anon', c.oid, 'select')
        or has_table_privilege('anon', c.oid, 'insert')
        or has_table_privilege('anon', c.oid, 'update')
        or has_table_privilege('anon', c.oid, 'delete'))),
  0,
  'logged-out callers have no privilege on any table in public'
);

select is(
  (select count(*)::int from pg_class c
    where c.relnamespace = 'public'::regnamespace
      and case when c.relkind = 'S' then has_sequence_privilege('anon', c.oid, 'usage') else false end),
  0,
  'logged-out callers have no privilege on any sequence in public'
);

select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and has_function_privilege('anon', p.oid, 'execute')),
  0,
  'logged-out callers can run no function in public'
);

select is(
  (select count(*)::int from pg_default_acl d
    where d.defaclnamespace = 'public'::regnamespace
      and d.defaclrole = 'postgres'::regrole
      and exists (select 1 from aclexplode(d.defaclacl) a where a.grantee = (select oid from pg_roles where rolname = 'anon'))),
  0,
  'new objects in public are not granted to logged-out callers by default'
);

select tests.login_anon();

select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  null,
  'a logged-out caller cannot read profiles'
);

select throws_ok(
  $$select public.owns_storage_folder('x/y.jpg')$$,
  '42501',
  null,
  'a logged-out caller cannot run the storage folder check'
);

select tests.logout();

select tests.login_as('ad000001-0000-0000-0000-000000000001');

select is(
  public.owns_storage_folder('ad000001-0000-0000-0000-000000000001/a.jpg'),
  true,
  'the owner is recognised in their own storage folder'
);

select is(
  public.owns_storage_folder('ad000002-0000-0000-0000-000000000002/a.jpg'),
  false,
  'a stranger is not recognised in someone else''s storage folder'
);

select is(
  public.owns_storage_folder('a.jpg'),
  false,
  'a file outside any folder belongs to nobody'
);

select * from finish();

rollback;
