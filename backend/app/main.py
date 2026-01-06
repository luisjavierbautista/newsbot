import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.api import router
from app.services.scheduler import news_scheduler

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager para startup/shutdown."""
    # Startup
    logger.info("Iniciando aplicación...")

    # Crear tablas si no existen
    Base.metadata.create_all(bind=engine)
    logger.info("Base de datos inicializada")

    # Iniciar scheduler (fetch cada 10 min, sin fetch inicial)
    news_scheduler.start()
    logger.info("Scheduler iniciado")

    yield

    # Shutdown
    logger.info("Deteniendo aplicación...")
    news_scheduler.stop()


app = FastAPI(
    title="LatBot News",
    description="Portal de noticias LATAM/USA con análisis de IA - latbot.news",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas
app.include_router(router)


@app.get("/")
async def root():
    return {
        "name": "LatBot News",
        "version": "1.0.0",
        "description": "Portal de noticias LATAM/USA con análisis de IA - latbot.news",
        "docs": "/docs"
    }
