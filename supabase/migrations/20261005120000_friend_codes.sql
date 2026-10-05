create table friend_codes (
  user_id uuid primary key references profiles on delete cascade,
  code text not null unique check (code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  expires_at timestamptz not null
);

alter table friend_codes enable row level security;

create policy "owners view their own friend code"
  on friend_codes for select
  using (auth.uid() = user_id);

create table friend_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  attempted_at timestamptz not null default now()
);

alter table friend_code_attempts enable row level security;

create index friend_code_attempts_user_time_idx on friend_code_attempts (user_id, attempted_at);

create or replace function public.generate_friend_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  result text := '';
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

revoke execute on function public.generate_friend_code() from public, anon, authenticated;

create or replace function public.current_friend_code(rotate boolean default false)
returns friend_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  result friend_codes;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if not rotate then
    select * into result from friend_codes
    where user_id = caller and expires_at > now() + interval '30 seconds';
    if result.user_id is not null then
      return result;
    end if;
  end if;

  for attempt in 1..5 loop
    begin
      insert into friend_codes (user_id, code, expires_at)
      values (caller, public.generate_friend_code(), now() + interval '10 minutes')
      on conflict (user_id) do update
        set code = excluded.code, expires_at = excluded.expires_at
      returning * into result;
      return result;
    exception when unique_violation then
      if attempt = 5 then
        raise;
      end if;
    end;
  end loop;

  return result;
end;
$$;

grant execute on function public.current_friend_code(boolean) to authenticated;

create or replace function public.redeem_friend_code(friend_code text)
returns table (
  outcome text,
  user_id uuid,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  normalized text := upper(regexp_replace(coalesce(friend_code, ''), '[^A-Za-z0-9]', '', 'g'));
  owner uuid;
  existing friendships;
  sent friendships;
  recent_attempts integer;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  delete from friend_code_attempts
  where friend_code_attempts.user_id = caller and attempted_at < now() - interval '1 hour';

  select count(*) into recent_attempts from friend_code_attempts
  where friend_code_attempts.user_id = caller and attempted_at > now() - interval '10 minutes';

  if recent_attempts >= 10 then
    raise exception 'För många försök. Vänta några minuter och prova igen.';
  end if;

  insert into friend_code_attempts (user_id) values (caller);

  select fc.user_id into owner from friend_codes fc
  where fc.code = normalized and fc.expires_at > now();

  if owner is null then
    outcome := 'invalid';
    return next;
    return;
  end if;

  if owner = caller then
    outcome := 'own_code';
    return next;
    return;
  end if;

  select * into existing from friendships
  where user_a = least(caller, owner) and user_b = greatest(caller, owner);

  if existing.id is not null and existing.status = 'blocked' then
    outcome := 'invalid';
    return next;
    return;
  end if;

  if existing.id is not null and existing.status = 'accepted' then
    outcome := 'already_friends';
  elsif existing.id is not null and existing.requester_id = caller then
    outcome := 'already_sent';
  else
    sent := public.send_friend_request(owner);
    outcome := case when sent.status = 'accepted' then 'accepted' else 'sent' end;
  end if;

  select p.id, p.display_name, p.avatar_url
  into user_id, display_name, avatar_url
  from profiles p where p.id = owner;

  return next;
end;
$$;

grant execute on function public.redeem_friend_code(text) to authenticated;
