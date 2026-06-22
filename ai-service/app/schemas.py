"""
Schemas Pydantic pour le service IA.
"""

from typing import Optional

from pydantic import BaseModel, Field


class ClassifyRequest(BaseModel):
    """Schema pour la requete de classification."""
    message: str = Field(
        ...,
        min_length=2,
        description="Le texte de la reclamation a classifier. Minimum 2 caracteres.",
        examples=["AC not working"],
    )


class ClassifyResponse(BaseModel):
    """Schema pour la reponse de classification."""
    category: str = Field(
        ...,
        description="La categorie predite de la reclamation.",
        examples=["MAINTENANCE"],
    )
    confidence: Optional[float] = Field(
        None,
        description="Le score de confiance de la prediction (0 a 1). Null si non supporte.",
        examples=[0.92],
    )


class DetectLanguageRequest(BaseModel):
    """Schema pour la requete de detection de langue."""
    message: str = Field(
        ...,
        min_length=2,
        description="Le texte dont on veut detecter la langue. Minimum 2 caracteres.",
        examples=["La climatisation ne marche pas"],
    )


class DetectLanguageResponse(BaseModel):
    """Schema pour la reponse de detection de langue."""
    language: str = Field(
        ...,
        description="Le code ISO 639-1 de la langue detectee (ex: fr, en, es).",
        examples=["fr"],
    )
    confidence: Optional[float] = Field(
        None,
        description="Score de confiance de la detection (0-1).",
    )
    language_name: Optional[str] = Field(
        None,
        description="Nom de la langue detectee.",
        examples=["French"],
    )
    supported: Optional[bool] = Field(
        None,
        description="Si la langue est supportee par le modele de traduction.",
    )
    method: Optional[str] = Field(
        None,
        description="Methode utilisee: 'keyword_override', 'langdetect', ou 'none'.",
        examples=["langdetect"],
    )


class TranslateRequest(BaseModel):
    """Schema pour la requete de traduction."""
    message: str = Field(
        ...,
        min_length=2,
        description="Le texte a traduire. Minimum 2 caracteres.",
        examples=["La climatisation ne marche pas"],
    )
    source_language: str = Field(
        ...,
        description="Code ISO 639-1 de la langue source (ex: fr, en, ar).",
        examples=["fr"],
    )
    target_language: str = Field(
        ...,
        description="Code ISO 639-1 de la langue cible (ex: en, fr).",
        examples=["en"],
    )


class TranslateResponse(BaseModel):
    """Schema pour la reponse de traduction."""
    original_message: str = Field(
        ...,
        description="Le texte original avant traduction.",
    )
    translated_text: str = Field(
        ...,
        description="Le texte traduit.",
    )
    source_language: str = Field(
        ...,
        description="Code ISO 639-1 de la langue source.",
    )
    target_language: str = Field(
        ...,
        description="Code ISO 639-1 de la langue cible.",
    )
    model: str = Field(
        ...,
        description="Modele utilise pour la traduction.",
        examples=["facebook/nllb-200-distilled-600M"],
    )
    cached: bool = Field(
        False,
        description="Si la traduction vient du cache.",
    )


class AnalyzeRequest(BaseModel):
    """Schema pour la requete d'analyse complete d'une reclamation."""
    message: str = Field(
        ...,
        min_length=2,
        description="Le texte brut de la reclamation. Minimum 2 caracteres.",
        examples=["La climatisation ne marche pas"],
    )
    staff_language: str = Field(
        ...,
        description="Code ISO 639-1 de la langue du personnel (ex: fr, en, es).",
        examples=["fr"],
    )


class AnalyzeResponse(BaseModel):
    """Schema pour la reponse d'analyse complete."""
    original_message: str = Field(..., description="Le message original du client.")
    detected_language: str = Field(..., description="La langue detectee du message (ISO 639-1).")
    normalized_message_en: str = Field(..., description="Le message traduit en anglais pour la classification.")
    staff_message: str = Field(..., description="Le message traduit dans la langue du personnel.")
    staff_language: str = Field(..., description="La langue du personnel.")
    category: str = Field(..., description="La categorie predite.")
    category_confidence: Optional[float] = Field(None, description="Le score de confiance de la prediction (0-1).")
    translation_model: str = Field(
        ...,
        description="Le modele utilise pour la traduction.",
        examples=["facebook/nllb-200-distilled-600M"],
    )
    translation_warning: Optional[str] = Field(None, description="Avertissement eventuel sur la traduction.")
