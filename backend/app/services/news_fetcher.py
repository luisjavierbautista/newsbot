import httpx
import logging
from datetime import datetime, timedelta
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
        self.last_fetch_time: Optional[datetime] = None

    def set_last_fetch_time(self, last_time: Optional[datetime]):
        """Establece el tiempo del último artículo para filtrar duplicados."""
        self.last_fetch_time = last_time
        if last_time:
            logger.info(f"Filtrando noticias posteriores a: {last_time}")

    async def fetch_news(self, query: Optional[str] = None) -> list[dict]:
        """Obtiene noticias usando Apify como primario, NewsData.io como fallback."""
        articles = []
        apify_failed = False

        # Intentar con Apify primero (más resultados, mejor para breaking news)
        if self.apify_api_key:
            try:
                articles = await self._fetch_from_apify(query)
                if articles:
                    logger.info(f"Obtenidas {len(articles)} noticias de Apify")
                    return articles
                else:
                    logger.warning(f"Apify retornó 0 resultados para query: {query}")
                    apify_failed = True
            except Exception as e:
                logger.error(f"Error en Apify: {e}")
                apify_failed = True

        # Fallback a NewsData.io si Apify falla o no hay resultados
        if self.newsdata_api_key and (apify_failed or not articles):
            logger.info("Intentando fallback a NewsData.io...")
            try:
                articles = await self._fetch_from_newsdata(query)
                if articles:
                    logger.info(f"Obtenidas {len(articles)} noticias de NewsData.io (fallback)")
                    return articles
            except Exception as e:
                logger.error(f"Error en NewsData.io: {e}")

        return articles

    async def fetch_all_queries(self) -> list[dict]:
        """Obtiene noticias para todas las queries predefinidas."""
        all_articles = []
        seen_urls = set()
        skipped_old = 0

        for query in self.DEFAULT_QUERIES:
            try:
                articles = await self.fetch_news(query)
                for article in articles:
                    url = article.get("url") or article.get("link")
                    if url and url not in seen_urls:
                        # Filtrar artículos antiguos si tenemos last_fetch_time
                        if self.last_fetch_time and article.get("published_at"):
                            if article["published_at"] <= self.last_fetch_time:
                                skipped_old += 1
                                continue
                        seen_urls.add(url)
                        all_articles.append(article)
            except Exception as e:
                logger.error(f"Error fetching query '{query}': {e}")

        if skipped_old > 0:
            logger.info(f"Artículos omitidos por ser antiguos: {skipped_old}")
        logger.info(f"Total de artículos nuevos únicos: {len(all_articles)}")
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
        """Obtiene noticias usando Apify Google News Scraper."""
        from apify_client import ApifyClient

        client = ApifyClient(self.apify_api_key)

        run_input = {
            "query": query or "Venezuela Maduro",
            "language": "es",
            "maxItems": 100,
        }

        try:
            run = client.actor("easyapi/google-news-scraper").call(run_input=run_input)

            # Check if run was successful
            if not run or run.get("status") == "FAILED":
                raise Exception(f"Apify run failed: {run.get('statusMessage', 'Unknown error')}")

            items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
            logger.info(f"Apify devolvió {len(items)} items para query: {query}")
            return self._normalize_apify_articles(items)
        except Exception as e:
            logger.error(f"Apify error para query '{query}': {e}")
            raise  # Re-raise to trigger fallback

    def _normalize_apify_articles(self, articles: list[dict]) -> list[dict]:
        """Normaliza artículos de Apify al formato interno."""
        normalized = []
        now = datetime.utcnow()

        for article in articles:
            # Google News Scraper usa "link" en vez de "url"
            url = article.get("link") or article.get("url") or ""

            # Preferir date_utc (ISO format), fallback a otros campos
            date_str = (
                article.get("date_utc") or  # ISO format: 2025-05-22T00:00:00.000Z
                article.get("publishedAt") or
                article.get("pubDate") or
                article.get("date") or
                article.get("published")
            )

            parsed_date = self._parse_date(date_str)
            # Si no hay fecha, usar fecha actual
            if not parsed_date:
                parsed_date = now

            # Imagen: preferir image, luego thumbnail (puede ser base64)
            image_url = article.get("image") or article.get("thumbnail") or ""
            # No guardar thumbnails base64 muy largos (son de baja calidad)
            if image_url.startswith("data:") and len(image_url) > 5000:
                image_url = ""

            normalized.append({
                "external_id": article.get("id") or url,
                "title": article.get("title", ""),
                "description": article.get("description") or article.get("snippet"),
                "content": article.get("content"),
                "url": url,
                "image_url": image_url,
                "source_name": article.get("source") or article.get("source_name"),
                "published_at": parsed_date,
                "language": "es",
                "country": None,
            })
        return normalized

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parsea fechas en varios formatos."""
        if not date_str:
            return None

        # Si es string, limpiar
        if isinstance(date_str, str):
            date_str = date_str.strip()

        # Manejar fechas relativas comunes de Google News
        if isinstance(date_str, str):
            lower = date_str.lower()
            now = datetime.utcnow()

            # Español
            if "hace" in lower:
                if "minuto" in lower:
                    mins = self._extract_number(date_str) or 1
                    return now - timedelta(minutes=mins)
                elif "hora" in lower:
                    hours = self._extract_number(date_str) or 1
                    return now - timedelta(hours=hours)
                elif "día" in lower or "dia" in lower:
                    days = self._extract_number(date_str) or 1
                    return now - timedelta(days=days)

            # English
            if "ago" in lower:
                if "minute" in lower:
                    mins = self._extract_number(date_str) or 1
                    return now - timedelta(minutes=mins)
                elif "hour" in lower:
                    hours = self._extract_number(date_str) or 1
                    return now - timedelta(hours=hours)
                elif "day" in lower:
                    days = self._extract_number(date_str) or 1
                    return now - timedelta(days=days)

            # "yesterday" / "ayer"
            if "yesterday" in lower or "ayer" in lower:
                return now - timedelta(days=1)

        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%S%z",
            "%a, %d %b %Y %H:%M:%S %Z",
            "%a, %d %b %Y %H:%M:%S %z",
            "%d %b %Y",
            "%b %d, %Y",
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except (ValueError, TypeError):
                continue

        logger.debug(f"Could not parse date: {date_str}")
        return None

    def _extract_number(self, text: str) -> Optional[int]:
        """Extrae el primer número de un texto."""
        import re
        match = re.search(r'\d+', text)
        return int(match.group()) if match else None
