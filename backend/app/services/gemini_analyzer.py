import json
import logging
import google.generativeai as genai
from typing import Optional
from app.config import get_settings
from app.schemas import GeminiAnalysisResult

logger = logging.getLogger(__name__)


class GeminiAnalyzer:
    """Servicio para analizar noticias con Google Gemini AI."""

    ANALYSIS_PROMPT = """Analiza el siguiente artículo de noticias en español y proporciona un análisis estructurado.

ARTÍCULO:
Título: {title}
Fuente: {source}
Contenido: {content}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin ```json) con esta estructura exacta:
{{
    "political_bias": "left|center-left|center|center-right|right",
    "bias_confidence": 0.0-1.0,
    "tone": "positive|neutral|negative|alarming",
    "tone_confidence": 0.0-1.0,
    "summary": "Resumen de 2-3 oraciones en español",
    "entities": [
        {{"type": "person|place|organization|date|country|city", "value": "nombre", "relevance": 0.0-1.0}}
    ]
}}

INSTRUCCIONES:
1. **Sesgo Político (political_bias)**: Evalúa la orientación del MEDIO que publica, no del contenido:
   - left: Medios de izquierda (ej: TeleSUR, Página 12)
   - center-left: Medios centro-izquierda (ej: El País España)
   - center: Medios neutrales/centrados (ej: Reuters, BBC)
   - center-right: Medios centro-derecha (ej: La Nación Argentina)
   - right: Medios de derecha (ej: PanamPost)

2. **Tono (tone)**: Evalúa cómo presenta la noticia:
   - positive: Enfoque optimista, celebratorio
   - neutral: Factual, sin emotividad
   - negative: Crítico, pesimista
   - alarming: Alarmista, sensacionalista

3. **Entidades**: Extrae TODAS las entidades mencionadas:
   - person: Nombres de personas (ej: "Nicolás Maduro", "Donald Trump")
   - country: Países (ej: "Venezuela", "Estados Unidos")
   - city: Ciudades (ej: "Caracas", "Washington")
   - place: Otros lugares (ej: "Miraflores", "Casa Blanca")
   - organization: Organizaciones (ej: "Fuerza Delta", "ONU")
   - date: Fechas mencionadas (ej: "3 de enero de 2026")

4. **Resumen**: Resume la noticia en 2-3 oraciones en español, capturando lo esencial.

Responde SOLO con el JSON, sin texto adicional."""

    def __init__(self):
        self.settings = get_settings()
        if self.settings.gemini_api_key:
            genai.configure(api_key=self.settings.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
            logger.warning("Gemini API key not configured")

    async def analyze_article(
        self,
        title: str,
        source: Optional[str] = None,
        content: Optional[str] = None
    ) -> Optional[GeminiAnalysisResult]:
        """Analiza un artículo y retorna el resultado estructurado."""
        if not self.model:
            logger.error("Gemini model not initialized")
            return None

        if not content:
            content = title

        # Truncar contenido si es muy largo
        max_content_length = 4000
        if len(content) > max_content_length:
            content = content[:max_content_length] + "..."

        prompt = self.ANALYSIS_PROMPT.format(
            title=title,
            source=source or "Desconocida",
            content=content
        )

        try:
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()

            # Limpiar el texto si viene con markdown
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            # Parsear JSON
            result_json = json.loads(result_text)

            return GeminiAnalysisResult(
                political_bias=result_json.get("political_bias", "center"),
                bias_confidence=float(result_json.get("bias_confidence", 0.5)),
                tone=result_json.get("tone", "neutral"),
                tone_confidence=float(result_json.get("tone_confidence", 0.5)),
                summary=result_json.get("summary", ""),
                entities=result_json.get("entities", [])
            )

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Gemini response: {e}")
            logger.debug(f"Raw response: {response.text if response else 'None'}")
            return None
        except Exception as e:
            logger.error(f"Error analyzing article with Gemini: {e}")
            return None

    async def analyze_batch(
        self,
        articles: list[dict]
    ) -> list[tuple[dict, Optional[GeminiAnalysisResult]]]:
        """Analiza un lote de artículos."""
        results = []
        for article in articles:
            analysis = await self.analyze_article(
                title=article.get("title", ""),
                source=article.get("source_name"),
                content=article.get("content") or article.get("description")
            )
            results.append((article, analysis))
        return results
