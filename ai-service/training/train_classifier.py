"""
Script d'entraînement du classificateur de réclamations hôtelières (v2).

Compare plusieurs pipelines (TF-IDF variantes + classifieurs multiples),
sélectionne le meilleur sur le macro F1-score, et génère un rapport complet.

Usage :
    cd ai-service
    python training/train_classifier.py
"""

import os
import sys

# Ajouter le dossier parent (ai-service/) au path pour les imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import ComplementNB
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    f1_score,
)
from sklearn.pipeline import Pipeline, FeatureUnion

from app.utils.text_cleaning import clean_text


# --- Configuration ---
DATASET_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "dataset", "complaints_dataset.csv"
)
MODEL_OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "models", "complaint_classifier.joblib"
)
REPORT_OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "reports", "classification_report.txt"
)
MISCLASSIFIED_OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "reports", "misclassified_examples.csv"
)
TEST_SIZE = 0.2
RANDOM_STATE = 42

# Manual test sentences
MANUAL_TESTS = [
    "Need more towels",
    "The AC is not working",
    "I want late checkout",
    "Can I book dinner tonight?",
    "The room is very dirty",
    "There is water leaking in the bathroom",
    "I need help please",
]

# Categories in consistent display order
CATEGORIES = [
    "COMPLAINT",
    "HOUSEKEEPING",
    "MAINTENANCE",
    "OTHER",
    "RECEPTION",
    "RESTAURANT",
]


def load_and_clean_data(path: str) -> pd.DataFrame:
    """Charger le dataset, supprimer les doublons, et nettoyer les textes."""
    print(f"[1/6] Chargement du dataset depuis : {path}")
    df = pd.read_csv(path)
    print(f"       -> {len(df)} exemples charges")

    # Supprimer les doublons exacts
    before = len(df)
    df = df.drop_duplicates(subset=["text"])
    removed = before - len(df)
    if removed > 0:
        print(f"       -> {removed} doublons supprimes")

    print(f"       -> Categories : {df['category'].nunique()}")
    print(f"       -> Distribution :\n{df['category'].value_counts().to_string()}\n")

    print("[2/6] Nettoyage des textes...")
    df["text_clean"] = df["text"].apply(clean_text)

    # Supprimer les lignes vides après nettoyage
    df = df[df["text_clean"].str.len() > 0]
    print(f"       -> {len(df)} exemples apres nettoyage\n")

    return df


def build_pipelines() -> dict:
    """Construire tous les pipelines candidats."""

    pipelines = {}

    # --- 1. TF-IDF word (1,2) + LogisticRegression ---
    pipelines["LR_word_12"] = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=8000,
            ngram_range=(1, 2),
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(
            max_iter=2000,
            C=5.0,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            solver="lbfgs",
        )),
    ])

    # --- 2. TF-IDF word (1,3) + LogisticRegression ---
    pipelines["LR_word_13"] = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=10000,
            ngram_range=(1, 3),
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(
            max_iter=2000,
            C=5.0,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            solver="lbfgs",
        )),
    ])

    # --- 3. TF-IDF char_wb (3,5) + LogisticRegression ---
    pipelines["LR_char_35"] = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=10000,
            analyzer="char_wb",
            ngram_range=(3, 5),
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(
            max_iter=2000,
            C=5.0,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            solver="lbfgs",
        )),
    ])

    # --- 4. Combined word + char TF-IDF + LogisticRegression ---
    pipelines["LR_combined"] = Pipeline([
        ("features", FeatureUnion([
            ("word_tfidf", TfidfVectorizer(
                max_features=8000,
                ngram_range=(1, 2),
                sublinear_tf=True,
            )),
            ("char_tfidf", TfidfVectorizer(
                max_features=8000,
                analyzer="char_wb",
                ngram_range=(3, 5),
                sublinear_tf=True,
            )),
        ])),
        ("clf", LogisticRegression(
            max_iter=2000,
            C=5.0,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            solver="lbfgs",
        )),
    ])

    # --- 4b. Combined word(1,3) + char(3,6) + LR with C=10 ---
    pipelines["LR_combined_v2"] = Pipeline([
        ("features", FeatureUnion([
            ("word_tfidf", TfidfVectorizer(
                max_features=10000,
                ngram_range=(1, 3),
                sublinear_tf=True,
            )),
            ("char_tfidf", TfidfVectorizer(
                max_features=10000,
                analyzer="char_wb",
                ngram_range=(3, 6),
                sublinear_tf=True,
            )),
        ])),
        ("clf", LogisticRegression(
            max_iter=2000,
            C=10.0,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            solver="lbfgs",
        )),
    ])

    # --- 4c. Combined word + char + LR with C=1 ---
    pipelines["LR_combined_C1"] = Pipeline([
        ("features", FeatureUnion([
            ("word_tfidf", TfidfVectorizer(
                max_features=8000,
                ngram_range=(1, 2),
                sublinear_tf=True,
            )),
            ("char_tfidf", TfidfVectorizer(
                max_features=8000,
                analyzer="char_wb",
                ngram_range=(3, 5),
                sublinear_tf=True,
            )),
        ])),
        ("clf", LogisticRegression(
            max_iter=2000,
            C=1.0,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            solver="lbfgs",
        )),
    ])

    # --- 5. TF-IDF word (1,2) + LinearSVC ---
    pipelines["SVC_word_12"] = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=8000,
            ngram_range=(1, 2),
            sublinear_tf=True,
        )),
        ("clf", LinearSVC(
            max_iter=2000,
            C=1.0,
            class_weight="balanced",
            random_state=RANDOM_STATE,
        )),
    ])

    # --- 6. Combined word + char TF-IDF + LinearSVC ---
    pipelines["SVC_combined"] = Pipeline([
        ("features", FeatureUnion([
            ("word_tfidf", TfidfVectorizer(
                max_features=8000,
                ngram_range=(1, 2),
                sublinear_tf=True,
            )),
            ("char_tfidf", TfidfVectorizer(
                max_features=8000,
                analyzer="char_wb",
                ngram_range=(3, 5),
                sublinear_tf=True,
            )),
        ])),
        ("clf", LinearSVC(
            max_iter=2000,
            C=1.0,
            class_weight="balanced",
            random_state=RANDOM_STATE,
        )),
    ])

    # --- 7. TF-IDF word (1,2) + ComplementNB ---
    pipelines["CNB_word_12"] = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=8000,
            ngram_range=(1, 2),
            sublinear_tf=True,
        )),
        ("clf", ComplementNB(alpha=0.5)),
    ])

    # --- 8. TF-IDF word (1,2) + SGDClassifier ---
    pipelines["SGD_word_12"] = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=8000,
            ngram_range=(1, 2),
            sublinear_tf=True,
        )),
        ("clf", SGDClassifier(
            loss="modified_huber",
            max_iter=2000,
            class_weight="balanced",
            random_state=RANDOM_STATE,
        )),
    ])

    # --- 9. Combined word + char TF-IDF + SGDClassifier ---
    pipelines["SGD_combined"] = Pipeline([
        ("features", FeatureUnion([
            ("word_tfidf", TfidfVectorizer(
                max_features=8000,
                ngram_range=(1, 2),
                sublinear_tf=True,
            )),
            ("char_tfidf", TfidfVectorizer(
                max_features=8000,
                analyzer="char_wb",
                ngram_range=(3, 5),
                sublinear_tf=True,
            )),
        ])),
        ("clf", SGDClassifier(
            loss="modified_huber",
            max_iter=2000,
            class_weight="balanced",
            random_state=RANDOM_STATE,
        )),
    ])

    return pipelines


def train_and_evaluate(pipelines: dict, X_train, X_test, y_train, y_test):
    """Entraîner tous les pipelines et collecter les résultats."""
    results = {}

    total = len(pipelines)
    for i, (name, pipeline) in enumerate(pipelines.items(), 1):
        print(f"[3/6] [{i}/{total}] Entrainement : {name}...")

        # Train
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        # Metrics
        acc = accuracy_score(y_test, y_pred)
        f1_macro = f1_score(y_test, y_pred, average="macro")
        f1_weighted = f1_score(y_test, y_pred, average="weighted")
        report = classification_report(y_test, y_pred, labels=CATEGORIES, zero_division=0)
        matrix = confusion_matrix(y_test, y_pred, labels=CATEGORIES)

        # Cross-validation (macro F1 on full train set)
        cv_scores = cross_val_score(
            pipeline, X_train, y_train,
            cv=5, scoring="f1_macro",
        )

        results[name] = {
            "pipeline": pipeline,
            "accuracy": acc,
            "f1_macro": f1_macro,
            "f1_weighted": f1_weighted,
            "cv_f1_macro_mean": cv_scores.mean(),
            "cv_f1_macro_std": cv_scores.std(),
            "report": report,
            "confusion_matrix": matrix,
            "y_pred": y_pred,
        }

        print(f"       -> Accuracy    : {acc:.4f}")
        print(f"       -> F1 macro    : {f1_macro:.4f}")
        print(f"       -> F1 weighted : {f1_weighted:.4f}")
        print(f"       -> CV F1 macro : {cv_scores.mean():.4f} (±{cv_scores.std():.4f})\n")

    return results


def select_best_model(results: dict) -> tuple:
    """Sélectionner le meilleur modèle basé sur le macro F1-score."""
    best_name = max(results, key=lambda k: results[k]["f1_macro"])
    best = results[best_name]
    print(f"[4/6] Meilleur modele : {best_name}")
    print(f"       -> Accuracy    : {best['accuracy']:.4f}")
    print(f"       -> F1 macro    : {best['f1_macro']:.4f}")
    print(f"       -> F1 weighted : {best['f1_weighted']:.4f}")
    print(f"       -> CV F1 macro : {best['cv_f1_macro_mean']:.4f} (±{best['cv_f1_macro_std']:.4f})\n")
    return best_name, best


def save_model(pipeline, path: str):
    """Sauvegarder le pipeline complet (TF-IDF + modele)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(pipeline, path)
    print(f"       -> Modele sauvegarde : {path}")


def save_misclassified(X_test, y_test, y_pred, path: str):
    """Sauvegarder les exemples mal classifiés dans un CSV."""
    os.makedirs(os.path.dirname(path), exist_ok=True)

    misclassified = pd.DataFrame({
        "text": X_test.values,
        "true_category": y_test.values,
        "predicted_category": y_pred,
    })
    misclassified = misclassified[misclassified["true_category"] != misclassified["predicted_category"]]
    misclassified.to_csv(path, index=False, encoding="utf-8")
    print(f"       -> Exemples mal classifies : {len(misclassified)} -> {path}")


def save_report(results: dict, best_name: str, path: str):
    """Sauvegarder le rapport de classification complet."""
    os.makedirs(os.path.dirname(path), exist_ok=True)

    with open(path, "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write("  RAPPORT DE CLASSIFICATION DES RECLAMATIONS (v2)\n")
        f.write("=" * 70 + "\n\n")

        # Summary table
        f.write(f"{'Pipeline':<20} {'Accuracy':>10} {'F1 macro':>10} {'F1 weighted':>12} {'CV F1 macro':>14}\n")
        f.write("-" * 70 + "\n")
        for name, res in sorted(results.items(), key=lambda x: -x[1]["f1_macro"]):
            marker = " *" if name == best_name else ""
            f.write(
                f"{name:<20} {res['accuracy']:>10.4f} {res['f1_macro']:>10.4f} "
                f"{res['f1_weighted']:>12.4f} "
                f"{res['cv_f1_macro_mean']:>8.4f}±{res['cv_f1_macro_std']:.4f}"
                f"{marker}\n"
            )
        f.write("\n")

        # Detailed report for each model
        for name, res in sorted(results.items(), key=lambda x: -x[1]["f1_macro"]):
            marker = " *** MEILLEUR ***" if name == best_name else ""
            f.write(f"\n{'='*70}\n")
            f.write(f"  {name}{marker}\n")
            f.write(f"{'='*70}\n\n")
            f.write(f"Accuracy     : {res['accuracy']:.4f}\n")
            f.write(f"F1 macro     : {res['f1_macro']:.4f}\n")
            f.write(f"F1 weighted  : {res['f1_weighted']:.4f}\n")
            f.write(f"CV F1 macro  : {res['cv_f1_macro_mean']:.4f} (±{res['cv_f1_macro_std']:.4f})\n\n")
            f.write("Classification Report :\n")
            f.write(res["report"])
            f.write("\n")
            f.write("Confusion Matrix :\n")
            f.write(f"Labels: {CATEGORIES}\n")
            f.write(str(res["confusion_matrix"]))
            f.write("\n\n")

        f.write("=" * 70 + "\n")
        f.write(f"Modele selectionne : {best_name}\n")
        f.write("=" * 70 + "\n")

    print(f"       -> Rapport sauvegarde : {path}")


def run_manual_tests(pipeline, test_sentences: list):
    """Tester le modele sur des exemples manuels."""
    print("\n[6/6] Tests manuels :\n")
    for sentence in test_sentences:
        cleaned = clean_text(sentence)
        prediction = pipeline.predict([cleaned])[0]
        print(f"       \"{sentence}\"")
        print(f"       -> {prediction}\n")


def main():
    """Pipeline principal d'entraînement."""
    print("=" * 70)
    print("  ENTRAINEMENT DU CLASSIFICATEUR DE RECLAMATIONS (v2)")
    print("=" * 70 + "\n")

    # 1. Charger et nettoyer les donnees
    df = load_and_clean_data(DATASET_PATH)

    # 2. Separer les donnees
    X = df["text_clean"]
    y = df["category"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"       -> Train : {len(X_train)} | Test : {len(X_test)}\n")

    # 3. Construire et entrainer tous les pipelines
    pipelines = build_pipelines()
    results = train_and_evaluate(pipelines, X_train, X_test, y_train, y_test)

    # 4. Selectionner le meilleur modele (macro F1)
    best_name, best = select_best_model(results)

    # 5. Sauvegarder
    print("[5/6] Sauvegarde...")
    save_model(best["pipeline"], MODEL_OUTPUT_PATH)
    save_report(results, best_name, REPORT_OUTPUT_PATH)
    save_misclassified(X_test, y_test, best["y_pred"], MISCLASSIFIED_OUTPUT_PATH)

    # 6. Tests manuels
    run_manual_tests(best["pipeline"], MANUAL_TESTS)

    print("=" * 70)
    print("  ENTRAINEMENT TERMINE AVEC SUCCES")
    print("=" * 70)


if __name__ == "__main__":
    main()
