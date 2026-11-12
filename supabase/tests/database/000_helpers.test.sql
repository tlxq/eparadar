create schema if not exists tests;
grant usage on schema tests to public;

create or replace function tests.create_user(p_id uuid, p_username text, p_display_name text)
returns void
language plpgsql
as $$
begin
  insert into auth.users (id) values (p_id);
  insert into public.profiles (id, username, display_name) values (p_id, p_username, p_display_name)
  on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;
end;
$$;

create or replace function tests.login_as(p_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_id::text, true);
end;
$$;

create or replace function tests.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function tests.logout()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
end;
$$;

grant execute on function tests.create_user(uuid, text, text) to public;
grant execute on function tests.login_as(uuid) to public;
grant execute on function tests.login_anon() to public;
grant execute on function tests.logout() to public;

select plan(1);
select has_function('tests', 'login_as', array['uuid'], 'test helpers are installed');
select * from finish();
