"""
Glossaire hotelier pour le post-traitement des traductions.
Remplace les termes generiques par des termes specifiques a l'hotellerie.
"""

# Glossaire FR -> EN : termes hoteliers specifiques
# Ces corrections s'appliquent apres la traduction pour ameliorer la qualite
HOTEL_GLOSSARY_FR_EN = {
    # Climatisation
    "air conditioning": "air conditioning",
    "conditioning of air": "air conditioning",
    "air conditioner": "air conditioning unit",
    # Chambres
    "the room": "the room",
    "bedroom": "room",
    # Personnel
    "reception desk": "front desk",
    "the reception": "the front desk",
    "receptionist": "front desk agent",
    # Equipements
    "television set": "TV",
    "television": "TV",
    "mini refrigerator": "minibar",
    "small refrigerator": "minibar",
    "small fridge": "minibar",
    # Services
    "room cleaning": "housekeeping",
    "cleaning of the room": "housekeeping",
    "cleaning room": "housekeeping",
    "room service": "room service",
    "wake-up call": "wake-up call",
    # Problemes courants
    "does not work": "is not working",
    "doesn't work": "is not working",
    "not working": "not working",
    "is broken": "is broken",
    "is damaged": "is damaged",
    "too noisy": "too noisy",
    "too loud": "too noisy",
    "too hot": "too hot",
    "too cold": "too cold",
    # Eau
    "hot water": "hot water",
    "warm water": "hot water",
    "cold water": "cold water",
}

# Glossaire EN -> FR : termes hoteliers specifiques
HOTEL_GLOSSARY_EN_FR = {
    "air conditioning": "climatisation",
    "air conditioning unit": "climatiseur",
    "front desk": "reception",
    "front desk agent": "receptionniste",
    "housekeeping": "service d'etage",
    "room service": "service en chambre",
    "minibar": "minibar",
    "wake-up call": "reveil telephonique",
    "check-in": "enregistrement",
    "check-out": "depart",
    "concierge": "concierge",
    "bellboy": "bagagiste",
    "valet": "voiturier",
    "laundry service": "service de blanchisserie",
    "pool": "piscine",
    "swimming pool": "piscine",
    "spa": "spa",
    "gym": "salle de sport",
    "fitness center": "salle de sport",
    "lobby": "hall",
    "elevator": "ascenseur",
    "towel": "serviette",
    "pillow": "oreiller",
    "blanket": "couverture",
    "sheets": "draps",
    "key card": "carte-cle",
    "safe": "coffre-fort",
    "balcony": "balcon",
    "bathroom": "salle de bain",
    "shower": "douche",
    "bathtub": "baignoire",
}


def apply_glossary(text: str, source_lang: str, target_lang: str) -> str:
    """
    Appliquer le glossaire hotelier au texte traduit.
    Remplace les termes generiques par des termes specifiques.
    
    Args:
        text: Le texte traduit a post-traiter.
        source_lang: Code ISO 639-1 de la langue source.
        target_lang: Code ISO 639-1 de la langue cible.
    
    Returns:
        Le texte avec les termes hoteliers corriges.
    """
    glossary = {}

    if target_lang == "en":
        glossary = HOTEL_GLOSSARY_FR_EN
    elif target_lang == "fr":
        glossary = HOTEL_GLOSSARY_EN_FR

    if not glossary:
        return text

    result = text
    # Sort by length (longest first) to avoid partial replacements
    for source_term, target_term in sorted(glossary.items(), key=lambda x: -len(x[0])):
        # Case-insensitive replacement
        lower_result = result.lower()
        idx = lower_result.find(source_term.lower())
        while idx != -1:
            result = result[:idx] + target_term + result[idx + len(source_term):]
            lower_result = result.lower()
            idx = lower_result.find(source_term.lower(), idx + len(target_term))

    return result
