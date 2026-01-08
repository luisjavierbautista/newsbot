import json
import logging
import hashlib
from typing import Optional, List, Tuple
from datetime import datetime, timedelta, date
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
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

        # Query ALL articles (no join required - we just need article content)
        # Use outerjoin to include articles that may not have analysis yet
        if not date_from and not date_to:
            cutoff = datetime.utcnow() - timedelta(hours=24)
            query = db.query(Article).outerjoin(ArticleAnalysis).filter(
                Article.published_at >= cutoff
            )
        else:
            query = db.query(Article).outerjoin(ArticleAnalysis)
            if date_from:
                query = query.filter(Article.published_at >= datetime.combine(date_from, datetime.min.time()))
            if date_to:
                query = query.filter(Article.published_at <= datetime.combine(date_to, datetime.max.time()))

        if topic:
            query = query.filter(
                (Article.title.ilike(f"%{topic}%")) |
                (Article.description.ilike(f"%{topic}%"))
            )

        # Get ALL articles for the period (no artificial limit)
        # Gemini can handle large prompts, we'll truncate content appropriately
        query = query.order_by(desc(Article.published_at))
        if limit and limit > 0:
            articles = query.limit(limit).all()
        else:
            # No limit - get all articles in the period
            articles = query.all()

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
        # Gemini 2.5 Flash has ~1M token context, but we want to stay reasonable
        # Target ~100k chars total for article content
        if total_articles <= 50:
            max_content = 1000
        elif total_articles <= 100:
            max_content = 600
        elif total_articles <= 200:
            max_content = 400
        elif total_articles <= 500:
            max_content = 200
        elif total_articles <= 1000:
            max_content = 100  # Title + brief snippet
        else:
            max_content = 50  # Just a tiny snippet for massive batches

        logger.info(f"Processing {total_articles} articles with max_content={max_content} chars each")

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
        """
        Get cached facts from database.
        First tries exact match, then falls back to range-based query
        which combines facts from multiple cached periods.
        """
        # Generate cache key from date range
        today = date.today()
        if not date_from:
            date_from = today - timedelta(days=1)
        if not date_to:
            date_to = today

        period_key = f"{date_from.isoformat()}_{date_to.isoformat()}"

        # First try exact match
        cache = db.query(FactsCache).filter(
            FactsCache.period_hours == period_key
        ).order_by(desc(FactsCache.generated_at)).first()

        if cache:
            cache_age_hours = (datetime.utcnow() - cache.generated_at).total_seconds() / 3600
            is_stale = cache_age_hours > 4

            try:
                data = json.loads(cache.facts_json)
                data["generated_at"] = cache.generated_at.isoformat()
                data["article_count"] = int(cache.article_count)
                data["date_from"] = date_from.isoformat()
                data["date_to"] = date_to.isoformat()
                data["cached"] = True
                data["is_stale"] = is_stale
                data["cache_age_hours"] = round(cache_age_hours, 1)
                return data
            except Exception as e:
                logger.error(f"Error parsing cached facts: {e}")

        # Fall back to range-based query (combines multiple periods)
        return self.get_cached_facts_for_range(db, date_from, date_to)

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

    def get_article_date_range(self, db: Session) -> Tuple[Optional[date], Optional[date]]:
        """Get the min and max published_at dates from all articles."""
        result = db.query(
            func.min(Article.published_at),
            func.max(Article.published_at)
        ).filter(Article.published_at.isnot(None)).first()

        if not result or not result[0]:
            return None, None

        return result[0].date(), result[1].date()

    def get_weekly_periods(self, start_date: date, end_date: date) -> List[Tuple[date, date]]:
        """Split a date range into weekly periods (Mon-Sun)."""
        periods = []
        current = start_date

        # Align to start of week (Monday)
        days_since_monday = current.weekday()
        week_start = current - timedelta(days=days_since_monday)

        while week_start <= end_date:
            week_end = week_start + timedelta(days=6)
            # Clamp to the actual date range
            period_start = max(week_start, start_date)
            period_end = min(week_end, end_date)
            periods.append((period_start, period_end))
            week_start = week_start + timedelta(days=7)

        return periods

    def get_processed_periods(self, db: Session) -> set:
        """Get all period keys that have been processed."""
        cache_entries = db.query(FactsCache.period_hours).all()
        return {entry[0] for entry in cache_entries}

    async def process_historical_facts(
        self,
        db: Session,
        force_reprocess: bool = False,
        max_batches: Optional[int] = None
    ) -> dict:
        """
        Process ALL historical articles in weekly batches.
        Only processes weeks that haven't been cached yet (unless force_reprocess=True).
        Returns summary of processing.
        """
        if not self.model:
            return {"error": "Gemini not configured", "processed": 0}

        # Get article date range
        min_date, max_date = self.get_article_date_range(db)
        if not min_date or not max_date:
            return {"error": "No articles found", "processed": 0}

        logger.info(f"Processing historical facts from {min_date} to {max_date}")

        # Get weekly periods
        periods = self.get_weekly_periods(min_date, max_date)
        logger.info(f"Found {len(periods)} weekly periods to process")

        # Get already processed periods
        processed_periods = set() if force_reprocess else self.get_processed_periods(db)

        # Process each period
        results = {
            "total_periods": len(periods),
            "already_processed": 0,
            "newly_processed": 0,
            "failed": 0,
            "facts_extracted": 0,
            "details": []
        }

        batch_count = 0
        for period_start, period_end in periods:
            period_key = f"{period_start.isoformat()}_{period_end.isoformat()}"

            # Skip if already processed
            if period_key in processed_periods:
                results["already_processed"] += 1
                continue

            # Check batch limit
            if max_batches and batch_count >= max_batches:
                logger.info(f"Reached max batches limit ({max_batches})")
                break

            try:
                logger.info(f"Processing period: {period_start} to {period_end}")
                result = await self.update_facts_cache(
                    db,
                    date_from=period_start,
                    date_to=period_end
                )

                if "error" not in result:
                    results["newly_processed"] += 1
                    results["facts_extracted"] += len(result.get("facts", []))
                    results["details"].append({
                        "period": period_key,
                        "facts": len(result.get("facts", [])),
                        "articles": result.get("article_count", 0)
                    })
                else:
                    results["failed"] += 1
                    logger.error(f"Failed to process {period_key}: {result['error']}")

                batch_count += 1

            except Exception as e:
                results["failed"] += 1
                logger.error(f"Error processing period {period_key}: {e}")

        logger.info(f"Historical processing complete: {results['newly_processed']} new periods, "
                   f"{results['already_processed']} already cached, {results['failed']} failed")

        return results

    def get_cached_facts_for_range(
        self,
        db: Session,
        date_from: date,
        date_to: date
    ) -> Optional[dict]:
        """
        Get cached facts that overlap with the requested date range.
        Combines facts from multiple cache entries if needed.
        """
        # Query all cache entries
        all_cache = db.query(FactsCache).order_by(desc(FactsCache.generated_at)).all()

        if not all_cache:
            return None

        # Find entries that overlap with requested range
        matching_facts = []
        matching_timeline = []
        matching_figures = {}
        total_articles = 0
        newest_generated = None

        for cache in all_cache:
            try:
                # Parse period key
                parts = cache.period_hours.split("_")
                if len(parts) != 2:
                    continue

                cache_from = date.fromisoformat(parts[0])
                cache_to = date.fromisoformat(parts[1])

                # Check if periods overlap
                if cache_to < date_from or cache_from > date_to:
                    continue

                # Parse cached data
                data = json.loads(cache.facts_json)

                # Collect facts (avoid duplicates by id)
                existing_ids = {f.get("id") for f in matching_facts}
                for fact in data.get("facts", []):
                    if fact.get("id") and fact["id"] not in existing_ids:
                        matching_facts.append(fact)
                        existing_ids.add(fact["id"])

                # Collect timeline events
                matching_timeline.extend(data.get("timeline_events", []))

                # Collect key figures (merge by name)
                for figure in data.get("key_figures", []):
                    name = figure.get("name")
                    if name:
                        if name in matching_figures:
                            matching_figures[name]["mentions"] += figure.get("mentions", 1)
                        else:
                            matching_figures[name] = figure.copy()

                total_articles += cache.article_count or 0

                if not newest_generated or cache.generated_at > newest_generated:
                    newest_generated = cache.generated_at

            except Exception as e:
                logger.error(f"Error parsing cache entry: {e}")
                continue

        if not matching_facts:
            return None

        # Sort facts by importance
        importance_order = {"alta": 0, "media": 1, "baja": 2}
        matching_facts.sort(key=lambda f: importance_order.get(f.get("importance", "baja"), 2))

        # Sort key figures by mentions
        sorted_figures = sorted(
            matching_figures.values(),
            key=lambda f: f.get("mentions", 0),
            reverse=True
        )[:10]  # Top 10

        return {
            "facts": matching_facts[:20],  # Top 20 facts
            "timeline_events": matching_timeline[:15],
            "key_figures": sorted_figures,
            "article_count": total_articles,
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
            "generated_at": newest_generated.isoformat() if newest_generated else None,
            "cached": True,
            "is_stale": False,
            "cache_age_hours": round((datetime.utcnow() - newest_generated).total_seconds() / 3600, 1) if newest_generated else None,
            "combined_from_periods": True
        }


# Global instance
fact_extractor = FactExtractor()
