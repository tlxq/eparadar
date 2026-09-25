alter table locations add column approximate_enabled boolean not null default false;

create or replace function fuzz_location_before_write()
returns trigger
language plpgsql
as $$
begin
  if new.approximate_enabled then
    new.lat := round(new.lat / 0.003) * 0.003;
    new.lng := round(new.lng / 0.003) * 0.003;
  end if;
  return new;
end;
$$;

create trigger locations_fuzz_before_write
  before insert or update on locations
  for each row
  execute function fuzz_location_before_write();
