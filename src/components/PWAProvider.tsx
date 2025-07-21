"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
}

interface PWAContextType {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
  clearPrompt: () => void;
}

const PWAContext = createContext<PWAContextType>({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,
  promptInstall: async () => {},
  clearPrompt: () => {},
});

export const usePWA = () => useContext(PWAContext);

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se o app já está instalado
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      // @ts-ignore: propriedade não padrão do navegador
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
    }

    // Interceptar o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevenir o prompt automático do navegador
      e.preventDefault();
      // Armazenar o evento para uso posterior
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Monitorar mudanças no estado de instalação
    const handleAppInstalled = () => {
      // Limpar o prompt armazenado
      setDeferredPrompt(null);
      // Atualizar estado
      setIsInstalled(true);
    };

    // Adicionar event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Limpar event listeners ao desmontar
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Função para mostrar o prompt de instalação
  const promptInstall = async () => {
    if (!deferredPrompt) {
      console.log('O prompt de instalação não está disponível');
      return;
    }

    // Mostrar o prompt de instalação
    await deferredPrompt.prompt();

    // Aguardar a escolha do usuário
    const choiceResult = await deferredPrompt.userChoice;
    
    // Limpar o prompt armazenado após o uso
    setDeferredPrompt(null);
    
    // Log do resultado (opcional)
    if (choiceResult.outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
    } else {
      console.log('Usuário recusou a instalação');
    }
  };

  // Função para limpar o prompt
  const clearPrompt = () => {
    setDeferredPrompt(null);
  };

  return (
    <PWAContext.Provider
      value={{
        deferredPrompt,
        isInstallable: !!deferredPrompt,
        isInstalled,
        promptInstall,
        clearPrompt,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
} 
