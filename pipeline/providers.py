"""Couche fournisseurs pour la génération de QCM.

But : ne pas dépendre d'un seul fournisseur d'IA. Chaque fournisseur sait lire
un PDF (vision + OCR arabe/français) et renvoyer un objet `QCM` validé.
`generate_qcm.py` les enchaîne en fallback : on essaie le moins cher / gratuit
d'abord (Gemini), et on bascule sur le suivant (Anthropic) si erreur ou quota.

Pour ajouter un fournisseur : crée une classe avec `name`, `available()` et
`generate(...)`, puis enregistre-la dans `REGISTRY` (et son rang dans
`DEFAULT_ORDER`). Les SDK sont importés *paresseusement* dans chaque méthode :
inutile d'installer le SDK d'un fournisseur que tu n'utilises pas.
"""
from __future__ import annotations

import base64
import os
from pathlib import Path

from schema import QCM


class ProviderError(Exception):
    """Le fournisseur n'a pas pu produire un QCM exploitable."""


# Tarifs API en $/million de tokens (entrée, sortie) — sert UNIQUEMENT à estimer
# le coût affiché. Gemini free tier = 0 $ (non listé -> coût 0).
PRICING: dict[str, tuple[float, float]] = {
    "claude-opus-4-8": (5.0, 25.0),
}


class Provider:
    """Interface commune à tous les fournisseurs."""

    name: str = "base"
    model: str = ""
    # Renseignés à chaque appel de generate() pour le suivi du coût.
    last_tokens: tuple[int, int] = (0, 0)
    last_cost: float = 0.0

    def available(self) -> bool:
        """Vrai si la clé API nécessaire est présente dans l'environnement."""
        raise NotImplementedError

    def generate(self, pdf_path: Path, system: str, instruction: str) -> QCM:
        """Lit le PDF et renvoie un QCM validé, ou lève ProviderError."""
        raise NotImplementedError

    def label(self) -> str:
        return f"{self.name} ({self.model})"


class GeminiProvider(Provider):
    """Google Gemini — free tier généreux, lecture PDF/arabe native."""

    name = "gemini"

    def __init__(self, model: str = "gemini-2.5-flash") -> None:
        self.model = model

    def available(self) -> bool:
        return bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))

    def generate(self, pdf_path: Path, system: str, instruction: str) -> QCM:
        from google import genai
        from google.genai import types

        client = genai.Client()  # lit GEMINI_API_KEY / GOOGLE_API_KEY
        response = client.models.generate_content(
            model=self.model,
            contents=[
                types.Part.from_bytes(
                    data=pdf_path.read_bytes(), mime_type="application/pdf"
                ),
                instruction,
            ],
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                response_schema=QCM,
                # gemini-2.5-flash "pense" (thinking) avant de répondre : la
                # réflexion consomme des tokens de sortie. 16k ne suffit pas pour
                # réflexion + 8-15 questions détaillées -> JSON tronqué. On élargit.
                max_output_tokens=32000,
            ),
        )
        qcm = response.parsed
        if not isinstance(qcm, QCM):
            fr = None
            if response.candidates:
                fr = getattr(response.candidates[0], "finish_reason", None)
            raise ProviderError(
                f"Gemini n'a pas renvoyé de JSON conforme (finish_reason={fr})"
            )
        um = getattr(response, "usage_metadata", None)
        self.last_tokens = (
            (getattr(um, "prompt_token_count", 0) or 0,
             getattr(um, "candidates_token_count", 0) or 0)
            if um is not None else (0, 0)
        )
        self.last_cost = 0.0  # free tier
        return qcm


class AnthropicProvider(Provider):
    """Anthropic Claude — qualité top, gardé en secours."""

    name = "anthropic"

    def __init__(self, model: str = "claude-opus-4-8") -> None:
        self.model = model

    def available(self) -> bool:
        return bool(os.getenv("ANTHROPIC_API_KEY"))

    def generate(self, pdf_path: Path, system: str, instruction: str) -> QCM:
        import anthropic

        client = anthropic.Anthropic()
        data = base64.standard_b64encode(pdf_path.read_bytes()).decode("utf-8")
        response = client.messages.parse(
            model=self.model,
            max_tokens=16000,
            thinking={"type": "adaptive"},
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": data,
                            },
                        },
                        {"type": "text", "text": instruction},
                    ],
                }
            ],
            output_format=QCM,
        )
        usage = response.usage
        in_tok = getattr(usage, "input_tokens", 0) or 0
        out_tok = getattr(usage, "output_tokens", 0) or 0
        pin, pout = PRICING.get(self.model, (0.0, 0.0))
        self.last_tokens = (in_tok, out_tok)
        self.last_cost = in_tok / 1e6 * pin + out_tok / 1e6 * pout
        return response.parsed_output


# Enregistrement des fournisseurs disponibles + ordre de fallback par défaut
# (gratuit / moins cher d'abord).
REGISTRY: dict[str, type[Provider]] = {
    "gemini": GeminiProvider,
    "anthropic": AnthropicProvider,
}
DEFAULT_ORDER: list[str] = ["gemini", "anthropic"]

# Plusieurs modèles Gemini essayés dans l'ordre. Intérêt :
#  1) résilience : si un modèle renvoie 503 (surcharge) ou 429 (quota épuisé),
#     on bascule sur le suivant ;
#  2) capacité gratuite : le free tier a un quota *par modèle*, donc enchaîner
#     plusieurs modèles multiplie le nombre de QCM générables par jour.
# flash-lite est mis en tête car flash 2.5 est souvent en forte demande (503) ;
# il "pense" peu -> pas de troncature, et reste largement assez bon pour des QCM.
GEMINI_MODELS: list[str] = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]


def build_chain(preferred: str | None = None) -> list[Provider]:
    """Construit la chaîne de fournisseurs à essayer, dans l'ordre.

    - `preferred` (ex: "anthropic") le force en tête s'il a sa clé.
    - Sinon on suit DEFAULT_ORDER.
    - On ne garde que les fournisseurs dont la clé API est présente.
    """
    order = list(DEFAULT_ORDER)
    if preferred:
        if preferred not in REGISTRY:
            raise SystemExit(
                f"Fournisseur inconnu : {preferred!r}. "
                f"Disponibles : {', '.join(REGISTRY)}"
            )
        order = [preferred] + [p for p in order if p != preferred]

    chain: list[Provider] = []
    for name in order:
        if name == "gemini":
            chain.extend(GeminiProvider(m) for m in GEMINI_MODELS)
        else:
            chain.append(REGISTRY[name]())
    return [p for p in chain if p.available()]
