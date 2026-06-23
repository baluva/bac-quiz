# Journal du travail de nuit — Bac Quiz

Travail autonome (loop) pendant que tu dors. Chaque entrée = ce qui a été fait,
pourquoi, et comment l'annuler. **Rien sur le paiement, build testé avant chaque commit.**

---

## Nuit du 2026-06-23

### 1. Questions inrépondables (priorité) ✅
**Problème :** des QCM venaient d'un devoir et renvoyaient à un support qu'on ne
voit pas dans l'app (« Document 1 », « (Document 2) », « d'après les documents »…)
→ impossible d'y répondre. Le filtre qualité ne les attrapait pas car ils ne
disaient pas « le document ».

**Fait :** ajout d'une règle précise `DOC_REF` dans `app/scripts/qcm-quality.mjs`
(références à un support **numéroté** ou **entre parenthèses** : Document N,
(Figure/Annexe/Tableau…), « d'après/selon les documents »). Testée avant
d'appliquer : **10 questions exclues (1%)**, toutes réellement inrépondables
(9 SVT type arbre généalogique / membrane nerveuse + 1 éco). Les questions
autoportantes type Word (« un document de traitement de texte », « Gras et
Souligné ») sont **gardées** (vérifié, pas de faux positif).

**Résultat :** 969 → **959 questions** publiées (114 exclues au total).
**Annuler :** `git revert` du commit, ou retirer `DOC_REF` de `classify()` dans
`qcm-quality.mjs` puis `npm run build`.

### 2. Polish UI mobile ✅
**Problème :** les élèves sont surtout sur téléphone. Le champ de recherche avait
un `min-width: 200px` (risque de débordement horizontal sur petit écran), et le
point de rupture mobile était un peu serré (560px, peu de règles).

**Fait :** `styles.css` — média `@media (max-width: 600px)` enrichi : recherche en
**pleine largeur** (plus de débordement), listes déroulantes flexibles, onglets et
hero un peu plus compacts, choix de quiz un poil plus aérés. Vérifié par capture à
390px + mesure : **0 débordement horizontal** (scrollWidth = clientWidth).
**Annuler :** `git revert` du commit, ou restaurer l'ancien bloc `@media
(max-width: 560px)` dans `styles.css`.

### 3. Accessibilité ✅
**Problème :** quelques éléments n'étaient pas annoncés correctement aux lecteurs
d'écran (bouton de fermeture en « × » sans nom, champ de recherche et listes de
filtres sans libellé, onglet actif non signalé).

**Fait :** ajout d'attributs ARIA (additifs, aucun changement visuel) :
- `aria-label="Fermer"` sur le bouton × de la modale de connexion (AuthModal).
- `aria-label` sur la recherche d'épreuves + les listes déroulantes année/session
  (EpreuvesView) et année des QCM (QcmView).
- `aria-current="page"` sur l'onglet actif (App.jsx) → le lecteur d'écran annonce
  la page courante.
Le toast a déjà `role="status"`, le ticker un `aria-label`, le logo Google
`aria-hidden`. Build OK, zéro impact visuel.
**Annuler :** `git revert` du commit (rien que des attributs ajoutés).

### 4. Micro-interactions ✅
**But :** rendre le retour visuel plus vivant et rassurant (sans en faire trop).

**Fait :** `styles.css` + une ligne dans `App.jsx` :
- Réponse au QCM : la **bonne** réponse fait un léger « pop » (scale), la **mauvaise**
  un petit « shake » → feedback immédiat et lisible.
- **Retour tactile** au clic (boutons, choix, puces, onglets) : léger enfoncement.
- **Spinner** de chargement (remplace le simple « Chargement… » par un vrai
  indicateur animé).
Tout respecte déjà `prefers-reduced-motion` (animations coupées si l'utilisateur
le demande). Build OK.
**Annuler :** `git revert` du commit, ou retirer le bloc « Micro-interactions »
en bas de `styles.css` + le `<span className="spinner">` dans `App.jsx`.

### 5. Nettoyage code mort ✅ (interne, non déployé)
**Fait :** retrait de la règle CSS `.tag.qcm` (`styles.css`), devenue inutilisée
depuis le retrait de la pastille « 🎯 QCM dispo ». Aucun impact visuel (la classe
n'était plus appliquée nulle part). `.tag.spec` et `.tag.best` restent utilisées.
Build OK. **Pas de redéploiement** (nettoyage interne, rendu identique).
**Annuler :** `git revert` du commit.
