# AI Service — Hotel Smart Concierge

Service IA basé sur **FastAPI** pour la traduction et la classification des réclamations hôtelières.

## Prérequis

- Python 3.10+

## Installation

```bash
# Se placer dans le dossier ai-service
cd ai-service

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Windows :
venv\Scripts\activate
# Linux / macOS :
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

## Configuration

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Modifier les variables si nécessaire
```

## Lancement

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Vérification

Ouvrir dans le navigateur :
- **Health check** : http://localhost:8000/health
- **Documentation API** : http://localhost:8000/docs

## Structure

```
ai-service/
├── app/
│   ├── main.py                # Point d'entrée FastAPI
│   ├── schemas.py             # Schémas Pydantic
│   ├── services/
│   │   ├── classifier_service.py   # Classification des réclamations
│   │   ├── language_service.py     # Détection de langue
│   │   └── translation_service.py  # Traduction
│   └── utils/
│       └── text_cleaning.py        # Nettoyage de texte
├── training/
│   └── train_classifier.py   # Script d'entraînement
├── models/                    # Modèles ML sauvegardés
├── reports/                   # Rapports d'évaluation
├── requirements.txt
├── .env.example
└── README.md
```
