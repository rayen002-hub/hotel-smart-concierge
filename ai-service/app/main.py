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

app = FastAPI(
    title="Hotel Smart Concierge - AI Service",
    description="Service IA pour la traduction et la classification des reclamations hotelieres.",
    version="1.0.0",
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

# Initialiser le service de traduction
translator = TranslationService()


@app.get("/health")
def health_check():
    """Verifier que le service IA est operationnel."""
    return {
        "status": "ok",
        "service": "ai-service",
        "model_loaded": classifier is not None,
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

    Recoit un texte et retourne le code ISO 639-1 de la langue detectee.
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
    Traduire un message d'une langue source vers une langue cible.

    En mode mock, le texte original est retourne sans traduction.
    En mode nllb, le modele facebook/nllb-200-distilled-600M est utilise.
    """
    try:
        result = translator.translate(
            text=request.message,
            source_language=request.source_language,
            target_language=request.target_language,
        )
        return TranslateResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la traduction : {str(e)}",
        )


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_complaint(request: AnalyzeRequest):
    """
    Analyser une reclamation complete (langue, traduction, classification).
    """
    if classifier is None:
        raise HTTPException(
            status_code=503,
            detail="Le modele de classification n'est pas charge.",
        )

    # 1. Detection de la langue
    try:
        detection_result = detect_language(request.message)
        detected_language = detection_result["language"]
        if detected_language == "unknown":
            detected_language = "fr"  # Fallback par defaut
    except Exception:
        detected_language = "fr"

    translation_warning = None

    # 2. Traduction vers l'anglais pour la classification
    normalized_message_en = request.message
    if detected_language != "en":
        try:
            translation_result = translator.translate(
                text=request.message,
                source_language=detected_language,
                target_language="en",
            )
            normalized_message_en = translation_result["translated_text"]
            if translation_result.get("warning"):
                translation_warning = translation_result["warning"]
        except Exception as e:
            translation_warning = f"Erreur de traduction vers l'anglais: {str(e)}"

    # 3. Classification
    try:
        classification_result = classifier.predict(normalized_message_en)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la classification : {str(e)}",
        )

    # 4. Traduction vers la langue du personnel
    staff_message = normalized_message_en
    if request.staff_language != "en":
        try:
            translation_result = translator.translate(
                text=normalized_message_en,
                source_language="en",
                target_language=request.staff_language,
            )
            staff_message = translation_result["translated_text"]
            if translation_result.get("warning") and not translation_warning:
                translation_warning = translation_result["warning"]
        except Exception as e:
            if not translation_warning:
                translation_warning = f"Erreur de traduction vers le staff: {str(e)}"

    return AnalyzeResponse(
        original_message=request.message,
        detected_language=detected_language,
        normalized_message_en=normalized_message_en,
        staff_message=staff_message,
        staff_language=request.staff_language,
        category=classification_result["category"],
        category_confidence=classification_result["confidence"],
        translation_warning=translation_warning,
    )
