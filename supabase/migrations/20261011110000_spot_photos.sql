create table spot_photos (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references spots on delete cascade,
  author_id uuid not null references profiles on delete cascade,
  path text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index spot_photos_spot_id_idx on spot_photos (spot_id);

create or replace function set_spot_photo_expiry()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  new.expires_at := now() + interval '24 hours';
  return new;
end;
$$;

create trigger spot_photos_set_expiry
  before insert on spot_photos
  for each row
  execute function set_spot_photo_expiry();

alter table spot_photos enable row level security;

create policy "people see fresh photos on spots they can see"
  on spot_photos for select
  using (
    expires_at > now()
    and exists (select 1 from spots s where s.id = spot_id)
    and not is_blocked_between(auth.uid(), author_id)
  );

create policy "people add photos to Raggställen they can see"
  on spot_photos for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from spots s where s.id = spot_id and s.kind = 'ragg')
    and split_part(path, '/', 1) = spot_id::text
  );

create policy "authors and spot creators remove photos"
  on spot_photos for delete
  using (
    author_id = auth.uid()
    or exists (select 1 from spots s where s.id = spot_id and s.creator_id = auth.uid())
  );

alter table spot_photos replica identity full;

alter publication supabase_realtime add table spot_photos;

insert into storage.buckets (id, name, public)
values ('spot-photos', 'spot-photos', false)
on conflict (id) do nothing;

create policy "people read spot photos they can see"
  on storage.objects for select
  using (
    bucket_id = 'spot-photos'
    and (
      owner_id = auth.uid()::text
      or exists (select 1 from public.spot_photos p where p.path = objects.name)
    )
  );

create policy "people upload photos to Raggställen they can see"
  on storage.objects for insert
  with check (
    bucket_id = 'spot-photos'
    and exists (
      select 1 from public.spots s
      where s.id::text = (storage.foldername(objects.name))[1] and s.kind = 'ragg'
    )
  );

create policy "uploaders delete their own spot photos"
  on storage.objects for delete
  using (bucket_id = 'spot-photos' and owner_id = auth.uid()::text);
