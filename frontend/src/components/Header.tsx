import { Link } from 'react-router-dom';
import { Newspaper, RefreshCw, BarChart3 } from 'lucide-react';
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
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="p-2 bg-primary-600 rounded-lg">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">LatBot<span className="text-primary-400">.news</span></h1>
              <p className="text-xs text-gray-400">Noticias LATAM con IA</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/?view=stats"
              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="hidden sm:inline">Estadísticas</span>
            </Link>

            <button
              onClick={() => refreshMutation.mutate()}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
