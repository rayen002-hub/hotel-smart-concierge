"""
Service de classification des reclamations.
Charge le modele ML entraine et expose une methode de prediction.
"""

import os
from typing import Optional

import joblib
import numpy as np

from app.utils.text_cleaning import clean_text


class ComplaintClassifier:
    """Classificateur de reclamations hotelières."""

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialiser le classificateur.

        Args:
            model_path: Chemin vers le fichier .joblib du modele.
                        Par defaut : ai-service/models/complaint_classifier.joblib
        """
        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(__file__), "..", "..", "models", "complaint_classifier.joblib"
            )

        self.model_path = os.path.abspath(model_path)
        self.pipeline = None
        self._load_model()

    def _load_model(self):
        """Charger le modele depuis le fichier joblib."""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Modele introuvable : {self.model_path}. "
                f"Veuillez d'abord entrainer le modele avec : python training/train_classifier.py"
            )

        try:
            self.pipeline = joblib.load(self.model_path)
        except Exception as e:
            raise RuntimeError(
                f"Erreur lors du chargement du modele : {e}"
            )

    def predict(self, text: str) -> dict:
        """
        Predire la categorie d'une reclamation.

        Args:
            text: Le texte de la reclamation.

        Returns:
            dict avec "category" (str) et "confidence" (float ou None).
        """
        if self.pipeline is None:
            raise RuntimeError("Le modele n'est pas charge.")

        # Nettoyer le texte
        cleaned = clean_text(text)

        if not cleaned:
            return {
                "category": "OTHER",
                "confidence": None,
            }

        # Predire la categorie
        category = self.pipeline.predict([cleaned])[0]

        # Calculer la confiance si le modele supporte predict_proba
        confidence = None
        if hasattr(self.pipeline, "predict_proba"):
            try:
                probas = self.pipeline.predict_proba([cleaned])[0]
                confidence = round(float(np.max(probas)), 4)
            except Exception:
                confidence = None

        return {
            "category": category,
            "confidence": confidence,
        }
