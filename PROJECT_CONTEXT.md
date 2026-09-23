# Plateforme intelligente de services numériques pour hôtels (PFE Master)

## Vue d'ensemble du Projet
Ce projet est composé de quatre parties principales :
1. **web-app** : PWA client + dashboards web pour réception, responsables et admin.
2. **backend** : API principale avec Express, TypeScript, Prisma et PostgreSQL.
3. **ai-service** : service IA avec FastAPI pour traduction et classification des réclamations.
4. **worker-app** : application Flutter pour les employés d’intervention.

## Objectif général
Développer une solution hôtelière permettant :
- Le check-in numérique via QR code.
- L’accès client à une PWA de chambre via QR code sécurisé.
- L’envoi de réclamations par le client.
- La traduction automatique des messages.
- La classification automatique des réclamations.
- L’orientation des réclamations vers le service concerné.
- L’assignation des tâches aux employés.
- Le suivi d’intervention par scan QR entrée/sortie.
- La confirmation de résolution par le client.

## Rôles utilisateurs
- `ADMIN`
- `RECEPTIONIST`
- `MAINTENANCE_MANAGER`
- `HOUSEKEEPING_MANAGER`
- `EMPLOYEE`

## Interfaces et Accès
- **Client** : Utilise uniquement la PWA.
- **Réception** : Utilise le dashboard web.
- **Chef de maintenance** : Utilise le dashboard web.
- **Gouvernante générale** : Utilise le dashboard web.
- **Employés** : Utilisent uniquement l’application Flutter.
- **Administrateur** : Utilise le dashboard web.

## Module IA
Fonctionnalités :
- Détecter la langue du message.
- Traduire le message.
- Classifier la réclamation.

*Note : Ne pas implémenter de prédiction de priorité.*

## Catégories de réclamations
- `MAINTENANCE`
- `HOUSEKEEPING`
- `RECEPTION`
- `RESTAURANT`
- `COMPLAINT`
- `OTHER`

## Statuts des réclamations
- `PENDING`
- `ASSIGNED`
- `IN_PROGRESS`
- `RESOLVED`
- `CONFIRMED`
- `NEEDS_REVIEW`
- `REOPENED`

## Contraintes de développement
- Ne pas ajouter de fonctionnalités non demandées.
- Ne pas réécrire tout le projet à chaque étape.
- Garder une architecture claire, modulaire et maintenable.
- Ajouter validation et gestion d’erreurs.
- Ne jamais mettre de secrets dans le code.
- Utiliser des fichiers `.env.example`.
- **Après chaque modification, expliquer comment tester.**
