# Acteurs et Permissions

## 1. Introduction

Ce document décrit les différents acteurs du système **Hotel Smart Concierge**, leurs rôles, leurs interfaces d'accès et leurs permissions respectives.

## 2. Liste des acteurs

### 2.1 Client (Guest)

- **Interface** : PWA (Progressive Web App)
- **Mode d'accès** : Scan d'un QR code sécurisé (pas de compte utilisateur)
- **Description** : Le client est un invité de l'hôtel ayant effectué son check-in. Il accède aux services de sa chambre via un QR code unique et temporaire.

**Permissions :**
| Action | Autorisé |
|--------|----------|
| Accéder à la PWA via QR code | ✅ |
| Consulter les informations de sa chambre | ✅ |
| Envoyer une réclamation | ✅ |
| Suivre le statut de ses réclamations | ✅ |
| Confirmer la résolution d'une réclamation | ✅ |
| Accéder aux réclamations d'autres chambres | ❌ |
| Accéder aux dashboards | ❌ |

### 2.2 Réceptionniste (RECEPTIONIST)

- **Interface** : Dashboard web
- **Mode d'accès** : Login avec identifiant et mot de passe
- **Description** : Le réceptionniste gère l'accueil des clients, effectue les check-in et génère les QR codes d'accès aux chambres.

**Permissions :**
| Action | Autorisé |
|--------|----------|
| Effectuer un check-in | ✅ |
| Générer un QR code client | ✅ |
| Consulter les réclamations (vue globale) | ✅ |
| Gérer les réclamations de type RECEPTION | ✅ |
| Assigner des tâches | ❌ |
| Gérer les utilisateurs | ❌ |
| Accéder aux statistiques globales | ❌ |

### 2.3 Chef de Maintenance (MAINTENANCE_MANAGER)

- **Interface** : Dashboard web
- **Mode d'accès** : Login avec identifiant et mot de passe
- **Description** : Le chef de maintenance supervise les réclamations techniques et assigne les tâches aux employés de maintenance.

**Permissions :**
| Action | Autorisé |
|--------|----------|
| Consulter les réclamations de type MAINTENANCE | ✅ |
| Assigner des tâches aux employés de maintenance | ✅ |
| Suivre les interventions en cours | ✅ |
| Marquer une réclamation comme nécessitant une revue | ✅ |
| Gérer les utilisateurs | ❌ |
| Voir les réclamations d'autres services | ❌ |

### 2.4 Gouvernante Générale (HOUSEKEEPING_MANAGER)

- **Interface** : Dashboard web
- **Mode d'accès** : Login avec identifiant et mot de passe
- **Description** : La gouvernante générale supervise les réclamations liées à la propreté et au ménage, et assigne les tâches aux femmes/valets de chambre.

**Permissions :**
| Action | Autorisé |
|--------|----------|
| Consulter les réclamations de type HOUSEKEEPING | ✅ |
| Assigner des tâches aux employés de ménage | ✅ |
| Suivre les interventions en cours | ✅ |
| Marquer une réclamation comme nécessitant une revue | ✅ |
| Gérer les utilisateurs | ❌ |
| Voir les réclamations d'autres services | ❌ |

### 2.5 Employé (EMPLOYEE)

- **Interface** : Application Flutter (mobile)
- **Mode d'accès** : Login avec identifiant et mot de passe
- **Description** : L'employé reçoit des tâches d'intervention et les exécute sur le terrain. Il utilise le scan QR pour tracer ses entrées et sorties de chambre.

**Permissions :**
| Action | Autorisé |
|--------|----------|
| Consulter ses tâches assignées | ✅ |
| Scanner un QR code pour démarrer une intervention | ✅ |
| Scanner un QR code pour terminer une intervention | ✅ |
| Consulter son historique d'interventions | ✅ |
| Assigner des tâches | ❌ |
| Accéder au dashboard web | ❌ |
| Modifier une réclamation | ❌ |

### 2.6 Administrateur (ADMIN)

- **Interface** : Dashboard web
- **Mode d'accès** : Login avec identifiant et mot de passe
- **Description** : L'administrateur a un accès complet au système. Il gère les utilisateurs, les chambres et dispose d'une vue globale sur l'ensemble du système.

**Permissions :**
| Action | Autorisé |
|--------|----------|
| Gérer les utilisateurs (CRUD) | ✅ |
| Gérer les chambres | ✅ |
| Consulter toutes les réclamations | ✅ |
| Consulter toutes les interventions | ✅ |
| Accéder aux statistiques globales | ✅ |
| Assigner des tâches | ✅ |
| Configurer le système | ✅ |

## 3. Matrice de permissions résumée

| Fonctionnalité | Client | RECEPTIONIST | MAINTENANCE_MANAGER | HOUSEKEEPING_MANAGER | EMPLOYEE | ADMIN |
|---|---|---|---|---|---|---|
| Accès PWA | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Accès Dashboard | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Accès App Flutter | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Check-in | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Générer QR | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Envoyer réclamation | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assigner tâche | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Exécuter intervention | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Confirmer résolution | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gestion utilisateurs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
