import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { articlesApi } from '../services/api';
import type { ArticleFilters } from '../types';
import Filters from '../components/Filters';
import ArticleList from '../components/ArticleList';
import StatsPanel from '../components/StatsPanel';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showStats = searchParams.get('view') === 'stats';

  const [filters, setFilters] = useState<ArticleFilters>({
    page: 1,
    page_size: 10,
    search: searchParams.get('search') || undefined,
    political_bias: searchParams.get('bias') || undefined,
    tone: searchParams.get('tone') || undefined,
    entity: searchParams.get('entity') || undefined,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['articles', filters],
    queryFn: () => articlesApi.getArticles(filters),
  });

  const handleFiltersChange = (newFilters: ArticleFilters) => {
    setFilters(newFilters);

    // Actualizar URL params
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.political_bias) params.set('bias', newFilters.political_bias);
    if (newFilters.tone) params.set('tone', newFilters.tone);
    if (newFilters.entity) params.set('entity', newFilters.entity);
    if (showStats) params.set('view', 'stats');
    setSearchParams(params);
  };

  const handleEntityClick = (entity: string) => {
    handleFiltersChange({ ...filters, entity, page: 1 });
  };

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-400 text-lg mb-2">Error al cargar las noticias</p>
        <p className="text-gray-500">Por favor, intenta de nuevo más tarde</p>
      </div>
    );
  }

  return (
    <div>
      {/* Banner principal */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Noticias LATAM y USA
        </h1>
        <p className="text-gray-400">
          Análisis en tiempo real con inteligencia artificial. Sesgo político, tono y entidades extraídas automáticamente.
        </p>
      </div>

      {/* Panel de estadísticas */}
      {showStats && <StatsPanel />}

      {/* Filtros */}
      <Filters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Lista de artículos */}
      <ArticleList
        articles={data?.articles || []}
        total={data?.total || 0}
        page={data?.page || 1}
        totalPages={data?.total_pages || 1}
        isLoading={isLoading}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onEntityClick={handleEntityClick}
      />
    </div>
  );
}
