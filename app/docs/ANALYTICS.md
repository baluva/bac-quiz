# Analytics — nombre de visiteurs

Solution : **Cloudflare Web Analytics** — gratuit, **sans cookie** (donc aucun
bandeau de consentement à afficher), respectueux de la vie privée.

## Comment c'est branché
- Un plugin Vite (`vite.config.js` → `cloudflareAnalytics`) injecte le *beacon*
  Cloudflare dans `index.html` **uniquement si** la variable
  `VITE_CF_BEACON_TOKEN` est définie. Vide = rien n'est injecté.
- La CSP (`netlify.toml`) autorise déjà `static.cloudflareinsights.com`
  (script) et `cloudflareinsights.com` (envoi des mesures).

## Étapes pour l'activer (une fois le site en ligne)
1. Déploie le site (il faut une URL publique).
2. Cloudflare → **Analytics & Logs → Web Analytics → Add a site** → saisis le
   domaine de ton site → Cloudflare te donne un **token**.
3. Mets ce token dans **Netlify → Site settings → Environment variables** :
   `VITE_CF_BEACON_TOKEN = <ton_token>`.
4. **Redéploie** (Trigger deploy). Le beacon est alors présent sur le site.
5. Le tableau de bord (visiteurs, pages vues, pays, sources…) est sur
   **Cloudflare → Web Analytics**. C'est ta « page de visiteurs ».

## Vérifier que ça marche
- Ouvre le site, puis la console réseau (F12 → Network) : tu dois voir
  `beacon.min.js` se charger et un appel vers `cloudflareinsights.com`.
- Les premières visites apparaissent dans le dashboard Cloudflare en quelques
  minutes.

## Note
Cloudflare Web Analytics donne les **agrégats** (combien de visiteurs, d'où,
quelles pages). Si un jour tu veux des **logs bruts par requête** (chaque hit
avec IP/horodatage), il faudrait soit Netlify (log drains, payant), soit passer
le site derrière le proxy Cloudflare. Pour « voir le nombre de visiteurs », le
dashboard Web Analytics suffit largement.
