# TODO — Rapport PFE Hotel Smart Concierge

## Informations à fournir manuellement

- [ ] **Nom officiel de l'hôtel** / entreprise d'accueil
- [ ] **Logo de l'hôtel** (format PNG/PDF) → `figures/images/logo_hotel.png`
- [ ] **Logo de l'université** (format PNG/PDF) → `figures/images/logo_universite.png`
- [ ] **Nom complet de l'étudiant**
- [ ] **Nom de l'encadrant académique**
- [ ] **Nom du superviseur en entreprise**
- [ ] **Nom de l'université / institut / département**
- [ ] **Diplôme exact** (Licence / Master en Informatique)
- [ ] **Année universitaire** (2024-2025 ?)
- [ ] **Dates exactes du stage** (pour le Gantt)
- [ ] **Dates exactes de chaque sprint** (pour le Gantt)

## Éléments textuels à rédiger

- [ ] **Dédicace** → `frontmatter/dedicace.tex`
- [ ] **Remerciements** → `frontmatter/remerciements.tex`
- [ ] **Présentation de l'organisme d'accueil** → `chapters/chapitre1_contexte.tex` §1.1
- [ ] **Étude de l'existant** (solutions concurrentes) → `chapters/chapitre1_contexte.tex` §1.4
- [ ] **Tableau comparatif** → `chapters/chapitre1_contexte.tex` §1.5
- [ ] **Rétrospective de chaque sprint** (9 rétrospectives)
- [ ] **Limites** et **perspectives** dans la conclusion
- [ ] **Bibliographie complète** → `bibliography/references.bib`

## Captures d'écran à réaliser

### Web (`figures/screenshots/web/`)
- [ ] Page de connexion (login)
- [ ] Dashboard admin — gestion utilisateurs
- [ ] Dashboard admin — gestion chambres
- [ ] Dashboard réception — réservations
- [ ] Dashboard réception — check-in workflow
- [ ] QR code client généré
- [ ] Dashboard manager — onglet réclamations
- [ ] Dashboard manager — onglet employés
- [ ] Dashboard gouvernante — onglet ménage

### PWA Client (`figures/screenshots/web/`)
- [ ] Page d'accueil chambre PWA (mobile)
- [ ] Page informations hôtel
- [ ] Page événements
- [ ] Page convertisseur devises
- [ ] Page messagerie client
- [ ] Page envoi réclamation
- [ ] Page suivi réclamations
- [ ] Check-in numérique côté client

### Flutter (`figures/screenshots/flutter/`)
- [ ] Écran de login
- [ ] Liste des tâches
- [ ] Détail d'une tâche
- [ ] Scanner QR entrée
- [ ] Scanner QR sortie
- [ ] Saisie résultat intervention
- [ ] Tâche housekeeping
- [ ] Scanner QR ménage

### IA/ML (`figures/screenshots/ai/`)
- [ ] Matrice de confusion → `figures/screenshots/ai/confusion_matrix.png`
- [ ] Résultats de build/test Jest
- [ ] Résultats de build/test pytest

## Diagrammes à exporter

Exporter depuis PlantUML en PNG ou PDF et placer dans `diagrams/images/` :

- [ ] `context_diagram.png`
- [ ] `usecase_global.png`
- [ ] `usecase_client.png`
- [ ] `usecase_reception_admin.png`
- [ ] `usecase_managers.png`
- [ ] `usecase_worker.png`
- [ ] `class_diagram_global.png`
- [ ] `sequence_checkin_qr.png`
- [ ] `sequence_room_pwa_access.png`
- [ ] `sequence_message_translation.png`
- [ ] `sequence_complaint_ai.png`
- [ ] `sequence_worker_intervention.png`
- [ ] `sequence_housekeeping_task.png`
- [ ] `activity_complaint_workflow.png`
- [ ] `activity_worker_qr_scan.png`
- [ ] `architecture_global.png`
- [ ] `architecture_ai_ml.png`
- [ ] `architecture_private_server.png`
- [ ] Diagramme de Gantt (3 releases, 9 sprints)

## Vérifications finales

- [ ] Compiler main.tex sans erreurs
- [ ] Vérifier que toutes les tables s'affichent correctement
- [ ] Vérifier la numérotation des chapitres
- [ ] Vérifier la table des matières
- [ ] Vérifier la liste des figures
- [ ] Vérifier la liste des tableaux
- [ ] Vérifier que les acronymes sont correctement résolus
- [ ] Relire le résumé et l'abstract
- [ ] Vérifier l'orthographe et la grammaire
