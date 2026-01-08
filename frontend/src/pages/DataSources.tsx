import { Link } from 'react-router-dom';
import {
  Database,
  Globe,
  Cpu,
  Newspaper,
  ArrowLeft,
  ExternalLink,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';

interface SourceCardProps {
  name: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  features: string[];
  role: string;
  color: string;
}

function SourceCard({ name, description, url, icon, features, role, color }: SourceCardProps) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${color}`} />
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-white">{name}</h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-dark-700 text-gray-400 rounded-full">
                {role}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>
        </div>

        <ul className="space-y-2 mb-4">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
              <Zap className="w-3 h-3 text-primary-400 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          Visitar sitio
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export default function DataSources() {
  const sources: SourceCardProps[] = [
    {
      name: 'Apify',
      description: 'Plataforma de web scraping que utilizamos para obtener noticias de Google News en tiempo real.',
      url: 'https://apify.com/',
      icon: <Globe className="w-6 h-6 text-white" />,
      features: [
        'Google News Scraper para noticias en espanol',
        'Hasta 100 articulos por consulta',
        'Actualizacion cada 10 minutos',
        'Cobertura global de fuentes',
      ],
      role: 'Primario',
      color: 'from-green-500 to-emerald-600',
    },
    {
      name: 'GNews',
      description: 'API de noticias con cobertura de mas de 80,000 fuentes en multiples idiomas.',
      url: 'https://gnews.io/',
      icon: <Newspaper className="w-6 h-6 text-white" />,
      features: [
        'Soporte nativo para espanol',
        'Mas de 80,000 fuentes de noticias',
        'Busqueda por palabras clave',
        'Ordenamiento por fecha de publicacion',
      ],
      role: 'Secundario',
      color: 'from-blue-500 to-cyan-600',
    },
    {
      name: 'NewsData.io',
      description: 'API de agregacion de noticias con cobertura en mas de 80 idiomas y filtros avanzados.',
      url: 'https://newsdata.io/',
      icon: <Database className="w-6 h-6 text-white" />,
      features: [
        'Cobertura en 80+ idiomas',
        'Filtros por pais y categoria',
        'Noticias de ultima hora',
        'API REST facil de usar',
      ],
      role: 'Respaldo',
      color: 'from-purple-500 to-pink-600',
    },
    {
      name: 'Google Gemini',
      description: 'Modelo de IA de Google utilizado para analizar el contenido de las noticias.',
      url: 'https://ai.google.dev/',
      icon: <Cpu className="w-6 h-6 text-white" />,
      features: [
        'Analisis de sesgo politico',
        'Deteccion de tono (positivo/negativo/neutro)',
        'Extraccion de entidades (personas, lugares)',
        'Generacion de resumenes automaticos',
      ],
      role: 'Analisis IA',
      color: 'from-orange-500 to-amber-600',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Fuentes de Datos</h1>
          <p className="text-gray-400">
            Conoce las fuentes y tecnologias que utilizamos para recopilar y analizar las noticias.
          </p>
        </div>

        {/* How it works */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-400" />
            Como funciona
          </h2>
          <div className="space-y-3 text-gray-300">
            <p>
              <strong className="text-white">1. Recopilacion:</strong> Cada 10 minutos, nuestro sistema
              busca noticias relevantes sobre Latinoamerica y USA utilizando multiples fuentes de datos.
            </p>
            <p>
              <strong className="text-white">2. Procesamiento:</strong> Las noticias se filtran para
              eliminar duplicados y se almacenan en nuestra base de datos.
            </p>
            <p>
              <strong className="text-white">3. Analisis con IA:</strong> Google Gemini analiza cada
              articulo para detectar sesgo politico, tono emocional y extraer entidades relevantes.
            </p>
            <p>
              <strong className="text-white">4. Presentacion:</strong> Los resultados se muestran en
              tiempo real con graficos interactivos y filtros avanzados.
            </p>
          </div>
        </div>

        {/* Sources Grid */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {sources.map((source) => (
            <SourceCard key={source.name} {...source} />
          ))}
        </div>

        {/* Transparency Note */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            Transparencia
          </h2>
          <div className="space-y-3 text-gray-300 text-sm">
            <p>
              En LatBot News creemos en la transparencia. Todas las noticias provienen de fuentes
              publicas y el analisis de IA es generado automaticamente sin edicion manual.
            </p>
            <p>
              El analisis de sesgo politico es una estimacion basada en el lenguaje utilizado y
              no representa una opinion editorial. Recomendamos siempre consultar multiples fuentes
              y formar tu propia opinion.
            </p>
            <p className="text-gray-500">
              Las marcas y logos mencionados pertenecen a sus respectivos propietarios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
