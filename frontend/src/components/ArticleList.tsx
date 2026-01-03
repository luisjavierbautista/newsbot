import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Article, ArticleFilters } from '../types';
import ArticleCard from './ArticleCard';

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
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="flex gap-4">
              <div className="w-64 h-40 bg-dark-700 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-dark-700 rounded w-1/4" />
                <div className="h-6 bg-dark-700 rounded w-3/4" />
                <div className="h-4 bg-dark-700 rounded w-full" />
                <div className="h-4 bg-dark-700 rounded w-2/3" />
                <div className="flex gap-2">
                  <div className="h-6 bg-dark-700 rounded w-20" />
                  <div className="h-6 bg-dark-700 rounded w-16" />
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

      {/* Lista de artículos */}
      <div className="space-y-4 mb-8">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} onEntityClick={onEntityClick} />
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
