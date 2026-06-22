# Guide de déploiement — Render

Ce document décrit les étapes pour déployer le backend sur **Render** et le configurer correctement pour la production.

---

## 1. Configuration du Service Web Render

Lors de la création de votre **Web Service** sur Render, utilisez les paramètres suivants :

* **Runtime** : `Node`
* **Build Command** :
  ```bash
  npm install && npm run build && npx prisma generate
  ```
* **Start Command** :
  ```bash
  npm run start
  ```

---

## 2. Variables d'environnement requises

Ajoutez les variables d'environnement suivantes dans l'onglet **Environment** de votre service Render :

| Clé | Description | Exemple / Valeur |
|---|---|---|
| `PORT` | Port d'écoute du serveur HTTP (injecté automatiquement par Render) | *Laissé vide ou généré par Render* |
| `NODE_ENV` | Mode de l'environnement | `production` |
| `DATABASE_URL` | URL de connexion PostgreSQL (Supabase ou autre) | `postgresql://user:password@host:5432/dbname` |
| `JWT_SECRET` | Secret pour signer les tokens JWT | *Chaîne de caractères sécurisée aléatoire* |
| `FRONTEND_URL` | URL de l'application cliente Web (CORS REST) | `https://mon-app.onrender.com` |
| `SOCKET_CORS_ORIGIN` | URL autorisée pour la connexion Socket.IO | `https://mon-app.onrender.com` (ou `*` pour tout autoriser) |
| `AI_SERVICE_URL` | URL de l'instance de l'AI Service | `https://mon-ai-service.onrender.com` |
| `FIELD_ENCRYPTION_KEY` | Clé AES-256 de 32 caractères pour le chiffrement des données | *32 caractères de long* |
| `CLIENT_QR_SECRET` | Secret pour valider les jetons QR clients | *Clé secrète* |
| `WORKER_QR_SECRET` | Secret pour valider les jetons QR employés | *Clé secrète* |
| `CHECKIN_QR_SECRET` | Secret pour valider les QR de check-in | *Clé secrète* |
| `SUPABASE_URL` | URL de votre projet Supabase (Stockage optionnel) | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY`| Clé Service Role Supabase | `eyJhbGci...` |
| `SUPABASE_STORAGE_BUCKET` | Nom du bucket pour les images d'événements | `hotel-uploads` |

> [!WARNING]
> **Sécurité :** Ne mettez jamais de clés ou mots de passe réels dans le code source ou dans les fichiers `.env.example`. Utilisez l'interface sécurisée de Render pour injecter ces valeurs.

---

## 3. Configuration du Stockage Supabase (Optionnel)

Render utilisant un système de fichiers éphémère (les fichiers locaux sont supprimés à chaque déploiement ou redémarrage), l'intégration Supabase Storage est indispensable pour conserver les images des événements en production.

### Étapes de configuration :
1. Créez un projet sur [Supabase](https://supabase.com/).
2. Accédez à la section **Storage** et créez un nouveau Bucket nommé `hotel-uploads`.
3. Assurez-vous de définir le bucket en **Public** afin que les images soient accessibles par les navigateurs des clients via l'URL publique fournie.
4. Renseignez les variables d'environnement `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_STORAGE_BUCKET` sur Render.

*Remarque : Si ces variables Supabase ne sont pas configurées, l'application fonctionnera en mode dégradé en utilisant le stockage disque local (`/uploads/events`), ce qui convient pour le développement local.*

---

## 4. Base de données et Migrations

La commande de build comprend `npx prisma generate` pour s'assurer que le client Prisma est régénéré pour la plateforme Linux de Render.
Pour exécuter les migrations en production :
- Lors du premier déploiement ou lors de modifications de schéma, vous pouvez exécuter un job ou utiliser une commande de déploiement intégrée pour exécuter :
  ```bash
  npx prisma db push
  ```
  ou
  ```bash
  npx prisma migrate deploy
  ```

---

## 5. Déploiement Frontend sur Vercel

Pour déployer la **web-app** sur Vercel :

### Étapes de configuration :
1. Créez un projet sur **Vercel** et liez-le à votre dépôt Git.
2. Définissez le **Root Directory** sur `web-app`.
3. Vercel détectera automatiquement la configuration **Vite**.
4. Dans la section **Environment Variables**, ajoutez les variables suivantes :

| Clé | Description | Exemple / Valeur |
|---|---|---|
| `VITE_API_URL` | URL de base de la REST API du backend déployé | `https://mon-backend-render-url/api` |
| `VITE_SOCKET_URL` | URL de base de Socket.IO du backend déployé | `https://mon-backend-render-url` |

### Commandes par défaut sur Vercel :
* **Framework Preset** : `Vite`
* **Build Command** : `npm run build` (équivalent à `tsc -b && vite build`)
* **Output Directory** : `dist`

---

## 6. Déploiement de l'AI Service (FastAPI)

Le service IA peut être déployé soit sur **Hugging Face Spaces** (méthode recommandée car gratuite pour les modèles CPU/GPU et compatible Docker), soit sur **Render** en tant que Web Service Docker.

### Option A : Déploiement sur Hugging Face Spaces (Docker)
1. Créez un nouveau **Space** sur Hugging Face.
2. Sélectionnez l'option de SDK **Docker** (au lieu de Streamlit ou Gradio).
3. Choisissez le template **Blank** (vide).
4. Poussez le contenu du dossier `ai-service` dans le dépôt Git de votre Space.
   - *Note : Assurez-vous que le fichier `Dockerfile` se trouve bien à la racine du dépôt du Space.*
5. Le Space se construira automatiquement et démarrera sur le port `7860`.

### Option B : Déploiement sur Render
1. Créez un nouveau **Web Service** sur Render.
2. Connectez votre dépôt Git et définissez le **Root Directory** sur `ai-service`.
3. Render détectera automatiquement le `Dockerfile` et construira l'image Docker.
4. Render injectera la variable `PORT` automatiquement et le conteneur l'écoutera grâce à la configuration du point d'entrée (`--port ${PORT:-7860}`).

### Notes de performance et de fonctionnement :
> [!IMPORTANT]
> **Latence du premier appel (Lazy Loading) :** Le modèle de traduction NLLB-200 (~2.5 Go) est chargé à la première requête de traduction ou d'analyse. Par conséquent, **la première traduction peut être lente** (entre 30 secondes et 2 minutes, le temps de télécharger le modèle si non pré-mis en cache et de le charger en mémoire). Les requêtes suivantes seront extrêmement rapides grâce au cache LRU local et au fait que le modèle soit déjà en mémoire.


