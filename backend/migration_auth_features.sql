-- Bac Quiz — migration : récompense « membre », spécialité choisie, newsletter
-- À coller dans Supabase → SQL Editor → Run. Idempotent (rejouable sans risque).

-- 1) Progression : spécialité focus + bonus de bienvenue (one-shot, par compte)
alter table public.progress add column if not exists section text;
alter table public.progress add column if not exists welcome_bonus boolean not null default false;

-- 2) Newsletter : table des abonnés.
--    RLS activée SANS policy → la table est inaccessible via la clé publique.
--    On lit la liste uniquement depuis le dashboard / le service role.
create table if not exists public.newsletter_subscribers (
  email       text primary key,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;

-- 3) Inscription via une fonction sécurisée (contourne la RLS proprement,
--    renvoie void → pas de SELECT requis côté client).
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
