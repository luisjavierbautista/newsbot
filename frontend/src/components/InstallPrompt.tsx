import { useState, useEffect } from 'react';
import { X, Download, Sparkles, Smartphone, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Detect iOS
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Detect if in standalone mode
const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return; // Don't show if dismissed within 7 days
      }
    }

    // iOS-specific handling
    if (isIOS()) {
      // Show iOS banner after a delay
      setTimeout(() => setShowIOSBanner(true), 2000);
      return;
    }

    // Check if event was already captured globally (before component mounted)
    if (window.deferredInstallPrompt) {
      setDeferredPrompt(window.deferredInstallPrompt);
      setTimeout(() => setShowBanner(true), 2000);
    }

    // Listen for custom event from main.tsx
    const handleInstallAvailable = () => {
      if (window.deferredInstallPrompt) {
        setDeferredPrompt(window.deferredInstallPrompt);
        setTimeout(() => setShowBanner(true), 2000);
      }
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);

    // Check if app was installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      window.deferredInstallPrompt = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async (isWidget: boolean = false) => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      // If widget mode, redirect to widget after install
      if (isWidget) {
        // Store preference to open widget on next launch
        localStorage.setItem('pwa-start-widget', 'true');
      }
    }

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowBanner(false);
    setShowIOSBanner(false);
  };

  // Don't render if installed
  if (isInstalled) {
    return null;
  }

  // iOS-specific banner
  if (showIOSBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 animate-slide-up">
        <div className="max-w-lg mx-auto bg-dark-800 rounded-2xl border border-dark-600 shadow-2xl shadow-black/50 overflow-hidden">
          {/* Gradient accent */}
          <div className="h-1 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500" />

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg shadow-primary-500/25">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Instala LatBot News</h3>
                  <p className="text-gray-400 text-xs">Agregar a pantalla de inicio</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-dark-700 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* iOS Instructions */}
            <div className="bg-dark-900 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold">1</div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>Toca</span>
                  <Share className="w-5 h-5 text-primary-400" />
                  <span>en Safari</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold">2</div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>Selecciona</span>
                  <PlusSquare className="w-5 h-5 text-primary-400" />
                  <span>"Agregar a inicio"</span>
                </div>
              </div>
            </div>

            {/* Features hint */}
            <p className="text-center text-[10px] text-gray-500 mt-3">
              Funciona sin conexion - Acceso rapido - Como app nativa
            </p>
          </div>
        </div>

        {/* Animation styles */}
        <style>{`
          @keyframes slide-up {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          .animate-slide-up {
            animation: slide-up 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  }

  // Standard banner (Android/Desktop)
  if (!showBanner || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 animate-slide-up">
      <div className="max-w-lg mx-auto bg-dark-800 rounded-2xl border border-dark-600 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Gradient accent */}
        <div className="h-1 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg shadow-primary-500/25">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Instala LatBot News</h3>
                <p className="text-gray-400 text-xs">Accede mas rapido desde tu pantalla</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-lg hover:bg-dark-700 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleInstall(false)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              App Completa
            </button>
            <button
              onClick={() => handleInstall(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-dark-700 hover:bg-dark-600 text-white text-sm font-medium rounded-xl border border-dark-600 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              Solo Hechos
            </button>
          </div>

          {/* Features hint */}
          <p className="text-center text-[10px] text-gray-500 mt-3">
            Funciona sin conexion - Notificaciones - Acceso rapido
          </p>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
