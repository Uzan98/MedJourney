'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { usePWA } from './PWAProvider'; // Importar o hook

export default function PWABanner() {
  const { isInstallable, isInstalled, promptInstall } = usePWA(); // Usar o contexto
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Verificar se o banner já foi dispensado
    const bannerDismissed = localStorage.getItem('pwa-banner-dismissed');
    const bannerDismissedTime = localStorage.getItem('pwa-banner-dismissed-time');
    
    // Mostrar novamente após 7 dias
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const shouldShowAgain = bannerDismissedTime && parseInt(bannerDismissedTime) < sevenDaysAgo;
    
    // Mostrar o banner se for instalável, não estiver instalado e não tiver sido dispensado recentemente
    if (isInstallable && !isInstalled && (!bannerDismissed || shouldShowAgain)) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 8000); // Atraso para não ser intrusivo

      return () => clearTimeout(timer);
    }

  }, [isInstallable, isInstalled]);

  const handleDismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', 'true');
    localStorage.setItem('pwa-banner-dismissed-time', Date.now().toString());
    setShowBanner(false);
  };

  const handleInstall = async () => {
    await promptInstall();
    // O banner pode ser escondido após a tentativa de instalação
    setShowBanner(false);
  };

  if (!showBanner || isInstalled) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg animate-in slide-in-from-top-5 duration-500">
      <div className="flex items-center justify-between px-4 py-2 max-w-sm mx-auto">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              Instale o Genoma
            </p>
            <p className="text-xs text-blue-100 truncate">
              Acesso rápido e offline.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleInstall}
            className="flex-shrink-0 px-3 py-1.5 bg-white text-blue-600 text-xs font-semibold rounded-full shadow-sm hover:bg-blue-50 transition-colors"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}