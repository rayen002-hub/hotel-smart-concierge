# Report Comparison — report.zip vs report2.zip

## Structure
- **report.zip**: 8 chapters, annexes, separate tables dir, biblatex/biber bibliography, global diagrams only (18 puml)
- **report2.zip**: 8 chapters, annexes, separate tables dir, no bibliography system, per-sprint diagrams (45+ puml)
- **Selected**: report2 structure (per-sprint diagrams, better sprint organization) + report1 preamble features (biblatex, better styling)

## Retained from report.zip (report1)
- Better preamble: biblatex/biber, graphicspath, booktabs, subcaption, caption setup, color definitions, listing config
- Bibliography references.bib with proper entries
- Annexes structure (installation guide, AI results, DB schema)
- Code listing styling with colors

## Retained from report2.zip (report2)
- Complete per-sprint chapter structure with consistent sections
- Per-sprint PlantUML diagrams (usecase, mcd, classes, sequence for each sprint)
- Backlog tables with 6-column format (ID, User story, Acteur, Priorité, Est., État)
- Textual use case descriptions with tabularx
- Cover page with correct academic info
- Frontmatter (résumé, abstract, dédicace, remerciements, acronymes)
- Product backlog with longtable
- Release/sprint planning tables
- Technology tables
- figplaceholder command (enhanced with IfFileExists)

## Outdated/Removed
- report2 lacks bibliography system → added from report1
- report2 figplaceholder is basic → enhanced with IfFileExists for safe compilation
- Neither report mentions DailyCleaningTask or WorkerShiftSchedule → added to Sprint 9
- Neither report has detailed shift management → added to Sprint 8/9
- report2 Sprint 9 only covers HousekeepingTask → updated to include DailyCleaningTask and shifts
- Some textual descriptions too brief in report2 → expanded with step-by-step enumerate
- report1 global-only diagrams insufficient → replaced with per-sprint diagrams from report2

## Contradictions Resolved
- Architecture: Both say "layered" — confirmed from code (Routes → Controllers → Services → Prisma)
- Flutter: Neither claims BLoC — confirmed feature-based directory structure
- PWA: Both correctly state only room/client space is PWA — confirmed
- NLLB-200: Both correctly describe as pre-trained — confirmed (not trained by student)
- AI metrics: Both have same values — confirmed from classification_report.txt
