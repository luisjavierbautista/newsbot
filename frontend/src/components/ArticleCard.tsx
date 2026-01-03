import { Link } from 'react-router-dom';
import { ExternalLink, Clock, Newspaper } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Article } from '../types';
import { biasLabels, toneLabels } from '../types';
import EntityTags from './EntityTags';

interface ArticleCardProps {
  article: Article;
  onEntityClick?: (entity: string) => void;
}

export default function ArticleCard({ article, onEntityClick }: ArticleCardProps) {
  const publishedDate = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: es })
    : 'Fecha desconocida';

  const getBiasClass = (bias: string | null) => {
    if (!bias) return 'badge-bias-center';
    return `badge-bias-${bias}`;
  };

  const getToneClass = (tone: string | null) => {
    if (!tone) return 'badge-tone-neutral';
    return `badge-tone-${tone}`;
  };

  return (
    <article className="card overflow-hidden hover:border-dark-600 transition-colors group">
      <div className="flex flex-col md:flex-row">
        {/* Imagen */}
        {article.image_url && (
          <div className="md:w-64 h-48 md:h-auto flex-shrink-0 overflow-hidden">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 p-5">
          {/* Header: Fuente y Fecha */}
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
            <div className="flex items-center gap-1.5">
              <Newspaper className="w-4 h-4" />
              <span className="font-medium text-gray-300">{article.source_name || 'Fuente desconocida'}</span>
            </div>
            <span className="text-dark-600">•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{publishedDate}</span>
            </div>
          </div>

          {/* Título */}
          <Link to={`/article/${article.id}`}>
            <h2 className="text-xl font-semibold text-white mb-2 hover:text-primary-400 transition-colors line-clamp-2">
              {article.title}
            </h2>
          </Link>

          {/* Descripción */}
          {article.description && (
            <p className="text-gray-400 mb-4 line-clamp-2">{article.description}</p>
          )}

          {/* Badges de análisis */}
          {article.analysis && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {article.analysis.political_bias && (
                <span className={`badge ${getBiasClass(article.analysis.political_bias)}`}>
                  {biasLabels[article.analysis.political_bias] || article.analysis.political_bias}
                </span>
              )}
              {article.analysis.tone && (
                <span className={`badge ${getToneClass(article.analysis.tone)}`}>
                  {toneLabels[article.analysis.tone] || article.analysis.tone}
                </span>
              )}
            </div>
          )}

          {/* Entidades */}
          {article.entities.length > 0 && (
            <div className="mb-4">
              <EntityTags
                entities={article.entities}
                maxVisible={4}
                onEntityClick={(e) => onEntityClick?.(e.entity_value)}
              />
            </div>
          )}

          {/* Footer: Link externo */}
          <div className="flex items-center justify-between pt-3 border-t border-dark-700">
            <Link
              to={`/article/${article.id}`}
              className="text-primary-400 hover:text-primary-300 text-sm font-medium"
            >
              Ver análisis completo
            </Link>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <span>Fuente original</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
