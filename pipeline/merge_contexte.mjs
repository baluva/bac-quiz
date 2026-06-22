// Outil d'aide à la récupération des énoncés (contextes) manquants.
//
// Fusionne des "patches" indexés par numéro de question dans l'overlay tracké
// `pipeline/manual_contextes.json` (consommé par app/scripts/build-manifest.mjs).
//
// Entrée  : pipeline/contexte_patches/<quizId>.json  = { "<index>": "<contexte>" }
//           (le <quizId> = nom du fichier de pipeline/data/output sans .json)
// Sortie  : pipeline/manual_contextes.json = { "<quizId>": { "<énoncé exact>": "<contexte>" } }
//
// L'index est résolu en énoncé EXACT depuis pipeline/data/output/<quizId>.json,
// ce qui évite toute recopie manuelle d'énoncé et garde l'overlay robuste même
// si les sorties pipeline (gitignorées) sont ensuite régénérées.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'data/output');
const PATCH_DIR = path.join(__dirname, 'contexte_patches');
const TARGET = path.join(__dirname, 'manual_contextes.json');

const overlay = {};
let nFiles = 0, nCtx = 0, nMissing = 0;

const patchFiles = fs.existsSync(PATCH_DIR)
  ? fs.readdirSync(PATCH_DIR).filter((f) => f.endsWith('.json'))
  : [];

for (const pf of patchFiles) {
  const quizId = pf.replace(/\.json$/, '');
  const outPath = path.join(OUTPUT_DIR, `${quizId}.json`);
  if (!fs.existsSync(outPath)) { console.warn(`⚠ output absent pour ${quizId}, patch ignoré`); continue; }
  const questions = JSON.parse(fs.readFileSync(outPath, 'utf-8')).questions || [];
  const patch = JSON.parse(fs.readFileSync(path.join(PATCH_DIR, pf), 'utf-8'));
  const byEnonce = {};
  for (const [idx, ctx] of Object.entries(patch)) {
    const q = questions[Number(idx)];
    if (!q) { console.warn(`⚠ ${quizId} #${idx} hors limites`); nMissing++; continue; }
    byEnonce[(q.enonce || '').trim()] = ctx;
    nCtx++;
  }
  if (Object.keys(byEnonce).length) { overlay[quizId] = byEnonce; nFiles++; }
}

fs.writeFileSync(TARGET, JSON.stringify(overlay, null, 2) + '\n');
console.log(`✅ manual_contextes.json : ${nFiles} QCM, ${nCtx} contextes${nMissing ? `, ${nMissing} index invalides` : ''}`);
