"""
Service de traduction.
Supporte deux modes : mock (dev) et nllb (production avec facebook/nllb-200-distilled-600M).
"""

import os
from typing import Optional


# Mapping des codes ISO 639-1 vers les codes NLLB (flores200)
NLLB_LANGUAGE_MAP = {
    "en": "eng_Latn",
    "fr": "fra_Latn",
    "ar": "arb_Arab",
    "it": "ita_Latn",
    "es": "spa_Latn",
    "de": "deu_Latn",
    "pt": "por_Latn",
    "nl": "nld_Latn",
    "ru": "rus_Cyrl",
    "zh": "zho_Hans",
    "ja": "jpn_Jpan",
    "ko": "kor_Hang",
    "tr": "tur_Latn",
}


class TranslationService:
    """Service de traduction avec support mock et NLLB."""

    def __init__(self):
        """Initialiser le service selon le mode configure."""
        self.mode = os.environ.get("TRANSLATION_MODE", "mock").lower()
        self._model = None
        self._tokenizer = None

    def _load_nllb_model(self):
        """Charger le modele NLLB a la premiere utilisation (lazy loading)."""
        if self._model is not None:
            return

        try:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

            model_name = "facebook/nllb-200-distilled-600M"
            print(f"[TranslationService] Chargement du modele {model_name}...")
            self._tokenizer = AutoTokenizer.from_pretrained(model_name)
            self._model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            print("[TranslationService] Modele charge avec succes.")
        except Exception as e:
            raise RuntimeError(
                f"Erreur lors du chargement du modele NLLB : {e}"
            )

    def _get_nllb_code(self, language: str) -> Optional[str]:
        """Convertir un code ISO 639-1 en code NLLB."""
        return NLLB_LANGUAGE_MAP.get(language)

    def translate(self, text: str, source_language: str, target_language: str) -> dict:
        """
        Traduire un texte d'une langue source vers une langue cible.

        Args:
            text: Le texte a traduire.
            source_language: Code ISO 639-1 de la langue source (ex: "fr").
            target_language: Code ISO 639-1 de la langue cible (ex: "en").

        Returns:
            dict avec translated_text, source_language, target_language, mode, warning.
        """
        # Si source == cible, pas besoin de traduire
        if source_language == target_language:
            return {
                "translated_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "mode": self.mode,
                "warning": None,
            }

        if self.mode == "mock":
            return self._translate_mock(text, source_language, target_language)
        elif self.mode == "nllb":
            return self._translate_nllb(text, source_language, target_language)
        else:
            return {
                "translated_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "mode": self.mode,
                "warning": f"Mode de traduction inconnu : {self.mode}. Texte original retourne.",
            }

    def _translate_mock(self, text: str, source_language: str, target_language: str) -> dict:
        """Mode mock : retourner le texte original sans traduction."""
        return {
            "translated_text": text,
            "source_language": source_language,
            "target_language": target_language,
            "mode": "mock",
            "warning": "Mode mock actif. Le texte n'a pas ete traduit.",
        }

    def _translate_nllb(self, text: str, source_language: str, target_language: str) -> dict:
        """Mode NLLB : traduire avec facebook/nllb-200-distilled-600M."""
        # Verifier que les langues sont supportees
        src_code = self._get_nllb_code(source_language)
        tgt_code = self._get_nllb_code(target_language)

        if not src_code:
            return {
                "translated_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "mode": "nllb",
                "warning": f"Langue source non supportee : {source_language}. Texte original retourne.",
            }

        if not tgt_code:
            return {
                "translated_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "mode": "nllb",
                "warning": f"Langue cible non supportee : {target_language}. Texte original retourne.",
            }

        # Charger le modele si necessaire
        try:
            self._load_nllb_model()
        except RuntimeError as e:
            return {
                "translated_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "mode": "nllb",
                "warning": str(e),
            }

        # Traduire
        try:
            self._tokenizer.src_lang = src_code
            inputs = self._tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
            target_lang_id = self._tokenizer.convert_tokens_to_ids(tgt_code)

            translated_tokens = self._model.generate(
                **inputs,
                forced_bos_token_id=target_lang_id,
                max_new_tokens=512,
            )

            translated_text = self._tokenizer.batch_decode(
                translated_tokens, skip_special_tokens=True
            )[0]

            return {
                "translated_text": translated_text,
                "source_language": source_language,
                "target_language": target_language,
                "mode": "nllb",
                "warning": None,
            }

        except Exception as e:
            return {
                "translated_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "mode": "nllb",
                "warning": f"Erreur de traduction : {str(e)}. Texte original retourne.",
            }
