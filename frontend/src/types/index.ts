export interface Entity {
  id: string;
  entity_type: 'person' | 'place' | 'organization' | 'date' | 'country' | 'city';
  entity_value: string;
  relevance: number;
}

export interface ArticleAnalysis {
  id: string;
  political_bias: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | null;
  bias_confidence: number | null;
  tone: 'positive' | 'neutral' | 'negative' | 'alarming' | null;
  tone_confidence: number | null;
  summary_ai: string | null;
  analyzed_at: string | null;
}

export interface Article {
  id: string;
  external_id: string | null;
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  image_url: string | null;
  source_name: string | null;
  published_at: string | null;
  fetched_at: string;
  created_at: string;
  language: string;
  country: string | null;
  analysis: ArticleAnalysis | null;
  entities: Entity[];
}

export interface ArticleListResponse {
  articles: Article[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EntityCount {
  type: string;
  value: string;
  count: number;
}

export interface Stats {
  total_articles: number;
  articles_today: number;
  sources_count: number;
  bias_distribution: Record<string, number>;
  tone_distribution: Record<string, number>;
  top_entities: EntityCount[];
}

export interface ArticleFilters {
  page?: number;
  page_size?: number;
  political_bias?: string;
  tone?: string;
  entity?: string;
  source?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

// Mapeos para UI en español
export const biasLabels: Record<string, string> = {
  'left': 'Izquierda',
  'center-left': 'Centro-Izquierda',
  'center': 'Centro',
  'center-right': 'Centro-Derecha',
  'right': 'Derecha',
};

export const toneLabels: Record<string, string> = {
  'positive': 'Positivo',
  'neutral': 'Neutral',
  'negative': 'Negativo',
  'alarming': 'Alarmista',
};

export const entityTypeLabels: Record<string, string> = {
  'person': 'Persona',
  'place': 'Lugar',
  'organization': 'Organización',
  'date': 'Fecha',
  'country': 'País',
  'city': 'Ciudad',
};

export const biasColors: Record<string, string> = {
  'left': 'bg-red-500',
  'center-left': 'bg-orange-500',
  'center': 'bg-gray-500',
  'center-right': 'bg-blue-400',
  'right': 'bg-blue-600',
};

export const toneColors: Record<string, string> = {
  'positive': 'bg-green-500',
  'neutral': 'bg-gray-500',
  'negative': 'bg-red-500',
  'alarming': 'bg-yellow-500',
};
