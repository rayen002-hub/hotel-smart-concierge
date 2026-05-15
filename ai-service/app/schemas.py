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
        description="Score de confiance. Null car langdetect ne le fournit pas.",
    )
