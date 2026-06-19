// Génère public/data/epreuves.json et public/data/qcm.json
// à partir de pipeline/data/raw_pdfs (sujets PDF) et pipeline/data/output (QCM).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAnswerable } from './qcm-quality.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PDF_DIR = path.resolve(ROOT, '../pipeline/data/raw_pdfs');
const QCM_DIR = path.resolve(ROOT, '../pipeline/data/output');
const OUT_DIR = path.resolve(ROOT, 'public/data');

// Spécialités (filières). Ordre = priorité de correspondance (clés multi-mots d'abord).
const SECTIONS = [
  ['economie_gestion', 'Économie & Gestion', '💼'],
  ['sciences_ex', 'Sciences expérimentales', '🧪'],
  ['informatique', "Sciences de l'informatique", '💻'],
  ['technique', 'Sciences techniques', '⚙️'],
  ['math', 'Mathématiques', '📐'],
  ['sport', 'Sport', '🏅'],
  ['lettre', 'Lettres', '📖'],
];

const MAT = {
  math: 'Mathématiques', physique: 'Sciences physiques', svt: 'Sciences de la vie et de la Terre',
  info: 'Informatique', bd: 'Bases de données', algorithme: 'Algorithmique',
  gestion: 'Gestion', economie: 'Économie', technique: 'Technologie',
  sport: 'Éducation physique', anglais: 'Anglais', arabe: 'Arabe', francais: 'Français',
  philo: 'Philosophie', geo: 'Histoire-Géographie', his: 'Histoire-Géographie',
  pensee: 'Pensée islamique', allemand: 'Allemand', italien: 'Italien',
  espagnol: 'Espagnol', russe: 'Russe', chinois: 'Chinois', turque: 'Turc',
  portugais: 'Portugais', musique: 'Musique', artistique: 'Arts',
};

const VARIANTS = new Set(['nr', 'ar', 'c', 'corrige', 'corrigé']);

function parsePdf(filename) {
  const stem = filename.replace(/\.pdf$/i, '');
  const tokens = stem.split('_');
  if (tokens.length < 4) return null;
  const year = parseInt(tokens[0], 10);
  const session = tokens[1]; // principale | controle
  if (!year || !['principale', 'controle'].includes(session)) return null;
  const rest = tokens.slice(2).join('_');

  let sectionKey = null, sectionLabel = null, sectionIcon = null, after = '';
  for (const [key, label, icon] of SECTIONS) {
    if (rest === key || rest.startsWith(key + '_')) {
      sectionKey = key; sectionLabel = label; sectionIcon = icon;
      after = rest.slice(key.length).replace(/^_/, '');
      break;
    }
  }
  if (!sectionKey) return null;

  const afterTokens = after ? after.split('_') : [];
  let variant = null;
  if (afterTokens.length && VARIANTS.has(afterTokens[afterTokens.length - 1])) {
    variant = afterTokens.pop();
  }
  const matiereKey = afterTokens.join('_') || sectionKey;
  const matiereLabel = MAT[matiereKey] || (matiereKey.charAt(0).toUpperCase() + matiereKey.slice(1));

  return { year, session, sectionKey, sectionLabel, sectionIcon, matiereKey, matiereLabel, variant, filename };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// En déploiement (Netlify), les 918 Mo de PDF ne sont pas présents :
// on conserve alors les JSON déjà versionnés au lieu de planter.
if (!fs.existsSync(PDF_DIR)) {
  console.log('⚠ raw_pdfs absent → epreuves.json/qcm.json conservés (mode build déploiement).');
  process.exit(0);
}

// ---- Épreuves ----
const pdfFiles = fs.readdirSync(PDF_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
const groups = new Map();
let skipped = 0;
for (const f of pdfFiles) {
  const p = parsePdf(f);
  if (!p) { skipped++; continue; }
  const id = `${p.year}_${p.session}_${p.sectionKey}_${p.matiereKey}`;
  if (!groups.has(id)) {
    groups.set(id, {
      id, year: p.year, session: p.session,
      sectionKey: p.sectionKey, sectionLabel: p.sectionLabel, sectionIcon: p.sectionIcon,
      matiereKey: p.matiereKey, matiereLabel: p.matiereLabel,
      docs: [],
    });
  }
  const g = groups.get(id);
  g.docs.push({
    file: p.filename,
    kind: p.variant ? 'complement' : 'enonce',
    label: p.variant ? 'Document complémentaire' : 'Sujet',
  });
}

const subjects = [...groups.values()].sort((a, b) =>
  b.year - a.year || a.sectionLabel.localeCompare(b.sectionLabel) || a.matiereLabel.localeCompare(b.matiereLabel)
);
// trie les docs : énoncé d'abord
for (const s of subjects) s.docs.sort((a, b) => (a.kind === 'enonce' ? -1 : 1));

const usedSections = SECTIONS
  .filter(([k]) => subjects.some((s) => s.sectionKey === k))
  .map(([key, label, icon]) => ({
    key, label, icon,
    count: subjects.filter((s) => s.sectionKey === key).length,
  }));
const years = [...new Set(subjects.map((s) => s.year))].sort((a, b) => b - a);

const epreuves = { generatedAt: new Date().toISOString(), sections: usedSections, years, subjects };
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'epreuves.json'), JSON.stringify(epreuves));

// ---- QCM ----
const qcmFiles = fs.existsSync(QCM_DIR) ? fs.readdirSync(QCM_DIR).filter((f) => f.endsWith('.json')) : [];
const quizzes = [];
let droppedQ = 0; // questions inrépondables exclues (renvoient à un visuel/doc non visible)
for (const f of qcmFiles) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(QCM_DIR, f), 'utf-8'));
    if (!Array.isArray(d.questions) || !d.questions.length) continue;
    // Filtre qualité : on n'expose QUE les questions répondables sans voir le
    // sujet (cf. scripts/qcm-quality.mjs). La source JSON reste intacte.
    const answerable = d.questions.filter(isAnswerable);
    droppedQ += d.questions.length - answerable.length;
    if (!answerable.length) continue; // QCM vidé par le filtre → on l'omet
    // Section/matière/année dérivées du NOM DE FICHIER (source canonique,
    // identique aux épreuves) — on ne fait pas confiance aux libellés du JSON
    // (le modèle/l'humain peut écrire « Sciences Techniques » vs « techniques »).
    const p = parsePdf(f.replace(/\.json$/, '.pdf'));
    quizzes.push({
      id: f.replace(/\.json$/, ''),
      matiere: p ? p.matiereLabel : d.matiere,
      section: p ? p.sectionLabel : d.section,
      sectionIcon: p ? p.sectionIcon : null,
      annee: p ? p.year : d.annee,
      session: p ? p.session : null,
      langue: d.langue || 'fr',
      nbQuestions: answerable.length,
      questions: answerable,
    });
  } catch (e) {
    console.warn('QCM ignoré:', f, e.message);
  }
}
quizzes.sort((a, b) => b.annee - a.annee || a.section.localeCompare(b.section) || a.matiere.localeCompare(b.matiere));
const totalQ = quizzes.reduce((n, q) => n + q.nbQuestions, 0);
fs.writeFileSync(path.join(OUT_DIR, 'qcm.json'), JSON.stringify({ generatedAt: new Date().toISOString(), totalQuestions: totalQ, quizzes }));

console.log(`✅ epreuves.json : ${subjects.length} sujets (${pdfFiles.length} PDF, ${skipped} ignorés), ${usedSections.length} spécialités, années ${years.at(-1)}–${years[0]}`);
console.log(`✅ qcm.json      : ${quizzes.length} QCM, ${totalQ} questions (${droppedQ} inrépondables exclues)`);
