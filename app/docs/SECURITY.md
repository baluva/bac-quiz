# Sécurité — Bac Quiz

Audit du 2026-06-19. État du code + actions.

## ✅ Bon dans le code
- **Pas de XSS** : tout le contenu (énoncés, choix, explications, pseudo) est
  rendu par React qui échappe automatiquement. Aucun `dangerouslySetInnerHTML`,
  `eval`, `innerHTML`.
- **Secrets** : les clés R2 (`R2_SECRET_ACCESS_KEY`, etc.) ne sont **pas**
  préfixées `VITE_` → Vite ne les met pas dans le bundle client. La clé Supabase
  `anon` est publique par design (sa sécurité repose sur la RLS, voir ci-dessous).
- **`.env`** gitignoré et non tracké.
- **Dépendances** : `npm audit` → 0 vulnérabilité.
- **Liens PDF** externes en `target="_blank" rel="noreferrer"` (pas de
  tabnabbing, pas de fuite de referrer).

## ✅ Ajouté : en-têtes de sécurité HTTP (`netlify.toml`)
CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Strict-Transport-Security`.
👉 **À vérifier après déploiement** : https://securityheaders.com (vise A/A+) et
ouvre la console du navigateur pour repérer d'éventuels blocages CSP (si tu
ajoutes un service tiers — analytics, etc. — il faudra l'autoriser dans la CSP).

## ⚠️ CRITIQUE À VÉRIFIER : Row Level Security (RLS) Supabase
La clé `anon` est publique (dans le JS). **Toute la sécurité de la table
`progress` repose sur la RLS.** Sans elle, n'importe qui pourrait lire la
progression de tous les utilisateurs, ou écraser/supprimer n'importe quelle ligne.

Sonde du 2026-06-19 : une lecture anonyme de `progress` renvoie `[]` (aucune
fuite **pour l'instant**) — mais ça peut juste vouloir dire que la table est
vide. **Confirme que la RLS est bien activée.**

### Vérifier
Supabase → **Table Editor → `progress`** : l'icône doit indiquer *RLS enabled*.
Ou Supabase → **Database → Policies** : la table `progress` doit avoir des
policies (et pas le bandeau rouge « RLS disabled »).

### SQL à exécuter (SQL Editor) si ce n'est pas déjà fait
```sql
-- 1) Activer la RLS
alter table public.progress enable row level security;

-- 2) Chaque utilisateur ne voit/écrit QUE sa propre ligne
create policy "progress_select_own" on public.progress
  for select using (auth.uid() = user_id);

create policy "progress_insert_own" on public.progress
  for insert with check (auth.uid() = user_id);

create policy "progress_update_own" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (pas de policy DELETE : l'app ne supprime pas de progression)
```
> Le code fait `upsert({ user_id, ... })` puis `select().eq('user_id', id)` :
> ces policies collent exactement à cet usage.

### Côté Auth Supabase
- Garde **« Confirm email »** activé (déjà reflété par le message « vérifie tes
  e-mails » à l'inscription).
- Supabase applique un rate-limit par défaut sur signup/login (anti brute-force).

## ⚠️ Hors site, mais important : ton dossier personnel est un dépôt git
`git rev-parse --show-toplevel` renvoie `C:\Users\louey` → **tout ton dossier
utilisateur est un repo git** (sans aucun commit pour l'instant). Risque : un
`git add -A` puis un push exposerait `.ssh/`, `Keys/`, `NTUSER.DAT`, et les
`.env` de tous tes projets.
👉 Ne fais jamais `git add -A` à la racine de `C:\Users\louey`. Idéalement,
initialise un repo **dans `bac-quiz/`** uniquement, et envisage de supprimer le
`.git` à la racine du dossier utilisateur s'il n'a pas de raison d'être.
