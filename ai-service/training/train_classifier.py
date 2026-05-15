"""
Script d'entraînement du classificateur de réclamations hôtelières.

Entraîne deux modèles (LogisticRegression et LinearSVC) avec TF-IDF,
compare leurs performances, sélectionne le meilleur et le sauvegarde.

Usage :
    cd ai-service
    python training/train_classifier.py
"""

import os
import sys

# Ajouter le dossier parent (ai-service/) au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from sklearn.pipeline import Pipeline

from app.utils.text_cleaning import clean_text


# --- Configuration ---
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "dataset", "complaints_dataset.csv")
MODEL_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "complaint_classifier.joblib")
REPORT_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "reports", "classification_report.txt")
TEST_SIZE = 0.2
RANDOM_STATE = 42


def load_and_clean_data(path: str) -> pd.DataFrame:
    """Charger le dataset et nettoyer les textes."""
    print(f"[1/5] Chargement du dataset depuis : {path}")
    df = pd.read_csv(path)
    print(f"       -> {len(df)} exemples charges")
    print(f"       -> Categories : {df['category'].nunique()}")
    print(f"       -> Distribution :\n{df['category'].value_counts().to_string()}\n")

    print("[2/5] Nettoyage des textes...")
    df["text_clean"] = df["text"].apply(clean_text)

    # Supprimer les lignes vides après nettoyage
    df = df[df["text_clean"].str.len() > 0]
    print(f"       -> {len(df)} exemples apres nettoyage\n")

    return df


def train_and_evaluate(X_train, X_test, y_train, y_test):
    """
    Entraîner les deux modèles et retourner le meilleur.

    Returns:
        tuple: (meilleur_pipeline, nom_du_meilleur, résultats_dict)
    """
    models = {
        "LogisticRegression": Pipeline([
            ("tfidf", TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
            ("clf", LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)),
        ]),
        "LinearSVC": Pipeline([
            ("tfidf", TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
            ("clf", LinearSVC(max_iter=2000, random_state=RANDOM_STATE)),
        ]),
    }

    results = {}

    for name, pipeline in models.items():
        print(f"[3/5] Entrainement du modele : {name}...")
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average="weighted")
        report = classification_report(y_test, y_pred)
        matrix = confusion_matrix(y_test, y_pred)

        results[name] = {
            "pipeline": pipeline,
            "accuracy": acc,
            "f1_weighted": f1,
            "report": report,
            "confusion_matrix": matrix,
            "y_pred": y_pred,
        }

        print(f"       -> Accuracy : {acc:.4f}")
        print(f"       -> F1-score (weighted) : {f1:.4f}\n")

    return results


def select_best_model(results: dict) -> tuple:
    """Sélectionner le meilleur modèle basé sur le F1-score weighted."""
    best_name = max(results, key=lambda k: results[k]["f1_weighted"])
    best = results[best_name]
    print(f"[4/5] Meilleur modele : {best_name}")
    print(f"       -> Accuracy : {best['accuracy']:.4f}")
    print(f"       -> F1-score : {best['f1_weighted']:.4f}\n")
    return best_name, best


def save_model(pipeline, path: str):
    """Sauvegarder le pipeline complet (TF-IDF + modele)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(pipeline, path)
    print(f"       -> Modele sauvegarde : {path}")


def save_report(results: dict, best_name: str, labels, path: str):
    """Sauvegarder le rapport de classification complet."""
    os.makedirs(os.path.dirname(path), exist_ok=True)

    with open(path, "w", encoding="utf-8") as f:
        f.write("=" * 60 + "\n")
        f.write("  RAPPORT DE CLASSIFICATION DES RECLAMATIONS\n")
        f.write("=" * 60 + "\n\n")

        for name, res in results.items():
            marker = " * MEILLEUR" if name == best_name else ""
            f.write(f"--- {name}{marker} ---\n\n")
            f.write(f"Accuracy  : {res['accuracy']:.4f}\n")
            f.write(f"F1-score  : {res['f1_weighted']:.4f}\n\n")
            f.write("Classification Report :\n")
            f.write(res["report"])
            f.write("\n")
            f.write("Confusion Matrix :\n")
            f.write(str(res["confusion_matrix"]))
            f.write("\n\n")

        f.write("=" * 60 + "\n")
        f.write(f"Modele selectionne : {best_name}\n")
        f.write("=" * 60 + "\n")

    print(f"       -> Rapport sauvegarde : {path}")


def main():
    """Pipeline principal d'entraînement."""
    print("=" * 60)
    print("  ENTRAINEMENT DU CLASSIFICATEUR DE RECLAMATIONS")
    print("=" * 60 + "\n")

    # 1. Charger et nettoyer les donnees
    df = load_and_clean_data(DATASET_PATH)

    # 2. Separer les donnees
    X = df["text_clean"]
    y = df["category"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"       -> Train : {len(X_train)} | Test : {len(X_test)}\n")

    # 3. Entrainer et evaluer les modeles
    results = train_and_evaluate(X_train, X_test, y_train, y_test)

    # 4. Selectionner le meilleur modele
    best_name, best = select_best_model(results)

    # 5. Sauvegarder
    print("[5/5] Sauvegarde...")
    save_model(best["pipeline"], MODEL_OUTPUT_PATH)
    save_report(results, best_name, y.unique(), REPORT_OUTPUT_PATH)

    print("\n" + "=" * 60)
    print("  ENTRAINEMENT TERMINE AVEC SUCCES")
    print("=" * 60)


if __name__ == "__main__":
    main()
