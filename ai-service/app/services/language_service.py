"""
Service de detection de langue.
Utilise langdetect pour identifier la langue du message client.
"""

from typing import Optional

from langdetect import detect, LangDetectException


def detect_language(text: str) -> dict:
    """
    Detecter la langue d'un texte.

    Args:
        text: Le texte dont on veut detecter la langue.

    Returns:
        dict avec "language" (str) et "confidence" (None).
        langdetect ne fournit pas de score de confiance fiable,
        donc confidence est toujours None.
    """
    if not text or len(text.strip()) < 2:
        return {
            "language": "unknown",
            "confidence": None,
        }

    try:
        language = detect(text)
        return {
            "language": language,
            "confidence": None,
        }
    except LangDetectException:
        return {
            "language": "unknown",
            "confidence": None,
        }
