"""
Service de detection de langue.
Utilise langdetect pour identifier la langue du message client.
Mappe le resultat vers le code NLLB si supporté.
"""

from langdetect import detect, detect_langs, LangDetectException

from app.utils.language_mapping import is_supported, LANGUAGE_NAMES


def detect_language(text: str) -> dict:
    """
    Detecter la langue d'un texte.

    Args:
        text: Le texte dont on veut detecter la langue.

    Returns:
        dict avec:
        - language: code ISO 639-1
        - confidence: score de confiance (0-1)
        - language_name: nom de la langue
        - supported: si la langue est supportee par NLLB
    """
    if not text or len(text.strip()) < 2:
        return {
            "language": "unknown",
            "confidence": None,
            "language_name": "Unknown",
            "supported": False,
        }

    try:
        # detect_langs retourne une liste de probabilites
        results = detect_langs(text)
        if not results:
            return {
                "language": "unknown",
                "confidence": None,
                "language_name": "Unknown",
                "supported": False,
            }

        top = results[0]
        lang_code = str(top.lang)
        confidence = round(float(top.prob), 4)
        lang_name = LANGUAGE_NAMES.get(lang_code, lang_code)
        supported = is_supported(lang_code)

        return {
            "language": lang_code,
            "confidence": confidence,
            "language_name": lang_name,
            "supported": supported,
        }

    except LangDetectException:
        return {
            "language": "unknown",
            "confidence": None,
            "language_name": "Unknown",
            "supported": False,
        }
