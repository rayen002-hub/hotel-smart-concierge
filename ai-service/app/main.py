from fastapi import FastAPI

app = FastAPI(
    title="Hotel Smart Concierge - AI Service",
    description="Service IA pour la traduction et la classification des réclamations hôtelières.",
    version="1.0.0",
)


@app.get("/health")
def health_check():
    """Vérifier que le service IA est opérationnel."""
    return {
        "status": "ok",
        "service": "ai-service",
    }
