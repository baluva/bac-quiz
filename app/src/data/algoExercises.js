// Exercices d'entraînement « algo » exécutés en Python dans le navigateur (Pyodide).
// Chaque exercice = un énoncé + une fonction à écrire + des tests (appel → résultat
// attendu, sous forme de repr() Python). Calqués sur l'épreuve pratique tunisienne
// (Algorithmique & programmation) : fonctions, boucles, chaînes, listes, récursivité.
// `expect` = repr() Python attendu : 'True', '120', '[1, 2, 3]', "'abc'"…
export const ALGO_EXERCISES = [
  {
    id: 'factorielle',
    titre: 'La factorielle',
    niveau: 'facile',
    fn: 'factorielle',
    enonce: "Écris une fonction factorielle(n) qui renvoie n! (le produit 1×2×…×n). Par convention, factorielle(0) = 1.",
    starter: 'def factorielle(n):\n    # ton code ici\n    ...\n',
    tests: [
      { call: 'factorielle(0)', expect: '1' },
      { call: 'factorielle(1)', expect: '1' },
      { call: 'factorielle(5)', expect: '120' },
      { call: 'factorielle(7)', expect: '5040' },
    ],
  },
  {
    id: 'est_premier',
    titre: 'Nombre premier',
    niveau: 'facile',
    fn: 'est_premier',
    enonce: "Écris une fonction est_premier(n) qui renvoie True si l'entier n (n ≥ 2) est un nombre premier, et False sinon. Rappel : 1 n'est pas premier.",
    starter: 'def est_premier(n):\n    # ton code ici\n    ...\n',
    tests: [
      { call: 'est_premier(2)', expect: 'True' },
      { call: 'est_premier(7)', expect: 'True' },
      { call: 'est_premier(1)', expect: 'False' },
      { call: 'est_premier(9)', expect: 'False' },
      { call: 'est_premier(97)', expect: 'True' },
    ],
  },
  {
    id: 'somme_chiffres',
    titre: 'Somme des chiffres',
    niveau: 'moyen',
    fn: 'somme_chiffres',
    enonce: "Écris une fonction somme_chiffres(n) qui renvoie la somme des chiffres de l'entier positif n. Exemple : somme_chiffres(1234) → 10.",
    starter: 'def somme_chiffres(n):\n    # ton code ici\n    ...\n',
    tests: [
      { call: 'somme_chiffres(0)', expect: '0' },
      { call: 'somme_chiffres(7)', expect: '7' },
      { call: 'somme_chiffres(1234)', expect: '10' },
      { call: 'somme_chiffres(99999)', expect: '45' },
    ],
  },
  {
    id: 'palindrome',
    titre: 'Palindrome',
    niveau: 'moyen',
    fn: 'est_palindrome',
    enonce: "Écris une fonction est_palindrome(ch) qui renvoie True si la chaîne ch se lit pareil dans les deux sens (ex : « kayak »), False sinon. On suppose ch en minuscules, sans espaces.",
    starter: 'def est_palindrome(ch):\n    # ton code ici\n    ...\n',
    tests: [
      { call: "est_palindrome('kayak')", expect: 'True' },
      { call: "est_palindrome('radar')", expect: 'True' },
      { call: "est_palindrome('bac')", expect: 'False' },
      { call: "est_palindrome('a')", expect: 'True' },
    ],
  },
  {
    id: 'pgcd',
    titre: 'PGCD (Euclide)',
    niveau: 'moyen',
    fn: 'pgcd',
    enonce: "Écris une fonction pgcd(a, b) qui renvoie le plus grand commun diviseur de deux entiers positifs a et b (algorithme d'Euclide).",
    starter: 'def pgcd(a, b):\n    # ton code ici\n    ...\n',
    tests: [
      { call: 'pgcd(12, 18)', expect: '6' },
      { call: 'pgcd(17, 5)', expect: '1' },
      { call: 'pgcd(100, 40)', expect: '20' },
      { call: 'pgcd(7, 7)', expect: '7' },
    ],
  },
  {
    id: 'maximum',
    titre: 'Maximum d\'une liste',
    niveau: 'facile',
    fn: 'maximum',
    enonce: "Écris une fonction maximum(t) qui renvoie le plus grand élément de la liste de nombres t (sans utiliser la fonction max de Python).",
    starter: 'def maximum(t):\n    # ton code ici\n    ...\n',
    tests: [
      { call: 'maximum([3, 7, 2, 9, 4])', expect: '9' },
      { call: 'maximum([-5, -2, -9])', expect: '-2' },
      { call: 'maximum([42])', expect: '42' },
    ],
  },
  {
    id: 'compte_voyelles',
    titre: 'Compter les voyelles',
    niveau: 'moyen',
    fn: 'compte_voyelles',
    enonce: "Écris une fonction compte_voyelles(ch) qui renvoie le nombre de voyelles (a, e, i, o, u, y) dans la chaîne ch (en minuscules).",
    starter: 'def compte_voyelles(ch):\n    # ton code ici\n    ...\n',
    tests: [
      { call: "compte_voyelles('bonjour')", expect: '3' },
      { call: "compte_voyelles('tunisie')", expect: '4' },
      { call: "compte_voyelles('xyz')", expect: '1' },
      { call: "compte_voyelles('')", expect: '0' },
    ],
  },
  {
    id: 'tri_croissant',
    titre: 'Tri à bulles',
    niveau: 'difficile',
    fn: 'tri_croissant',
    enonce: "Écris une fonction tri_croissant(t) qui renvoie une nouvelle liste contenant les éléments de t triés par ordre croissant (tu peux utiliser le tri à bulles). Ne modifie pas la liste d'origine.",
    starter: 'def tri_croissant(t):\n    # ton code ici\n    ...\n',
    tests: [
      { call: 'tri_croissant([3, 1, 2])', expect: '[1, 2, 3]' },
      { call: 'tri_croissant([5, 5, 1, 9, 0])', expect: '[0, 1, 5, 5, 9]' },
      { call: 'tri_croissant([])', expect: '[]' },
      { call: 'tri_croissant([42])', expect: '[42]' },
    ],
  },
];
