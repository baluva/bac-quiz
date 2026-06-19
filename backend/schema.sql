-- Bac Quiz — schéma Supabase
-- À coller dans Supabase → SQL Editor → Run.
-- Crée 2 tables (profils + progression) avec Row Level Security :
-- chaque utilisateur ne voit/modifie que SES données.

-- 1) Profil public (pseudo affiché, futur classement)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  pseudo      text,
  created_at  timestamptz not null default now()
);

-- 2) Progression (XP, séries, scores) — 1 ligne par utilisateur
create table if not exists public.progress (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  xp          integer not null default 0,
  answered    integer not null default 0,
  correct     integer not null default 0,
  streak      integer not null default 0,
  last_day    text,
  best        jsonb   not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;

-- Policies profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Policies progress
drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own" on public.progress
  for select using (auth.uid() = user_id);
drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress
  for insert with check (auth.uid() = user_id);
drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress
  for update using (auth.uid() = user_id);

-- Crée automatiquement profil + progression à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, pseudo)
    values (new.id, coalesce(new.raw_user_meta_data->>'pseudo', split_part(new.email, '@', 1)));
  insert into public.progress (user_id) values (new.id);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
