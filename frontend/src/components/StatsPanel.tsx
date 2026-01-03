import { useQuery } from '@tanstack/react-query';
import { BarChart3, Newspaper, Calendar, Building2, TrendingUp } from 'lucide-react';
import { articlesApi } from '../services/api';
import { biasLabels, toneLabels, entityTypeLabels } from '../types';

export default function StatsPanel() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: articlesApi.getStats,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-dark-700 rounded w-1/2 mb-2" />
            <div className="h-8 bg-dark-700 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const biasData = Object.entries(stats.bias_distribution).map(([key, value]) => ({
    label: biasLabels[key] || key,
    value,
    key,
  }));

  const toneData = Object.entries(stats.tone_distribution).map(([key, value]) => ({
    label: toneLabels[key] || key,
    value,
    key,
  }));

  const maxBias = Math.max(...biasData.map((d) => d.value), 1);
  const maxTone = Math.max(...toneData.map((d) => d.value), 1);

  return (
    <div className="space-y-6 mb-8">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600/20 rounded-lg">
              <Newspaper className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Noticias</p>
              <p className="text-2xl font-bold text-white">{stats.total_articles}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Calendar className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Hoy</p>
              <p className="text-2xl font-bold text-white">{stats.articles_today}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Fuentes</p>
              <p className="text-2xl font-bold text-white">{stats.sources_count}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-600/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Entidades Top</p>
              <p className="text-2xl font-bold text-white">{stats.top_entities.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución de sesgo */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            Distribución por Sesgo Político
          </h3>
          <div className="space-y-3">
            {biasData.map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{item.label}</span>
                  <span className="text-gray-400">{item.value}</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.key === 'left'
                        ? 'bg-red-500'
                        : item.key === 'center-left'
                        ? 'bg-orange-500'
                        : item.key === 'center'
                        ? 'bg-gray-500'
                        : item.key === 'center-right'
                        ? 'bg-blue-400'
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${(item.value / maxBias) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución de tono */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            Distribución por Tono
          </h3>
          <div className="space-y-3">
            {toneData.map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{item.label}</span>
                  <span className="text-gray-400">{item.value}</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.key === 'positive'
                        ? 'bg-green-500'
                        : item.key === 'neutral'
                        ? 'bg-gray-500'
                        : item.key === 'negative'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${(item.value / maxTone) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top entidades */}
      {stats.top_entities.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Entidades más mencionadas</h3>
          <div className="flex flex-wrap gap-2">
            {stats.top_entities.map((entity, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-dark-700 rounded-lg text-sm"
              >
                <span className="text-gray-400 text-xs">
                  {entityTypeLabels[entity.type] || entity.type}
                </span>
                <span className="text-white font-medium">{entity.value}</span>
                <span className="text-primary-400 text-xs font-medium">{entity.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
