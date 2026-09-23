# LoomStay — Rapport PFE Final

## Compilation

```bash
cd loomstay-final-report
pdflatex main.tex
biber main
pdflatex main.tex
pdflatex main.tex
```

Ou avec latexmk :
```bash
latexmk -pdf main.tex
```

## Structure

```
main.tex                    # Document principal
preamble.tex                # Préambule (packages, commandes)
cover/page_de_garde.tex     # Page de garde
frontmatter/                # Dédicace, remerciements, résumé, abstract, acronymes
chapters/
  introduction_generale.tex
  chapitre1_contexte.tex    # Contexte et étude de l'existant
  chapitre2_sprint0.tex     # Sprint 0 : Analyse et préparation
  chapitre3_release1.tex    # Release 1 : Sprints 1, 2, 3
  chapitre4_release2.tex    # Release 2 : Sprints 4, 5, 6
  chapitre5_release3.tex    # Release 3 : Sprints 7, 8, 9
  chapitre6_build_tests_validation.tex
  chapitre7_deploiement.tex
  conclusion_generale.tex
tables/                     # Tableaux externalisés
bibliography/references.bib # Références bibliographiques
annexes/annexes.tex         # Annexes
diagrams/plantuml/          # Fichiers PlantUML source
imgs/                       # Images (diagrams/, screenshots/, logos/)
```

## Images à ajouter

Les images sont référencées via la commande `\safefig` qui affiche un placeholder
si le fichier n'existe pas. Pour chaque sprint, ajoutez :

- `imgs/diagrams/sprintN_usecase.png`
- `imgs/diagrams/sprintN_mcd.png`
- `imgs/diagrams/sprintN_sequence.png`
- `imgs/diagrams/sprintN_classes.png`

Captures d'écran à ajouter dans `imgs/screenshots/`.

## Diagrammes PlantUML

Les fichiers `.puml` dans `diagrams/plantuml/` peuvent être compilés avec :
```bash
java -jar plantuml.jar diagrams/plantuml/*.puml -o ../../imgs/diagrams/
```
