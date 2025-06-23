"use client";

import { useState, useEffect } from 'react';
import Startup from './startup';

// Componente cliente para lidar com a lógica de inicialização
export function StartupProvider({ children }: { children: React.ReactNode }) {
  const [isStartupComplete, setIsStartupComplete] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Se estivermos no servidor ou ainda não carregamos o cliente, renderize apenas o layout normal
  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <>
      {isStartupComplete ? (
        children
      ) : (
        <>
          <Startup onCompleteAction={() => setIsStartupComplete(true)} />
          {/* Renderizar children para evitar problemas de hydration, mas escondido */}
          <div style={{ display: 'none' }}>{children}</div>
        </>
      )}
    </>
  );
} 
