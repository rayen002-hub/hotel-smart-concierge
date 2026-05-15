from fastapi import FastAPI, HTTPException

from app.schemas import (
    ClassifyRequest,
    ClassifyResponse,
    DetectLanguageRequest,
    DetectLanguageResponse,
)
from app.services.classifier_service import ComplaintClassifier
from app.services.language_service import detect_language

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
