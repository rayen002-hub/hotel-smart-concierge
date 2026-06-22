"""
Service de traduction basé sur facebook/nllb-200-distilled-600M.
Pas de mode mock. Le modèle est chargé en lazy loading au premier appel.
Inclut un cache LRU pour éviter les traductions redondantes.
Le chargement du modèle est protégé par un timeout pour ne jamais bloquer le service.
"""

import hashlib
import threading
import traceback
from collections import OrderedDict
from typing import Optional


from app.utils.language_mapping import get_nllb_code, is_supported, LANGUAGE_NAMES
from app.utils.hotel_glossary import apply_glossary


# -------------------------------------------------------------------
# Translation cache (LRU, max 500 entries)
# -------------------------------------------------------------------

class TranslationCache:
    """Cache LRU pour les traductions identiques."""

    def __init__(self, max_size: int = 500):
        self._cache: OrderedDict[str, str] = OrderedDict()
        self._max_size = max_size
        self._hits = 0
        self._misses = 0

    def _make_key(self, text: str, src: str, tgt: str) -> str:
        raw = f"{src}|{tgt}|{text}"
        return hashlib.md5(raw.encode("utf-8")).hexdigest()

    def get(self, text: str, src: str, tgt: str) -> Optional[str]:
        key = self._make_key(text, src, tgt)
        if key in self._cache:
            self._hits += 1
            self._cache.move_to_end(key)
            return self._cache[key]
        self._misses += 1
        return None

    def put(self, text: str, src: str, tgt: str, result: str):
        key = self._make_key(text, src, tgt)
        self._cache[key] = result
        self._cache.move_to_end(key)
        if len(self._cache) > self._max_size:
            self._cache.popitem(last=False)

    @property
    def stats(self) -> dict:
        return {
            "size": len(self._cache),
            "max_size": self._max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / max(self._hits + self._misses, 1), 3),
        }


# -------------------------------------------------------------------
# Translation Service
# -------------------------------------------------------------------

MODEL_NAME = "facebook/nllb-200-distilled-600M"

# Maximum time (seconds) to wait for model loading
MODEL_LOAD_TIMEOUT = 120


class TranslationService:
    """Service de traduction avec facebook/nllb-200-distilled-600M."""

    def __init__(self):
        """Initialiser le service. Le modele est charge en lazy loading."""
        self._model = None
        self._tokenizer = None
        self._loaded = False
        self._loading = False
        self._load_error: Optional[str] = None
        self._cache = TranslationCache(max_size=500)
        self._lock = threading.Lock()

    def _load_model(self):
        """Charger le modele NLLB a la premiere utilisation (lazy loading)."""
        if self._loaded:
            return

        if self._load_error:
            raise RuntimeError(
                f"Le modele de traduction n'a pas pu etre charge: {self._load_error}"
            )

        if self._loading:
            raise RuntimeError(
                "Le modele de traduction est en cours de chargement. Reessayez dans quelques secondes."
            )

        with self._lock:
            # Double-check after acquiring lock
            if self._loaded:
                return
            if self._load_error:
                raise RuntimeError(
                    f"Le modele de traduction n'a pas pu etre charge: {self._load_error}"
                )

            self._loading = True

        # Load in a background thread with timeout
        load_result = {"success": False, "error": None}

        def _do_load():
            try:
                from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

                print(f"[TranslationService] Chargement du modele {MODEL_NAME}...")
                print("[TranslationService] Premier chargement = telechargement (~2.5 GB). Patience...")

                tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
                model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

                self._tokenizer = tokenizer
                self._model = model
                self._loaded = True
                load_result["success"] = True
                print(f"[TranslationService] Modele {MODEL_NAME} charge avec succes.")
            except Exception as e:
                load_result["error"] = str(e)
                print(f"[TranslationService] ERREUR lors du chargement: {e}")
                traceback.print_exc()

        thread = threading.Thread(target=_do_load, daemon=True)
        thread.start()
        thread.join(timeout=MODEL_LOAD_TIMEOUT)

        self._loading = False

        if thread.is_alive():
            self._load_error = (
                f"Timeout ({MODEL_LOAD_TIMEOUT}s) lors du chargement du modele. "
                "Le cache HuggingFace est peut-etre corrompu. "
                "Supprimez le dossier ~/.cache/huggingface/hub/models--facebook--nllb-200-distilled-600M et redemarrez."
            )
            raise RuntimeError(self._load_error)

        if not load_result["success"]:
            self._load_error = load_result["error"] or "Erreur inconnue"
            raise RuntimeError(
                f"Le modele de traduction n'a pas pu etre charge: {self._load_error}"
            )

    def translate(self, text: str, source_language: str, target_language: str) -> dict:
        """
        Traduire un texte d'une langue source vers une langue cible.

        Args:
            text: Le texte a traduire.
            source_language: Code ISO 639-1 de la langue source (ex: "fr").
            target_language: Code ISO 639-1 de la langue cible (ex: "en").

        Returns:
            dict avec original_message, translated_text, source_language,
            target_language, model, cached.
        """
        # Si source == cible, pas besoin de traduire
        if source_language == target_language:
            return {
                "original_message": text,
                "translated_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "model": MODEL_NAME,
                "cached": False,
            }

        # Verifier que les langues sont supportees
        src_nllb = get_nllb_code(source_language)
        tgt_nllb = get_nllb_code(target_language)

        if not src_nllb:
            src_name = LANGUAGE_NAMES.get(source_language, source_language)
            raise ValueError(
                f"Langue source non supportee : '{source_language}' ({src_name}). "
                f"Langues supportees : voir GET /supported-languages"
            )

        if not tgt_nllb:
            tgt_name = LANGUAGE_NAMES.get(target_language, target_language)
            raise ValueError(
                f"Langue cible non supportee : '{target_language}' ({tgt_name}). "
                f"Langues supportees : voir GET /supported-languages"
            )

        # Verifier le cache
        cached = self._cache.get(text, source_language, target_language)
        if cached is not None:
            return {
                "original_message": text,
                "translated_text": cached,
                "source_language": source_language,
                "target_language": target_language,
                "model": MODEL_NAME,
                "cached": True,
            }

        # Charger le modele si necessaire
        self._load_model()

        # Traduire avec NLLB
        self._tokenizer.src_lang = src_nllb
        inputs = self._tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True,
        )

        target_lang_id = self._tokenizer.convert_tokens_to_ids(tgt_nllb)

        translated_tokens = self._model.generate(
            **inputs,
            forced_bos_token_id=target_lang_id,
            max_new_tokens=512,
            num_beams=4,
            early_stopping=True,
        )

        translated_text = self._tokenizer.batch_decode(
            translated_tokens, skip_special_tokens=True
        )[0]

        # Post-traitement : appliquer le glossaire hotelier
        translated_text = apply_glossary(translated_text, source_language, target_language)

        # Mettre en cache
        self._cache.put(text, source_language, target_language, translated_text)

        return {
            "original_message": text,
            "translated_text": translated_text,
            "source_language": source_language,
            "target_language": target_language,
            "model": MODEL_NAME,
            "cached": False,
        }

    def reset_error(self):
        """Reinitialiser l'erreur pour permettre une nouvelle tentative de chargement."""
        self._load_error = None
        self._loading = False

    @property
    def cache_stats(self) -> dict:
        """Retourner les statistiques du cache."""
        return self._cache.stats

    @property
    def is_loaded(self) -> bool:
        """Verifier si le modele est charge."""
        return self._loaded

    @property
    def load_error(self) -> Optional[str]:
        """Retourner l'erreur de chargement si presente."""
        return self._load_error
