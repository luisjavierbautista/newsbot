import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Flame,
  RefreshCw,
  Zap,
  MessageSquare,
  Target,
  Scale,
  Handshake,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { articlesApi, Fact } from '../services/api';

// Category icons and colors (same as Facts page)
const categoryConfig: Record<string, { icon: typeof Zap; color: string }> = {
  evento: { icon: Zap, color: 'from-purple-500 to-pink-500' },
  declaracion: { icon: MessageSquare, color: 'from-blue-500 to-cyan-500' },
  dato: { icon: Target, color: 'from-green-500 to-emerald-500' },
  decision: { icon: Scale, color: 'from-orange-500 to-amber-500' },
  conflicto: { icon: AlertTriangle, color: 'from-red-500 to-rose-500' },
  acuerdo: { icon: Handshake, color: 'from-teal-500 to-green-500' },
};

const verificationConfig: Record<string, { icon: typeof Shield; color: string }> = {
  alto: { icon: ShieldCheck, color: 'text-green-400' },
  medio: { icon: Shield, color: 'text-yellow-400' },
  bajo: { icon: ShieldAlert, color: 'text-gray-400' },
};

// Compact Fact Card for Widget
function WidgetFactCard({ fact }: { fact: Fact }) {
  const config = categoryConfig[fact.category] || categoryConfig.evento;
  const CategoryIcon = config.icon;
  const verification = verificationConfig[fact.verification] || verificationConfig.bajo;
  const VerificationIcon = verification.icon;

  return (
    <div className="relative bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Gradient accent */}
      <div className={`h-1 bg-gradient-to-r ${config.color}`} />

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-md bg-gradient-to-br ${config.color}`}>
              <CategoryIcon className="w-3 h-3 text-white" />
            </div>
            {fact.importance === 'alta' && (
              <div className="flex items-center gap-1 text-red-400">
                <Flame className="w-3 h-3" />
                <span className="text-[10px] font-bold">HOT</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <VerificationIcon className={`w-3.5 h-3.5 ${verification.color}`} />
            <span className="text-[10px] text-gray-400">{fact.source_count}</span>
          </div>
        </div>

        {/* Fact text */}
        <p className="text-sm text-white font-medium leading-snug line-clamp-3">
          {fact.fact}
        </p>

        {/* Sources */}
        {fact.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {fact.sources.slice(0, 2).map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-dark-700 hover:bg-dark-600 text-[10px] text-gray-400 transition-colors"
              >
                <span className="truncate max-w-[60px]">{source.source}</span>
                <ExternalLink className="w-2 h-2" />
              </a>
            ))}
            {fact.sources.length > 2 && (
              <span className="text-[10px] text-gray-500">+{fact.sources.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FactsWidget() {
  // Get yesterday and today's dates
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['facts-widget'],
    queryFn: () => articlesApi.getFacts({
      date_from: formatDate(yesterday),
      date_to: formatDate(today),
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const facts = data?.facts?.slice(0, 5) || []; // Show only top 5 facts

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-sm border-b border-dark-800">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">LatBot Hechos</h1>
              <p className="text-[10px] text-gray-500">{data?.article_count || 0} noticias analizadas</p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Facts List */}
      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 rounded-full border-2 border-dark-700 border-t-primary-500 animate-spin" />
            <p className="text-gray-500 text-xs mt-3">Cargando hechos...</p>
          </div>
        ) : facts.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No hay hechos disponibles</p>
          </div>
        ) : (
          facts.map((fact) => (
            <WidgetFactCard key={fact.id} fact={fact} />
          ))
        )}
      </main>

      {/* Footer - Open Full App */}
      <footer className="sticky bottom-0 bg-dark-900/95 backdrop-blur-sm border-t border-dark-800 p-3">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Abrir App Completa
          <ArrowRight className="w-4 h-4" />
        </Link>
      </footer>
    </div>
  );
}
