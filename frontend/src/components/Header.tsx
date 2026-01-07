import { Link } from 'react-router-dom';
import { Newspaper, RefreshCw, BarChart3, Network, Sparkles } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { articlesApi } from '../services/api';
import { useState } from 'react';

export default function Header() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMutation = useMutation({
    mutationFn: articlesApi.triggerFetch,
    onMutate: () => setIsRefreshing(true),
    onSettled: () => {
      setTimeout(() => {
        setIsRefreshing(false);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      }, 2000);
    },
  });

  return (
    <header className="bg-dark-900 border-b border-dark-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-w-0">
            <div className="p-1.5 sm:p-2 bg-primary-600 rounded-lg flex-shrink-0">
              <Newspaper className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white truncate">LatBot<span className="text-primary-400">.news</span></h1>
              <p className="text-[10px] sm:text-xs text-gray-400">Noticias LATAM con IA</p>
            </div>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            <Link
              to="/facts"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              title="Hechos del Momento"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden md:inline text-sm">Hechos</span>
            </Link>

            <Link
              to="/graph"
              className="hidden sm:flex items-center gap-1.5 px-2 sm:px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              title="Grafo de Entidades"
            >
              <Network className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden md:inline text-sm">Grafo</span>
            </Link>

            <Link
              to="/stats"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
              title="Estadísticas"
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden md:inline text-sm">Stats</span>
            </Link>

            <button
              onClick={() => refreshMutation.mutate()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-sm">
                {isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
