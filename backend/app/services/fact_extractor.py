import json
import logging
import hashlib
from typing import Optional
from datetime import datetime, timedelta, date
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.config import get_settings
from app.models import Article, ArticleAnalysis, FactsCache

logger = logging.getLogger(__name__)


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
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
            logger.warning("Gemini API key not configured for FactExtractor")

    async def extract_facts(
        self,
        db: Session,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: Optional[int] = None,
        topic: Optional[str] = None
    ) -> dict:
        """Extract facts from articles within a date range."""
        if not self.model:
            return {"error": "Gemini not configured", "facts": []}

        # Default to last 24 hours if no dates provided
        if not date_from and not date_to:
            cutoff = datetime.utcnow() - timedelta(hours=24)
            query = db.query(Article).join(ArticleAnalysis).filter(
                Article.published_at >= cutoff
            )
        else:
            query = db.query(Article).join(ArticleAnalysis)
            if date_from:
                query = query.filter(Article.published_at >= datetime.combine(date_from, datetime.min.time()))
            if date_to:
                query = query.filter(Article.published_at <= datetime.combine(date_to, datetime.max.time()))

        if topic:
            query = query.filter(
                (Article.title.ilike(f"%{topic}%")) |
                (Article.description.ilike(f"%{topic}%"))
            )

        # Get articles with optional limit (max 100 to avoid timeouts)
        query = query.order_by(desc(Article.published_at))
        max_limit = 100  # Hard cap to prevent timeouts
        if limit and limit > 0:
            effective_limit = min(limit, max_limit)
            articles = query.limit(effective_limit).all()
        else:
            # Default to max_limit
            articles = query.limit(max_limit).all()

        if not articles:
            return {
                "facts": [],
                "timeline_events": [],
                "key_figures": [],
                "article_count": 0,
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
            }

        # Format articles for the prompt
        # Adjust content truncation based on article count to stay within token limits
        total_articles = len(articles)
        articles_text = ""
        article_map = {}

        # Calculate max content length based on article count
        # Approximate: 100 articles * 500 chars = 50k chars, well within limits
        if total_articles <= 50:
            max_content = 1000
        elif total_articles <= 100:
            max_content = 600
        elif total_articles <= 200:
            max_content = 400
        else:
            max_content = 250  # Very brief for large batches

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
            content = content[:max_content] if len(content) > max_content else content
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
                "article_count": total_articles,
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
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
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
            }

    def get_cached_facts(
        self,
        db: Session,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Optional[dict]:
        """Get cached facts from database."""
        # Generate cache key from date range
        today = date.today()
        if not date_from:
            date_from = today - timedelta(days=1)
        if not date_to:
            date_to = today

        period_key = f"{date_from.isoformat()}_{date_to.isoformat()}"

        cache = db.query(FactsCache).filter(
            FactsCache.period_hours == period_key
        ).order_by(desc(FactsCache.generated_at)).first()

        if not cache:
            return None

        # Cache is valid for 4 hours (scheduler runs every 2 hours, so this gives buffer)
        # We never return None for stale cache - always return cached data
        # User requests should NEVER trigger AI analysis
        cache_age_hours = (datetime.utcnow() - cache.generated_at).total_seconds() / 3600
        is_stale = cache_age_hours > 4

        try:
            data = json.loads(cache.facts_json)
            data["generated_at"] = cache.generated_at.isoformat()
            data["article_count"] = int(cache.article_count)
            data["date_from"] = date_from.isoformat()
            data["date_to"] = date_to.isoformat()
            data["cached"] = True
            data["is_stale"] = is_stale  # Indicate if cache is older than 4 hours
            data["cache_age_hours"] = round(cache_age_hours, 1)
            return data
        except Exception as e:
            logger.error(f"Error parsing cached facts: {e}")
            return None

    async def update_facts_cache(
        self,
        db: Session,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        limit: Optional[int] = None
    ) -> dict:
        """Extract facts and save to cache."""
        today = date.today()
        if not date_from:
            date_from = today - timedelta(days=1)
        if not date_to:
            date_to = today

        logger.info(f"Updating facts cache for {date_from} to {date_to} (limit={limit})...")

        # Extract fresh facts
        result = await self.extract_facts(db, date_from=date_from, date_to=date_to, limit=limit)

        if "error" in result:
            logger.error(f"Failed to extract facts: {result['error']}")
            return result

        # Prepare JSON for storage
        cache_data = {
            "facts": result.get("facts", []),
            "timeline_events": result.get("timeline_events", []),
            "key_figures": result.get("key_figures", [])
        }

        period_key = f"{date_from.isoformat()}_{date_to.isoformat()}"

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

        logger.info(f"Facts cache updated for {date_from} to {date_to}: {len(result.get('facts', []))} facts")
        return result

    async def update_default_cache(self, db: Session):
        """Update cache for default period (last 24h). Called by scheduler."""
        logger.info("Starting scheduled facts cache update...")
        today = date.today()
        yesterday = today - timedelta(days=1)
        try:
            await self.update_facts_cache(db, date_from=yesterday, date_to=today)
        except Exception as e:
            logger.error(f"Error updating default facts cache: {e}")
        logger.info("Scheduled facts cache update completed")


# Global instance
fact_extractor = FactExtractor()
