"""Schéma des données QCM produites par le pipeline.

On utilise Pydantic pour valider la sortie de Claude (structured outputs).
Ce même schéma servira de contrat pour la base de données et l'app mobile.
"""
from __future__ import annotations

from enum import Enum
from typing import List

from pydantic import BaseModel, Field


class Difficulte(str, Enum):
    facile = "facile"
    moyen = "moyen"
    difficile = "difficile"


class Question(BaseModel):
    enonce: str = Field(description="L'énoncé de la question (dans la langue du sujet)")
    contexte: str = Field(
        default="",
        description=(
            "Texte support OBLIGATOIRE si la question s'appuie sur un document, "
            "texte, extrait, tableau, code, algorithme ou citation présent dans le "
            "sujet. Recopie ici fidèlement le passage nécessaire (en entier si court) "
            "pour qu'on puisse répondre SANS voir le sujet d'origine. Laisse vide "
            "uniquement si la question est répondable seule (connaissance pure)."
        ),
    )
    choix: List[str] = Field(description="Les propositions de réponse (4 de préférence)")
    index_correct: int = Field(
        description="Index 0-based de la bonne réponse dans 'choix'"
    )
    explication: str = Field(
        description="Explication pédagogique claire de la bonne réponse"
    )
    difficulte: Difficulte
    theme: str = Field(description="Thème / chapitre du programme couvert par la question")


class QCM(BaseModel):
    matiere: str = Field(description="Matière de l'épreuve, ex: Mathématiques, Physique, Arabe")
    section: str = Field(
        description="Section / série du bac, ex: Sciences expérimentales, Mathématiques, Lettres"
    )
    annee: int = Field(description="Année de la session (ex: 2015). 0 si introuvable.")
    langue: str = Field(description="Langue principale du sujet: 'ar', 'fr' ou 'en'")
    questions: List[Question]
