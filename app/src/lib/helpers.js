export const EPREUVES_BASE = import.meta.env.VITE_EPREUVES_BASE || '/epreuves';

// Prochaine session du bac (épreuve principale, ~mi-juin de l'année suivante).
export const NEXT_BAC = new Date('2027-06-09T08:00:00');

export const sessionLabel = (s) => (s === 'controle' ? 'Contrôle' : 'Principale');

export function pdfUrl(file) {
  return `${EPREUVES_BASE}/${encodeURIComponent(file)}`;
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
