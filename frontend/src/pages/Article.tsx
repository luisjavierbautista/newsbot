import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Clock, Newspaper, Brain, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { articlesApi } from '../services/api';
import { biasLabels, toneLabels } from '../types';
import EntityTags from '../components/EntityTags';
import SEO from '../components/SEO';

// Parse UTC date string properly
const parseUTCDate = (dateString: string): Date => {
  // If the date string doesn't have timezone info, treat it as UTC
  if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
    return new Date(dateString + 'Z');
  }
  return new Date(dateString);
};

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ['article', id],
    queryFn: () => articlesApi.getArticle(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 animate-pulse space-y-6">
          <div className="h-6 bg-dark-700 rounded w-1/4" />
          <div className="h-10 bg-dark-700 rounded w-3/4" />
          <div className="h-64 bg-dark-700 rounded" />
          <div className="space-y-3">
            <div className="h-4 bg-dark-700 rounded w-full" />
            <div className="h-4 bg-dark-700 rounded w-full" />
            <div className="h-4 bg-dark-700 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg mb-2">Artículo no encontrado</p>
          <Link to="/" className="text-primary-400 hover:text-primary-300">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const publishedDate = article.published_at
    ? format(parseUTCDate(article.published_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
    : 'Fecha desconocida';

  // Explicit mappings to prevent Tailwind from purging dynamic classes
  const biasClasses: Record<string, string> = {
    'left': 'badge-bias-left',
    'center-left': 'badge-bias-center-left',
    'center': 'badge-bias-center',
    'center-right': 'badge-bias-center-right',
    'right': 'badge-bias-right',
  };

  const toneClasses: Record<string, string> = {
    'positive': 'badge-tone-positive',
    'neutral': 'badge-tone-neutral',
    'negative': 'badge-tone-negative',
    'alarming': 'badge-tone-alarming',
  };

  const getBiasClass = (bias: string | null) => {
    if (!bias) return 'badge-bias-center';
    return biasClasses[bias] || 'badge-bias-center';
  };

  const getToneClass = (tone: string | null) => {
    if (!tone) return 'badge-tone-neutral';
    return toneClasses[tone] || 'badge-tone-neutral';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <SEO
        page="article"
        title={`${article.title} - LatBot News`}
        description={article.description || article.analysis?.summary_ai || undefined}
      />
      {/* Botón volver */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver a noticias
      </Link>

      <article className="card overflow-hidden">
        {/* Imagen principal */}
        {article.image_url && (
          <div className="h-64 md:h-96 overflow-hidden">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="p-6 md:p-8">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
            <div className="flex items-center gap-1.5">
              <Newspaper className="w-4 h-4" />
              <span className="font-medium text-gray-300">
                {article.source_name || 'Fuente desconocida'}
              </span>
            </div>
            <span className="text-dark-600">•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{publishedDate}</span>
            </div>
            {article.country && (
              <>
                <span className="text-dark-600">•</span>
                <span>{article.country}</span>
              </>
            )}
          </div>

          {/* Título */}
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {article.title}
          </h1>

          {/* Descripción */}
          {article.description && (
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              {article.description}
            </p>
          )}

          {/* Análisis IA */}
          {article.analysis && (
            <div className="bg-dark-900 rounded-xl p-6 mb-6 border border-dark-700">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary-400" />
                <h2 className="text-lg font-semibold text-white">Análisis con IA</h2>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-3 mb-4">
                {article.analysis.political_bias && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Sesgo del Medio</span>
                    <span className={`badge ${getBiasClass(article.analysis.political_bias)}`}>
                      {biasLabels[article.analysis.political_bias] || article.analysis.political_bias}
                      {article.analysis.bias_confidence && (
                        <span className="ml-1 opacity-70">
                          ({Math.round(article.analysis.bias_confidence * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {article.analysis.tone && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Tono</span>
                    <span className={`badge ${getToneClass(article.analysis.tone)}`}>
                      {toneLabels[article.analysis.tone] || article.analysis.tone}
                      {article.analysis.tone_confidence && (
                        <span className="ml-1 opacity-70">
                          ({Math.round(article.analysis.tone_confidence * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Resumen IA */}
              {article.analysis.summary_ai && (
                <div className="mb-4">
                  <span className="text-xs text-gray-500 block mb-2">Resumen generado</span>
                  <p className="text-gray-300 italic">"{article.analysis.summary_ai}"</p>
                </div>
              )}
            </div>
          )}

          {/* Entidades */}
          {article.entities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Entidades mencionadas
              </h3>
              <EntityTags entities={article.entities} maxVisible={20} />
            </div>
          )}

          {/* Contenido */}
          {article.content && (
            <div className="prose prose-invert max-w-none mb-6">
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {article.content}
              </div>
            </div>
          )}

          {/* Link a fuente original */}
          <div className="pt-6 border-t border-dark-700">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <span>Leer artículo original</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}
