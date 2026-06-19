-- Bac Quiz — schéma Supabase
-- À coller dans Supabase → SQL Editor → Run.
-- Crée 2 tables (profils + progression) avec Row Level Security :
-- chaque utilisateur ne voit/modifie que SES données.

-- 1) Profil public (pseudo + identité de classement)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  pseudo      text,
  first_name  text,
  last_name   text,
  region      text,
  created_at  timestamptz not null default now()
);

-- 2) Progression (XP, séries, scores) — 1 ligne par utilisateur
create table if not exists public.progress (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  xp            integer not null default 0,
  answered      integer not null default 0,
  correct       integer not null default 0,
  streak        integer not null default 0,
  last_day      text,
  best          jsonb   not null default '{}'::jsonb,
  section       text,                              -- spécialité « focus » choisie
  welcome_bonus boolean not null default false,    -- bonus de bienvenue déjà accordé ?
  updated_at    timestamptz not null default now()
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

-- 3) Newsletter — abonnés (e-mail privé : RLS activée sans policy → table verrouillée,
--    on lit la liste depuis le dashboard / service role).
create table if not exists public.newsletter_subscribers (
  email       text primary key,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;

-- Inscription via une fonction sécurisée (contourne la RLS proprement, renvoie void).
create or replace function public.subscribe_newsletter(p_email text, p_user_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;
  insert into public.newsletter_subscribers (email, user_id)
  values (lower(trim(p_email)), p_user_id)
  on conflict (email) do nothing;
end; $$;

grant execute on function public.subscribe_newsletter(text, uuid) to anon, authenticated;

-- 4) Classement public — fonction SECURITY DEFINER : n'expose que les champs
--    d'affichage (jamais l'e-mail). Tri par XP, filtre région optionnel.
create or replace function public.leaderboard(p_limit int default 100, p_region text default null)
returns table (rank bigint, user_id uuid, display_name text, region text, xp int, answered int, correct int)
language sql security definer set search_path = public stable as $$
  select
    row_number() over (order by pr.xp desc, pr.correct desc, p.created_at asc) as rank,
    p.id,
    coalesce(nullif(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), ''), p.pseudo, 'Anonyme'),
    p.region, pr.xp, pr.answered, pr.correct
  from public.profiles p
  join public.progress pr on pr.user_id = p.id
  where pr.xp > 0 and (p_region is null or p.region = p_region)
  order by pr.xp desc, pr.correct desc, p.created_at asc
  limit greatest(1, least(p_limit, 200));
$$;
grant execute on function public.leaderboard(int, text) to anon, authenticated;

-- 5) Planning du bac (le countdown vise la prochaine épreuve) — lecture publique.
create table if not exists public.bac_schedule (
  id          bigint generated always as identity primary key,
  label       text not null,
  matiere     text,
  session     text not null default 'principale',
  starts_at   timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table public.bac_schedule enable row level security;
drop policy if exists "bac_schedule_read" on public.bac_schedule;
create policy "bac_schedule_read" on public.bac_schedule for select using (true);
