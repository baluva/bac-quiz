-- Bac Quiz — migration : classement public (nom, prénom, région) + planning du bac
-- À coller dans Supabase → SQL Editor → Run. Idempotent (rejouable sans risque).

-- 1) Identité publique pour le classement (sur la table profiles existante)
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name  text;
alter table public.profiles add column if not exists region     text;

-- 2) Fonction classement : SECURITY DEFINER → lit profiles + progress en
--    contournant la RLS, mais n'expose QUE les champs d'affichage publics
--    (jamais l'e-mail). Tri par XP. Filtre région optionnel.
create or replace function public.leaderboard(p_limit int default 100, p_region text default null)
returns table (
  rank         bigint,
  user_id      uuid,
  display_name text,
  region       text,
  xp           int,
  answered     int,
  correct      int
) language sql security definer set search_path = public stable as $$
  select
    row_number() over (order by pr.xp desc, pr.correct desc, p.created_at asc) as rank,
    p.id as user_id,
    coalesce(
      nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
      p.pseudo, 'Anonyme'
    ) as display_name,
    p.region,
    pr.xp, pr.answered, pr.correct
  from public.profiles p
  join public.progress pr on pr.user_id = p.id
  where pr.xp > 0
    and (p_region is null or p.region = p_region)
  order by pr.xp desc, pr.correct desc, p.created_at asc
  limit greatest(1, least(p_limit, 200));
$$;

grant execute on function public.leaderboard(int, text) to anon, authenticated;

-- 3) Planning du bac : le countdown vise la prochaine épreuve de cette table.
--    Lecture publique ; écriture réservée au dashboard / service role.
--    → quand les dates officielles tombent, tu mets à jour ICI, sans redéployer l'app.
create table if not exists public.bac_schedule (
  id          bigint generated always as identity primary key,
  label       text not null,                 -- ex : "Bac 2027 — Mathématiques"
  matiere     text,
  session     text not null default 'principale',
  starts_at   timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table public.bac_schedule enable row level security;
drop policy if exists "bac_schedule_read" on public.bac_schedule;
create policy "bac_schedule_read" on public.bac_schedule for select using (true);

-- Évènement par défaut (= ancienne date en dur) si la table est vide ; à remplacer
-- par le vrai calendrier officiel quand il est publié.
insert into public.bac_schedule (label, session, starts_at)
select 'Bac 2027 — épreuve principale', 'principale', '2027-06-09T08:00:00+01:00'
where not exists (select 1 from public.bac_schedule);
