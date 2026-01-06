import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, Filter, ZoomIn, ZoomOut, Maximize2, X, Loader2, ExternalLink, Newspaper, TrendingUp, Move, Hand } from 'lucide-react';
import { articlesApi, EntityGraphData, EntityGraphNode } from '../services/api';
import { entityTypeLabels } from '../types';
import type { Article } from '../types';
import SEO from '../components/SEO';

const entityTypeColors: Record<string, string> = {
  person: '#f87171',      // red
  organization: '#60a5fa', // blue
  country: '#34d399',     // green
  city: '#fbbf24',        // yellow
  place: '#a78bfa',       // purple
  date: '#f472b6',        // pink
};

// Detect mobile device
const isMobile = () => window.innerWidth < 768;

export default function EntityGraph() {
  const navigate = useNavigate();
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [graphData, setGraphData] = useState<EntityGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile detection
  const [mobile, setMobile] = useState(isMobile());

  // Filters - fewer nodes on mobile by default
  const [entityType, setEntityType] = useState<string>('');
  const [minConnections, setMinConnections] = useState(2);
  const [limit, setLimit] = useState(mobile ? 40 : 80);

  // Selected node
  const [selectedNode, setSelectedNode] = useState<EntityGraphNode | null>(null);
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [connectedEntities, setConnectedEntities] = useState<string[]>([]);

  // Interaction mode for mobile
  const [dragMode, setDragMode] = useState(true);

  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Handle resize and mobile detection
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const isMobileNow = isMobile();
        setMobile(isMobileNow);
        setDimensions({
          width: rect.width,
          height: Math.max(isMobileNow ? 350 : 400, window.innerHeight - (isMobileNow ? 250 : 200)),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Fetch graph data
  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await articlesApi.getEntityGraph({
        entity_type: entityType || undefined,
        min_connections: minConnections,
        limit,
      });
      setGraphData(data);
    } catch (err) {
      setError('Error al cargar el grafo de entidades');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [entityType, minConnections, limit]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Configure d3 forces for better spacing - tighter on mobile
  useEffect(() => {
    if (graphRef.current && graphData) {
      const fg = graphRef.current;
      // On mobile: tighter clustering, larger nodes more visible
      // On desktop: more spread out
      fg.d3Force('charge')?.strength(mobile ? -200 : -400);
      fg.d3Force('link')?.distance(() => mobile ? 80 : 150);
      fg.d3Force('center')?.strength(mobile ? 0.1 : 0.05);
    }
  }, [graphData, mobile]);

  // Node click handler
  const handleNodeClick = useCallback(async (node: any) => {
    const entityNode = node as EntityGraphNode;
    setSelectedNode(entityNode);
    setSelectedArticles([]);
    setLoadingArticles(true);

    // Find connected entities from links
    if (graphData) {
      const connected = graphData.links
        .filter(link => {
          const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
          return sourceId === entityNode.id || targetId === entityNode.id;
        })
        .map(link => {
          const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
          return sourceId === entityNode.id ? targetId : sourceId;
        })
        .slice(0, 5)
        .map(id => {
          const node = graphData.nodes.find(n => n.id === id);
          return node?.label || id.split(':')[1];
        });
      setConnectedEntities(connected);
    }

    // Fetch article details
    try {
      const articles: Article[] = [];
      for (const articleId of entityNode.articles.slice(0, 5)) {
        try {
          const article = await articlesApi.getArticle(articleId);
          articles.push(article);
        } catch {
          // Skip if article not found
        }
      }
      setSelectedArticles(articles);
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoadingArticles(false);
    }
  }, [graphData]);

  // Navigate to article
  const handleArticleClick = (articleId: string) => {
    navigate(`/article/${articleId}`);
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.3, 300);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.3, 300);
    }
  };

  const handleFitView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  };

  // Node appearance - larger on mobile for touch
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Truncate label - shorter on mobile
    const maxLen = mobile ? 10 : 15;
    const label = node.label.length > maxLen ? node.label.substring(0, maxLen) + '...' : node.label;

    // Larger nodes on mobile for better touch targets
    const baseSize = mobile ? 4 : 3;
    const multiplier = mobile ? 2.5 : 2;
    const fontSize = Math.max(mobile ? 10 : 9, (mobile ? 12 : 11) / globalScale);
    const nodeSize = Math.sqrt(node.count) * multiplier + baseSize;

    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    ctx.fillStyle = entityTypeColors[node.type] || '#6b7280';
    ctx.fill();

    // Draw border for selected node
    if (selectedNode?.id === node.id) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = (mobile ? 3 : 2) / globalScale;
      ctx.stroke();
    }

    // Draw label with background for readability
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Text background
    const textWidth = ctx.measureText(label).width;
    const padding = mobile ? 3 : 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(
      node.x - textWidth / 2 - padding,
      node.y + nodeSize + 2,
      textWidth + padding * 2,
      fontSize + padding
    );

    // Text
    ctx.fillStyle = '#e5e7eb';
    ctx.fillText(label, node.x, node.y + nodeSize + 3);
  }, [selectedNode, mobile]);

  return (
    <div className="min-h-screen pb-8">
      <SEO page="entities" />
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <Network className="w-7 h-7 text-primary-400" />
              Grafo de Entidades
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Explora las relaciones entre personas, lugares y organizaciones en las noticias
            </p>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-lg text-gray-300 hover:bg-dark-700 transition-colors sm:hidden"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`card p-4 mb-4 ${showFilters ? 'block' : 'hidden sm:block'}`}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="w-full sm:w-auto">
            <label className="block text-sm text-gray-400 mb-1">Tipo de entidad</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="person">Personas</option>
              <option value="organization">Organizaciones</option>
              <option value="country">Paises</option>
              <option value="city">Ciudades</option>
              <option value="place">Lugares</option>
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm text-gray-400 mb-1">Min. conexiones</label>
            <select
              value={minConnections}
              onChange={(e) => setMinConnections(Number(e.target.value))}
              className="w-full sm:w-32 px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            >
              <option value={1}>1+</option>
              <option value={2}>2+</option>
              <option value={3}>3+</option>
              <option value={5}>5+</option>
              <option value={10}>10+</option>
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm text-gray-400 mb-1">Max. entidades</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full sm:w-32 px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            >
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={80}>80</option>
              <option value={100}>100</option>
              <option value={150}>150</option>
            </select>
          </div>

          {graphData && (
            <div className="text-sm text-gray-400 sm:ml-auto">
              {graphData.total_entities} entidades, {graphData.total_connections} conexiones
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-dark-700">
          {Object.entries(entityTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              {entityTypeLabels[type] || type}
            </div>
          ))}
        </div>
      </div>

      {/* Graph Container */}
      <div ref={containerRef} className="card relative overflow-hidden" style={{ height: dimensions.height }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-400">
            {error}
          </div>
        ) : graphData && graphData.nodes.length > 0 ? (
          <>
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={(node: any, color, ctx) => {
                // Larger touch area on mobile
                const baseSize = mobile ? 4 : 3;
                const multiplier = mobile ? 2.5 : 2;
                const nodeSize = Math.sqrt(node.count) * multiplier + baseSize;
                const touchPadding = mobile ? 12 : 5;
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeSize + touchPadding, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();
              }}
              onNodeClick={handleNodeClick}
              onNodeDrag={mobile && !dragMode ? undefined : undefined}
              enableNodeDrag={!mobile || dragMode}
              enablePanInteraction={true}
              enableZoomInteraction={true}
              linkColor={() => 'rgba(100, 116, 139, 0.25)'}
              linkWidth={(link: any) => Math.max(mobile ? 1 : 0.5, Math.sqrt(link.value) * (mobile ? 0.8 : 0.5))}
              backgroundColor="transparent"
              cooldownTicks={mobile ? 150 : 200}
              d3AlphaDecay={mobile ? 0.03 : 0.02}
              d3VelocityDecay={mobile ? 0.5 : 0.4}
              nodeRelSize={mobile ? 5 : 4}
              minZoom={mobile ? 0.5 : 0.3}
              maxZoom={mobile ? 4 : 8}
              onEngineStop={() => graphRef.current?.zoomToFit(400, mobile ? 40 : 80)}
            />

            {/* Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              {/* Mobile mode toggle */}
              {mobile && (
                <button
                  onClick={() => setDragMode(!dragMode)}
                  className={`p-3 rounded-lg transition-colors ${
                    dragMode
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-800/90 text-gray-300 hover:bg-dark-700'
                  }`}
                  title={dragMode ? "Modo arrastrar" : "Modo seleccionar"}
                >
                  {dragMode ? <Move className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
                </button>
              )}
              <button
                onClick={handleZoomIn}
                className="p-3 sm:p-2 bg-dark-800/90 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors active:bg-dark-600"
                title="Acercar"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-3 sm:p-2 bg-dark-800/90 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors active:bg-dark-600"
                title="Alejar"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={handleFitView}
                className="p-3 sm:p-2 bg-dark-800/90 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors active:bg-dark-600"
                title="Ajustar vista"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No hay datos para mostrar. Intenta ajustar los filtros.
          </div>
        )}
      </div>

      {/* Selected Node Panel - Enhanced */}
      {selectedNode && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-4 sm:left-4 sm:w-[420px] bg-dark-800 border border-dark-600 rounded-t-2xl sm:rounded-xl shadow-2xl z-50 max-h-[70vh] sm:max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-dark-700">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entityTypeColors[selectedNode.type] }}
                />
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  {entityTypeLabels[selectedNode.type] || selectedNode.type}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white truncate">{selectedNode.label}</h3>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Newspaper className="w-4 h-4" />
                  <span>{selectedNode.count} noticias</span>
                </div>
                {connectedEntities.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-400">
                    <TrendingUp className="w-4 h-4" />
                    <span>{connectedEntities.length} conexiones</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Connected Entities */}
            {connectedEntities.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Relacionado con
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {connectedEntities.map((entity, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-dark-700 text-gray-300 text-xs rounded-md"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Articles */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Noticias recientes
              </h4>

              {loadingArticles ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                </div>
              ) : selectedArticles.length > 0 ? (
                <div className="space-y-2">
                  {selectedArticles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleArticleClick(article.id)}
                      className="w-full text-left p-3 bg-dark-700/50 hover:bg-dark-700 rounded-lg transition-colors group"
                    >
                      <p className="text-sm text-white line-clamp-2 group-hover:text-primary-300 transition-colors">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-500">
                          {article.source_name || 'Fuente'}
                        </span>
                        <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-2">No se encontraron noticias</p>
              )}

              {selectedNode.articles.length > 5 && (
                <button
                  onClick={() => navigate(`/?entity=${encodeURIComponent(selectedNode.label)}`)}
                  className="w-full mt-3 py-2.5 text-sm text-primary-400 hover:text-primary-300 hover:bg-dark-700 rounded-lg transition-colors font-medium"
                >
                  Ver todas las {selectedNode.count} noticias
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile mode indicator */}
      {mobile && graphData && graphData.nodes.length > 0 && (
        <div className="mt-3 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-dark-800 rounded-full text-xs text-gray-400">
            {dragMode ? (
              <>
                <Move className="w-3.5 h-3.5 text-primary-400" />
                <span>Modo arrastrar</span>
              </>
            ) : (
              <>
                <Hand className="w-3.5 h-3.5 text-primary-400" />
                <span>Modo seleccionar</span>
              </>
            )}
            <span className="text-gray-600">|</span>
            <span>Usa el botón para cambiar</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-3 text-center text-sm text-gray-500">
        <span className="hidden sm:inline">Haz clic en una entidad para ver noticias relacionadas. Arrastra para mover, scroll para zoom.</span>
        <span className="sm:hidden">
          {dragMode
            ? "Arrastra para mover nodos. Toca para seleccionar."
            : "Toca una entidad para ver detalles. Pellizca para zoom."
          }
        </span>
      </div>
    </div>
  );
}
