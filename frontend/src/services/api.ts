import axios from 'axios';
import type { Article, ArticleListResponse, ArticleFilters, Stats, EntityCount } from '../types';

const api = axios.create({
  baseURL: '/api',
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
};

export default api;
