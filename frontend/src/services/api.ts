import axios from 'axios';
import type { Article, ArticleListResponse, ArticleFilters, Stats, EntityCount } from '../types';

// Use environment variable or fallback to relative /api path
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const articlesApi = {
  getArticles: async (filters: ArticleFilters = {}): Promise<ArticleListResponse> => {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());
    if (filters.political_bias) params.append('political_bias', filters.political_bias);
    if (filters.tone) params.append('tone', filters.tone);
    if (filters.entity) params.append('entity', filters.entity);
    if (filters.source) params.append('source', filters.source);
    if (filters.search) params.append('search', filters.search);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);

    const response = await api.get<ArticleListResponse>(`/articles?${params.toString()}`);
    return response.data;
  },

  getArticle: async (id: string): Promise<Article> => {
    const response = await api.get<Article>(`/articles/${id}`);
    return response.data;
  },

  searchArticles: async (query: string, limit = 20): Promise<Article[]> => {
    const response = await api.get<Article[]>(`/articles/search/${encodeURIComponent(query)}?limit=${limit}`);
    return response.data;
  },

  getEntities: async (entityType?: string, limit = 50): Promise<EntityCount[]> => {
    const params = new URLSearchParams();
    if (entityType) params.append('entity_type', entityType);
    params.append('limit', limit.toString());

    const response = await api.get<EntityCount[]>(`/entities?${params.toString()}`);
    return response.data;
  },

  getStats: async (): Promise<Stats> => {
    const response = await api.get<Stats>('/stats');
    return response.data;
  },

  triggerFetch: async (): Promise<{ status: string; message: string }> => {
    const response = await api.post<{ status: string; message: string }>('/fetch-now');
    return response.data;
  },

  getEntityGraph: async (params: {
    entity_type?: string;
    min_connections?: number;
    limit?: number;
  } = {}): Promise<EntityGraphData> => {
    const searchParams = new URLSearchParams();
    if (params.entity_type) searchParams.append('entity_type', params.entity_type);
    if (params.min_connections) searchParams.append('min_connections', params.min_connections.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await api.get<EntityGraphData>(`/entity-graph?${searchParams.toString()}`);
    return response.data;
  },

  getSourceStats: async (params: {
    limit?: number;
    min_articles?: number;
  } = {}): Promise<SourceStatsResponse> => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.min_articles) searchParams.append('min_articles', params.min_articles.toString());

    const response = await api.get<SourceStatsResponse>(`/stats/sources?${searchParams.toString()}`);
    return response.data;
  },

  getFacts: async (params: {
    date_from?: string;
    date_to?: string;
    refresh?: boolean;
  } = {}): Promise<FactsResponse> => {
    const searchParams = new URLSearchParams();
    if (params.date_from) searchParams.append('date_from', params.date_from);
    if (params.date_to) searchParams.append('date_to', params.date_to);
    if (params.refresh) searchParams.append('refresh', 'true');

    const response = await api.get<FactsResponse>(`/facts?${searchParams.toString()}`);
    return response.data;
  },
};

export interface EntityGraphNode {
  id: string;
  label: string;
  type: string;
  count: number;
  articles: string[];
}

export interface EntityGraphLink {
  source: string;
  target: string;
  value: number;
  articles: string[];
}

export interface EntityGraphData {
  nodes: EntityGraphNode[];
  links: EntityGraphLink[];
  total_entities: number;
  total_connections: number;
}

export interface SourceStats {
  source_name: string;
  total_articles: number;
  bias_score: number; // -2 (left) to +2 (right)
  dominant_bias: string;
  dominant_tone: string;
  bias_distribution: Record<string, number>;
  tone_distribution: Record<string, number>;
}

export interface SourceStatsResponse {
  sources: SourceStats[];
  total_sources: number;
}

export interface FactSource {
  id: string;
  title: string;
  source: string;
  url: string;
  published_at: string | null;
  bias: string | null;
  tone: string | null;
}

export interface Fact {
  id: string;
  fact: string;
  category: 'evento' | 'declaracion' | 'dato' | 'decision' | 'conflicto' | 'acuerdo';
  importance: 'alta' | 'media' | 'baja';
  who: string[];
  when: string | null;
  where: string | null;
  quote: string | null;
  quote_author: string | null;
  sources: FactSource[];
  source_count: number;
  verification: 'alto' | 'medio' | 'bajo';
  sentiment: 'positivo' | 'negativo' | 'neutral' | 'alarmante';
}

export interface TimelineEvent {
  date: string;
  event: string;
  fact_ids: string[];
}

export interface KeyFigure {
  name: string;
  role: string;
  stance: string;
  mentions: number;
}

export interface FactsResponse {
  facts: Fact[];
  timeline_events: TimelineEvent[];
  key_figures: KeyFigure[];
  article_count: number;
  articles_processed?: number;
  date_from?: string;
  date_to?: string;
  generated_at?: string;
  cached?: boolean;
  error?: string;
}

export default api;
