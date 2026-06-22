"""
Service de detection de langue.
Utilise langdetect avec des regles de correction hotel-specifiques
pour fiabiliser la detection, surtout pour les messages courts.
"""

import re
from langdetect import detect_langs, LangDetectException

from app.utils.language_mapping import is_supported, LANGUAGE_NAMES


# ── Hotel-specific keyword hints per language ─────────────────────
# Each entry: (compiled regex pattern, weight boost)
# Patterns are matched case-insensitively against the input text.

_KEYWORD_HINTS: dict[str, list[tuple[re.Pattern, float]]] = {
    "fr": [
        (re.compile(r"\bne\s+\w+\s+pas\b", re.I), 0.35),
        (re.compile(r"\bclimatisation\b", re.I), 0.40),
        (re.compile(r"\bserviette[s]?\b", re.I), 0.30),
        (re.compile(r"\bchambre\b", re.I), 0.30),
        (re.compile(r"\bréception\b", re.I), 0.30),
        (re.compile(r"\breception\b", re.I), 0.20),  # without accent
        (re.compile(r"\bdouche\b", re.I), 0.30),
        (re.compile(r"\btoilette[s]?\b", re.I), 0.25),
        (re.compile(r"\beau chaude\b", re.I), 0.35),
        (re.compile(r"\beau froide\b", re.I), 0.35),
        (re.compile(r"\bpiscine\b", re.I), 0.25),
        (re.compile(r"\bpetit[- ]?déjeuner\b", re.I), 0.35),
        (re.compile(r"\bpetit[- ]?dejeuner\b", re.I), 0.30),
        (re.compile(r"\bascenseur\b", re.I), 0.35),
        (re.compile(r"\bménage\b", re.I), 0.30),
        (re.compile(r"\bménage\b", re.I), 0.30),
        (re.compile(r"\brobinet\b", re.I), 0.35),
        (re.compile(r"\bbruyant[e]?\b", re.I), 0.25),
        (re.compile(r"\bpropre\b", re.I), 0.20),
        (re.compile(r"\bsale\b", re.I), 0.20),
        (re.compile(r"\bmarche pas\b", re.I), 0.30),
        (re.compile(r"\bne fonctionne pas\b", re.I), 0.35),
        (re.compile(r"\bs'il vous plaît\b", re.I), 0.30),
        (re.compile(r"\bmerci\b", re.I), 0.15),
        (re.compile(r"\bbesoin\b", re.I), 0.20),
    ],
    "en": [
        (re.compile(r"\bnot working\b", re.I), 0.35),
        (re.compile(r"\bdoesn'?t work\b", re.I), 0.35),
        (re.compile(r"\bbroken\b", re.I), 0.25),
        (re.compile(r"\btowel[s]?\b", re.I), 0.30),
        (re.compile(r"\broom\b", re.I), 0.20),
        (re.compile(r"\bbathroom\b", re.I), 0.25),
        (re.compile(r"\bbreakfast\b", re.I), 0.25),
        (re.compile(r"\bhousekeeping\b", re.I), 0.30),
        (re.compile(r"\bfront desk\b", re.I), 0.30),
        (re.compile(r"\bair conditioning\b", re.I), 0.35),
        (re.compile(r"\bAC\b"), 0.20),  # case-sensitive for AC
        (re.compile(r"\bplease\b", re.I), 0.15),
        (re.compile(r"\bneed\b", re.I), 0.15),
        (re.compile(r"\bhot water\b", re.I), 0.30),
        (re.compile(r"\bcold water\b", re.I), 0.30),
        (re.compile(r"\bnoisy\b", re.I), 0.25),
        (re.compile(r"\bdirty\b", re.I), 0.25),
        (re.compile(r"\bclean\b", re.I), 0.15),
    ],
    "es": [
        (re.compile(r"\bno funciona\b", re.I), 0.35),
        (re.compile(r"\btoalla[s]?\b", re.I), 0.30),
        (re.compile(r"\bhabitación\b", re.I), 0.30),
        (re.compile(r"\bhabitacion\b", re.I), 0.25),
        (re.compile(r"\blimpieza\b", re.I), 0.30),
        (re.compile(r"\bdesayuno\b", re.I), 0.30),
        (re.compile(r"\brecepción\b", re.I), 0.30),
        (re.compile(r"\bducha\b", re.I), 0.25),
        (re.compile(r"\bagua caliente\b", re.I), 0.35),
        (re.compile(r"\bnecesito\b", re.I), 0.25),
        (re.compile(r"\bpor favor\b", re.I), 0.20),
        (re.compile(r"\bruidoso\b", re.I), 0.25),
        (re.compile(r"\bsucio\b", re.I), 0.25),
        (re.compile(r"\bmás\b", re.I), 0.15),
    ],
    "it": [
        (re.compile(r"\bnon funziona\b", re.I), 0.35),
        (re.compile(r"\basciugaman[io]?\b", re.I), 0.30),
        (re.compile(r"\bcamera\b", re.I), 0.25),
        (re.compile(r"\bcolazione\b", re.I), 0.30),
        (re.compile(r"\bbagno\b", re.I), 0.25),
        (re.compile(r"\bacqua calda\b", re.I), 0.35),
        (re.compile(r"\bho bisogno\b", re.I), 0.30),
        (re.compile(r"\bper favore\b", re.I), 0.20),
        (re.compile(r"\brumoroso\b", re.I), 0.25),
        (re.compile(r"\bsporco\b", re.I), 0.25),
        (re.compile(r"\bpulizia\b", re.I), 0.30),
        (re.compile(r"\baria condizionata\b", re.I), 0.35),
    ],
    "de": [
        (re.compile(r"\bfunktioniert nicht\b", re.I), 0.35),
        (re.compile(r"\bhandtücher?\b", re.I), 0.30),
        (re.compile(r"\bhandtucher?\b", re.I), 0.25),  # without umlaut
        (re.compile(r"\bzimmer\b", re.I), 0.25),
        (re.compile(r"\bfrühstück\b", re.I), 0.30),
        (re.compile(r"\brezeption\b", re.I), 0.30),
        (re.compile(r"\bbadezimmer\b", re.I), 0.30),
        (re.compile(r"\bwarmes wasser\b", re.I), 0.35),
        (re.compile(r"\bich brauche\b", re.I), 0.30),
        (re.compile(r"\bbitte\b", re.I), 0.15),
        (re.compile(r"\bschmutzig\b", re.I), 0.25),
        (re.compile(r"\blaut\b", re.I), 0.20),
        (re.compile(r"\bkaputt\b", re.I), 0.30),
        (re.compile(r"\bklimaanlage\b", re.I), 0.35),
    ],
    "ar": [
        (re.compile(r"لا يعمل", re.I), 0.35),
        (re.compile(r"مكيف", re.I), 0.30),
        (re.compile(r"منشفة", re.I), 0.30),
        (re.compile(r"غرفة", re.I), 0.25),
        (re.compile(r"حمام", re.I), 0.25),
        (re.compile(r"ماء ساخن", re.I), 0.35),
        (re.compile(r"فطور", re.I), 0.30),
        (re.compile(r"نظافة", re.I), 0.30),
        (re.compile(r"استقبال", re.I), 0.30),
        (re.compile(r"من فضلك", re.I), 0.20),
    ],
}

# Confidence threshold: if langdetect's top result is below this,
# we rely more heavily on keyword analysis.
_LOW_CONFIDENCE_THRESHOLD = 0.70


def _compute_keyword_scores(text: str) -> dict[str, float]:
    """
    Compute keyword-match scores for each language.
    Returns {lang_code: total_score}.
    """
    scores: dict[str, float] = {}
    for lang, patterns in _KEYWORD_HINTS.items():
        total = 0.0
        for pattern, weight in patterns:
            if pattern.search(text):
                total += weight
        if total > 0:
            scores[lang] = round(total, 4)
    return scores


def detect_language(text: str) -> dict:
    """
    Detect the language of a text using a hybrid approach:
    1. Run langdetect for statistical detection
    2. Apply hotel-specific keyword matching
    3. If keywords strongly suggest a different language, override

    Args:
        text: The text to detect the language of.

    Returns:
        dict with:
        - language: ISO 639-1 code
        - confidence: confidence score (0-1)
        - language_name: name of the language
        - supported: whether the language is supported by NLLB
        - method: "keyword_override" or "langdetect"
    """
    if not text or len(text.strip()) < 2:
        return {
            "language": "unknown",
            "confidence": None,
            "language_name": "Unknown",
            "supported": False,
            "method": "none",
        }

    text_clean = text.strip()

    # ── Step 1: Keyword analysis ──────────────────────────────────
    keyword_scores = _compute_keyword_scores(text_clean)

    # ── Step 2: langdetect statistical analysis ───────────────────
    langdetect_lang = None
    langdetect_confidence = 0.0
    try:
        results = detect_langs(text_clean)
        if results:
            top = results[0]
            langdetect_lang = str(top.lang)
            langdetect_confidence = round(float(top.prob), 4)
    except LangDetectException:
        pass

    # ── Step 3: Decision logic ────────────────────────────────────

    # Find the best keyword match
    best_kw_lang = None
    best_kw_score = 0.0
    if keyword_scores:
        best_kw_lang = max(keyword_scores, key=keyword_scores.get)
        best_kw_score = keyword_scores[best_kw_lang]

    # Case A: Strong keyword match overrides langdetect
    if best_kw_lang and best_kw_score >= 0.30:
        # If langdetect agrees, use it with boosted confidence
        if langdetect_lang == best_kw_lang:
            final_lang = langdetect_lang
            final_confidence = min(1.0, round(langdetect_confidence + best_kw_score * 0.3, 4))
            method = "langdetect"
        # If langdetect disagrees or has low confidence, prefer keywords
        elif langdetect_confidence < _LOW_CONFIDENCE_THRESHOLD or best_kw_score >= 0.50:
            final_lang = best_kw_lang
            final_confidence = min(1.0, round(0.80 + best_kw_score * 0.2, 4))
            method = "keyword_override"
        # langdetect is confident AND keywords are moderate — check for
        # close competitors in keyword scores
        else:
            # If langdetect's language also has keyword evidence, trust langdetect
            langdetect_kw_score = keyword_scores.get(langdetect_lang, 0.0)
            if langdetect_kw_score > 0:
                final_lang = langdetect_lang
                final_confidence = langdetect_confidence
                method = "langdetect"
            else:
                # Keywords point elsewhere, langdetect has no keyword backing
                final_lang = best_kw_lang
                final_confidence = min(1.0, round(0.80 + best_kw_score * 0.2, 4))
                method = "keyword_override"

    # Case B: No strong keyword match — trust langdetect
    elif langdetect_lang:
        final_lang = langdetect_lang
        final_confidence = langdetect_confidence
        method = "langdetect"

    # Case C: Neither method succeeded
    else:
        return {
            "language": "unknown",
            "confidence": None,
            "language_name": "Unknown",
            "supported": False,
            "method": "none",
        }

    lang_name = LANGUAGE_NAMES.get(final_lang, final_lang)
    supported = is_supported(final_lang)

    return {
        "language": final_lang,
        "confidence": final_confidence,
        "language_name": lang_name,
        "supported": supported,
        "method": method,
    }
