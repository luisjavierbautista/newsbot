from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models import Article, ArticleAnalysis, Entity
from app.schemas import ArticleResponse, ArticleListResponse, StatsResponse
from app.services.scheduler import news_scheduler

router = APIRouter(prefix="/api", tags=["articles"])


@router.get("/articles", response_model=ArticleListResponse)
async def get_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    political_bias: Optional[str] = Query(None, description="Filtrar por sesgo: left,center-left,center,center-right,right"),
    tone: Optional[str] = Query(None, description="Filtrar por tono: positive,neutral,negative,alarming"),
    entity: Optional[str] = Query(None, description="Filtrar por entidad (persona, lugar, etc.)"),
    source: Optional[str] = Query(None, description="Filtrar por fuente"),
    search: Optional[str] = Query(None, description="Búsqueda en título y descripción"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db)
):
    """Obtiene lista de artículos con filtros y paginación."""
    query = db.query(Article).outerjoin(ArticleAnalysis)

    # Filtro por sesgo político
    if political_bias:
        biases = [b.strip() for b in political_bias.split(",")]
        query = query.filter(ArticleAnalysis.political_bias.in_(biases))

    # Filtro por tono
    if tone:
        tones = [t.strip() for t in tone.split(",")]
        query = query.filter(ArticleAnalysis.tone.in_(tones))

    # Filtro por entidad
    if entity:
        query = query.join(Entity).filter(
            Entity.entity_value.ilike(f"%{entity}%")
        )

    # Filtro por fuente
    if source:
        query = query.filter(Article.source_name.ilike(f"%{source}%"))

    # Búsqueda en título/descripción
    if search:
        query = query.filter(
            (Article.title.ilike(f"%{search}%")) |
            (Article.description.ilike(f"%{search}%"))
        )

    # Filtro por fecha
    if date_from:
        query = query.filter(Article.published_at >= date_from)
    if date_to:
        query = query.filter(Article.published_at <= date_to)

    # Total para paginación
    total = query.distinct().count()

    # Ordenar por fecha de publicación
    query = query.order_by(desc(Article.published_at))

    # Paginación
    offset = (page - 1) * page_size
    articles = query.distinct().offset(offset).limit(page_size).all()

    total_pages = (total + page_size - 1) // page_size

    return ArticleListResponse(
        articles=[ArticleResponse.model_validate(a) for a in articles],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: UUID, db: Session = Depends(get_db)):
    """Obtiene un artículo por ID con su análisis y entidades."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    return ArticleResponse.model_validate(article)


@router.get("/articles/search/{query}")
async def search_articles(
    query: str,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Búsqueda rápida de artículos."""
    articles = db.query(Article).filter(
        (Article.title.ilike(f"%{query}%")) |
        (Article.description.ilike(f"%{query}%")) |
        (Article.content.ilike(f"%{query}%"))
    ).order_by(desc(Article.published_at)).limit(limit).all()

    return [ArticleResponse.model_validate(a) for a in articles]


@router.get("/entities")
async def get_entities(
    entity_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Obtiene lista de entidades únicas con conteo."""
    query = db.query(
        Entity.entity_type,
        Entity.entity_value,
        func.count(Entity.id).label("count")
    ).group_by(Entity.entity_type, Entity.entity_value)

    if entity_type:
        query = query.filter(Entity.entity_type == entity_type)

    query = query.order_by(desc("count")).limit(limit)

    results = query.all()

    return [
        {
            "type": r.entity_type,
            "value": r.entity_value,
            "count": r.count
        }
        for r in results
    ]


@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    """Obtiene estadísticas generales del portal."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_articles = db.query(Article).count()
    articles_today = db.query(Article).filter(Article.created_at >= today).count()
    sources_count = db.query(func.count(func.distinct(Article.source_name))).scalar() or 0

    # Distribución de sesgo
    bias_results = db.query(
        ArticleAnalysis.political_bias,
        func.count(ArticleAnalysis.id)
    ).group_by(ArticleAnalysis.political_bias).all()
    bias_distribution = {r[0]: r[1] for r in bias_results if r[0]}

    # Distribución de tono
    tone_results = db.query(
        ArticleAnalysis.tone,
        func.count(ArticleAnalysis.id)
    ).group_by(ArticleAnalysis.tone).all()
    tone_distribution = {r[0]: r[1] for r in tone_results if r[0]}

    # Top entidades
    top_entities = db.query(
        Entity.entity_type,
        Entity.entity_value,
        func.count(Entity.id).label("count")
    ).group_by(
        Entity.entity_type, Entity.entity_value
    ).order_by(desc("count")).limit(10).all()

    return StatsResponse(
        total_articles=total_articles,
        articles_today=articles_today,
        sources_count=sources_count,
        bias_distribution=bias_distribution,
        tone_distribution=tone_distribution,
        top_entities=[
            {"type": e.entity_type, "value": e.entity_value, "count": e.count}
            for e in top_entities
        ]
    )


@router.post("/fetch-now")
async def trigger_fetch():
    """Trigger manual para obtener noticias inmediatamente."""
    try:
        await news_scheduler.run_now()
        return {"status": "success", "message": "Fetch iniciado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-pending")
async def analyze_pending_articles(db: Session = Depends(get_db)):
    """Analiza artículos que no tienen análisis."""
    from app.services.gemini_analyzer import GeminiAnalyzer
    from app.models import ArticleAnalysis, Entity
    from datetime import datetime

    analyzer = GeminiAnalyzer()

    # Obtener artículos sin análisis
    pending = db.query(Article).filter(
        ~Article.id.in_(
            db.query(ArticleAnalysis.article_id)
        )
    ).limit(10).all()

    analyzed = 0
    for article in pending:
        result = await analyzer.analyze_article(
            title=article.title,
            source=article.source_name,
            content=article.content or article.description
        )

        if result:
            analysis = ArticleAnalysis(
                article_id=article.id,
                political_bias=result.political_bias,
                bias_confidence=result.bias_confidence,
                tone=result.tone,
                tone_confidence=result.tone_confidence,
                summary_ai=result.summary,
                analyzed_at=datetime.utcnow(),
            )
            db.add(analysis)

            for entity_data in result.entities:
                entity = Entity(
                    article_id=article.id,
                    entity_type=entity_data.get("type", "unknown"),
                    entity_value=entity_data.get("value", ""),
                    relevance=float(entity_data.get("relevance", 1.0)),
                )
                db.add(entity)

            analyzed += 1

    db.commit()
    return {"status": "success", "analyzed": analyzed, "pending": len(pending)}


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
