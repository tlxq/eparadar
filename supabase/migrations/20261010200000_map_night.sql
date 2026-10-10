alter table cars
  add column color text
  check (color in ('rod', 'bla', 'gron', 'gul', 'orange', 'vit', 'svart', 'silver', 'lila', 'rosa'));

alter table locations
  add column heading real check (heading >= 0 and heading < 360),
  add column moving boolean not null default false;

create or replace function fuzz_location_before_write()
returns trigger
language plpgsql
as $$
begin
  if new.approximate_enabled then
    new.lat := round(new.lat / 0.003) * 0.003;
    new.lng := round(new.lng / 0.003) * 0.003;
    new.heading := null;
    new.moving := false;
  end if;
  return new;
end;
$$;
