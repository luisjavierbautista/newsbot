from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://newsbot:newsbot123@localhost:5432/newsbot"

    # News API
    newsdata_api_key: str = ""

    # Gemini AI
    gemini_api_key: str = ""

    # Apify (primary)
    apify_api_key: str = ""

    # GNews (secondary)
    gnews_api_key: str = ""

    # App Config
    fetch_interval_minutes: int = 10
    debug: bool = True

    # CORS (comma-separated string or list)
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, list):
            return ",".join(v)
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
