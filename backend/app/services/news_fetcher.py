import httpx
import logging
from datetime import datetime
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)


class NewsFetcher:
    """Servicio para obtener noticias de NewsData.io con fallback a Apify."""

    NEWSDATA_BASE_URL = "https://newsdata.io/api/1/latest"

    # Queries para Venezuela/LATAM - Breaking news
    DEFAULT_QUERIES = [
        "Venezuela Caracas explosiones",
        "Maduro capturado detenido",
        "Venezuela ataque militar",
        "Trump Venezuela invasion",
        "Venezuela ultimas noticias hoy",
        "Caracas bombardeo",
        "Venezuela EEUU conflicto",
        "Maduro arrestado",
    ]

    def __init__(self):
        self.settings = get_settings()
        self.newsdata_api_key = self.settings.newsdata_api_key
        self.apify_api_key = self.settings.apify_api_key

    async def fetch_news(self, query: Optional[str] = None) -> list[dict]:
        """Obtiene noticias usando NewsData.io, con fallback a Apify."""
        articles = []

        # Intentar con NewsData.io primero
        if self.newsdata_api_key:
            try:
                articles = await self._fetch_from_newsdata(query)
                if articles:
                    logger.info(f"Obtenidas {len(articles)} noticias de NewsData.io")
                    return articles
            except Exception as e:
                logger.error(f"Error en NewsData.io: {e}")

        # Fallback a Apify si NewsData falla o no hay resultados
        if self.apify_api_key and not articles:
            try:
                articles = await self._fetch_from_apify(query)
                if articles:
                    logger.info(f"Obtenidas {len(articles)} noticias de Apify (fallback)")
                    return articles
            except Exception as e:
                logger.error(f"Error en Apify: {e}")

        return articles

    async def fetch_all_queries(self) -> list[dict]:
        """Obtiene noticias para todas las queries predefinidas."""
        all_articles = []
        seen_urls = set()

        for query in self.DEFAULT_QUERIES:
            try:
                articles = await self.fetch_news(query)
                for article in articles:
                    url = article.get("url") or article.get("link")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        all_articles.append(article)
            except Exception as e:
                logger.error(f"Error fetching query '{query}': {e}")

        logger.info(f"Total de artículos únicos obtenidos: {len(all_articles)}")
        return all_articles

    async def _fetch_from_newsdata(self, query: Optional[str] = None) -> list[dict]:
        """Obtiene noticias de NewsData.io API."""
        # Usar solo parámetros soportados en el tier gratuito
        params = {
            "apikey": self.newsdata_api_key,
            "language": "es",
        }

        if query:
            params["q"] = query
        else:
            params["q"] = "Venezuela Maduro"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.NEWSDATA_BASE_URL, params=params)

            # Log response for debugging
            if response.status_code != 200:
                logger.error(f"NewsData.io response: {response.status_code} - {response.text[:500]}")
                response.raise_for_status()

            data = response.json()

            if data.get("status") != "success":
                raise Exception(f"NewsData API error: {data.get('message')}")

            results = data.get("results", [])
            return self._normalize_newsdata_articles(results)

    def _normalize_newsdata_articles(self, articles: list[dict]) -> list[dict]:
        """Normaliza artículos de NewsData.io al formato interno."""
        normalized = []
        for article in articles:
            normalized.append({
                "external_id": article.get("article_id"),
                "title": article.get("title", ""),
                "description": article.get("description"),
                "content": article.get("content"),
                "url": article.get("link", ""),
                "image_url": article.get("image_url"),
                "source_name": article.get("source_id") or article.get("source_name"),
                "published_at": self._parse_date(article.get("pubDate")),
                "language": article.get("language", "es"),
                "country": ",".join(article.get("country", [])) if article.get("country") else None,
            })
        return normalized

    async def _fetch_from_apify(self, query: Optional[str] = None) -> list[dict]:
        """Obtiene noticias usando Apify Google News Scraper como fallback."""
        from apify_client import ApifyClient

        client = ApifyClient(self.apify_api_key)

        run_input = {
            "query": query or "Venezuela Maduro",
            "language": "es",
            "maxItems": 100,
        }

        try:
            run = client.actor("easyapi/google-news-scraper").call(run_input=run_input)
            items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
            return self._normalize_apify_articles(items)
        except Exception as e:
            logger.error(f"Apify error: {e}")
            return []

    def _normalize_apify_articles(self, articles: list[dict]) -> list[dict]:
        """Normaliza artículos de Apify al formato interno."""
        normalized = []
        for article in articles:
            normalized.append({
                "external_id": article.get("id") or article.get("url"),
                "title": article.get("title", ""),
                "description": article.get("description"),
                "content": article.get("content"),
                "url": article.get("url", ""),
                "image_url": article.get("image"),
                "source_name": article.get("source"),
                "published_at": self._parse_date(article.get("publishedAt") or article.get("date")),
                "language": "es",
                "country": None,
            })
        return normalized

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parsea fechas en varios formatos."""
        if not date_str:
            return None

        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%a, %d %b %Y %H:%M:%S %Z",
            "%Y-%m-%d",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue

        return None
