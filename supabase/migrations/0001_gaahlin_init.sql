-- ============================================================================
-- Gaahlin Photography — Migration 0001
-- Init: dedikerat schema, roller, kärntabeller, RLS-policies, grants.
-- Skapad 2026-05-29.
--
-- ISOLERING: allt lever i ett dedikerat schema "gaahlin" — samma mönster som
-- digicademy/roma i den delade Sandbox-instansen. Migrationen skapar ENBART
-- gaahlin-objekt. Den rör aldrig public, aldrig ett annat schema, och gör inga
-- instans-breda ändringar (inga default privileges utanför gaahlin, inga
-- ändringar av roller eller grants på public).
--
-- KÖR via apply_migration ELLER klistra in i Supabase SQL Editor.
-- ============================================================================

-- 1. Schema ------------------------------------------------------------------
create schema if not exists gaahlin;
grant usage on schema gaahlin to anon, authenticated;

-- 2. Roller ------------------------------------------------------------------
-- B03-beslut: admin-roll via separat tabell, INTE user_metadata (som kunden
-- själv kan skriva via klient-SDK:n). Auditbar och säker mot privesc.
create table if not exists gaahlin.roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- 3. Admin-check -------------------------------------------------------------
-- SECURITY DEFINER: kör som ägaren och läser gaahlin.roles UTAN att utlösa
-- RLS — annars skulle roles_admin_all-policyn nedan bli rekursiv.
-- Fast search_path = '' → allt måste fullkvalificeras.
create or replace function gaahlin.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from gaahlin.roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;
grant execute on function gaahlin.is_admin() to anon, authenticated;

-- 4. Kontaktförfrågningar ----------------------------------------------------
create table if not exists gaahlin.contacts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

-- 5. Bildmetadata ------------------------------------------------------------
create table if not exists gaahlin.images (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  description  text,
  category     text,
  storage_path text,
  sort_order   int not null default 0,
  is_public    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- 6. Kundkonton --------------------------------------------------------------
create table if not exists gaahlin.clients (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email        text,
  created_at   timestamptz not null default now()
);

-- 7. Bildleveranser per kund -------------------------------------------------
create table if not exists gaahlin.deliveries (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references gaahlin.clients(user_id) on delete cascade,
  image_id     uuid references gaahlin.images(id) on delete set null,
  title        text,
  storage_path text,
  created_at   timestamptz not null default now()
);

-- 8. RLS på samtliga tabeller ------------------------------------------------
alter table gaahlin.roles      enable row level security;
alter table gaahlin.contacts   enable row level security;
alter table gaahlin.images     enable row level security;
alter table gaahlin.clients    enable row level security;
alter table gaahlin.deliveries enable row level security;

-- 9. Policies ----------------------------------------------------------------
-- roles: var och en ser sin egen rad; admin styr allt
create policy roles_self_select on gaahlin.roles
  for select to authenticated using (user_id = auth.uid());
create policy roles_admin_all on gaahlin.roles
  for all to authenticated using (gaahlin.is_admin()) with check (gaahlin.is_admin());

-- contacts: vem som helst får skicka in; bara admin läser och raderar
create policy contacts_public_insert on gaahlin.contacts
  for insert to anon, authenticated with check (true);
create policy contacts_admin_select on gaahlin.contacts
  for select to authenticated using (gaahlin.is_admin());
create policy contacts_admin_delete on gaahlin.contacts
  for delete to authenticated using (gaahlin.is_admin());

-- images: publika bilder läsbara av alla; admin styr allt
create policy images_public_read on gaahlin.images
  for select to anon, authenticated using (is_public = true);
create policy images_admin_all on gaahlin.images
  for all to authenticated using (gaahlin.is_admin()) with check (gaahlin.is_admin());

-- clients: kund ser sin egen rad; admin styr allt
create policy clients_self_select on gaahlin.clients
  for select to authenticated using (user_id = auth.uid());
create policy clients_admin_all on gaahlin.clients
  for all to authenticated using (gaahlin.is_admin()) with check (gaahlin.is_admin());

-- deliveries: kund ser sina egna; admin styr allt
create policy deliveries_client_select on gaahlin.deliveries
  for select to authenticated using (client_id = auth.uid());
create policy deliveries_admin_all on gaahlin.deliveries
  for all to authenticated using (gaahlin.is_admin()) with check (gaahlin.is_admin());

-- 10. Table-grants -----------------------------------------------------------
-- RLS är grinden; grants ger bara RÄTTEN att försöka. Utan matchande policy
-- nekas en roll ändå (default deny). Scoped enbart till gaahlin-schemat.
grant select, insert, update, delete on all tables in schema gaahlin to anon, authenticated;
alter default privileges in schema gaahlin
  grant select, insert, update, delete on tables to anon, authenticated;

-- ============================================================================
-- BOOTSTRAP — första admin (körs EN gång, manuellt, efter migrationen).
-- is_admin() är false för alla tills första admin finns, så ingen kan sätta
-- admin via RLS. Kör därför detta i SQL Editor (service role kringgår RLS).
-- Byt ut e-posten mot Anders inloggnings-e-post i Supabase Auth:
--
--   insert into gaahlin.roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'DIN-EPOST@exempel.se'
--   on conflict (user_id) do nothing;
-- ============================================================================
