from pydantic import BaseModel, HttpUrl
from datetime import datetime
from uuid import UUID
from typing import Optional


class EntityResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_value: str
    relevance: float

    class Config:
        from_attributes = True


class ArticleAnalysisResponse(BaseModel):
    id: UUID
    political_bias: Optional[str] = None
    bias_confidence: Optional[float] = None
    tone: Optional[str] = None
    tone_confidence: Optional[float] = None
    summary_ai: Optional[str] = None
    analyzed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ArticleBase(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    source_name: Optional[str] = None
    published_at: Optional[datetime] = None
    language: str = "es"
    country: Optional[str] = None


class ArticleCreate(ArticleBase):
    external_id: Optional[str] = None


class ArticleResponse(ArticleBase):
    id: UUID
    external_id: Optional[str] = None
    fetched_at: datetime
    created_at: datetime
    analysis: Optional[ArticleAnalysisResponse] = None
    entities: list[EntityResponse] = []

    class Config:
        from_attributes = True


class ArticleListResponse(BaseModel):
    articles: list[ArticleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class GeminiAnalysisResult(BaseModel):
    political_bias: str
    bias_confidence: float
    tone: str
    tone_confidence: float
    summary: str
    entities: list[dict]


class StatsResponse(BaseModel):
    total_articles: int
    articles_today: int
    sources_count: int
    bias_distribution: dict[str, int]
    tone_distribution: dict[str, int]
    top_entities: list[dict]
