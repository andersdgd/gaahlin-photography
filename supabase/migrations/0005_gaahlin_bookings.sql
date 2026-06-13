FILE: supabase/migrations/0005_gaahlin_bookings.sql
-- 0005 — bokningsförfrågningar (gaahlin.bookings).
-- Publik kan skapa en förfrågan (som contacts); admin läser + ändrar status + raderar.
-- Redan applicerad mot Sandbox via connectorn. Denna fil är repo-källan.

create table if not exists gaahlin.bookings (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  phone          text,
  shoot_type     text,
  preferred_date date,
  message        text,
  status         text not null default 'ny',
  created_at     timestamptz not null default now()
);

alter table gaahlin.bookings enable row level security;

-- Vem som helst (anon + authenticated) får skapa en förfrågan.
drop policy if exists bookings_public_insert on gaahlin.bookings;
create policy bookings_public_insert on gaahlin.bookings
  for insert to anon, authenticated
  with check (true);

-- Admin styr allt (läsa, ändra status, radera).
drop policy if exists bookings_admin_all on gaahlin.bookings;
create policy bookings_admin_all on gaahlin.bookings
  for all to authenticated
  using (gaahlin.is_admin())
  with check (gaahlin.is_admin());
