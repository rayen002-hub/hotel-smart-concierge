# Périmètre Fonctionnel

## 1. Introduction

Ce document décrit le périmètre fonctionnel de la plateforme **Hotel Smart Concierge**. Il détaille les fonctionnalités couvertes par chaque module du système, le parcours utilisateur pour chaque acteur, ainsi que les limites du projet.

## 2. Fonctionnalités par module

### 2.1 Check-in numérique

- Le réceptionniste enregistre l'arrivée du client dans le système.
- Un QR code sécurisé est généré, contenant un token signé lié à la chambre et à la réservation.
- Le client scanne ce QR code pour accéder à la PWA de sa chambre.

### 2.2 PWA Client (accès chambre)

- Accès uniquement via QR code sécurisé (pas de login/mot de passe).
- Le client peut :
  - Consulter les informations de sa chambre.
  - Envoyer une réclamation (texte libre, dans sa langue).
  - Suivre le statut de ses réclamations.
  - Confirmer la résolution d'une réclamation.

### 2.3 Gestion des réclamations

- Le client rédige un message dans sa langue.
- Le système détecte automatiquement la langue.
- Le message est traduit vers le français.
- La réclamation est classifiée automatiquement dans une catégorie.
- La réclamation est orientée vers le responsable du service concerné.
- Le responsable assigne la tâche à un employé.
- L'employé effectue l'intervention.
- Le client confirme la résolution.

### 2.4 Module IA

- **Détection de langue** : identification automatique de la langue du message client.
- **Traduction** : traduction du message vers le français.
- **Classification** : attribution d'une catégorie parmi les suivantes :
  - `MAINTENANCE` : problèmes techniques (plomberie, électricité, climatisation, etc.)
  - `HOUSEKEEPING` : propreté, linge, articles manquants
  - `RECEPTION` : accueil, facturation, réservation
  - `RESTAURANT` : service de restauration
  - `COMPLAINT` : plaintes générales sur le service
  - `OTHER` : demandes ne relevant d'aucune catégorie spécifique

> **Note** : La prédiction de priorité n'est pas implémentée dans ce projet.

### 2.5 Suivi d'intervention

- Le responsable assigne une tâche à un employé via le dashboard.
- L'employé reçoit la notification sur l'application Flutter.
- L'employé scanne un QR code à l'entrée de la chambre pour démarrer l'intervention.
- L'employé scanne le QR code à la sortie pour signaler la fin de l'intervention.
- Le système enregistre les horodatages d'entrée et de sortie.

### 2.6 Dashboards web

#### Dashboard Réception
- Check-in des clients.
- Génération de QR codes.
- Vue d'ensemble des réclamations.

#### Dashboard Chef de Maintenance
- Liste des réclamations de type `MAINTENANCE`.
- Assignation des tâches aux employés de maintenance.
- Suivi des interventions en cours.

#### Dashboard Gouvernante Générale
- Liste des réclamations de type `HOUSEKEEPING`.
- Assignation des tâches aux employés de ménage.
- Suivi des interventions en cours.

#### Dashboard Administrateur
- Gestion des utilisateurs (création, modification, suppression).
- Gestion des chambres.
- Vue globale sur toutes les réclamations et interventions.
- Statistiques générales.

## 3. Parcours Client

```
Arrivée à l'hôtel
    │
    ▼
Check-in par le réceptionniste
    │
    ▼
Réception du QR code de chambre
    │
    ▼
Scan du QR code → Accès à la PWA
    │
    ▼
Envoi d'une réclamation (texte libre)
    │
    ▼
Suivi du statut de la réclamation
    │
    ▼
Confirmation de résolution
```

## 4. Parcours Employé

```
Connexion à l'application Flutter
    │
    ▼
Réception d'une tâche assignée
    │
    ▼
Déplacement vers la chambre
    │
    ▼
Scan QR code (entrée) → Début d'intervention
    │
    ▼
Réalisation de l'intervention
    │
    ▼
Scan QR code (sortie) → Fin d'intervention
```

## 5. Hors périmètre

Les fonctionnalités suivantes ne sont **pas** incluses dans ce projet :
- Prédiction de priorité des réclamations.
- Système de paiement en ligne.
- Réservation de chambres en ligne.
- Chat en temps réel.
- Notifications push.
- Gestion des stocks ou inventaire.
- Intégration avec des systèmes PMS tiers.
