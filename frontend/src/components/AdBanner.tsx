import { useEffect, useRef } from 'react';

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
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
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
  const sizes: Record<string, { width: string; height: string; label: string }> = {
    banner: { width: '100%', height: '90px', label: 'Banner Ad (728x90)' },
    sidebar: { width: '300px', height: '250px', label: 'Sidebar Ad (300x250)' },
    'in-article': { width: '100%', height: '250px', label: 'In-Article Ad' },
    footer: { width: '100%', height: '90px', label: 'Footer Ad (728x90)' },
  };

  const size = sizes[type];

  return (
    <div
      className={`flex items-center justify-center bg-dark-800 border border-dashed border-dark-600 rounded-lg text-gray-500 text-sm ${className}`}
      style={{ width: size.width, height: size.height }}
    >
      <span>{size.label}</span>
    </div>
  );
}
