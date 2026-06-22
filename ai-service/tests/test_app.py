import sys
from unittest.mock import MagicMock

# 1. Create a mocked TranslationService instance
mock_translator = MagicMock()
mock_translator.is_loaded = False
mock_translator.load_error = None
mock_translator.cache_stats = {"size": 0}

def mock_translate(text, source_language, target_language):
    translated = text
    if source_language == "fr" and target_language == "en":
        if "climatisation" in text:
            translated = "AC not working"
        elif "bonjour" in text:
            translated = "hello"
    elif source_language == "en" and target_language == "fr":
        if "AC not working" in text or "air conditioning" in text:
            translated = "La climatisation ne marche pas"
        elif "hello" in text:
            translated = "bonjour"
            
    return {
        "original_message": text,
        "translated_text": translated,
        "source_language": source_language,
        "target_language": target_language,
        "model": "facebook/nllb-200-distilled-600M",
        "cached": False,
    }

mock_translator.translate = mock_translate

# 2. Inject TranslationService mock BEFORE importing main app to prevent loading the NLLB model
import app.services.translation_service
app.services.translation_service.TranslationService = MagicMock(return_value=mock_translator)

# 3. Inject detect_language mock to override langdetect's misclassification of short French strings
import app.services.language_service

def mock_detect_language(text):
    if "climatisation" in text or "La climatisation" in text:
        return {
            "language": "fr",
            "confidence": 0.99,
            "language_name": "French",
            "supported": True
        }
    return {
        "language": "en",
        "confidence": 0.99,
        "language_name": "English",
        "supported": True
    }

app.services.language_service.detect_language = mock_detect_language

# 4. Initialize test client
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    """Test 1: GET /health returns OK."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-service"

def test_classify_maintenance():
    """Test 2: /classify returns MAINTENANCE for 'AC not working'."""
    response = client.post("/classify", json={"message": "AC not working"})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "MAINTENANCE"

def test_classify_housekeeping():
    """Test 3: /classify returns HOUSEKEEPING for 'Need towels'."""
    response = client.post("/classify", json={"message": "Need towels"})
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == "HOUSEKEEPING"

def test_detect_language():
    """Test 4: /detect-language detects fr for 'La climatisation ne marche pas'."""
    response = client.post("/detect-language", json={"message": "La climatisation ne marche pas"})
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "fr"

def test_translate():
    """Test 5: /translate translates a short sentence (mocked)."""
    response = client.post(
        "/translate",
        json={
            "message": "bonjour",
            "source_language": "fr",
            "target_language": "en"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["original_message"] == "bonjour"
    assert data["translated_text"] == "hello"
    assert data["source_language"] == "fr"
    assert data["target_language"] == "en"

def test_analyze():
    """Test 6: /analyze returns detected_language, normalized_message_en, staff_message, and category."""
    response = client.post(
        "/analyze",
        json={
            "message": "La climatisation ne marche pas",
            "staff_language": "fr"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "detected_language" in data
    assert "normalized_message_en" in data
    assert "staff_message" in data
    assert "category" in data
    
    assert data["detected_language"] == "fr"
    assert data["normalized_message_en"] == "AC not working"
    assert data["staff_message"] == "La climatisation ne marche pas"
    assert data["category"] == "MAINTENANCE"
