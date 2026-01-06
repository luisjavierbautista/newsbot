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
    if news_scheduler._fetch_in_progress:
        return {"status": "skipped", "message": "Fetch ya en progreso, intente más tarde"}
    try:
        await news_scheduler.run_now()
        return {"status": "success", "message": "Fetch completado"}
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


@router.get("/stats/sources")
async def get_source_stats(
    limit: int = Query(20, ge=1, le=50),
    min_articles: int = Query(3, ge=1),
    db: Session = Depends(get_db)
):
    """
    Get statistics per source/media company.
    Returns bias and tone distribution for each source.
    """
    from sqlalchemy import case, cast, Float

    # Get sources with article counts and bias/tone breakdown
    sources_query = db.query(
        Article.source_name,
        func.count(Article.id).label("total_articles"),
        # Bias counts
        func.sum(case((ArticleAnalysis.political_bias == 'left', 1), else_=0)).label("bias_left"),
        func.sum(case((ArticleAnalysis.political_bias == 'center-left', 1), else_=0)).label("bias_center_left"),
        func.sum(case((ArticleAnalysis.political_bias == 'center', 1), else_=0)).label("bias_center"),
        func.sum(case((ArticleAnalysis.political_bias == 'center-right', 1), else_=0)).label("bias_center_right"),
        func.sum(case((ArticleAnalysis.political_bias == 'right', 1), else_=0)).label("bias_right"),
        # Tone counts
        func.sum(case((ArticleAnalysis.tone == 'positive', 1), else_=0)).label("tone_positive"),
        func.sum(case((ArticleAnalysis.tone == 'neutral', 1), else_=0)).label("tone_neutral"),
        func.sum(case((ArticleAnalysis.tone == 'negative', 1), else_=0)).label("tone_negative"),
        func.sum(case((ArticleAnalysis.tone == 'alarming', 1), else_=0)).label("tone_alarming"),
    ).outerjoin(ArticleAnalysis).filter(
        Article.source_name.isnot(None),
        Article.source_name != ''
    ).group_by(Article.source_name).having(
        func.count(Article.id) >= min_articles
    ).order_by(desc("total_articles")).limit(limit)

    results = sources_query.all()

    sources = []
    for r in results:
        # Calculate bias score (-2 to +2 scale: left=-2, center=0, right=+2)
        total_with_bias = (r.bias_left or 0) + (r.bias_center_left or 0) + (r.bias_center or 0) + (r.bias_center_right or 0) + (r.bias_right or 0)

        if total_with_bias > 0:
            bias_score = (
                (r.bias_left or 0) * -2 +
                (r.bias_center_left or 0) * -1 +
                (r.bias_center or 0) * 0 +
                (r.bias_center_right or 0) * 1 +
                (r.bias_right or 0) * 2
            ) / total_with_bias
        else:
            bias_score = 0

        # Determine dominant bias
        bias_counts = {
            'left': r.bias_left or 0,
            'center-left': r.bias_center_left or 0,
            'center': r.bias_center or 0,
            'center-right': r.bias_center_right or 0,
            'right': r.bias_right or 0,
        }
        dominant_bias = max(bias_counts, key=bias_counts.get) if total_with_bias > 0 else 'center'

        # Determine dominant tone
        tone_counts = {
            'positive': r.tone_positive or 0,
            'neutral': r.tone_neutral or 0,
            'negative': r.tone_negative or 0,
            'alarming': r.tone_alarming or 0,
        }
        total_with_tone = sum(tone_counts.values())
        dominant_tone = max(tone_counts, key=tone_counts.get) if total_with_tone > 0 else 'neutral'

        sources.append({
            "source_name": r.source_name,
            "total_articles": r.total_articles,
            "bias_score": round(bias_score, 2),  # -2 (left) to +2 (right)
            "dominant_bias": dominant_bias,
            "dominant_tone": dominant_tone,
            "bias_distribution": bias_counts,
            "tone_distribution": tone_counts,
        })

    return {
        "sources": sources,
        "total_sources": len(sources),
    }


@router.get("/facts")
async def get_facts(
    hours: int = Query(24, ge=1, le=168, description="Hours to look back"),
    db: Session = Depends(get_db)
):
    """
    Return cached facts from recent news articles.
    Facts are pre-computed every 2 hours by background job.
    Returns cached results for fast response.
    """
    from app.services.fact_extractor import fact_extractor

    # Try to get cached facts
    cached = fact_extractor.get_cached_facts(db, hours=hours)

    if cached:
        return cached

    # No cache available - return empty with message
    # (Cache will be populated by background job)
    return {
        "facts": [],
        "timeline_events": [],
        "key_figures": [],
        "article_count": 0,
        "period_hours": hours,
        "message": "Facts cache not yet available. Will be generated shortly.",
        "cached": False
    }


@router.post("/facts/refresh")
async def refresh_facts_cache(
    db: Session = Depends(get_db)
):
    """
    Manually trigger facts cache refresh.
    Use sparingly as it calls the AI API.
    """
    from app.services.fact_extractor import fact_extractor, CACHE_PERIODS

    results = {}
    for hours in CACHE_PERIODS:
        result = await fact_extractor.update_facts_cache(db, hours=hours)
        results[f"{hours}h"] = {
            "facts_count": len(result.get("facts", [])),
            "article_count": result.get("article_count", 0)
        }

    return {
        "status": "success",
        "message": "Facts cache refreshed",
        "results": results
    }


@router.get("/entities/analyze-duplicates")
async def analyze_duplicate_entities(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    db: Session = Depends(get_db)
):
    """
    Analiza entidades duplicadas usando IA.
    Retorna grupos de entidades que deberían unificarse.
    """
    from app.services.entity_unifier import entity_unifier

    result = await entity_unifier.analyze_duplicates(db, entity_type)
    return result


@router.post("/entities/unify")
async def unify_entities(
    dry_run: bool = Query(True, description="Si es True, solo muestra qué se cambiaría"),
    db: Session = Depends(get_db)
):
    """
    Unifica entidades duplicadas.
    Primero analiza con IA, luego aplica los cambios.
    dry_run=True para ver preview, dry_run=False para aplicar.
    """
    from app.services.entity_unifier import entity_unifier

    # First analyze
    analysis = await entity_unifier.analyze_duplicates(db)

    if not analysis.get("groups"):
        return {"message": "No se encontraron duplicados para unificar", "updates": []}

    # Then unify
    result = await entity_unifier.unify_entities(db, analysis["groups"], dry_run=dry_run)
    return result


@router.get("/entity-graph")
async def get_entity_graph(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    min_connections: int = Query(2, ge=1, description="Minimum connections to include"),
    limit: int = Query(100, ge=10, le=500),
    db: Session = Depends(get_db)
):
    """
    Get entity relationship graph data.
    Returns nodes (entities) and links (co-occurrences in articles).
    """
    from collections import defaultdict

    # Get top entities
    entity_query = db.query(
        Entity.entity_type,
        Entity.entity_value,
        func.count(Entity.id).label("count"),
        func.array_agg(Entity.article_id).label("article_ids")
    ).group_by(Entity.entity_type, Entity.entity_value)

    if entity_type:
        types = [t.strip() for t in entity_type.split(",")]
        entity_query = entity_query.filter(Entity.entity_type.in_(types))

    entity_query = entity_query.having(func.count(Entity.id) >= min_connections)
    entity_query = entity_query.order_by(desc("count")).limit(limit)

    entities = entity_query.all()

    # Build nodes
    nodes = []
    entity_to_articles = {}

    for e in entities:
        node_id = f"{e.entity_type}:{e.entity_value}"
        nodes.append({
            "id": node_id,
            "label": e.entity_value,
            "type": e.entity_type,
            "count": e.count,
            "articles": [str(aid) for aid in e.article_ids] if e.article_ids else []
        })
        entity_to_articles[node_id] = set(str(aid) for aid in e.article_ids) if e.article_ids else set()

    # Build links (entities that share articles)
    links = []
    link_set = set()
    node_ids = [n["id"] for n in nodes]

    for i, node1_id in enumerate(node_ids):
        for node2_id in node_ids[i + 1:]:
            shared = entity_to_articles[node1_id] & entity_to_articles[node2_id]
            if shared:
                link_key = tuple(sorted([node1_id, node2_id]))
                if link_key not in link_set:
                    link_set.add(link_key)
                    links.append({
                        "source": node1_id,
                        "target": node2_id,
                        "value": len(shared),
                        "articles": list(shared)[:10]  # Limit to 10 article IDs
                    })

    return {
        "nodes": nodes,
        "links": links,
        "total_entities": len(nodes),
        "total_connections": len(links)
    }
