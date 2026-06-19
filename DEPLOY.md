# Mise en ligne — Bac Quiz

Stack : **Netlify** (app) + **Cloudflare R2** (PDF) + **Supabase** (comptes + progression).

## 1. Supabase (comptes)
1. Projet créé : `https://ewbjfdnjvyqfpujgnhhg.supabase.co` ✅
2. **SQL Editor → New query** → colle tout `backend/schema.sql` → **Run**.
   (Crée `profiles` + `progress`, les RLS, et le trigger qui crée la ligne à l'inscription.)
3. Clé publishable déjà dans `app/.env` ✅
4. (Auth → Providers → Email) : pour tester vite, tu peux désactiver « Confirm email ».

## 2. Cloudflare R2 (les 918 Mo de PDF)
1. Cloudflare → **R2** → *Create bucket* : `bac-quiz-epreuves`.
2. **R2 → Manage API Tokens** → crée un token *Object Read & Write* → note `Access Key ID`, `Secret`, et l'`Account ID`.
3. Mets-les dans `app/.env` :
   ```
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=bac-quiz-epreuves
   ```
4. Upload : `cd app && npm run upload:pdfs`
5. Bucket → **Settings → Public access** : active l'URL publique `r2.dev` (ou un domaine perso). Copie la base, ex `https://pub-xxxx.r2.dev`.

## 3. Netlify (l'app)
1. Pousse le dossier `bac-quiz` sur un repo GitHub (l'app est dans `app/`).
2. Netlify → *Add new site → Import from Git* → choisis le repo.
   La config est lue depuis `app/netlify.toml` (base `app`, build `npm run build`, publish `dist`).
3. **Site settings → Environment variables** :
   ```
   VITE_SUPABASE_URL=https://ewbjfdnjvyqfpujgnhhg.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   VITE_EPREUVES_BASE=https://pub-xxxx.r2.dev   (URL publique R2 de l'étape 2)
   VITE_SITE_URL=https://<ton-site>.netlify.app (URL définitive — SEO : canonical/OG/sitemap)
   VITE_CF_BEACON_TOKEN=                         (vide au début ; voir docs/ANALYTICS.md)
   ```
4. Deploy. ✅
5. Une fois l'URL connue, reviens régler `VITE_SITE_URL` puis **redéploie**.

> Astuce : pour un premier déploiement sans GitHub, `npx netlify-cli deploy --prod --dir app/dist` (après `npm run build` dans `app/`).

## Après la mise en ligne
- **SEO** : voir `app/docs/SEO.md` (Google Search Console + sitemap).
- **Sécurité** : voir `app/docs/SECURITY.md` (vérifier que `backend/schema.sql` a bien été exécuté → RLS active).
- **Visiteurs** : voir `app/docs/ANALYTICS.md` (activer Cloudflare Web Analytics).

## Notes
- `app/public/data/*.json` est **versionné** : le build Netlify n'a pas les PDF et réutilise ces manifestes.
- En local, les PDF sont servis par le middleware Vite ; en prod par R2 (`VITE_EPREUVES_BASE`).
