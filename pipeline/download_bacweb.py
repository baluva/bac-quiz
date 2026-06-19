"""Télécharge les archives du bac depuis bacweb.tn vers data/raw_pdfs/.

Le site n'a pas d'API. On lit `section.htm` pour lister les pages
(section x matière), puis on lit chaque page pour récupérer les VRAIS liens
PDF (`bac/ANNEE/{principale|controle}/MATIERE/fichier.pdf`). On télécharge en
conservant l'info dans le nom de fichier, en filtrant par année et en
ignorant les corrigés (`*_c.pdf`) par défaut.

N'utilise QUE la bibliothèque standard : aucune installation requise.
Le site fonctionne en http:// (le certificat https expiré n'est pas utilisé),
mais on désactive quand même la vérification SSL par sécurité.

Exemples:
    python download_bacweb.py --since 2000
    python download_bacweb.py --since 2015 --sections mma sma --with-corriges
    python download_bacweb.py --since 2020 --limit 5      # test rapide
"""
from __future__ import annotations

import argparse
import re
import ssl
import sys
import time
import urllib.request
from pathlib import Path

# Console Windows : forcer l'UTF-8 pour les accents / symboles.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # noqa: BLE001
    pass

BASE = "http://www.bacweb.tn/"
RAW_DIR = Path(__file__).parent / "data" / "raw_pdfs"
UA = "Mozilla/5.0 (compatible; bac-quiz/1.0)"

# Pages de navigation à ignorer quand on cherche les pages section x matière.
NAV_PAGES = {"index.html", "section.htm", "guide.htm", "bac.htm", "jourj.htm", "apresbac.htm"}

# Contexte SSL non vérifiant (utile seulement si un lien bascule en https).
_SSL_CTX = ssl.create_default_context()
_SSL_CTX.check_hostname = False
_SSL_CTX.verify_mode = ssl.CERT_NONE

PDF_RE = re.compile(r"bac/(\d{4})/(principale|controle)/[^\"'>\s]+?\.pdf", re.IGNORECASE)
PAGE_RE = re.compile(r'href="([a-z0-9_]{2,12}\.html?)"', re.IGNORECASE)


def fetch(url: str, retries: int = 3) -> bytes:
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30, context=_SSL_CTX) as resp:
                return resp.read()
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise last  # type: ignore[misc]


def list_section_pages(only: list[str] | None) -> list[str]:
    if only:
        return [s if s.endswith((".htm", ".html")) else f"{s}.htm" for s in only]
    html = fetch(BASE + "section.htm").decode("utf-8", "ignore")
    pages = {p for p in PAGE_RE.findall(html)}
    return sorted(pages - NAV_PAGES)


def collect_pdf_paths(pages: list[str], since: int, with_corriges: bool) -> list[str]:
    found: set[str] = set()
    for page in pages:
        try:
            html = fetch(BASE + page).decode("utf-8", "ignore")
        except Exception as exc:  # noqa: BLE001
            print(f"  ! page illisible {page}: {exc}")
            continue
        for m in PDF_RE.finditer(html):
            path, year = m.group(0), int(m.group(1))
            if year < since:
                continue
            if not with_corriges and path.lower().endswith("_c.pdf"):
                continue
            found.add(path)
    return sorted(found)


def flat_name(path: str) -> str:
    # "bac/2015/principale/math/math.pdf" -> "2015_principale_math_math.pdf"
    return path[len("bac/"):].replace("/", "_")


def download(path: str) -> str:
    dest = RAW_DIR / flat_name(path)
    if dest.exists() and dest.stat().st_size > 0:
        return "déjà là"
    data = fetch(BASE + path)
    if not data.startswith(b"%PDF"):
        return "pas un PDF (ignoré)"
    dest.write_bytes(data)
    return f"{len(data) // 1024} Ko"


def main() -> None:
    ap = argparse.ArgumentParser(description="Télécharge les sujets du bac depuis bacweb.tn")
    ap.add_argument("--since", type=int, default=2000, help="année min (défaut 2000)")
    ap.add_argument("--sections", nargs="*", help="codes de pages, ex: mma sma (défaut: toutes)")
    ap.add_argument("--with-corriges", action="store_true", help="inclure aussi les corrigés *_c.pdf")
    ap.add_argument("--limit", type=int, default=0, help="nombre max de fichiers (0 = illimité)")
    ap.add_argument("--delay", type=float, default=0.3, help="pause entre téléchargements (s)")
    args = ap.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print("→ Liste des pages section x matière ...")
    pages = list_section_pages(args.sections)
    print(f"  {len(pages)} pages à scanner")

    print(f"→ Collecte des liens PDF (depuis {args.since}) ...")
    paths = collect_pdf_paths(pages, args.since, args.with_corriges)
    if args.limit:
        paths = paths[: args.limit]
    print(f"  {len(paths)} sujets trouvés")

    ok = skip = fail = 0
    for i, path in enumerate(paths, 1):
        try:
            status = download(path)
            print(f"  [{i}/{len(paths)}] {flat_name(path)} — {status}")
            if status == "déjà là":
                skip += 1
            else:
                ok += 1
        except Exception as exc:  # noqa: BLE001
            fail += 1
            print(f"  [{i}/{len(paths)}] {flat_name(path)} — ✗ {exc}")
        time.sleep(args.delay)

    print(f"\n✓ Terminé : {ok} téléchargés, {skip} déjà présents, {fail} échecs → {RAW_DIR}")


if __name__ == "__main__":
    main()
