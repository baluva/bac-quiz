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
  hist_geo: 'Histoire-Géographie', his_geo: 'Histoire-Géographie', hist: 'Histoire-Géographie',
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
  if (!p) { if (!/^bac-pratique-/i.test(f)) skipped++; continue; }
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

// ---- Bac PRATIQUE (épreuves pratiques / TP, source reviserbac.tn) ----
// Fichiers nommés `bac-pratique-<JJMMAAAA>-<code>-<créneau|corrigeN>.pdf`
// (ignorés par parsePdf car sans « _ »). On les regroupe par (année, section)
// → une carte par filière et par an, avec tous les sujets (créneaux) + corrigés.
const PRAT_SECTION = {
  algo: ['informatique', "Sciences de l'informatique", '💻'],
  sti: ['informatique', "Sciences de l'informatique", '💻'],
  sc: ['sciences_ex', 'Sciences expérimentales', '🧪'],
  tic: ['sciences_ex', 'Sciences expérimentales', '🧪'],
  eco: ['economie_gestion', 'Économie & Gestion', '💼'],
  lettres: ['lettre', 'Lettres', '📖'],
  sport: ['sport', 'Sport', '🏅'],
};
const PRAT_MATIERE = {
  informatique: "Épreuve pratique d'informatique",
  sciences_ex: 'Épreuve pratique (TIC)',
  economie_gestion: 'Épreuve pratique (TIC)',
  lettre: 'Épreuve pratique (TIC)',
  sport: 'Épreuve pratique (TIC)',
};
const PRAT_RE = /^bac-pratique-\d{2}\d{2}(\d{4})-([a-z]+)-(.+)\.pdf$/i;
function prettySlot(tail) {
  const t = tail.toLowerCase();
  let m;
  if ((m = t.match(/^(\d{1,2})h(\d{2})?$/))) return m[2] ? `${m[1]}h${m[2]}` : `${m[1]}h`;
  if ((m = t.match(/^s(\d+)$/))) return `Série ${m[1]}`;
  return tail;
}
const pratGroups = new Map();
for (const f of pdfFiles) {
  const m = f.match(PRAT_RE);
  if (!m) continue;
  const year = parseInt(m[1], 10);
  const code = m[2].toLowerCase();
  const tail = m[3];
  const sec = PRAT_SECTION[code];
  if (!sec) { continue; }
  const [sectionKey, sectionLabel, sectionIcon] = sec;
  const id = `${year}_pratique_${sectionKey}`;
  if (!pratGroups.has(id)) {
    pratGroups.set(id, {
      id, year, session: 'pratique',
      sectionKey, sectionLabel, sectionIcon,
      matiereKey: 'pratique', matiereLabel: PRAT_MATIERE[sectionKey] || 'Épreuve pratique',
      docs: [],
    });
  }
  const cm = tail.match(/^corrige(\d+)$/i);
  pratGroups.get(id).docs.push(cm
    ? { file: f, kind: 'corrige', label: `Corrigé ${cm[1]}`, order: 100 + parseInt(cm[1], 10) }
    : { file: f, kind: 'enonce', label: `Sujet · ${prettySlot(tail)}`, order: 0 });
}
const pratSubjects = [...pratGroups.values()].sort((a, b) =>
  b.year - a.year || a.sectionLabel.localeCompare(b.sectionLabel));
for (const s of pratSubjects) {
  s.docs.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  s.docs.forEach((d) => delete d.order);
}
const pratSections = SECTIONS
  .filter(([k]) => pratSubjects.some((s) => s.sectionKey === k))
  .map(([key, label, icon]) => ({ key, label, icon, count: pratSubjects.filter((s) => s.sectionKey === key).length }));
const pratYears = [...new Set(pratSubjects.map((s) => s.year))].sort((a, b) => b - a);
const pratNbDocs = pratSubjects.reduce((n, s) => n + s.docs.length, 0);
fs.writeFileSync(path.join(OUT_DIR, 'pratique.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), sections: pratSections, years: pratYears, subjects: pratSubjects }));

// ---- Contextes manuels (overlay tracké) ----
// Certaines questions renvoyaient à un document (annexe, tableau, texte) absent
// du JSON brut → exclues par le filtre qualité. On rétablit leur `contexte` à
// partir des PDF source via ce fichier versionné (clé = énoncé exact), ce qui les
// rend de nouveau répondables sans dépendre des sorties pipeline (gitignorées).
const MANUAL_CTX_FILE = path.resolve(ROOT, '../pipeline/manual_contextes.json');
let MANUAL_CTX = {};
try { MANUAL_CTX = JSON.parse(fs.readFileSync(MANUAL_CTX_FILE, 'utf-8')); } catch { /* pas d'overlay */ }
let ctxApplied = 0, ansFixed = 0;

// ---- QCM ----
const qcmFiles = fs.existsSync(QCM_DIR) ? fs.readdirSync(QCM_DIR).filter((f) => f.endsWith('.json')) : [];
const quizzes = [];
let droppedQ = 0; // questions inrépondables exclues (renvoient à un visuel/doc non visible)
for (const f of qcmFiles) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(QCM_DIR, f), 'utf-8'));
    if (!Array.isArray(d.questions) || !d.questions.length) continue;
    // Applique l'overlay manuel (avant le filtre qualité) pour ce QCM. Chaque
    // entrée vaut soit une chaîne (= contexte seul), soit un objet
    // { ctx?, ans?, exp? } qui ajoute le contexte ET corrige la bonne réponse /
    // l'explication (réponses générées « à l'aveugle » parfois erronées).
    const overlay = MANUAL_CTX[f.replace(/\.json$/, '')] || {};
    for (const q of d.questions) {
      const o = overlay[(q.enonce || '').trim()];
      if (!o) continue;
      const ctx = typeof o === 'string' ? o : o.ctx;
      if (ctx && !((q.contexte || '').trim())) { q.contexte = ctx; ctxApplied++; }
      if (typeof o === 'object') {
        if (Number.isInteger(o.ans) && o.ans !== q.index_correct) { q.index_correct = o.ans; ansFixed++; }
        if (o.exp) q.explication = o.exp;
      }
    }
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
console.log(`✅ qcm.json      : ${quizzes.length} QCM, ${totalQ} questions (${droppedQ} inrépondables exclues, ${ctxApplied} contextes manuels, ${ansFixed} réponses corrigées)`);
console.log(`✅ pratique.json : ${pratSubjects.length} épreuves pratiques (${pratNbDocs} documents), ${pratSections.length} spécialités, années ${pratYears.at(-1)}–${pratYears[0]}`);
