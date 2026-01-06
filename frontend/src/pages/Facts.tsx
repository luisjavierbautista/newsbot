import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  Clock,
  MapPin,
  Users,
  Quote,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Flame,
  TrendingUp,
  Calendar,
  User,
  RefreshCw,
  Zap,
  Target,
  MessageSquare,
  Scale,
  Handshake,
  AlertTriangle,
} from 'lucide-react';
import { articlesApi, Fact, KeyFigure, TimelineEvent } from '../services/api';
import SEO from '../components/SEO';

// Category icons and colors
const categoryConfig: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  evento: { icon: Zap, color: 'from-purple-500 to-pink-500', label: 'Evento' },
  declaracion: { icon: MessageSquare, color: 'from-blue-500 to-cyan-500', label: 'Declaracion' },
  dato: { icon: Target, color: 'from-green-500 to-emerald-500', label: 'Dato' },
  decision: { icon: Scale, color: 'from-orange-500 to-amber-500', label: 'Decision' },
  conflicto: { icon: AlertTriangle, color: 'from-red-500 to-rose-500', label: 'Conflicto' },
  acuerdo: { icon: Handshake, color: 'from-teal-500 to-green-500', label: 'Acuerdo' },
};

const sentimentColors: Record<string, string> = {
  positivo: 'bg-green-500',
  negativo: 'bg-red-500',
  neutral: 'bg-gray-500',
  alarmante: 'bg-yellow-500',
};

const verificationConfig: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  alto: { icon: ShieldCheck, color: 'text-green-400', label: 'Verificado' },
  medio: { icon: Shield, color: 'text-yellow-400', label: 'Parcial' },
  bajo: { icon: ShieldAlert, color: 'text-gray-400', label: 'Sin verificar' },
};

// Fact Card Component
function FactCard({ fact, index, isActive }: { fact: Fact; index: number; isActive: boolean }) {
  const config = categoryConfig[fact.category] || categoryConfig.evento;
  const CategoryIcon = config.icon;
  const verification = verificationConfig[fact.verification] || verificationConfig.bajo;
  const VerificationIcon = verification.icon;

  return (
    <div
      className={`relative w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto transition-all duration-500 ${
        isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-50'
      }`}
    >
      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-dark-800 to-dark-900 border border-dark-600 shadow-2xl">
        {/* Gradient header */}
        <div className={`h-1.5 sm:h-2 bg-gradient-to-r ${config.color}`} />

        {/* Category badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
          <div className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-gradient-to-r ${config.color} text-white text-[10px] sm:text-xs font-bold shadow-lg`}>
            <CategoryIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {config.label}
          </div>
        </div>

        {/* Importance indicator */}
        {fact.importance === 'alta' && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
            <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] sm:text-xs font-bold">
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              HOT
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 pt-12 sm:p-6 sm:pt-14">
          {/* Main fact */}
          <p className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight mb-3 sm:mb-4">
            {fact.fact}
          </p>

          {/* Quote if exists */}
          {fact.quote && (
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-dark-700/50 rounded-lg sm:rounded-xl border-l-4 border-primary-500">
              <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400 mb-1.5 sm:mb-2" />
              <p className="text-xs sm:text-sm text-gray-300 italic">"{fact.quote}"</p>
              {fact.quote_author && (
                <p className="text-[10px] sm:text-xs text-primary-400 mt-1.5 sm:mt-2 font-medium">— {fact.quote_author}</p>
              )}
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            {fact.who.length > 0 && (
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-dark-700 text-[10px] sm:text-xs text-gray-300">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-400" />
                <span className="truncate max-w-[100px] sm:max-w-none">{fact.who.slice(0, 2).join(', ')}</span>
              </div>
            )}
            {fact.where && (
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-dark-700 text-[10px] sm:text-xs text-gray-300">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-400" />
                <span className="truncate max-w-[80px] sm:max-w-none">{fact.where}</span>
              </div>
            )}
            {fact.when && (
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-dark-700 text-[10px] sm:text-xs text-gray-300">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-400" />
                {fact.when}
              </div>
            )}
          </div>

          {/* Verification & Sources */}
          <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-dark-700">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <VerificationIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${verification.color}`} />
              <div>
                <p className="text-[10px] sm:text-xs font-medium text-white">{verification.label}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">{fact.source_count} fuente{fact.source_count !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Sentiment dot */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${sentimentColors[fact.sentiment]}`} />
              <span className="text-[10px] sm:text-xs text-gray-400 capitalize">{fact.sentiment}</span>
            </div>
          </div>

          {/* Sources preview */}
          {fact.sources.length > 0 && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-dark-700">
              <p className="text-[10px] sm:text-xs text-gray-500 mb-1.5 sm:mb-2">Fuentes:</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {fact.sources.slice(0, 3).map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-dark-700 hover:bg-dark-600 text-[10px] sm:text-xs text-gray-300 transition-colors"
                  >
                    <span className="truncate max-w-[60px] sm:max-w-none">{source.source}</span>
                    <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card number */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 text-[10px] sm:text-xs text-dark-500 font-mono">
          #{index + 1}
        </div>
      </div>
    </div>
  );
}

// Key Figure Card
function KeyFigureCard({ figure }: { figure: KeyFigure }) {
  return (
    <div className="flex-shrink-0 w-32 sm:w-40 p-3 sm:p-4 bg-gradient-to-br from-dark-800 to-dark-900 rounded-xl sm:rounded-2xl border border-dark-600">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-base sm:text-lg mb-2 sm:mb-3">
        {figure.name.charAt(0)}
      </div>
      <h4 className="font-bold text-white text-xs sm:text-sm truncate">{figure.name}</h4>
      <p className="text-[10px] sm:text-xs text-gray-400 truncate">{figure.role}</p>
      <p className="text-[10px] sm:text-xs text-primary-400 mt-1.5 sm:mt-2 line-clamp-2">{figure.stance}</p>
      <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-gray-500">
        <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        {figure.mentions} menciones
      </div>
    </div>
  );
}

// Timeline Component
function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="relative">
      {/* Line */}
      <div className="absolute left-3 sm:left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-purple-500 to-pink-500" />

      <div className="space-y-4 sm:space-y-6">
        {events.map((event, i) => (
          <div key={i} className="relative pl-8 sm:pl-10">
            {/* Dot */}
            <div className="absolute left-1.5 sm:left-2.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary-500 ring-2 sm:ring-4 ring-dark-900" />

            <div className="p-3 sm:p-4 bg-dark-800/50 rounded-lg sm:rounded-xl border border-dark-700">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400" />
                <span className="text-xs sm:text-sm font-medium text-primary-400">{event.date}</span>
              </div>
              <p className="text-white text-xs sm:text-sm">{event.event}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Facts() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hours, setHours] = useState(24);
  const carouselRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['facts', hours],
    queryFn: () => articlesApi.getFacts({ hours }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const facts = data?.facts || [];
  const keyFigures = data?.key_figures || [];
  const timelineEvents = data?.timeline_events || [];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => Math.min(facts.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [facts.length]);

  // Touch swipe for mobile
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentIndex((prev) => Math.min(facts.length - 1, prev + 1));
      } else {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    }
  };

  return (
    <div className="min-h-screen pb-6 sm:pb-8 overflow-x-hidden">
      <SEO page="facts" />
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl mb-6 sm:mb-8 p-4 sm:p-6 md:p-8 bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800 border border-dark-700">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-32 sm:w-48 md:w-72 h-32 sm:h-48 md:h-72 bg-primary-500 rounded-full filter blur-[60px] sm:blur-[80px] md:blur-[100px] animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-32 sm:w-48 md:w-72 h-32 sm:h-48 md:h-72 bg-purple-500 rounded-full filter blur-[60px] sm:blur-[80px] md:blur-[100px] animate-pulse delay-1000" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg shadow-primary-500/25">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Hechos del Momento</h1>
              <p className="text-xs sm:text-sm text-gray-400">Informacion verificada de multiples fuentes</p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 max-w-2xl">
            Hechos concretos extraidos de <span className="text-primary-400 font-semibold">{data?.article_count || 0} noticias</span> usando IA.
            <span className="hidden sm:inline"> Cada hecho muestra cuantas fuentes lo confirman.</span>
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg sm:rounded-xl text-white text-xs sm:text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value={6}>6 horas</option>
              <option value={12}>12 horas</option>
              <option value={24}>24 horas</option>
              <option value={48}>48 horas</option>
              <option value={72}>72 horas</option>
            </select>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-dark-700 border-t-primary-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-primary-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-400 mt-4">Analizando noticias con IA...</p>
          <p className="text-gray-500 text-sm">Esto puede tomar unos segundos</p>
        </div>
      ) : facts.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No se encontraron hechos en este periodo</p>
          <p className="text-gray-500 text-sm mt-2">Intenta ampliar el rango de tiempo</p>
        </div>
      ) : (
        <>
          {/* Fact Cards Carousel */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4 px-1 sm:px-2">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                <span className="hidden xs:inline">Hechos Principales</span>
                <span className="xs:hidden">Hechos</span>
                <span className="text-xs sm:text-sm font-normal text-gray-400">({facts.length})</span>
              </h2>

              {/* Navigation */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-dark-700 text-white disabled:opacity-30 hover:bg-dark-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="text-xs sm:text-sm text-gray-400 min-w-[2.5rem] sm:min-w-[3rem] text-center">
                  {currentIndex + 1}/{facts.length}
                </span>
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(facts.length - 1, prev + 1))}
                  disabled={currentIndex === facts.length - 1}
                  className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-dark-700 text-white disabled:opacity-30 hover:bg-dark-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Cards */}
            <div
              ref={carouselRef}
              className="relative overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {facts.map((fact, index) => (
                  <div key={fact.id} className="w-full flex-shrink-0 px-2 sm:px-4">
                    <FactCard fact={fact} index={index} isActive={index === currentIndex} />
                  </div>
                ))}
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-1 sm:gap-1.5 mt-4 sm:mt-6">
                {facts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-1 sm:h-1.5 rounded-full transition-all ${
                      index === currentIndex
                        ? 'w-4 sm:w-6 bg-primary-500'
                        : 'w-1 sm:w-1.5 bg-dark-600 hover:bg-dark-500'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Swipe hint for mobile */}
            <p className="text-center text-[10px] sm:text-xs text-gray-500 mt-3 sm:mt-4 sm:hidden">
              Desliza para ver mas hechos
            </p>
          </div>

          {/* Key Figures */}
          {keyFigures.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 px-1 sm:px-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                Figuras Clave
              </h2>
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 sm:pb-4 px-1 sm:px-2 scrollbar-hide">
                {keyFigures.map((figure, i) => (
                  <KeyFigureCard key={i} figure={figure} />
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timelineEvents.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 px-1 sm:px-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                Cronologia
              </h2>
              <div className="px-1 sm:px-2">
                <Timeline events={timelineEvents} />
              </div>
            </div>
          )}

          {/* All Facts Grid (collapsed view) */}
          <div className="mt-8 sm:mt-10">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 px-1 sm:px-2">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              Todos los Hechos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 px-1 sm:px-2">
              {facts.map((fact, i) => {
                const config = categoryConfig[fact.category] || categoryConfig.evento;
                const CategoryIcon = config.icon;
                const verification = verificationConfig[fact.verification];
                const VerificationIcon = verification.icon;

                return (
                  <button
                    key={fact.id}
                    onClick={() => setCurrentIndex(i)}
                    className="text-left p-3 sm:p-4 bg-dark-800 hover:bg-dark-700 rounded-lg sm:rounded-xl border border-dark-700 transition-colors group"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className={`p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-gradient-to-br ${config.color} flex-shrink-0`}>
                        <CategoryIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs sm:text-sm font-medium line-clamp-2 group-hover:text-primary-300 transition-colors">
                          {fact.fact}
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
                          <div className="flex items-center gap-1">
                            <VerificationIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${verification.color}`} />
                            <span className="text-[10px] sm:text-xs text-gray-400">{fact.source_count} fuentes</span>
                          </div>
                          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${sentimentColors[fact.sentiment]}`} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
