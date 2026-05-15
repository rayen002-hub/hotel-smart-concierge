# Workflow de Traitement des Réclamations

## 1. Introduction

Ce document décrit le cycle de vie complet d'une réclamation dans le système **Hotel Smart Concierge**, depuis sa soumission par le client jusqu'à sa confirmation de résolution.

## 2. Statuts des réclamations

| Statut | Description |
|--------|-------------|
| `PENDING` | Réclamation soumise, en attente de traitement |
| `ASSIGNED` | Assignée à un employé par le responsable |
| `IN_PROGRESS` | Employé en intervention (QR scanné à l'entrée) |
| `RESOLVED` | Intervention terminée (QR scanné à la sortie) |
| `CONFIRMED` | Résolution confirmée par le client |
| `NEEDS_REVIEW` | Nécessite une revue par le responsable |
| `REOPENED` | Rouverte par le client (non satisfait) |

## 3. Diagramme de transitions

```
Client envoie réclamation
        │
        ▼
    [PENDING] ──► Responsable assigne ──► [ASSIGNED]
                                              │
                              Scan QR entrée  │
                                              ▼
                                        [IN_PROGRESS]
                                         │         │
                          Scan QR sortie │         │ Problème signalé
                                         ▼         ▼
                                    [RESOLVED]  [NEEDS_REVIEW]
                                     │    │         │
                          Confirme   │    │ Refus   │ Réassigne
                                     ▼    ▼         ▼
                              [CONFIRMED] [REOPENED]──► [PENDING]
```

## 4. Description détaillée

### Étape 1 : Soumission

1. Le client rédige un message dans sa langue via la PWA.
2. Le backend transmet le message au service IA.
3. Le service IA : détecte la langue, traduit en français, classifie.
4. La réclamation est enregistrée avec statut `PENDING`.

### Étape 2 : Orientation

| Catégorie | Responsable |
|-----------|-------------|
| `MAINTENANCE` | Chef de Maintenance |
| `HOUSEKEEPING` | Gouvernante Générale |
| `RECEPTION` | Réceptionniste |
| `RESTAURANT` | Administrateur |
| `COMPLAINT` | Administrateur |
| `OTHER` | Administrateur |

### Étape 3 : Assignation

Le responsable assigne un employé → statut `ASSIGNED`.

### Étape 4 : Intervention

1. L'employé scanne le QR d'entrée → statut `IN_PROGRESS`.
2. Il effectue l'intervention.
3. Il scanne le QR de sortie → statut `RESOLVED`.

### Étape 5 : Confirmation

- Client confirme → `CONFIRMED` (fin).
- Client non satisfait → `REOPENED` → retour à `PENDING`.

### Cas particulier : Revue

Le responsable peut passer en `NEEDS_REVIEW`, puis réassigner.

## 5. QR Codes

### 5.1 QR Code Client

- **Généré par** : le réceptionniste lors du check-in.
- **Contenu** : token JWT signé (réservation + chambre).
- **Validité** : durée du séjour.
- **Usage** : accès à la PWA.

### 5.2 QR Code Intervention

- **Affiché sur** : chaque chambre.
- **Contenu** : identifiant de la chambre.
- **Usage** : scan entrée/sortie par l'employé.
- **Validation** : le backend vérifie la tâche assignée.
