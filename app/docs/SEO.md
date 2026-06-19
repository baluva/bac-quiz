# SEO — Bac Quiz

Tout le SEO technique est en place dans le code et se régénère à chaque build
(`npm run build` → `prebuild` lance `build-manifest` + `build-seo`).

## Ce qui est déjà fait (automatique)
- **`index.html`** : `<title>` et description riches en mots-clés, balises
  **Open Graph** + **Twitter Card** (joli aperçu sur Facebook/WhatsApp/LinkedIn),
  `<link rel="canonical">`, `<meta robots>`, données structurées **JSON-LD**
  (WebSite + EducationalOrganization), et un `<noscript>` indexable.
- **`og-image.png`** (1200×630) : image de partage aux couleurs du site.
- **`robots.txt`** + **`sitemap.xml`** : générés par `scripts/build-seo.mjs`.
- Toutes les URL absolues sont pilotées par **une seule variable** : `VITE_SITE_URL`.

## ⚠️ 3 actions à faire toi-même au déploiement
1. **Définir `VITE_SITE_URL`** = l'URL définitive du site (sans `/` final) :
   - en local : dans `app/.env` ;
   - sur **Netlify** : *Site settings → Environment variables* →
     `VITE_SITE_URL = https://ton-domaine`.
   - puis redéployer. Sans ça, canonical/OG/sitemap pointeront vers le
     placeholder `https://bac-quiz.netlify.app`.
2. **Google Search Console** (le plus important pour être trouvé) :
   https://search.google.com/search-console → ajouter la propriété (l'URL du
   site), vérifier la propriété, puis **Sitemaps → soumettre** `sitemap.xml`.
   C'est ce qui déclenche l'indexation.
3. **Promotion** : partager le lien dans les groupes Facebook/WhatsApp d'élèves.
   Sur un site neuf sans backlinks, c'est le canal qui amène le 1er trafic — et
   l'aperçu OG soigné est fait pour ça.

## Vérifier l'aperçu de partage
- Facebook : https://developers.facebook.com/tools/debug/
- Twitter/X : https://cards-dev.twitter.com/validator
- LinkedIn : https://www.linkedin.com/post-inspector/

## Limite connue (prochain gros levier)
L'app est une **SPA en hash routing** (`#qcm`, `#epreuves`, `#profil`) : pour
Google il n'y a donc **qu'une seule page**. Le site peut ranker sur « bac quiz
tunisie » en général, mais **pas** sur des requêtes précises type « épreuve bac
math 2023 » car chaque épreuve n'est pas une URL indexable.

Pour capter ce trafic long-tail (le gros du volume), il faudrait **pré-générer
une page statique par épreuve/spécialité**. C'est un chantier à part, à faire
dans un second temps.
