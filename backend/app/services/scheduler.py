import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import SessionLocal
from app.models import Article, ArticleAnalysis, Entity
from app.services.news_fetcher import NewsFetcher
from app.services.gemini_analyzer import GeminiAnalyzer

logger = logging.getLogger(__name__)


class NewsScheduler:
    """Scheduler para obtener y analizar noticias periódicamente."""

    def __init__(self):
        self.settings = get_settings()
        self.scheduler = AsyncIOScheduler()
        self.news_fetcher = NewsFetcher()
        self.gemini_analyzer = GeminiAnalyzer()
        self.is_running = False

    def start(self):
        """Inicia el scheduler."""
        if self.is_running:
            logger.warning("Scheduler ya está corriendo")
            return

        interval_minutes = self.settings.fetch_interval_minutes

        self.scheduler.add_job(
            self._fetch_and_analyze_job,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id="news_fetch_job",
            name=f"Fetch news every {interval_minutes} minutes",
            replace_existing=True,
        )

        self.scheduler.start()
        self.is_running = True
        logger.info(f"Scheduler iniciado - fetch cada {interval_minutes} minutos")

    def stop(self):
        """Detiene el scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Scheduler detenido")

    async def _fetch_and_analyze_job(self):
        """Job principal: obtiene noticias, analiza con Gemini y guarda en DB."""
        logger.info("Iniciando job de fetch y análisis...")

        try:
            # Obtener noticias
            articles = await self.news_fetcher.fetch_all_queries()
            logger.info(f"Obtenidos {len(articles)} artículos")

            if not articles:
                logger.warning("No se obtuvieron artículos")
                return

            # Procesar en la base de datos
            db = SessionLocal()
            try:
                saved_count = 0
                analyzed_count = 0

                for article_data in articles:
                    # Verificar si ya existe
                    existing = None
                    if article_data.get("external_id"):
                        existing = db.query(Article).filter(
                            Article.external_id == article_data["external_id"]
                        ).first()

                    if not existing and article_data.get("url"):
                        existing = db.query(Article).filter(
                            Article.url == article_data["url"]
                        ).first()

                    if existing:
                        continue

                    # Crear artículo
                    article = Article(
                        external_id=article_data.get("external_id"),
                        title=article_data.get("title", ""),
                        description=article_data.get("description"),
                        content=article_data.get("content"),
                        url=article_data.get("url", ""),
                        image_url=article_data.get("image_url"),
                        source_name=article_data.get("source_name"),
                        published_at=article_data.get("published_at"),
                        language=article_data.get("language", "es"),
                        country=article_data.get("country"),
                        fetched_at=datetime.utcnow(),
                    )
                    db.add(article)
                    db.flush()
                    saved_count += 1

                    # Analizar con Gemini
                    analysis_result = await self.gemini_analyzer.analyze_article(
                        title=article.title,
                        source=article.source_name,
                        content=article.content or article.description
                    )

                    if analysis_result:
                        # Guardar análisis
                        analysis = ArticleAnalysis(
                            article_id=article.id,
                            political_bias=analysis_result.political_bias,
                            bias_confidence=analysis_result.bias_confidence,
                            tone=analysis_result.tone,
                            tone_confidence=analysis_result.tone_confidence,
                            summary_ai=analysis_result.summary,
                            analyzed_at=datetime.utcnow(),
                        )
                        db.add(analysis)

                        # Guardar entidades
                        for entity_data in analysis_result.entities:
                            entity = Entity(
                                article_id=article.id,
                                entity_type=entity_data.get("type", "unknown"),
                                entity_value=entity_data.get("value", ""),
                                relevance=float(entity_data.get("relevance", 1.0)),
                            )
                            db.add(entity)

                        analyzed_count += 1

                db.commit()
                logger.info(f"Guardados {saved_count} artículos, analizados {analyzed_count}")

            except Exception as e:
                db.rollback()
                logger.error(f"Error en DB: {e}")
                raise
            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error en job de fetch: {e}")

    async def run_now(self):
        """Ejecuta el job manualmente (para trigger desde API)."""
        await self._fetch_and_analyze_job()


# Instancia global
news_scheduler = NewsScheduler()
