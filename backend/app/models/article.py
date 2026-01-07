import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class PoliticalBias(str, enum.Enum):
    LEFT = "left"
    CENTER_LEFT = "center-left"
    CENTER = "center"
    CENTER_RIGHT = "center-right"
    RIGHT = "right"


class Tone(str, enum.Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    ALARMING = "alarming"


class EntityType(str, enum.Enum):
    PERSON = "person"
    PLACE = "place"
    ORGANIZATION = "organization"
    DATE = "date"
    COUNTRY = "country"
    CITY = "city"


class Article(Base):
    __tablename__ = "articles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(255), unique=True, nullable=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    url = Column(String(2048), nullable=False)
    image_url = Column(String(2048), nullable=True)
    source_name = Column(String(255), nullable=True)
    published_at = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    language = Column(String(10), default="es")
    country = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    analysis = relationship("ArticleAnalysis", back_populates="article", uselist=False)
    entities = relationship("Entity", back_populates="article")


class ArticleAnalysis(Base):
    __tablename__ = "article_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False)
    political_bias = Column(String(20), nullable=True)
    bias_confidence = Column(Float, nullable=True)
    tone = Column(String(20), nullable=True)
    tone_confidence = Column(Float, nullable=True)
    summary_ai = Column(Text, nullable=True)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    article = relationship("Article", back_populates="analysis")


class Entity(Base):
    __tablename__ = "entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_value = Column(String(500), nullable=False)
    relevance = Column(Float, default=1.0)

    # Relationships
    article = relationship("Article", back_populates="entities")


class FactsCache(Base):
    """Cache for AI-generated facts analysis. Updated every 2 hours."""
    __tablename__ = "facts_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    period_hours = Column(String(50), nullable=False, default="24")  # e.g., "24", "48" or "YYYY-MM-DD_YYYY-MM-DD"
    facts_json = Column(Text, nullable=False)  # JSON string with facts, timeline, key_figures
    article_count = Column(Float, default=0)
    generated_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
