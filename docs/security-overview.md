# Sécurité du Système

## 1. Introduction

Ce document décrit les mécanismes de sécurité mis en place dans la plateforme **Hotel Smart Concierge** pour protéger les données, contrôler les accès et garantir l'intégrité des opérations.

## 2. Authentification

### 2.1 Authentification du personnel (JWT)

- **Mécanisme** : JSON Web Tokens (JWT).
- **Flux** :
  1. L'utilisateur envoie ses identifiants (email + mot de passe).
  2. Le backend vérifie les identifiants et retourne un token JWT signé.
  3. Le token est inclus dans le header `Authorization: Bearer <token>` pour chaque requête.
- **Contenu du token** : identifiant utilisateur, rôle, date d'expiration.
- **Expiration** : durée limitée, nécessitant un renouvellement.
- **Stockage** : côté client (localStorage ou cookie sécurisé).

### 2.2 Authentification du client (QR Token)

- **Mécanisme** : Token signé embarqué dans un QR code.
- **Flux** :
  1. Le réceptionniste effectue le check-in.
  2. Le système génère un token signé contenant les informations de la réservation.
  3. Le token est encodé dans un QR code remis au client.
  4. Le client scanne le QR code pour accéder à la PWA.
- **Contenu du token** : identifiant de réservation, numéro de chambre, dates de validité.
- **Sécurité** : le token est signé avec une clé secrète côté serveur, empêchant la falsification.

## 3. Autorisation (RBAC)

### 3.1 Contrôle d'accès basé sur les rôles

Le système implémente un modèle **RBAC** (Role-Based Access Control) avec cinq rôles :

| Rôle | Accès |
|------|-------|
| `ADMIN` | Accès complet à toutes les ressources |
| `RECEPTIONIST` | Check-in, QR codes, réclamations réception |
| `MAINTENANCE_MANAGER` | Réclamations maintenance, assignation |
| `HOUSEKEEPING_MANAGER` | Réclamations ménage, assignation |
| `EMPLOYEE` | Tâches assignées, scan QR intervention |

### 3.2 Middleware d'autorisation

- Chaque route de l'API est protégée par un middleware vérifiant :
  1. La présence et la validité du token JWT.
  2. Le rôle de l'utilisateur par rapport aux rôles autorisés pour la route.
- Les routes sont décorées avec les rôles requis.

## 4. Validation des accès

### 4.1 Validation du QR code client

- À chaque accès via QR code, le backend vérifie :
  - La signature du token (non falsifié).
  - La date de validité (séjour en cours).
  - L'existence de la réservation en base de données.
  - Le statut actif de la réservation.

### 4.2 Validation du QR code intervention

- Lors du scan par l'employé, le backend vérifie :
  - L'identité de l'employé (token JWT valide).
  - L'existence d'une tâche assignée à cet employé pour cette chambre.
  - Le statut actuel de la tâche (doit être `ASSIGNED` ou `IN_PROGRESS`).

## 5. Protection des données

### 5.1 Mots de passe

- Les mots de passe sont hachés avec **bcrypt** avant stockage.
- Les mots de passe ne sont jamais stockés en clair.
- Les mots de passe ne sont jamais retournés dans les réponses API.

### 5.2 Variables d'environnement

- Les secrets (clés JWT, URL de base de données, clés API) sont stockés dans des fichiers `.env`.
- Les fichiers `.env` sont exclus du contrôle de version via `.gitignore`.
- Des fichiers `.env.example` sont fournis comme modèles.

### 5.3 Validation des entrées

- Toutes les entrées utilisateur sont validées côté serveur.
- Protection contre les injections SQL (via Prisma ORM).
- Validation des types et formats des données.

## 6. Communication

### 6.1 API externe

- Les communications entre les clients (web-app, worker-app) et le backend se font via HTTPS.

### 6.2 API interne

- La communication entre le backend et le service IA se fait sur le réseau interne.
- Le service IA n'est pas exposé directement à l'extérieur.

## 7. Module IA — Sécurité

- Le service IA est accessible uniquement par le backend (pas d'accès direct client).
- Les messages clients sont transmis de manière sécurisée pour traduction et classification.
- Le service IA ne stocke aucune donnée de manière persistante.
- **Fonctionnalités IA** : détection de langue, traduction et classification uniquement.
