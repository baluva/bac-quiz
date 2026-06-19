# Bac Quiz 🇹🇳 — réviser le bac tunisien en s'amusant

App mobile qui génère des QCM (et du contenu de révision ludique) à partir des
archives du baccalauréat tunisien (sujets depuis 2000, source
[bacweb.tn](http://www.bacweb.tn)). Les questions sont générées automatiquement
par l'API Claude (vision + OCR arabe/français), puis servies dans une app mobile
avec gamification : score/XP/niveaux, séries (streaks) & badges, révision
espacée (SRS) et mode duel/classement.

## Architecture

```
1. PIPELINE D'INGESTION  (Python)         <- on est ici
   PDF scanné -> Claude (vision) lit la page -> QCM + explications -> JSON

2. BACKEND  (Supabase : Postgres + Auth + Realtime)
   questions, users, progression, SRS, leaderboard, duels

3. APP MOBILE  (Expo / React Native)
   quiz, XP, badges, streaks, révision SRS, duels
```

## Choix techniques

- **Pas d'OCR séparé** (Tesseract galère sur l'arabe scanné) : l'API Claude lit
  directement le PDF par vision **et** génère le QCM en une passe.
- **Modèle** : `claude-opus-4-8`, sortie JSON validée par Pydantic (structured outputs).
- **Backend** : Supabase (auth + base + temps réel pour les duels), niveau gratuit.
- **Mobile** : Expo (React Native) — test direct au téléphone via QR code, iOS + Android.

## Étape 1 — Pipeline (dossier `pipeline/`)

### Installation

```bash
cd pipeline
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell
pip install -r requirements.txt
copy .env.example .env          # puis colle ta clé API dans .env
```

### Télécharger les archives (bacweb.tn)

Le téléchargeur n'utilise que la lib standard Python (aucune install requise).
Le site est en `http://` simple, donc le certificat HTTPS expiré n'est pas un souci.

```bash
python download_bacweb.py --since 2000               # toutes sections, depuis 2000
python download_bacweb.py --since 2015 --sections mma sma   # maths + sciences
python download_bacweb.py --since 2020 --limit 6     # test rapide
python download_bacweb.py --since 2000 --with-corriges     # inclure les corrigés
```

URL des sujets : `http://www.bacweb.tn/bac/{année}/{principale|controle}/{matière}/*.pdf`.
Les fichiers atterrissent dans `data/raw_pdfs/` (ex: `2022_principale_math_math.pdf`).
Omets `--sections` pour tout récupérer ; sinon code par section×matière (ex: `mma` = maths).

### Lancer

```bash
# Génère les QCM depuis les PDF téléchargés :
python generate_qcm.py data/raw_pdfs/maths_2015.pdf   # un sujet
python generate_qcm.py data/raw_pdfs/                  # tout le dossier
```

Sortie : un fichier JSON par sujet dans `data/output/`, au format `schema.py`
(`matiere`, `section`, `annee`, `langue`, `questions[]`).

## Roadmap

- [x] Pipeline PDF -> QCM JSON (étape 1)
- [x] Téléchargeur des archives bacweb.tn -> `data/raw_pdfs/`
- [ ] Schéma + base Supabase (questions, users, progression, SRS, duels)
- [ ] App Expo : quiz simple
- [ ] Gamification : XP & niveaux -> badges & streaks -> SRS -> duels
