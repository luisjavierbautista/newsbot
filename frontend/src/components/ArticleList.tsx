import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Article, ArticleFilters } from '../types';
import ArticleCard from './ArticleCard';
import { AdPlaceholder } from './AdBanner';

interface ArticleListProps {
  articles: Article[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  filters: ArticleFilters;
  onFiltersChange: (filters: ArticleFilters) => void;
  onEntityClick?: (entity: string) => void;
}

export default function ArticleList({
  articles,
  total,
  page,
  totalPages,
  isLoading,
  filters,
  onFiltersChange,
  onEntityClick,
}: ArticleListProps) {
  const handlePageChange = (newPage: number) => {
    onFiltersChange({ ...filters, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-3 sm:p-5 animate-pulse">
            <div className="flex gap-3 sm:gap-4">
              {/* Imagen - oculta en móvil, más pequeña en tablet */}
              <div className="hidden sm:block w-32 md:w-48 lg:w-64 h-24 md:h-32 lg:h-40 bg-dark-700 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 sm:space-y-3">
                <div className="h-3 sm:h-4 bg-dark-700 rounded w-1/3 sm:w-1/4" />
                <div className="h-5 sm:h-6 bg-dark-700 rounded w-full sm:w-3/4" />
                <div className="h-3 sm:h-4 bg-dark-700 rounded w-full" />
                <div className="hidden sm:block h-4 bg-dark-700 rounded w-2/3" />
                <div className="flex gap-2">
                  <div className="h-5 sm:h-6 bg-dark-700 rounded w-16 sm:w-20" />
                  <div className="h-5 sm:h-6 bg-dark-700 rounded w-14 sm:w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-400 text-lg">No se encontraron noticias</p>
        <p className="text-gray-500 mt-2">
          Intenta ajustar los filtros o realizar una nueva búsqueda
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Contador de resultados */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400">
          Mostrando <span className="text-white font-medium">{articles.length}</span> de{' '}
          <span className="text-white font-medium">{total}</span> noticias
        </p>
      </div>

      {/* Lista de artículos con ads intercalados */}
      <div className="space-y-4 mb-8">
        {articles.map((article, index) => (
          <div key={article.id}>
            <ArticleCard article={article} onEntityClick={onEntityClick} />
            {/* Ad cada 3 artículos */}
            {(index + 1) % 3 === 0 && index < articles.length - 1 && (
              <div className="my-4">
                <AdPlaceholder type="in-article" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg bg-dark-800 text-gray-400 hover:bg-dark-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
