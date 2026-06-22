# Utilisez une image Python officielle légère
FROM python:3.11-slim

# Définir les variables d'environnement de base
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Créer un utilisateur non-root "user" avec UID 1000 (requis par Hugging Face Spaces)
RUN useradd -m -u 1000 user

# Définir le dossier de travail
WORKDIR /home/user/app

# Installer les dépendances système requises pour la compilation éventuelle de paquets Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copier le fichier requirements.txt et l'installer en tant qu'utilisateur "user"
COPY --chown=user:user requirements.txt /home/user/app/
RUN pip install --no-cache-dir --user -r requirements.txt

# Copier le reste du code source du service IA
COPY --chown=user:user . /home/user/app/

# Ajouter le chemin des exécutables locaux de l'utilisateur au PATH
ENV PATH=/home/user/.local/bin:$PATH

# Exposer le port par défaut (7860)
EXPOSE 7860

# Lancer FastAPI avec Uvicorn. Écoute sur 0.0.0.0 et utilise le port de $PORT s'il est fourni (Render), sinon 7860 (Hugging Face)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
