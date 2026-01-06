import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SourceStats } from '../services/api';
import { biasLabels, toneLabels } from '../types';

interface MediaBiasSpectrumProps {
  sources: SourceStats[];
}

const biasColors: Record<string, string> = {
  'left': '#ef4444',
  'center-left': '#f97316',
  'center': '#6b7280',
  'center-right': '#60a5fa',
  'right': '#3b82f6',
};

const toneIcons: Record<string, typeof TrendingUp> = {
  'positive': TrendingUp,
  'neutral': Minus,
  'negative': TrendingDown,
  'alarming': TrendingDown,
};

const toneColors: Record<string, string> = {
  'positive': 'text-green-400',
  'neutral': 'text-gray-400',
  'negative': 'text-red-400',
  'alarming': 'text-yellow-400',
};

export default function MediaBiasSpectrum({ sources }: MediaBiasSpectrumProps) {
  const navigate = useNavigate();
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Sort by bias score for spectrum display
  const sortedSources = [...sources].sort((a, b) => a.bias_score - b.bias_score);
  const displayedSources = showAll ? sortedSources : sortedSources.slice(0, 10);

  const handleSourceClick = (sourceName: string) => {
    navigate(`/?source=${encodeURIComponent(sourceName)}`);
  };

  // Calculate position on spectrum (0-100%)
  const getSpectrumPosition = (biasScore: number) => {
    // bias_score ranges from -2 to +2, map to 0-100
    return ((biasScore + 2) / 4) * 100;
  };

  // Get gradient color based on position
  const getGradientColor = (biasScore: number) => {
    if (biasScore < -1) return 'from-red-500/30 to-red-600/10';
    if (biasScore < 0) return 'from-orange-500/30 to-orange-600/10';
    if (biasScore < 0.5 && biasScore > -0.5) return 'from-gray-500/30 to-gray-600/10';
    if (biasScore < 1) return 'from-blue-400/30 to-blue-500/10';
    return 'from-blue-500/30 to-blue-600/10';
  };

  return (
    <div className="space-y-6">
      {/* Spectrum Visualization */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Espectro de Sesgo por Medio</h3>
        <p className="text-sm text-gray-400 mb-6">
          Posición de cada fuente en el espectro político basado en el análisis de sus artículos
        </p>

        {/* Spectrum Bar */}
        <div className="relative mb-8">
          {/* Background gradient */}
          <div className="h-12 sm:h-16 rounded-xl bg-gradient-to-r from-red-600/40 via-gray-600/40 to-blue-600/40 relative overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 flex">
              {[0, 25, 50, 75, 100].map((pos) => (
                <div
                  key={pos}
                  className="absolute top-0 bottom-0 w-px bg-white/10"
                  style={{ left: `${pos}%` }}
                />
              ))}
            </div>

            {/* Source bubbles */}
            {displayedSources.map((source, index) => {
              const position = getSpectrumPosition(source.bias_score);
              const size = Math.min(40, Math.max(24, source.total_articles * 2));

              return (
                <button
                  key={source.source_name}
                  onClick={() => setExpandedSource(
                    expandedSource === source.source_name ? null : source.source_name
                  )}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full z-10"
                  style={{
                    left: `${Math.max(5, Math.min(95, position))}%`,
                    zIndex: expandedSource === source.source_name ? 20 : 10 - index,
                  }}
                  title={`${source.source_name}: ${source.total_articles} artículos`}
                >
                  <div
                    className={`rounded-full border-2 border-white/50 shadow-lg flex items-center justify-center text-[10px] font-bold text-white ${
                      expandedSource === source.source_name ? 'ring-2 ring-primary-400' : ''
                    }`}
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: biasColors[source.dominant_bias] || '#6b7280',
                    }}
                  >
                    {source.source_name.charAt(0).toUpperCase()}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Labels */}
          <div className="flex justify-between mt-2 text-xs sm:text-sm">
            <span className="text-red-400 font-medium">Izquierda</span>
            <span className="text-orange-400 font-medium hidden sm:block">Centro-Izq</span>
            <span className="text-gray-400 font-medium">Centro</span>
            <span className="text-blue-300 font-medium hidden sm:block">Centro-Der</span>
            <span className="text-blue-400 font-medium">Derecha</span>
          </div>
        </div>

        {/* Expanded Source Detail */}
        {expandedSource && (
          <div className="mb-4 p-4 bg-dark-700/50 rounded-xl border border-dark-600 animate-in slide-in-from-top-2">
            {(() => {
              const source = sources.find(s => s.source_name === expandedSource);
              if (!source) return null;
              const ToneIcon = toneIcons[source.dominant_tone] || Minus;

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: biasColors[source.dominant_bias] }}
                      >
                        {source.source_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{source.source_name}</h4>
                        <p className="text-sm text-gray-400">{source.total_articles} artículos analizados</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSourceClick(source.source_name)}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm text-white transition-colors"
                    >
                      Ver noticias
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-dark-600">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Sesgo predominante</p>
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${biasColors[source.dominant_bias]}20`,
                          color: biasColors[source.dominant_bias],
                        }}
                      >
                        {biasLabels[source.dominant_bias] || source.dominant_bias}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tono predominante</p>
                      <span className={`inline-flex items-center gap-1 ${toneColors[source.dominant_tone]}`}>
                        <ToneIcon className="w-4 h-4" />
                        {toneLabels[source.dominant_tone] || source.dominant_tone}
                      </span>
                    </div>
                  </div>

                  {/* Mini bias distribution */}
                  <div className="pt-3 border-t border-dark-600">
                    <p className="text-xs text-gray-500 mb-2">Distribución de sesgo</p>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                      {Object.entries(source.bias_distribution).map(([bias, count]) => {
                        const total = Object.values(source.bias_distribution).reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? (count / total) * 100 : 0;
                        if (percentage === 0) return null;
                        return (
                          <div
                            key={bias}
                            className="h-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: biasColors[bias],
                            }}
                            title={`${biasLabels[bias]}: ${count}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center text-xs">
          {Object.entries(biasColors).map(([bias, color]) => (
            <div key={bias} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-400">{biasLabels[bias]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Source List */}
      <div className="card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary-400" />
          Análisis por Medio ({sources.length})
        </h3>

        <div className="space-y-2">
          {displayedSources.map((source) => {
            const ToneIcon = toneIcons[source.dominant_tone] || Minus;

            return (
              <button
                key={source.source_name}
                onClick={() => handleSourceClick(source.source_name)}
                className={`w-full p-3 rounded-lg bg-gradient-to-r ${getGradientColor(source.bias_score)} hover:bg-dark-700/80 transition-all text-left group`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: biasColors[source.dominant_bias] }}
                    >
                      {source.source_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate group-hover:text-primary-300 transition-colors">
                        {source.source_name}
                      </p>
                      <p className="text-xs text-gray-500">{source.total_articles} artículos</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${biasColors[source.dominant_bias]}20`,
                          color: biasColors[source.dominant_bias],
                        }}
                      >
                        {biasLabels[source.dominant_bias]}
                      </span>
                      <span className={`flex items-center gap-1 text-xs ${toneColors[source.dominant_tone]}`}>
                        <ToneIcon className="w-3 h-3" />
                      </span>
                    </div>

                    {/* Mini spectrum bar */}
                    <div className="w-16 h-2 rounded-full bg-gradient-to-r from-red-600/50 via-gray-600/50 to-blue-600/50 relative hidden sm:block">
                      <div
                        className="absolute w-2 h-2 rounded-full bg-white border border-gray-400 top-0 transform -translate-x-1/2"
                        style={{ left: `${getSpectrumPosition(source.bias_score)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {sources.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full mt-4 py-2 text-sm text-primary-400 hover:text-primary-300 flex items-center justify-center gap-1 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Ver todos ({sources.length - 10} más)
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
