-- Bac Quiz — migration : enregistrer prénom / nom / région dès l'inscription.
-- À coller dans Supabase → SQL Editor → Run. Idempotent.
-- Met à jour le trigger qui crée le profil : il lit maintenant aussi
-- first_name / last_name / region depuis les métadonnées d'inscription.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, pseudo, first_name, last_name, region)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'pseudo', split_part(new.email, '@', 1)),
      nullif(new.raw_user_meta_data->>'first_name', ''),
      nullif(new.raw_user_meta_data->>'last_name', ''),
      nullif(new.raw_user_meta_data->>'region', '')
    );
  insert into public.progress (user_id) values (new.id);
  return new;
end; $$;
