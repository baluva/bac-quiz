export const EPREUVES_BASE = import.meta.env.VITE_EPREUVES_BASE || '/epreuves';

// Calendrier du bac (repli quand la table Supabase `bac_schedule` est vide).
// On cible automatiquement la prochaine date encore à venir → le compte à rebours
// reste à jour sans redéploiement. Source : calendrier officiel 2026.
const BAC_DATES = [
  { label: 'Bac 2026 — épreuves de contrôle', date: '2026-06-29T08:00:00' },
  { label: 'Résultats du bac 2026 (contrôle)', date: '2026-07-12T08:00:00' },
  { label: 'Bac 2027 — épreuve principale', date: '2027-06-08T08:00:00' },
];
const _nextBac =
  BAC_DATES.find((d) => new Date(d.date).getTime() > Date.now()) ||
  BAC_DATES[BAC_DATES.length - 1];

// Prochaine échéance du bac (la plus proche encore à venir) + son libellé.
export const NEXT_BAC = new Date(_nextBac.date);
export const NEXT_BAC_LABEL = _nextBac.label;

export const sessionLabel = (s) => (s === 'controle' ? 'Contrôle' : 'Principale');

export function pdfUrl(file) {
  return `${EPREUVES_BASE}/${encodeURIComponent(file)}`;
}

// Télécharge un PDF SANS quitter le site. Les fichiers sont sur Cloudflare R2
// (cross-origin) : l'attribut <a download> y est ignoré et ferait quitter le
// site. On tente donc un téléchargement « blob » (nécessite le CORS R2) ; en cas
// d'échec (CORS absent), on ouvre dans un nouvel onglet → le site reste affiché.
export async function downloadPdf(url, filename) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = obj;
    a.download = filename || 'epreuve.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 5000);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// Mélange (Fisher-Yates) — renvoie une copie.
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function countdownParts(target = NEXT_BAC) {
  const ms = Math.max(0, target - new Date());
  const days = Math.floor(ms / 864e5);
  const hours = Math.floor((ms % 864e5) / 36e5);
  const mins = Math.floor((ms % 36e5) / 6e4);
  return { days, hours, mins };
}

export const DIFF_COLOR = { facile: '#3ddc97', moyen: '#f5b14c', difficile: '#ff6b8b' };
