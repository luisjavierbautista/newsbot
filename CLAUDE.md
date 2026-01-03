# CLAUDE.md - LatBot.news Project Guide

## Project Overview
LatBot.news is a Spanish-language news portal focused on LATAM and USA news, featuring AI-powered analysis using Google Gemini.

## Tech Stack

### Backend (FastAPI)
- **Location:** `/backend`
- **Framework:** FastAPI + Uvicorn
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Migrations:** Alembic
- **Scheduler:** APScheduler (fetches news every 10 minutes)
- **AI:** Google Gemini (`gemini-2.5-flash`) for article analysis

### Frontend (Vite + React)
- **Location:** `/frontend`
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS (dark mode)
- **State:** React Query
- **Build:** Vite

## Key Services

### News Fetching (`backend/app/services/news_fetcher.py`)
- **Primary:** Apify Google News Scraper (`easyapi/google-news-scraper`)
- **Fallback:** NewsData.io API
- Fetches articles for predefined queries about Venezuela/LATAM

### AI Analysis (`backend/app/services/gemini_analyzer.py`)
- Model: `gemini-2.5-flash`
- Analyzes: political bias, tone, entities (NER), summary
- Auto-runs after fetching new articles

## Docker Images
- Backend: `imbautista/latbot-backend:latest`
- Frontend: `imbautista/latbot-frontend:latest`

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host:5432/newsbot
NEWSDATA_API_KEY=xxx
GEMINI_API_KEY=xxx
APIFY_API_KEY=xxx
FETCH_INTERVAL_MINUTES=10
CORS_ORIGINS=https://latbot.news,https://www.latbot.news
```

### Frontend (build-time)
```
VITE_API_URL=https://api.latbot.news/api
```

## API Endpoints
- `GET /api/articles` - List articles with filters
- `GET /api/articles/{id}` - Article detail
- `GET /api/stats` - Statistics
- `GET /api/entities` - Entity list
- `POST /api/fetch-now` - Trigger manual fetch
- `POST /api/analyze-pending` - Analyze unprocessed articles

## Common Tasks

### Rebuild and Push Images
```bash
# Backend
cd backend && docker build -t imbautista/latbot-backend:latest . && docker push imbautista/latbot-backend:latest

# Frontend
cd frontend && docker build -t imbautista/latbot-frontend:latest . && docker push imbautista/latbot-frontend:latest
```

### Trigger News Fetch
```bash
curl -X POST https://api.latbot.news/api/fetch-now
```

## Project Structure
```
newsbot/
├── backend/
│   ├── app/
│   │   ├── api/routes.py       # API endpoints
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/
│   │   │   ├── news_fetcher.py # Apify + NewsData.io
│   │   │   ├── gemini_analyzer.py
│   │   │   └── scheduler.py
│   │   ├── config.py
│   │   └── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/api.ts
│   │   └── config/ads.ts
│   ├── Dockerfile
│   └── nginx.conf.template
└── docker-compose.yml
```

## Analytics & Ads
- **Analytics:** Plausible (privacy-focused)
- **Ads:** Google AdSense (`ca-pub-1493654482685437`)
- Ad placements: top banner, sidebar (2x), in-article, footer

## Git Repository
`git@github.com:luisjavierbautista/newsbot.git`
