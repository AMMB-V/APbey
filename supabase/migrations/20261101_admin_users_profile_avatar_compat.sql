-- Ensure the profile column required by the admin user listing exists.
-- Some deployments applied the admin listing function before the avatar
-- profile migration, which made the function fail for every admin.
alter table public.profiles
  add column if not exists avatar_url text;
