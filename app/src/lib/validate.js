// Contrôles de saisie réutilisables côté client (en plus des contraintes serveur).

export const MAX_NAME = 40;

// E-mail : format simple mais robuste (un @, un point dans le domaine, pas d'espace).
export const isEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v || '').trim());

// Nom / prénom / pseudo : longueur raisonnable, pas de caractères dangereux.
export function nameError(v, label = 'Ce champ') {
  const t = (v || '').trim();
  if (!t) return null; // champ optionnel : vide = OK
  if (t.length < 2) return `${label} : au moins 2 caractères.`;
  if (t.length > MAX_NAME) return `${label} : ${MAX_NAME} caractères maximum.`;
  if (/[<>{}$\\]/.test(t)) return `${label} contient des caractères non autorisés.`;
  return null;
}

// Mot de passe : longueur (bcrypt = 72 octets max côté Supabase).
export function passwordError(v) {
  const p = v || '';
  if (p.length < 6) return 'Mot de passe : 6 caractères minimum.';
  if (p.length > 72) return 'Mot de passe : 72 caractères maximum.';
  return null;
}
