create table user_ages (
  user_id uuid primary key references profiles on delete cascade,
  birth_year smallint not null check (birth_year between 1900 and 2100),
  created_at timestamptz not null default now()
);

alter table user_ages enable row level security;

revoke update, delete, truncate on user_ages from anon, authenticated;

create policy "people read their own birth year"
  on user_ages for select to authenticated
  using (user_id = auth.uid());

create policy "people set their own birth year once"
  on user_ages for insert to authenticated
  with check (user_id = auth.uid());

create or replace function public.check_minimum_age()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.birth_year > extract(year from now())::int - 15 then
    raise exception 'Du måste vara minst 15 år för att använda epaRadar.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_minimum_age() from public, anon, authenticated;

create trigger user_ages_minimum_age
  before insert on user_ages
  for each row
  execute function public.check_minimum_age();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  birth_year_text text := new.raw_user_meta_data->>'birth_year';
begin
  if new.raw_user_meta_data ? 'username' and coalesce(birth_year_text, '') !~ '^\d{4}$' then
    raise exception 'Fyll i ditt födelseår.';
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Ny användare')
  );

  if birth_year_text ~ '^\d{4}$' then
    insert into public.user_ages (user_id, birth_year) values (new.id, birth_year_text::smallint);
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
