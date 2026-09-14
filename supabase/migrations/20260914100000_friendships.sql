create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles on delete cascade,
  addressee_id uuid not null references profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  user_a uuid generated always as (least(requester_id, addressee_id)) stored,
  user_b uuid generated always as (greatest(requester_id, addressee_id)) stored,
  check (requester_id <> addressee_id),
  unique (user_a, user_b)
);

create index friendships_addressee_pending_idx on friendships (addressee_id) where status = 'pending';
create index friendships_requester_id_idx on friendships (requester_id);

alter table friendships enable row level security;

create policy "participants view their friendships"
  on friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "participants remove their friendships"
  on friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create or replace function public.is_friend(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

grant execute on function public.is_friend(uuid, uuid) to authenticated;

create or replace function public.send_friend_request(target_user_id uuid)
returns friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  existing friendships;
  result friendships;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if target_user_id = caller then
    raise exception 'Du kan inte lägga till dig själv som vän.';
  end if;

  select * into existing from friendships
  where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id);

  if existing.id is not null then
    if existing.status = 'accepted' then
      raise exception 'Ni är redan vänner.';
    elsif existing.requester_id = caller then
      raise exception 'Vänförfrågan är redan skickad.';
    else
      update friendships set status = 'accepted', responded_at = now()
      where id = existing.id
      returning * into result;
      return result;
    end if;
  end if;

  begin
    insert into friendships (requester_id, addressee_id)
    values (caller, target_user_id)
    returning * into result;
    return result;
  exception when unique_violation then
    update friendships set status = 'accepted', responded_at = now()
    where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id)
    returning * into result;
    return result;
  end;
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

create or replace function public.respond_to_friend_request(request_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target friendships;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into target from friendships
  where id = request_id and addressee_id = caller and status = 'pending';

  if target.id is null then
    raise exception 'Vänförfrågan hittades inte.';
  end if;

  if accept then
    update friendships set status = 'accepted', responded_at = now() where id = request_id;
  else
    delete from friendships where id = request_id;
  end if;
end;
$$;

grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;

alter table friendships replica identity full;

alter publication supabase_realtime add table friendships;
