-- ============================================================================
-- Bac Quiz — FIX BASE (tout-en-un, idempotent)
-- À coller dans Supabase → SQL Editor → Run. Réexécutable sans risque.
--
-- Répare une base déjà créée :
--   • ajoute les colonnes manquantes (profiles.first_name/last_name/region/avatar_url,
--     progress.section/welcome_bonus) ;
--   • met à jour le trigger de création de compte pour qu'il enregistre AUSSI
--     l'identité venue de Google (name / given_name / family_name / picture) ;
--   • (re)crée leaderboard, newsletter, bac_schedule + les policies RLS.
-- ============================================================================

-- 1) Colonnes manquantes -----------------------------------------------------
alter table public.profiles add column if not exists first_name  text;
alter table public.profiles add column if not exists last_name   text;
alter table public.profiles add column if not exists region      text;
alter table public.profiles add column if not exists avatar_url  text;

alter table public.progress add column if not exists section       text;
alter table public.progress add column if not exists welcome_bonus boolean not null default false;

-- 2) RLS (au cas où elle n'aurait pas été activée) ---------------------------
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own" on public.progress for select using (auth.uid() = user_id);
drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress for insert with check (auth.uid() = user_id);
drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress for update using (auth.uid() = user_id);

-- 3) Trigger de création de compte (e-mail/mot de passe ET Google) -----------
--    Google place dans raw_user_meta_data : name, full_name, given_name,
--    family_name, picture/avatar_url, email. On retombe proprement dessus.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fullname text  := nullif(coalesce(m->>'full_name', m->>'name', ''), '');
begin
  insert into public.profiles (id, pseudo, first_name, last_name, region, avatar_url)
    values (
      new.id,
      coalesce(m->>'pseudo', fullname, split_part(new.email, '@', 1)),
      coalesce(nullif(m->>'first_name', ''), nullif(m->>'given_name', ''),
               nullif(split_part(fullname, ' ', 1), '')),
      coalesce(nullif(m->>'last_name', ''), nullif(m->>'family_name', ''),
               nullif(nullif(substr(fullname, length(split_part(fullname, ' ', 1)) + 2), ''), '')),
      nullif(m->>'region', ''),
      coalesce(m->>'avatar_url', m->>'picture')
    )
    on conflict (id) do nothing;
  insert into public.progress (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4) Newsletter --------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  email       text primary key,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;

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

-- 5) Classement public -------------------------------------------------------
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

-- 6) Planning du bac (countdown) --------------------------------------------
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
