import asyncio
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
from app.services.entity_unifier import entity_unifier
from app.services.fact_extractor import fact_extractor

logger = logging.getLogger(__name__)


class NewsScheduler:
    """Scheduler para obtener y analizar noticias periódicamente."""

    def __init__(self):
        self.settings = get_settings()
        self.scheduler = AsyncIOScheduler()
        self.news_fetcher = NewsFetcher()
        self.gemini_analyzer = GeminiAnalyzer()
        self.is_running = False
        self._fetch_in_progress = False
        self._fetch_lock = asyncio.Lock()

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

        # Entity unification job - every hour
        self.scheduler.add_job(
            self._unify_entities_job,
            trigger=IntervalTrigger(hours=1),
            id="entity_unify_job",
            name="Unify duplicate entities every hour",
            replace_existing=True,
        )

        # Facts cache update job - every 2 hours
        self.scheduler.add_job(
            self._update_facts_cache_job,
            trigger=IntervalTrigger(hours=2),
            id="facts_cache_job",
            name="Update facts cache every 2 hours",
            replace_existing=True,
        )

        self.scheduler.start()
        self.is_running = True
        logger.info(f"Scheduler iniciado - fetch cada {interval_minutes} minutos, facts cache cada 2 horas")

    def stop(self):
        """Detiene el scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Scheduler detenido")

    async def _fetch_and_analyze_job(self):
        """Job principal: obtiene noticias, analiza con Gemini y guarda en DB."""

        # Evitar ejecuciones concurrentes
        if self._fetch_in_progress:
            logger.warning("Fetch ya en progreso, omitiendo esta ejecución")
            return

        async with self._fetch_lock:
            self._fetch_in_progress = True
            logger.info("Iniciando job de fetch y análisis...")

        try:
            # Obtener el tiempo del último artículo para evitar duplicados
            db = SessionLocal()
            try:
                from sqlalchemy import func
                last_article = db.query(func.max(Article.published_at)).scalar()
                if last_article:
                    self.news_fetcher.set_last_fetch_time(last_article)
                    logger.info(f"Último artículo en DB: {last_article}")
                else:
                    logger.info("No hay artículos previos, obteniendo todos")
            finally:
                db.close()

            # Obtener noticias
            articles = await self.news_fetcher.fetch_all_queries()
            logger.info(f"Obtenidos {len(articles)} artículos nuevos")

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

                    # Truncar campos largos para evitar errores de DB
                    url = (article_data.get("url", "") or "")[:2048]
                    external_id = (article_data.get("external_id") or "")[:255] or None
                    image_url = (article_data.get("image_url") or "")[:2048] or None
                    source_name = (article_data.get("source_name") or "")[:255] or None

                    # Crear artículo
                    article = Article(
                        external_id=external_id,
                        title=article_data.get("title", ""),
                        description=article_data.get("description"),
                        content=article_data.get("content"),
                        url=url,
                        image_url=image_url,
                        source_name=source_name,
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
        finally:
            self._fetch_in_progress = False
            logger.info("Job de fetch finalizado")

    async def run_now(self):
        """Ejecuta el job manualmente (para trigger desde API)."""
        await self._fetch_and_analyze_job()

    async def _unify_entities_job(self):
        """Job para unificar entidades duplicadas cada hora."""
        logger.info("Iniciando job de unificación de entidades...")

        db = SessionLocal()
        try:
            # Analyze duplicates
            analysis = await entity_unifier.analyze_duplicates(db)

            if not analysis.get("groups"):
                logger.info("No se encontraron entidades duplicadas para unificar")
                return

            # Apply unification
            result = await entity_unifier.unify_entities(db, analysis["groups"], dry_run=False)

            logger.info(f"Entidades unificadas: {result.get('total_updates', 0)} actualizaciones")

        except Exception as e:
            logger.error(f"Error en job de unificación: {e}")
        finally:
            db.close()

    async def _update_facts_cache_job(self):
        """Job para actualizar cache de hechos cada 2 horas."""
        logger.info("Iniciando job de actualización de facts cache...")

        db = SessionLocal()
        try:
            await fact_extractor.update_default_cache(db)
        except Exception as e:
            logger.error(f"Error en job de facts cache: {e}")
        finally:
            db.close()

    async def update_facts_now(self):
        """Trigger manual para actualizar facts cache."""
        await self._update_facts_cache_job()


# Instancia global
news_scheduler = NewsScheduler()
