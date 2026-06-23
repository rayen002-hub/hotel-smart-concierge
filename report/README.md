# Rapport PFE — Hotel Smart Concierge

## Structure du projet LaTeX

```
report/
├── main.tex                    ← Document principal (compile ici)
├── preamble.tex                ← Packages et configuration LaTeX
├── cover/
│   └── page_de_garde.tex       ← Page de garde
├── frontmatter/
│   ├── dedicace.tex            ← Dédicace
│   ├── remerciements.tex       ← Remerciements
│   ├── resume.tex              ← Résumé (français)
│   ├── abstract.tex            ← Abstract (anglais)
│   └── acronymes.tex           ← Liste des sigles et acronymes
├── chapters/
│   ├── introduction_generale.tex
│   ├── chapitre1_contexte.tex
│   ├── chapitre2_sprint0.tex
│   ├── chapitre3_release1.tex  ← Sprints 1-3
│   ├── chapitre4_release2.tex  ← Sprints 4-6
│   ├── chapitre5_release3.tex  ← Sprints 7-9
│   ├── chapitre6_build_tests_validation.tex
│   ├── chapitre7_installation_serveur_prive.tex
│   └── conclusion_generale.tex
├── tables/
│   ├── acteurs.tex
│   ├── besoins_fonctionnels.tex
│   ├── besoins_non_fonctionnels.tex
│   ├── backlog_produit.tex
│   ├── planification_releases.tex
│   ├── sprints_par_release.tex
│   ├── technologies_developpement.tex
│   └── technologies_complementaires.tex
├── figures/
│   ├── images/                 ← Logos, images statiques
│   └── screenshots/
│       ├── web/                ← Captures d'écran web
│       ├── flutter/            ← Captures d'écran Flutter
│       └── ai/                 ← Matrice de confusion, etc.
├── diagrams/
│   ├── plantuml/               ← Fichiers source PlantUML (.puml)
│   └── images/                 ← Diagrammes exportés (PNG/PDF)
├── annexes/
│   ├── annexes.tex
│   ├── schema_base_donnees.tex
│   ├── resultats_ia.tex
│   └── guide_installation.tex
├── bibliography/
│   └── references.bib          ← Références bibliographiques
├── TODO_REPORT.md              ← Checklist des éléments à fournir
└── README.md                   ← Ce fichier
```

## Comment compiler

### Avec pdflatex + biber

```bash
cd report
pdflatex main.tex
biber main
pdflatex main.tex
pdflatex main.tex
```

### Avec latexmk (recommandé)

```bash
cd report
latexmk -pdf main.tex
```

### Avec VS Code + LaTeX Workshop

1. Installer l'extension **LaTeX Workshop**
2. Ouvrir `main.tex`
3. Compiler avec `Ctrl+Alt+B`

## Où placer les fichiers

| Type de fichier | Emplacement |
|----------------|-------------|
| Logo université / hôtel | `figures/images/` |
| Captures d'écran web | `figures/screenshots/web/` |
| Captures d'écran Flutter | `figures/screenshots/flutter/` |
| Captures d'écran IA/ML | `figures/screenshots/ai/` |
| Diagrammes PlantUML (source) | `diagrams/plantuml/` |
| Diagrammes exportés (PNG/PDF) | `diagrams/images/` |
| Références bibliographiques | `bibliography/references.bib` |

## Comment ajouter un nouveau chapitre

1. Créer le fichier dans `chapters/nouveau_chapitre.tex`
2. Ajouter `\input{chapters/nouveau_chapitre}` dans `main.tex`

## Comment ajouter une référence bibliographique

1. Ajouter l'entrée dans `bibliography/references.bib`
2. Utiliser `\cite{clef}` dans le texte
3. Recompiler avec biber

## Comment exporter les diagrammes PlantUML

```bash
# Installation de PlantUML (Java requis)
java -jar plantuml.jar diagrams/plantuml/usecase_global.puml -o ../images/

# Ou utiliser le serveur PlantUML en ligne :
# https://www.plantuml.com/plantuml/uml/
```

## Fichiers générés à partir des documents de planification

Les tables LaTeX dans `tables/` ont été générées à partir de :
- `pfe_report_elements.md` — Éléments du rapport (acteurs, besoins, backlog, technologies)
- `pfe_scrum_planning_revised.md` — Planification Scrum révisée (3 releases, 9 sprints)

En cas de modification de la planification, mettre à jour les fichiers `tables/` correspondants.

## Notes importantes

- **3 releases, 9 sprints** — Pas de Release 4 (IA/ML) ni de Release 5 (build/tests)
- **PWA** = uniquement l'espace client chambre (`/room`), pas les dashboards
- **Supabase/Vercel/Render/HF** = déploiement temporaire de démonstration uniquement
- **NLLB-200** = modèle pré-entraîné, pas entraîné dans ce projet
- **Build/tests** = Definition of Done continue, pas une release Scrum
