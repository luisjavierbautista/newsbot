import { useQuery } from '@tanstack/react-query';
import { BarChart3, Newspaper, Calendar, Building2, TrendingUp, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { articlesApi } from '../services/api';
import { biasLabels, toneLabels, entityTypeLabels } from '../types';
import MediaBiasSpectrum from '../components/MediaBiasSpectrum';

export default function Stats() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: articlesApi.getStats,
  });

  const { data: sourceStats, isLoading: isLoadingSources } = useQuery({
    queryKey: ['sourceStats'],
    queryFn: () => articlesApi.getSourceStats({ limit: 30, min_articles: 2 }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pb-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-400" />
            Estadísticas
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Análisis y métricas del portal de noticias
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-dark-700 rounded w-1/2 mb-2" />
              <div className="h-8 bg-dark-700 rounded w-1/3" />
            </div>
          ))}
        </div>
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

  const handleEntityClick = (entityValue: string) => {
    navigate(`/?entity=${encodeURIComponent(entityValue)}`);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary-400" />
          Estadísticas
        </h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base">
          Análisis y métricas del portal de noticias
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600/20 rounded-lg">
              <Newspaper className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-400">Total Noticias</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.total_articles.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Calendar className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-400">Hoy</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.articles_today}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-400">Fuentes</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.sources_count}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-600/20 rounded-lg">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-400">Entidades</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.top_entities.length}+</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Political Bias Distribution */}
        <div className="card p-4 sm:p-5">
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
                <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
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

        {/* Tone Distribution */}
        <div className="card p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            Distribución por Tono
          </h3>
          <div className="space-y-3">
            {toneData.map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{item.label}</span>
                  <span className="text-gray-400">{item.value}</span>
                </div>
                <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
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

      {/* Top Entities */}
      {stats.top_entities.length > 0 && (
        <div className="card p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" />
            Entidades más mencionadas
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Haz clic en una entidad para ver sus noticias
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.top_entities.map((entity, i) => (
              <button
                key={i}
                onClick={() => handleEntityClick(entity.value)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm transition-colors group"
              >
                <span className="text-gray-500 text-xs">
                  {entityTypeLabels[entity.type] || entity.type}
                </span>
                <span className="text-white font-medium group-hover:text-primary-300 transition-colors">
                  {entity.value}
                </span>
                <span className="text-primary-400 text-xs font-medium bg-primary-500/20 px-1.5 py-0.5 rounded">
                  {entity.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media Bias Spectrum */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary-400" />
          Análisis por Medio de Comunicación
        </h2>
        {isLoadingSources ? (
          <div className="card p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
          </div>
        ) : sourceStats && sourceStats.sources.length > 0 ? (
          <MediaBiasSpectrum sources={sourceStats.sources} />
        ) : (
          <div className="card p-8 text-center text-gray-400">
            No hay suficientes datos de fuentes para mostrar
          </div>
        )}
      </div>
    </div>
  );
}
