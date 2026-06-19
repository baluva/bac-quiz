"""Pipeline d'ingestion Bac Quiz — étape 1.

Prend un sujet du bac tunisien en PDF (scanné), le fait lire par un modèle de
vision (OCR arabe/français en une passe) et génère des QCM structurés avec
explications, prêts à charger dans la base de données.

Multi-fournisseur : on essaie le moins cher / gratuit d'abord (Gemini), puis on
bascule sur Anthropic en secours. Voir providers.py.

Usage:
    python generate_qcm.py data/raw_pdfs/maths_2015.pdf      # un seul sujet
    python generate_qcm.py data/raw_pdfs/                    # tout un dossier
    python generate_qcm.py data/raw_pdfs/ --provider anthropic   # forcer un fournisseur
    python generate_qcm.py data/raw_pdfs/ --force            # régénérer même si déjà fait

Pré-requis:
    pip install -r requirements.txt
    au moins une clé API dans .env  (voir .env.example)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

from providers import Provider, ProviderError, build_chain
from schema import QCM

# Console Windows : forcer l'UTF-8 pour les accents / symboles.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # noqa: BLE001
    pass

load_dotenv()

OUTPUT_DIR = Path(__file__).parent / "data" / "output"

SYSTEM_PROMPT = """Tu es un professeur tunisien expérimenté qui prépare les élèves au baccalauréat.
On te donne un sujet d'examen du bac tunisien, souvent scanné, en arabe et/ou en français.

Ta tâche :
1. Lis attentivement le sujet (fais l'OCR toi-même, y compris l'arabe).
2. Identifie la matière, la section/série et l'année si elles apparaissent dans le document.
3. Génère des questions à choix multiples (QCM) qui couvrent les notions clés du sujet :
   - 8 à 15 questions, variées en difficulté (facile / moyen / difficile) ;
   - 4 propositions par question, une seule correcte ;
   - rédige les questions dans la langue principale du sujet ;
   - donne une explication pédagogique claire pour chaque bonne réponse ;
   - associe un thème / chapitre du programme à chaque question.

Reste fidèle au programme officiel tunisien et au contenu réel du sujet.
N'invente pas de notions hors-sujet."""

USER_INSTRUCTION = (
    "Voici un sujet du bac tunisien. Génère les QCM correspondants au format demandé."
)


def generate_with_fallback(chain, pdf_path: Path) -> tuple[QCM, Provider]:
    """Essaie chaque fournisseur de la chaîne ; renvoie (QCM, fournisseur utilisé)."""
    last_error: Exception | None = None
    for provider in chain:
        try:
            qcm = provider.generate(pdf_path, SYSTEM_PROMPT, USER_INSTRUCTION)
            return qcm, provider
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            print(f"   … {provider.name} a échoué ({exc}), on tente le suivant.")
    raise ProviderError(
        f"Tous les fournisseurs ont échoué (dernier : {last_error})"
    )


def process(chain, pdf_path: Path, force: bool) -> float | None:
    """Génère le QCM d'un PDF. Renvoie le coût estimé en $, ou None si sauté."""
    out_path = OUTPUT_DIR / f"{pdf_path.stem}.json"
    if out_path.exists() and not force:
        print(f"↷ {pdf_path.name} déjà généré, on saute (--force pour refaire).")
        return None

    print(f"→ Lecture de {pdf_path.name} ...")
    qcm, provider = generate_with_fallback(chain, pdf_path)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(qcm.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    rel = out_path.relative_to(Path.cwd()) if out_path.is_relative_to(Path.cwd()) else out_path
    in_tok, out_tok = provider.last_tokens
    cost = provider.last_cost
    cout = "gratuit (free tier)" if cost == 0 else f"~${cost:.3f}"
    print(
        f"✓ {len(qcm.questions)} questions — {qcm.matiere} ({qcm.section}, {qcm.annee}) "
        f"via {provider.label()} — {in_tok}+{out_tok} tokens, {cout} → {rel}"
    )
    return cost


def main() -> None:
    parser = argparse.ArgumentParser(description="Génère des QCM depuis des PDF du bac.")
    parser.add_argument("path", help="Fichier PDF ou dossier de PDF")
    parser.add_argument(
        "--provider",
        help="Forcer un fournisseur en tête (gemini, anthropic). Sinon fallback auto.",
    )
    parser.add_argument(
        "--force", action="store_true", help="Régénérer même si le JSON existe déjà."
    )
    parser.add_argument(
        "--matieres",
        help="Ne traiter que ces matières (dernier token du nom de fichier), "
        "séparées par des virgules. Ex: math,physique,svt,info,technique",
    )
    args = parser.parse_args()

    target = Path(args.path)
    pdfs = sorted(target.glob("*.pdf")) if target.is_dir() else [target]
    if args.matieres:
        wanted = {m.strip().lower() for m in args.matieres.split(",") if m.strip()}
        pdfs = [p for p in pdfs if p.stem.rsplit("_", 1)[-1].lower() in wanted]
    if not pdfs:
        print(f"Aucun PDF trouvé dans {target}")
        sys.exit(1)

    chain = build_chain(args.provider)
    if not chain:
        print(
            "Aucun fournisseur disponible : mets au moins une clé API dans .env "
            "(GEMINI_API_KEY ou ANTHROPIC_API_KEY). Voir .env.example."
        )
        sys.exit(1)
    print(f"Fournisseurs (ordre d'essai) : {', '.join(p.label() for p in chain)}\n")

    done = skipped = failed = 0
    total_cost = 0.0
    for pdf in pdfs:
        try:
            cost = process(chain, pdf, args.force)
            if cost is None:
                skipped += 1
            else:
                done += 1
                total_cost += cost
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"✗ Échec sur {pdf.name}: {exc}")
            msg = str(exc).lower()
            if "resource_exhausted" in msg or "429" in msg or "quota" in msg:
                print(
                    "\n⛔ Quota du fournisseur atteint — arrêt propre. "
                    "Relance plus tard : les fichiers déjà générés seront sautés."
                )
                break

    cout_total = "0 $ (free tier)" if total_cost == 0 else f"~${total_cost:.2f}"
    print(f"\nBilan : {done} générés, {skipped} sautés, {failed} échoués "
          f"sur {len(pdfs)} PDF. Coût estimé : {cout_total}")


if __name__ == "__main__":
    main()
