"""
Tests for the improved language detection service.
These tests verify the hybrid keyword+langdetect approach
WITHOUT mocking detect_language — they test the real implementation.
"""

import pytest
from app.services.language_service import detect_language


class TestFrenchDetection:
    """French detection should work for hotel-specific messages."""

    def test_climatisation_ne_marche_pas(self):
        """The original bug: 'La climatisation ne marche pas' was detected as Italian."""
        result = detect_language("La climatisation ne marche pas")
        assert result["language"] == "fr", f"Expected 'fr', got '{result['language']}'"
        assert result["confidence"] is not None
        assert result["confidence"] > 0.5
        assert result["supported"] is True
        assert result["language_name"] == "French"

    def test_eau_chaude(self):
        result = detect_language("Il n'y a pas d'eau chaude dans la chambre")
        assert result["language"] == "fr"

    def test_serviettes(self):
        result = detect_language("Je voudrais des serviettes propres")
        assert result["language"] == "fr"

    def test_douche_ne_marche_pas(self):
        result = detect_language("La douche ne marche pas")
        assert result["language"] == "fr"

    def test_reception(self):
        result = detect_language("Je dois aller à la réception")
        assert result["language"] == "fr"


class TestEnglishDetection:
    """English detection for common hotel complaints."""

    def test_ac_not_working(self):
        result = detect_language("AC not working")
        assert result["language"] == "en"

    def test_need_towels(self):
        result = detect_language("I need more towels please")
        assert result["language"] == "en"

    def test_hot_water(self):
        result = detect_language("There is no hot water in the bathroom")
        assert result["language"] == "en"

    def test_broken_ac(self):
        result = detect_language("The air conditioning is broken")
        assert result["language"] == "en"


class TestSpanishDetection:
    """Spanish detection for hotel messages."""

    def test_necesito_toallas(self):
        result = detect_language("Necesito más toallas")
        assert result["language"] == "es", f"Expected 'es', got '{result['language']}'"

    def test_no_funciona(self):
        result = detect_language("El aire acondicionado no funciona")
        assert result["language"] == "es"

    def test_agua_caliente(self):
        result = detect_language("No hay agua caliente en la habitación")
        assert result["language"] == "es"


class TestItalianDetection:
    """Italian detection for hotel messages."""

    def test_bisogno_asciugamani(self):
        result = detect_language("Ho bisogno di asciugamani")
        assert result["language"] == "it", f"Expected 'it', got '{result['language']}'"

    def test_non_funziona(self):
        result = detect_language("L'aria condizionata non funziona")
        assert result["language"] == "it"


class TestGermanDetection:
    """German detection for hotel messages."""

    def test_brauche_handtucher(self):
        result = detect_language("Ich brauche Handtücher")
        assert result["language"] == "de", f"Expected 'de', got '{result['language']}'"

    def test_funktioniert_nicht(self):
        result = detect_language("Die Klimaanlage funktioniert nicht")
        assert result["language"] == "de"


class TestResponseFormat:
    """Test that the response format is correct."""

    def test_has_method_field(self):
        result = detect_language("La climatisation ne marche pas")
        assert "method" in result
        assert result["method"] in ("keyword_override", "langdetect", "none")

    def test_has_confidence(self):
        result = detect_language("AC not working")
        assert "confidence" in result
        assert result["confidence"] is not None
        assert 0 <= result["confidence"] <= 1.0

    def test_has_language_name(self):
        result = detect_language("Ich brauche Handtücher")
        assert "language_name" in result
        assert result["language_name"] == "German"

    def test_has_supported_flag(self):
        result = detect_language("Necesito más toallas")
        assert "supported" in result
        assert isinstance(result["supported"], bool)


class TestEdgeCases:
    """Edge cases and short text handling."""

    def test_empty_string(self):
        result = detect_language("")
        assert result["language"] == "unknown"
        assert result["method"] == "none"

    def test_single_char(self):
        result = detect_language("a")
        assert result["language"] == "unknown"

    def test_whitespace_only(self):
        result = detect_language("   ")
        assert result["language"] == "unknown"

    def test_none_input(self):
        result = detect_language(None)
        assert result["language"] == "unknown"
