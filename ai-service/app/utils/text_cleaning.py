"""
Utilitaires de nettoyage de texte.
Prétraitement des messages avant classification.
"""

import re
import string


def clean_text(text: str) -> str:
    """
    Nettoyer et normaliser un texte pour la classification.

    Étapes :
    1. Convertir en minuscules.
    2. Supprimer les caractères spéciaux et la ponctuation.
    3. Supprimer les espaces multiples.
    4. Supprimer les espaces en début et fin de chaîne.

    Args:
        text: Le texte brut à nettoyer.

    Returns:
        Le texte nettoyé et normalisé.
    """
    if not isinstance(text, str):
        return ""

    # Convertir en minuscules
    text = text.lower()

    # Supprimer les caractères spéciaux (garder les lettres, chiffres et espaces)
    text = re.sub(r"[^a-zA-ZÀ-ÿ0-9\s]", " ", text)

    # Supprimer les espaces multiples
    text = re.sub(r"\s+", " ", text)

    # Supprimer les espaces en début et fin
    text = text.strip()

    return text
