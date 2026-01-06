import json
import logging
import hashlib
from typing import Optional
from datetime import datetime, timedelta
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.config import get_settings
from app.models import Article, ArticleAnalysis, FactsCache

logger = logging.getLogger(__name__)

# Standard periods to cache
CACHE_PERIODS = [24, 48, 72]


class FactExtractor:
    """Service to extract and cluster facts from news articles using Gemini AI."""

    EXTRACT_PROMPT = """Analiza los siguientes artículos de noticias y extrae los HECHOS CONCRETOS más importantes.

ARTÍCULOS:
{articles}

INSTRUCCIONES:
1. Extrae hechos verificables y concretos (no opiniones)
2. Incluye: qué pasó, quién está involucrado, cuándo, dónde
3. Si el mismo hecho aparece en múltiples artículos, agrúpalos
4. Identifica citas textuales importantes de personas relevantes
5. Clasifica cada hecho por categoría e importancia

Responde SOLO con JSON válido (sin markdown):
{{
    "facts": [
        {{
            "id": "unique_hash",
            "fact": "Descripción clara y concisa del hecho",
            "category": "evento|declaracion|dato|decision|conflicto|acuerdo",
            "importance": "alta|media|baja",
            "who": ["personas/entidades involucradas"],
            "when": "fecha o momento si se menciona",
            "where": "lugar si se menciona",
            "quote": "cita textual relevante si existe (o null)",
            "quote_author": "autor de la cita si existe (o null)",
            "article_indices": [0, 1, 2],
            "sentiment": "positivo|negativo|neutral|alarmante"
        }}
    ],
    "timeline_events": [
        {{
            "date": "YYYY-MM-DD o descripción temporal",
            "event": "descripción breve del evento",
            "fact_ids": ["id1", "id2"]
        }}
    ],
    "key_figures": [
        {{
            "name": "Nombre de persona clave",
            "role": "cargo o rol",
            "stance": "posición o acción principal",
            "mentions": 5
        }}
    ]
}}

Máximo 10 hechos principales, ordenados por importancia."""

    def __init__(self):
        self.settings = get_settings()
        if self.settings.gemini_api_key:
            genai.configure(api_key=self.settings.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            self.model = None
            logger.warning("Gemini API key not configured for FactExtractor")

    async def extract_facts(
        self,
        db: Session,
        hours: int = 24,
        limit: int = 30,
        topic: Optional[str] = None
    ) -> dict:
        """Extract facts from recent articles."""
        if not self.model:
            return {"error": "Gemini not configured", "facts": []}

        # Get recent articles with analysis
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        query = db.query(Article).join(ArticleAnalysis).filter(
            Article.published_at >= cutoff
        )

        if topic:
            query = query.filter(
                (Article.title.ilike(f"%{topic}%")) |
                (Article.description.ilike(f"%{topic}%"))
            )

        articles = query.order_by(desc(Article.published_at)).limit(limit).all()

        if not articles:
            return {
                "facts": [],
                "timeline_events": [],
                "key_figures": [],
                "article_count": 0,
                "period_hours": hours
            }

        # Format articles for the prompt
        articles_text = ""
        article_map = {}
        for i, article in enumerate(articles):
            article_map[i] = {
                "id": str(article.id),
                "title": article.title,
                "source": article.source_name,
                "url": article.url,
                "published_at": article.published_at.isoformat() if article.published_at else None,
                "bias": article.analysis.political_bias if article.analysis else None,
                "tone": article.analysis.tone if article.analysis else None,
            }
            content = article.content or article.description or ""
            # Truncate content to avoid token limits
            content = content[:1500] if len(content) > 1500 else content
            articles_text += f"\n[Artículo {i}] - {article.source_name}\nTítulo: {article.title}\nContenido: {content}\n"

        prompt = self.EXTRACT_PROMPT.format(articles=articles_text)

        try:
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()

            # Clean markdown if present
            if result_text.startswith("```"):
                result_text = result_text.split("```")[1]
                if result_text.startswith("json"):
                    result_text = result_text[4:]
                result_text = result_text.strip()

            # Extract JSON
            if not result_text.startswith("{"):
                start = result_text.find("{")
                if start != -1:
                    result_text = result_text[start:]
            if not result_text.endswith("}"):
                end = result_text.rfind("}")
                if end != -1:
                    result_text = result_text[:end + 1]

            result = json.loads(result_text)

            # Enrich facts with source information
            facts = result.get("facts", [])
            for fact in facts:
                # Generate stable ID if not present
                if not fact.get("id"):
                    fact["id"] = hashlib.md5(fact["fact"].encode()).hexdigest()[:12]

                # Add source details
                article_indices = fact.get("article_indices", [])
                fact["sources"] = []
                for idx in article_indices:
                    if idx in article_map:
                        fact["sources"].append(article_map[idx])
                fact["source_count"] = len(fact["sources"])

                # Add verification level based on source count
                if fact["source_count"] >= 3:
                    fact["verification"] = "alto"
                elif fact["source_count"] >= 2:
                    fact["verification"] = "medio"
                else:
                    fact["verification"] = "bajo"

            return {
                "facts": facts,
                "timeline_events": result.get("timeline_events", []),
                "key_figures": result.get("key_figures", []),
                "article_count": len(articles),
                "period_hours": hours,
                "generated_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error extracting facts: {e}")
            return {
                "error": str(e),
                "facts": [],
                "timeline_events": [],
                "key_figures": [],
                "article_count": len(articles),
                "period_hours": hours
            }

    def get_cached_facts(self, db: Session, hours: int = 24) -> Optional[dict]:
        """Get cached facts from database."""
        period_key = str(hours)

        cache = db.query(FactsCache).filter(
            FactsCache.period_hours == period_key
        ).order_by(desc(FactsCache.generated_at)).first()

        if not cache:
            return None

        try:
            data = json.loads(cache.facts_json)
            data["generated_at"] = cache.generated_at.isoformat()
            data["article_count"] = int(cache.article_count)
            data["period_hours"] = hours
            data["cached"] = True
            return data
        except Exception as e:
            logger.error(f"Error parsing cached facts: {e}")
            return None

    async def update_facts_cache(self, db: Session, hours: int = 24) -> dict:
        """Extract facts and save to cache. Called by background scheduler."""
        logger.info(f"Updating facts cache for {hours}h period...")

        # Extract fresh facts
        result = await self.extract_facts(db, hours=hours, limit=30)

        if "error" in result:
            logger.error(f"Failed to extract facts: {result['error']}")
            return result

        # Prepare JSON for storage (without generated_at as it's stored separately)
        cache_data = {
            "facts": result.get("facts", []),
            "timeline_events": result.get("timeline_events", []),
            "key_figures": result.get("key_figures", [])
        }

        period_key = str(hours)

        # Delete old cache for this period
        db.query(FactsCache).filter(FactsCache.period_hours == period_key).delete()

        # Create new cache entry
        cache = FactsCache(
            period_hours=period_key,
            facts_json=json.dumps(cache_data, ensure_ascii=False),
            article_count=result.get("article_count", 0),
            generated_at=datetime.utcnow()
        )
        db.add(cache)
        db.commit()

        logger.info(f"Facts cache updated for {hours}h period: {len(result.get('facts', []))} facts")
        return result

    async def update_all_caches(self, db: Session):
        """Update cache for all standard periods. Called by scheduler every 2 hours."""
        logger.info("Starting scheduled facts cache update...")
        for hours in CACHE_PERIODS:
            try:
                await self.update_facts_cache(db, hours=hours)
            except Exception as e:
                logger.error(f"Error updating cache for {hours}h: {e}")
        logger.info("Scheduled facts cache update completed")


# Global instance
fact_extractor = FactExtractor()
