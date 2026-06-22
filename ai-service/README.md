# AI Service — Hotel Smart Concierge

Service IA basé sur **FastAPI** pour la traduction et la classification des réclamations hôtelières.

## Modèles utilisés

| Modèle | Taille | Fonction |
|--------|--------|----------|
| `facebook/nllb-200-distilled-600M` | ~2.5 GB | Traduction multilingue (200+ langues) |
| Classificateur custom (scikit-learn) | ~1 MB | Classification des réclamations |

## Installation

```bash
cd ai-service
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

## Lancement

```bash
uvicorn app.main:app --reload --port 8000
```

> **Note** : Le modèle NLLB est chargé en **lazy loading** au premier appel de traduction.
> Le premier appel prend ~30-60 secondes (téléchargement + chargement en mémoire).
> Les appels suivants sont quasi-instantanés grâce au cache.

## Endpoints

### `GET /health`
Vérifie le statut du service.

### `GET /supported-languages`
Retourne la liste des 80+ langues supportées par NLLB.

### `POST /detect-language`
Détecte la langue d'un message.

```json
{ "message": "La climatisation ne marche pas" }
```

→ Réponse :
```json
{
  "language": "fr",
  "confidence": 0.9999,
  "language_name": "French",
  "supported": true
}
```

### `POST /translate`
Traduit un message entre deux langues.

```json
{
  "message": "La climatisation ne marche pas",
  "source_language": "fr",
  "target_language": "en"
}
```

→ Réponse :
```json
{
  "original_message": "La climatisation ne marche pas",
  "translated_text": "The air conditioning is not working",
  "source_language": "fr",
  "target_language": "en",
  "model": "facebook/nllb-200-distilled-600M",
  "cached": false
}
```

### `POST /classify`
Classifie une réclamation hôtelière (en anglais).

### `POST /analyze`
Analyse complète d'une réclamation : détection langue + traduction + classification.

**Input :**
```json
{
  "message": "La climatisation ne marche pas",
  "staff_language": "fr"
}
```

**Output :**
```json
{
  "original_message": "La climatisation ne marche pas",
  "detected_language": "fr",
  "normalized_message_en": "The air conditioning is not working",
  "staff_message": "La climatisation ne marche pas",
  "staff_language": "fr",
  "category": "MAINTENANCE",
  "category_confidence": 0.91,
  "translation_model": "facebook/nllb-200-distilled-600M",
  "translation_warning": null
}
```

**Tester avec curl :**

```bash
# Réclamation en français (staff FR)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "La climatisation ne marche pas", "staff_language": "fr"}'

# Réclamation en espagnol (staff FR)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "El aire acondicionado no funciona", "staff_language": "fr"}'

# Réclamation en arabe (staff FR)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "المكيف لا يعمل", "staff_language": "fr"}'

# Réclamation en anglais (staff EN)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "The room is too noisy", "staff_language": "en"}'
```

**Logique étape 4 (staff_message) :**
- Si `detected_language == staff_language` → message original (pas de traduction inutile)
- Si `staff_language == "en"` → `normalized_message_en` directement
- Sinon → traduction EN → staff_language via NLLB

## Langues supportées

Le modèle NLLB supporte **80+ langues** mappées via des codes ISO 639-1 :

| Code | Langue | Code NLLB |
|------|--------|-----------|
| `ar` | Arabic | `arb_Arab` |
| `bn` | Bengali | `ben_Beng` |
| `bg` | Bulgarian | `bul_Cyrl` |
| `ca` | Catalan | `cat_Latn` |
| `zh` | Chinese | `zho_Hans` |
| `hr` | Croatian | `hrv_Latn` |
| `cs` | Czech | `ces_Latn` |
| `da` | Danish | `dan_Latn` |
| `nl` | Dutch | `nld_Latn` |
| `en` | English | `eng_Latn` |
| `fi` | Finnish | `fin_Latn` |
| `fr` | French | `fra_Latn` |
| `de` | German | `deu_Latn` |
| `el` | Greek | `ell_Grek` |
| `he` | Hebrew | `heb_Hebr` |
| `hi` | Hindi | `hin_Deva` |
| `hu` | Hungarian | `hun_Latn` |
| `id` | Indonesian | `ind_Latn` |
| `it` | Italian | `ita_Latn` |
| `ja` | Japanese | `jpn_Jpan` |
| `ko` | Korean | `kor_Hang` |
| `ms` | Malay | `zsm_Latn` |
| `no` | Norwegian | `nob_Latn` |
| `fa` | Persian | `pes_Arab` |
| `pl` | Polish | `pol_Latn` |
| `pt` | Portuguese | `por_Latn` |
| `ro` | Romanian | `ron_Latn` |
| `ru` | Russian | `rus_Cyrl` |
| `sr` | Serbian | `srp_Cyrl` |
| `sk` | Slovak | `slk_Latn` |
| `sl` | Slovenian | `slv_Latn` |
| `es` | Spanish | `spa_Latn` |
| `sw` | Swahili | `swh_Latn` |
| `sv` | Swedish | `swe_Latn` |
| `th` | Thai | `tha_Thai` |
| `tr` | Turkish | `tur_Latn` |
| `uk` | Ukrainian | `ukr_Cyrl` |
| `ur` | Urdu | `urd_Arab` |
| `vi` | Vietnamese | `vie_Latn` |

... et 40+ autres. Voir `GET /supported-languages` pour la liste complète.

## Architecture

```
ai-service/
├── app/
│   ├── main.py                         # FastAPI app + endpoints
│   ├── schemas.py                      # Pydantic schemas
│   ├── services/
│   │   ├── classifier_service.py       # Classification des réclamations
│   │   ├── language_service.py         # Détection de langue (langdetect)
│   │   └── translation_service.py      # Traduction NLLB + cache LRU
│   └── utils/
│       ├── hotel_glossary.py           # Glossaire hôtelier (post-traitement)
│       ├── language_mapping.py         # ISO 639-1 → NLLB codes
│       └── text_cleaning.py           # Nettoyage de texte
├── models/                             # Modèles sauvegardés
├── training/                           # Scripts d'entraînement
└── requirements.txt
```

## Cache de traduction

Le service utilise un cache LRU en mémoire (max 500 entrées) pour éviter de recalculer les traductions identiques. Les stats du cache sont visibles via `GET /health`.

## Glossaire hôtelier

Un post-traitement est appliqué après chaque traduction pour remplacer les termes génériques par des termes spécifiques à l'hôtellerie (ex: "cleaning of the room" → "housekeeping").
