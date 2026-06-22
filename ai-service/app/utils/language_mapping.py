"""
Mapping des codes ISO 639-1 vers les codes NLLB (flores200).
Le modele facebook/nllb-200-distilled-600M utilise ses propres codes de langue.
"""

# Mapping ISO 639-1 -> NLLB flores200 code
ISO_TO_NLLB = {
    "af": "afr_Latn",   # Afrikaans
    "am": "amh_Ethi",   # Amharic
    "ar": "arb_Arab",   # Arabic (Modern Standard)
    "az": "azj_Latn",   # Azerbaijani
    "be": "bel_Cyrl",   # Belarusian
    "bg": "bul_Cyrl",   # Bulgarian
    "bn": "ben_Beng",   # Bengali
    "bs": "bos_Latn",   # Bosnian
    "ca": "cat_Latn",   # Catalan
    "cs": "ces_Latn",   # Czech
    "cy": "cym_Latn",   # Welsh
    "da": "dan_Latn",   # Danish
    "de": "deu_Latn",   # German
    "el": "ell_Grek",   # Greek
    "en": "eng_Latn",   # English
    "es": "spa_Latn",   # Spanish
    "et": "est_Latn",   # Estonian
    "fa": "pes_Arab",   # Persian
    "fi": "fin_Latn",   # Finnish
    "fr": "fra_Latn",   # French
    "ga": "gle_Latn",   # Irish
    "gl": "glg_Latn",   # Galician
    "gu": "guj_Gujr",   # Gujarati
    "ha": "hau_Latn",   # Hausa
    "he": "heb_Hebr",   # Hebrew
    "hi": "hin_Deva",   # Hindi
    "hr": "hrv_Latn",   # Croatian
    "hu": "hun_Latn",   # Hungarian
    "hy": "hye_Armn",   # Armenian
    "id": "ind_Latn",   # Indonesian
    "ig": "ibo_Latn",   # Igbo
    "is": "isl_Latn",   # Icelandic
    "it": "ita_Latn",   # Italian
    "ja": "jpn_Jpan",   # Japanese
    "jv": "jav_Latn",   # Javanese
    "ka": "kat_Geor",   # Georgian
    "kk": "kaz_Cyrl",   # Kazakh
    "km": "khm_Khmr",   # Khmer
    "kn": "kan_Knda",   # Kannada
    "ko": "kor_Hang",   # Korean
    "lo": "lao_Laoo",   # Lao
    "lt": "lit_Latn",   # Lithuanian
    "lv": "lvs_Latn",   # Latvian
    "mk": "mkd_Cyrl",   # Macedonian
    "ml": "mal_Mlym",   # Malayalam
    "mn": "khk_Cyrl",   # Mongolian
    "mr": "mar_Deva",   # Marathi
    "ms": "zsm_Latn",   # Malay
    "my": "mya_Mymr",   # Burmese
    "ne": "npi_Deva",   # Nepali
    "nl": "nld_Latn",   # Dutch
    "no": "nob_Latn",   # Norwegian
    "pa": "pan_Guru",   # Punjabi
    "pl": "pol_Latn",   # Polish
    "pt": "por_Latn",   # Portuguese
    "ro": "ron_Latn",   # Romanian
    "ru": "rus_Cyrl",   # Russian
    "si": "sin_Sinh",   # Sinhala
    "sk": "slk_Latn",   # Slovak
    "sl": "slv_Latn",   # Slovenian
    "so": "som_Latn",   # Somali
    "sq": "als_Latn",   # Albanian
    "sr": "srp_Cyrl",   # Serbian
    "sv": "swe_Latn",   # Swedish
    "sw": "swh_Latn",   # Swahili
    "ta": "tam_Taml",   # Tamil
    "te": "tel_Telu",   # Telugu
    "th": "tha_Thai",   # Thai
    "tl": "tgl_Latn",   # Tagalog
    "tr": "tur_Latn",   # Turkish
    "uk": "ukr_Cyrl",   # Ukrainian
    "ur": "urd_Arab",   # Urdu
    "uz": "uzn_Latn",   # Uzbek
    "vi": "vie_Latn",   # Vietnamese
    "yo": "yor_Latn",   # Yoruba
    "zh": "zho_Hans",   # Chinese (Simplified)
    "zu": "zul_Latn",   # Zulu
}

# Reverse mapping for display
NLLB_TO_ISO = {v: k for k, v in ISO_TO_NLLB.items()}

# Language names for display
LANGUAGE_NAMES = {
    "af": "Afrikaans", "am": "Amharic", "ar": "Arabic", "az": "Azerbaijani",
    "be": "Belarusian", "bg": "Bulgarian", "bn": "Bengali", "bs": "Bosnian",
    "ca": "Catalan", "cs": "Czech", "cy": "Welsh", "da": "Danish",
    "de": "German", "el": "Greek", "en": "English", "es": "Spanish",
    "et": "Estonian", "fa": "Persian", "fi": "Finnish", "fr": "French",
    "ga": "Irish", "gl": "Galician", "gu": "Gujarati", "ha": "Hausa",
    "he": "Hebrew", "hi": "Hindi", "hr": "Croatian", "hu": "Hungarian",
    "hy": "Armenian", "id": "Indonesian", "ig": "Igbo", "is": "Icelandic",
    "it": "Italian", "ja": "Japanese", "jv": "Javanese", "ka": "Georgian",
    "kk": "Kazakh", "km": "Khmer", "kn": "Kannada", "ko": "Korean",
    "lo": "Lao", "lt": "Lithuanian", "lv": "Latvian", "mk": "Macedonian",
    "ml": "Malayalam", "mn": "Mongolian", "mr": "Marathi", "ms": "Malay",
    "my": "Burmese", "ne": "Nepali", "nl": "Dutch", "no": "Norwegian",
    "pa": "Punjabi", "pl": "Polish", "pt": "Portuguese", "ro": "Romanian",
    "ru": "Russian", "si": "Sinhala", "sk": "Slovak", "sl": "Slovenian",
    "so": "Somali", "sq": "Albanian", "sr": "Serbian", "sv": "Swedish",
    "sw": "Swahili", "ta": "Tamil", "te": "Telugu", "th": "Thai",
    "tl": "Tagalog", "tr": "Turkish", "uk": "Ukrainian", "ur": "Urdu",
    "uz": "Uzbek", "vi": "Vietnamese", "yo": "Yoruba", "zh": "Chinese",
    "zu": "Zulu",
}


def get_nllb_code(iso_code: str) -> str | None:
    """Convertir un code ISO 639-1 en code NLLB."""
    return ISO_TO_NLLB.get(iso_code)


def get_iso_code(nllb_code: str) -> str | None:
    """Convertir un code NLLB en code ISO 639-1."""
    return NLLB_TO_ISO.get(nllb_code)


def is_supported(iso_code: str) -> bool:
    """Verifier si une langue est supportee par le modele."""
    return iso_code in ISO_TO_NLLB


def get_supported_languages() -> list[dict]:
    """Retourner la liste des langues supportees."""
    return [
        {"code": k, "name": LANGUAGE_NAMES.get(k, k), "nllb_code": v}
        for k, v in sorted(ISO_TO_NLLB.items())
    ]
