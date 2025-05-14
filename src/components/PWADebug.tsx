"use client";

import React from 'react';
import { usePWA } from './PWAProvider';

const PWADebug: React.FC = () => {
  const { isInstallable, isInstalled } = usePWA();

  return (
    <div className="fixed bottom-0 left-0 bg-black/80 text-white p-2 text-xs font-mono z-50">
      <div>
        <span className="mr-2">PWA:</span>
        <span className={isInstalled ? 'text-green-400' : 'text-gray-400'}>
          {isInstalled ? 'Instalado ✓' : 'Não instalado ✗'}
        </span>
      </div>
      <div>
        <span className="mr-2">Instalável:</span>
        <span className={isInstallable ? 'text-green-400' : 'text-gray-400'}>
          {isInstallable ? 'Sim ✓' : 'Não ✗'}
        </span>
      </div>
      <div>
        <span className="mr-2">Display:</span>
        <span className="text-green-400">
          {typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches
            ? 'Standalone'
            : 'Browser'}
        </span>
      </div>
    </div>
  );
};

export default PWADebug; 