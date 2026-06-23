// Règle unique de "répondabilité" d'une question QCM, partagée par l'audit
// (audit-qcm.mjs) et la génération du manifeste (build-manifest.mjs).
// Une question est INRÉPONDABLE si elle renvoie à un élément que l'élève ne voit
// pas dans l'app : un VISUEL (figure, courbe…) — irréparable en texte — ou un
// DOCUMENT/texte/annexe SANS `contexte` suffisant pour y répondre.

// Renvoie à un visuel non transcriptible en texte (cas le plus grave).
// NB : « figure de style / de rhétorique » n'est PAS un visuel (terme littéraire) → exclu via lookahead.
export const VISUEL = /\b(figure(?!s?\s+de\s+(?:style|rh[ée]torique))|sch[ée]ma|graphique|courbe|circuit|montage|diagramme|chronogramme|logigramme|photo|image|dessin|la carte|repr[ée]sent[ée]e? ci|trac[ée]|oscillogramme)\b/i;

// Renvoie à un document/texte/extrait/annexe absent (rattrapable via `contexte`).
export const DOC = /\b(le document|du document|au document|selon le document|le tableau|du tableau|le texte|l'extrait|l['e] annexe|annexe|ci-dessus|ci-dessous|ci-contre|ci-joint|le programme suivant|l'algorithme suivant|le code suivant|la fonction suivante|la requ[êe]te suivante|le sch[ée]ma suivant|de l'exercice|l'exercice n)\b/i;

// Référence à un support NUMÉROTÉ ou ENTRE PARENTHÈSES que l'élève ne voit pas :
// « Document 1 », « (Document 2) », « (Figure 3) », « (Annexe 1) », « d'après les
// documents »… Beaucoup de QCM issus d'un devoir y renvoient sans dire « le
// document » → inrépondables. Volontairement précis pour NE PAS attraper les
// usages génériques autoportants (« un document de traitement de texte », Word).
export const DOC_REF = /(\(\s*(?:documents?|figures?|annexes?|tableaux?|sch[ée]mas?|graphes?|courbes?|doc)\b|\b(?:documents?|annexes?)\s+\d|\b(?:d'apr[èe]s|selon|voir)\s+(?:les|des|ces)\s+documents?\b)/i;

export const CONTEXTE_MIN = 40; // en-dessous, le contexte ne "montre" rien d'utile

// Retourne 'VISUEL', 'DOC' ou null (= répondable).
// NB : DOC ne s'évalue que sur l'ÉNONCÉ. Une question qui exige un document le
// signale toujours dans son énoncé (« selon le document/annexe/tableau… ») ;
// chercher ces termes dans les CHOIX produisait des faux positifs (ex. « le
// document principal » dans une réponse sur le publipostage, « de l'exercice »
// dans une réponse de comptabilité) qui excluaient des questions de cours.
export function classify(q) {
  const ctx = (q.contexte || '').trim();
  const enonce = q.enonce || '';
  const hay = `${enonce} ${(q.choix || []).join(' ')}`;
  if (VISUEL.test(hay)) return 'VISUEL';
  if ((DOC.test(enonce) || DOC_REF.test(enonce)) && ctx.length < CONTEXTE_MIN) return 'DOC';
  return null;
}

export function isAnswerable(q) {
  return classify(q) === null;
}
