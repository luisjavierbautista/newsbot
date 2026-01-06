import { Helmet } from 'react-helmet-async';

interface SEOProps {
  page: 'home' | 'facts' | 'sources' | 'entities' | 'article' | 'default';
  title?: string;
  description?: string;
}

const PAGE_META = {
  home: {
    title: 'LatBot News - Noticias LATAM con IA',
    description: 'Portal de noticias de Latinoamerica y USA con analisis de inteligencia artificial.',
  },
  facts: {
    title: 'Hechos Verificados - LatBot News',
    description: 'Hechos verificados y timeline de eventos extraidos de las noticias mas recientes.',
  },
  sources: {
    title: 'Analisis de Fuentes - LatBot News',
    description: 'Analisis del sesgo politico y tono de los principales medios de comunicacion.',
  },
  entities: {
    title: 'Red de Entidades - LatBot News',
    description: 'Visualizacion de las conexiones entre personas, organizaciones y lugares en las noticias.',
  },
  article: {
    title: 'Articulo - LatBot News',
    description: 'Noticia con analisis de IA: sesgo politico, tono y entidades extraidas.',
  },
  default: {
    title: 'LatBot News - Noticias LATAM con IA',
    description: 'Portal de noticias de Latinoamerica y USA con analisis de inteligencia artificial.',
  },
};

export default function SEO({ page, title, description }: SEOProps) {
  const meta = PAGE_META[page];
  const finalTitle = title || meta.title;
  const finalDescription = description || meta.description;
  const ogImage = `https://api.latbot.news/api/og/ai?page=${page}`;

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />

      {/* Open Graph */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
