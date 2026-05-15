# Architecture Générale du Système

## 1. Vue d'ensemble

La plateforme **Hotel Smart Concierge** repose sur une architecture orientée services (SOA), composée de quatre modules indépendants communiquant via des API REST. Cette architecture permet une séparation claire des responsabilités, une scalabilité horizontale et une maintenance facilitée.

## 2. Schéma d'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                 │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │  PWA Client   │   │ Dashboard Web│   │ App Flutter  │       │
│   │ (web-app)     │   │ (web-app)    │   │ (worker-app) │       │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘       │
└──────────┼──────────────────┼──────────────────┼────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API PRINCIPALE (backend)                    │
│         Express.js + TypeScript + Prisma ORM                    │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│   │   Auth   │  │ Chambres │  │Réclam.   │  │  Tâches  │      │
│   │  (JWT)   │  │ & QR     │  │          │  │          │      │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└──────────┬──────────────────────────┬───────────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐   ┌───────────────────────┐
│   PostgreSQL        │   │   Service IA           │
│   Base de données   │   │   (ai-service)         │
│                     │   │   FastAPI + Python      │
│                     │   │   Traduction +          │
│                     │   │   Classification        │
└─────────────────────┘   └───────────────────────┘
```

## 3. Description des modules

### 3.1 web-app (PWA + Dashboards)

- **Technologie** : React.js (Progressive Web App)
- **Rôle** : Interface utilisateur pour les clients et le personnel hôtelier
- **Composantes** :
  - **PWA Client** : accès via QR code, envoi de réclamations, suivi de résolution
  - **Dashboard Réception** : gestion du check-in, génération de QR codes
  - **Dashboard Chef Maintenance** : assignation des tâches de maintenance
  - **Dashboard Gouvernante** : assignation des tâches de ménage
  - **Dashboard Administrateur** : gestion globale du système

### 3.2 backend (API principale)

- **Technologie** : Express.js, TypeScript, Prisma ORM, PostgreSQL
- **Rôle** : Logique métier centrale, gestion des données et orchestration
- **Responsabilités** :
  - Authentification et autorisation (JWT + RBAC)
  - Gestion des chambres et des réservations
  - Traitement des réclamations
  - Génération et validation des QR codes
  - Communication avec le service IA
  - Gestion des tâches et des interventions

### 3.3 ai-service (Service IA)

- **Technologie** : FastAPI, Python
- **Rôle** : Traitement intelligent des messages clients
- **Fonctionnalités** :
  - Détection automatique de la langue du message
  - Traduction du message vers le français (langue de travail)
  - Classification de la réclamation dans une des catégories prédéfinies

### 3.4 worker-app (Application Flutter)

- **Technologie** : Flutter (Dart)
- **Rôle** : Application mobile pour les employés d'intervention
- **Fonctionnalités** :
  - Réception des tâches assignées
  - Scan QR pour démarrer une intervention (entrée chambre)
  - Scan QR pour terminer une intervention (sortie chambre)
  - Historique des interventions effectuées

## 4. Communication inter-services

| Source | Destination | Protocole | Description |
|--------|-------------|-----------|-------------|
| web-app | backend | REST API (HTTPS) | Toutes les opérations client et dashboard |
| worker-app | backend | REST API (HTTPS) | Gestion des tâches et interventions |
| backend | ai-service | REST API (HTTP interne) | Envoi de messages pour traduction et classification |
| backend | PostgreSQL | TCP (Prisma) | Persistance des données |

## 5. Flux de données principal

1. Le client scanne un QR code → accède à la PWA
2. Le client envoie une réclamation via la PWA
3. Le backend reçoit la réclamation et l'envoie au service IA
4. Le service IA détecte la langue, traduit et classifie le message
5. Le backend enregistre la réclamation classifiée
6. Le responsable concerné est notifié et assigne un employé
7. L'employé reçoit la tâche sur l'application Flutter
8. L'employé scanne le QR pour démarrer/terminer l'intervention
9. Le client confirme la résolution via la PWA
