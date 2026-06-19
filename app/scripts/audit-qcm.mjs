// Audit qualité : repère les questions QCM "orphelines" (renvoient à un élément
// que l'élève ne voit pas). Règle = scripts/qcm-quality.mjs (partagée avec le build).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify } from './qcm-quality.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, '../../pipeline/data/output');

let totalQ = 0, visuel = 0, doc = 0, ok = 0;
const offenders = [];
const files = fs.readdirSync(DIR).filter((x) => x.endsWith('.json'));

for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf-8'));
  (d.questions || []).forEach((q, i) => {
    totalQ++;
    const c = classify(q);
    if (c === 'VISUEL') { visuel++; offenders.push({ f, i, type: c, ctx: (q.contexte||'').length, enonce: (q.enonce || '').slice(0, 90) }); }
    else if (c === 'DOC') { doc++; offenders.push({ f, i, type: c, ctx: (q.contexte||'').length, enonce: (q.enonce || '').slice(0, 90) }); }
    else ok++;
  });
}

console.log(`\n📊 ${totalQ} questions analysées (${files.length} QCM)`);
console.log(`  🟥 VISUEL (irréparable en texte) : ${visuel}`);
console.log(`  🟧 DOC/texte sans contexte       : ${doc}`);
console.log(`  🟩 OK (répondables)              : ${ok}`);
console.log(`  → ${visuel + doc} problématiques (${Math.round((visuel + doc) / totalQ * 100)}%)\n`);

const byFile = {};
for (const o of offenders) byFile[o.f] = (byFile[o.f] || 0) + 1;
console.log('--- par fichier ---');
Object.entries(byFile).sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log(`  ${String(n).padStart(2)}  ${f}`));
console.log('\n--- 20 exemples ---');
offenders.slice(0, 20).forEach((o) => console.log(`  [${o.type}] ${o.f} #${o.i} — ${o.enonce}…`));
