# Variables d'environnement — Production

> [!CAUTION]
> **Ne jamais committer les vrais secrets dans le dépôt Git.**
> Utilisez uniquement les fichiers `.env.example` comme référence.
> En production, injectez les variables via votre plateforme (Render, Railway, Vercel, Docker secrets, etc.).

---

## Backend (`backend/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL (Supabase ou autre) | `postgresql://user:password@host:5432/dbname` |
| `JWT_SECRET` | Clé secrète pour signer les tokens JWT staff | Chaîne aléatoire ≥ 32 caractères |
| `CLIENT_QR_SECRET` | Clé secrète pour les tokens QR client (accès chambre PWA) | Chaîne aléatoire ≥ 32 caractères |
| `WORKER_QR_SECRET` | Clé secrète pour les tokens QR employé (scan entrée/sortie) | Chaîne aléatoire ≥ 32 caractères |
| `CHECKIN_QR_SECRET` | Clé secrète pour les tokens QR de check-in | Chaîne aléatoire ≥ 32 caractères |
| `FIELD_ENCRYPTION_KEY` | Clé AES-256 pour chiffrer les champs sensibles (passeport) | Exactement 32 caractères |
| `AI_SERVICE_URL` | URL du micro-service IA (FastAPI) | `https://ai-service.example.com` |
| `FRONTEND_URL` | URL du frontend (CORS origin) | `https://app.example.com` |
| `SOCKET_CORS_ORIGIN` | Origin autorisée pour les connexions WebSocket | `https://app.example.com` |
| `CURRENCY_API_URL` | URL de l'API externe de taux de change | `https://api.exchangerate.host/latest` |
| `SUPABASE_URL` | URL du projet Supabase | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase (accès admin) | `eyJhbGciOi...` |
| `SUPABASE_STORAGE_BUCKET` | Nom du bucket Supabase Storage pour les uploads | `hotel-uploads` |

---

## AI Service (`ai-service/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `MODEL_NAME` | Nom du modèle de traduction HuggingFace | `facebook/nllb-200-distilled-600M` |
| `CLASSIFIER_MODEL_PATH` | Chemin vers le fichier `.joblib` du classificateur | `models/complaint_classifier.joblib` |
| `DEFAULT_STAFF_LANGUAGE` | Langue par défaut du personnel hôtelier | `fr` |

---

## Web App (`web-app/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL de base de l'API backend | `https://api.example.com/api` |
| `VITE_SOCKET_URL` | URL du serveur WebSocket | `https://api.example.com` |

---

## Worker App (`worker-app/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `API_BASE_URL` | URL de base de l'API backend | `https://api.example.com/api` |
| `SOCKET_URL` | URL du serveur WebSocket | `https://api.example.com` |

---

## Bonnes pratiques

- **Générer des secrets forts** : utilisez `openssl rand -hex 32` ou un gestionnaire de secrets.
- **Ne jamais réutiliser** la même clé pour `JWT_SECRET`, `CLIENT_QR_SECRET`, `WORKER_QR_SECRET` et `CHECKIN_QR_SECRET`.
- **Rotation des clés** : changez les secrets régulièrement. Après rotation, les tokens existants seront invalidés.
- **`.env.example`** : chaque service contient un fichier `.env.example` avec les noms de variables (sans valeurs réelles). Copiez-le en `.env` et remplissez vos valeurs.
- **`.gitignore`** : vérifiez que `.env` est bien listé dans `.gitignore` pour chaque service.
