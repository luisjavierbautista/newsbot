from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://newsbot:newsbot123@localhost:5432/newsbot"

    # News API
    newsdata_api_key: str = ""

    # Gemini AI
    gemini_api_key: str = ""

    # Apify (fallback)
    apify_api_key: str = ""

    # App Config
    fetch_interval_minutes: int = 10
    debug: bool = True

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
