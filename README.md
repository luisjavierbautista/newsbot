# NewsBot LATAM

Portal de noticias en español enfocado en LATAM y USA con análisis de IA.

## Características

- **Obtención automática de noticias** cada 10 minutos desde NewsData.io (con fallback a Apify)
- **Análisis con Gemini AI**:
  - Clasificación de sesgo político del medio
  - Análisis de tono (positivo, neutral, negativo, alarmista)
  - Extracción de entidades (personas, lugares, organizaciones, fechas)
  - Resumen automático
- **Frontend moderno** con dark mode, filtros y búsqueda
- **API REST** completa con FastAPI

## Requisitos

- Docker y Docker Compose
- Python 3.11+
- Node.js 18+
- API Keys:
  - [NewsData.io](https://newsdata.io/) (gratis: 200 créditos/día)
  - [Google Gemini](https://aistudio.google.com/apikey) (gratis con límites)
  - [Apify](https://apify.com/) (opcional, para fallback)

## Instalación

### 1. Clonar y configurar

```bash
cd newsbot

# Copiar archivo de configuración
cp backend/.env.example backend/.env

# Editar .env con tus API keys
nano backend/.env
```

### 2. Iniciar PostgreSQL

```bash
docker-compose up -d
```

### 3. Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

## Uso

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/articles` | Lista artículos (paginado, filtros) |
| GET | `/api/articles/{id}` | Detalle con análisis |
| GET | `/api/articles/search/{query}` | Búsqueda |
| GET | `/api/entities` | Lista entidades |
| GET | `/api/stats` | Estadísticas |
| POST | `/api/fetch-now` | Trigger manual de fetch |

### Filtros disponibles

```
GET /api/articles?political_bias=left,center&tone=negative&entity=Maduro&source=infobae
```

## Estructura del Proyecto

```
newsbot/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints
│   │   ├── models/       # SQLAlchemy
│   │   ├── schemas/      # Pydantic
│   │   ├── services/     # News fetcher, Gemini, Scheduler
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Home, Article
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript types
│   └── package.json
└── docker-compose.yml
```

## Configuración

Variables de entorno en `backend/.env`:

```env
DATABASE_URL=postgresql://newsbot:newsbot123@localhost:5432/newsbot
NEWSDATA_API_KEY=tu_api_key
GEMINI_API_KEY=tu_api_key
APIFY_API_KEY=tu_api_key  # opcional
FETCH_INTERVAL_MINUTES=10
```

## Desarrollo

El scheduler automáticamente:
1. Obtiene noticias de NewsData.io
2. Si falla, usa Apify como fallback
3. Analiza cada artículo con Gemini
4. Guarda en PostgreSQL

Para forzar una actualización manual:
```bash
curl -X POST http://localhost:8000/api/fetch-now
```
