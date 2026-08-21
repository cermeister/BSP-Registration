-- Production database schema for Supabase/PostgreSQL.
-- Run this in the Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  role text not null check (role in ('admin','guest')),
  created_at timestamptz not null default now()
);

create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists districts (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references divisions(id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(division_id,name)
);

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references districts(id),
  name text not null,
  category text not null check (category in ('High School','College','Elementary','Community')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists fee_settings (
  id uuid primary key default gen_random_uuid(),
  scout_fee numeric(12,2) not null default 0,
  unit_leader_fee numeric(12,2) not null default 0,
  effective_from date not null default current_date,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  registration_number text not null unique,
  registration_date date not null default current_date,
  division_id uuid not null references divisions(id),
  district_id uuid not null references districts(id),
  category text not null check (category in ('High School','College','Elementary','Community')),
  school_id uuid references schools(id),
  school_name text,
  scout_count integer not null default 0 check (scout_count >= 0),
  unit_leader_count integer not null default 0 check (unit_leader_count >= 0),
  scout_fee numeric(12,2) not null,
  unit_leader_fee numeric(12,2) not null,
  total_amount numeric(12,2) generated always as ((scout_count * scout_fee) + (unit_leader_count * unit_leader_fee)) stored,
  status text not null default 'confirmed' check (status in ('confirmed','archived')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scouts (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  complete_name text not null,
  grade_level text,
  created_at timestamptz not null default now()
);

create table if not exists unit_leaders (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  complete_name text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references registrations(id) on delete set null,
  action text not null check (action in ('CREATE','UPDATE','ARCHIVE','RESTORE','DELETE')),
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  changes jsonb
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists registrations_updated_at on registrations;
create trigger registrations_updated_at
before update on registrations
for each row execute function set_updated_at();

-- Seed the three initial divisions.
insert into divisions(name) values
('Butuan City Division'),
('Cabadbaran City Division'),
('Agusan del Norte Division')
on conflict (name) do nothing;

-- IMPORTANT:
-- Do NOT store admin/admin or guest/guest as production passwords.
-- Create these accounts in Supabase Authentication, then add their roles to profiles.
-- The downloadable starter app currently includes the requested credentials only
-- as a local prototype login so you can immediately inspect the UI.
