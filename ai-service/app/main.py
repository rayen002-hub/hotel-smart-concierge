from fastapi import FastAPI, HTTPException

from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ClassifyRequest,
    ClassifyResponse,
    DetectLanguageRequest,
    DetectLanguageResponse,
    TranslateRequest,
    TranslateResponse,
)
from app.services.classifier_service import ComplaintClassifier
from app.services.language_service import detect_language
from app.services.translation_service import TranslationService
from app.utils.language_mapping import get_supported_languages

app = FastAPI(
    title="Hotel Smart Concierge - AI Service",
    description="Service IA pour la traduction (NLLB) et la classification des reclamations hotelieres.",
    version="2.0.0",
)

# Charger le classificateur au demarrage
try:
    classifier = ComplaintClassifier()
except FileNotFoundError as e:
    print(f"[WARNING] {e}")
    classifier = None
except RuntimeError as e:
    print(f"[ERROR] {e}")
    classifier = None

# Initialiser le service de traduction (lazy loading du modele)
translator = TranslationService()


@app.get("/health")
def health_check():
    """Verifier que le service IA est operationnel."""
    return {
        "status": "ok",
        "service": "ai-service",
        "classifier_loaded": classifier is not None,
        "translation_model": "facebook/nllb-200-distilled-600M",
        "translation_model_loaded": translator.is_loaded,
        "translation_load_error": translator.load_error,
        "translation_cache": translator.cache_stats,
    }


@app.post("/translation/reset")
def reset_translation():
    """Reinitialiser l'erreur de traduction pour permettre une nouvelle tentative."""
    translator.reset_error()
    return {"status": "ok", "message": "Erreur de traduction reinitialisee."}


@app.get("/supported-languages")
def supported_languages():
    """Retourner la liste des langues supportees par le modele de traduction."""
    languages = get_supported_languages()
    return {
        "count": len(languages),
        "model": "facebook/nllb-200-distilled-600M",
        "languages": languages,
    }


@app.post("/classify", response_model=ClassifyResponse)
def classify_complaint(request: ClassifyRequest):
    """
    Classifier une reclamation hoteliere.

    Recoit un message texte et retourne la categorie predite
    avec un score de confiance.
    """
    if classifier is None:
        raise HTTPException(
            status_code=503,
            detail="Le modele de classification n'est pas charge. "
                   "Veuillez entrainer le modele avec : python training/train_classifier.py",
        )

    try:
        result = classifier.predict(request.message)
        return ClassifyResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la classification : {str(e)}",
        )


@app.post("/detect-language", response_model=DetectLanguageResponse)
def detect_language_endpoint(request: DetectLanguageRequest):
    """
    Detecter la langue d'un message.

    Recoit un texte et retourne le code ISO 639-1 de la langue detectee,
    le score de confiance, et si la langue est supportee par NLLB.
    """
    try:
        result = detect_language(request.message)
        return DetectLanguageResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la detection de langue : {str(e)}",
        )


@app.post("/translate", response_model=TranslateResponse)
def translate_text(request: TranslateRequest):
    """
    Traduire un message avec facebook/nllb-200-distilled-600M.

    Le modele est charge en lazy loading au premier appel.
    Les traductions identiques sont mises en cache.
    Un glossaire hotelier est applique en post-traitement.
    """
    try:
        result = translator.translate(
            text=request.message,
            source_language=request.source_language,
            target_language=request.target_language,
        )
        return TranslateResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la traduction : {str(e)}",
        )


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_complaint(request: AnalyzeRequest):
    """
    Analyser une reclamation complete :
    1. Detecter la langue du message
    2. Traduire vers l'anglais (normalized_message_en)
    3. Classifier avec le modele ML
    4. Traduire vers staff_language si necessaire
    5. Retourner toutes les informations utiles
    """
    if classifier is None:
        raise HTTPException(
            status_code=503,
            detail="Le modele de classification n'est pas charge. "
                   "Veuillez entrainer le modele avec : python training/train_classifier.py",
        )

    translation_warning = None

    # ── Etape 1 : Detection de la langue ──────────────────────────
    try:
        detection_result = detect_language(request.message)
        detected_language = detection_result["language"]
        if detected_language == "unknown":
            detected_language = "fr"  # Fallback par defaut
    except Exception:
        detected_language = "fr"

    # ── Etape 2 : Traduction vers l'anglais ───────────────────────
    normalized_message_en = request.message
    if detected_language != "en":
        try:
            tr_en = translator.translate(
                text=request.message,
                source_language=detected_language,
                target_language="en",
            )
            normalized_message_en = tr_en["translated_text"]
        except ValueError as e:
            translation_warning = f"Langue non supportee : {str(e)}"
        except Exception as e:
            translation_warning = f"Erreur de traduction vers EN : {str(e)}"

    # ── Etape 3 : Classification ──────────────────────────────────
    try:
        classification_result = classifier.predict(normalized_message_en)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la classification : {str(e)}",
        )

    # ── Etape 4 : Traduction vers staff_language ──────────────────
    if detected_language == request.staff_language:
        # Meme langue : utiliser le message original directement
        staff_message = request.message
    elif request.staff_language == "en":
        # Staff parle anglais : utiliser normalized_message_en
        staff_message = normalized_message_en
    else:
        # Traduire EN -> staff_language
        staff_message = normalized_message_en
        try:
            tr_staff = translator.translate(
                text=normalized_message_en,
                source_language="en",
                target_language=request.staff_language,
            )
            staff_message = tr_staff["translated_text"]
        except ValueError as e:
            if not translation_warning:
                translation_warning = f"Langue staff non supportee : {str(e)}"
        except Exception as e:
            if not translation_warning:
                translation_warning = f"Erreur de traduction vers staff : {str(e)}"

    return AnalyzeResponse(
        original_message=request.message,
        detected_language=detected_language,
        normalized_message_en=normalized_message_en,
        staff_message=staff_message,
        staff_language=request.staff_language,
        category=classification_result["category"],
        category_confidence=classification_result["confidence"],
        translation_model="facebook/nllb-200-distilled-600M",
        translation_warning=translation_warning,
    )
