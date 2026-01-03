import { useEffect, useRef } from 'react';
import { adsConfig } from '../config/ads';

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: boolean;
  className?: string;
}

export default function AdBanner({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;

    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
        isLoaded.current = true;
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <div className={`ad-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adsConfig.publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

interface AdPlaceholderProps {
  type: 'banner' | 'sidebar' | 'in-article' | 'footer';
  className?: string;
}

export function AdPlaceholder({ type, className = '' }: AdPlaceholderProps) {
  const config: Record<string, { minHeight: string; label: string; cta: string }> = {
    banner: {
      minHeight: '90px',
      label: 'Espacio Publicitario',
      cta: 'Anuncie aqui y llegue a miles de lectores'
    },
    sidebar: {
      minHeight: '250px',
      label: 'Publicidad',
      cta: 'Promocione su marca aqui'
    },
    'in-article': {
      minHeight: '120px',
      label: 'Espacio Publicitario',
      cta: 'Anuncie en LatBot.news'
    },
    footer: {
      minHeight: '90px',
      label: 'Espacio Publicitario',
      cta: 'Contactenos para anunciar'
    },
  };

  const { minHeight, label, cta } = config[type];

  return (
    <a
      href="mailto:publicidad@latbot.news?subject=Consulta%20sobre%20publicidad%20en%20LatBot.news"
      className={`block w-full ${className}`}
    >
      <div
        className="flex flex-col items-center justify-center bg-gradient-to-r from-dark-800 to-dark-850 border border-dashed border-primary-600/30 rounded-lg text-center p-4 hover:border-primary-500/50 hover:bg-dark-750 transition-all cursor-pointer group"
        style={{ minHeight }}
      >
        <span className="text-primary-400 font-medium text-sm sm:text-base">{label}</span>
        <span className="text-gray-400 text-xs sm:text-sm mt-1 group-hover:text-primary-300 transition-colors">
          {cta}
        </span>
        <span className="text-primary-500 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          publicidad@latbot.news
        </span>
      </div>
    </a>
  );
}
