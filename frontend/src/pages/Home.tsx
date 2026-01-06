import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { BarChart3, Network, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { articlesApi } from '../services/api';
import type { ArticleFilters } from '../types';
import Filters from '../components/Filters';
import ArticleList from '../components/ArticleList';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

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
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Noticias LATAM y USA
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Análisis en tiempo real con IA en <span className="text-primary-400 font-medium">LatBot.news</span>. Sesgo político, tono y entidades extraídas automáticamente.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
        {/* Stats Card */}
        <Link
          to="/stats"
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600/20 to-purple-900/30 border border-violet-500/20 p-4 sm:p-5 hover:border-violet-500/40 transition-all duration-300"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <BarChart3 className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-semibold text-white">Estadísticas</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Distribución de sesgo político, tendencias de tono y entidades más mencionadas
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-violet-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-violet-500/10">
            <div className="flex items-center gap-1.5 text-xs text-violet-300">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tendencias</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-violet-300">
              <Users className="w-3.5 h-3.5" />
              <span>Top entidades</span>
            </div>
          </div>
        </Link>

        {/* Entity Graph Card */}
        <Link
          to="/graph"
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-600/20 to-blue-900/30 border border-cyan-500/20 p-4 sm:p-5 hover:border-cyan-500/40 transition-all duration-300"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Network className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-white">Grafo de Entidades</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Visualiza conexiones entre personas, lugares y organizaciones en las noticias
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-cyan-500/10">
            <div className="flex -space-x-1">
              <span className="w-3 h-3 rounded-full bg-red-400 border border-dark-900"></span>
              <span className="w-3 h-3 rounded-full bg-blue-400 border border-dark-900"></span>
              <span className="w-3 h-3 rounded-full bg-green-400 border border-dark-900"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-400 border border-dark-900"></span>
            </div>
            <span className="text-xs text-cyan-300">Interactivo y visual</span>
          </div>
        </Link>
      </div>

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
