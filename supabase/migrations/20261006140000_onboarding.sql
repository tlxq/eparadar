alter table profiles add column onboarded_at timestamptz;

update profiles set onboarded_at = coalesce(created_at, now());
