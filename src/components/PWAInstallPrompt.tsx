'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, HelpCircle } from 'lucide-react';
import { usePWA } from '@/components/PWAProvider'; // Importar o hook

export default function PWAInstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = usePWA(); // Usar o contexto
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    const promptDismissed = localStorage.getItem('pwa-install-dismissed');
    if (promptDismissed || isInstalled) {
      return;
    }

    // Mostrar o prompt se for instalável (Android) ou se for iOS
    const timer = setTimeout(() => {
      if (isInstallable || (iOS && !isInstalled)) {
        setShowPrompt(true);
      }
    }, 5000); // Atraso para não ser intrusivo

    return () => {
      clearTimeout(timer);
    };
  }, [isInstallable, isInstalled]);

  const handleInstallClick = async () => {
    if (!isInstallable) return;
    await promptInstall();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowPrompt(false);
  };

  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 mx-auto max-w-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Instalar MedJourney
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-gray-600 text-xs mb-4 leading-relaxed">
          {isIOS 
            ? "Adicione o MedJourney à sua tela inicial para acesso rápido e uma experiência completa de app!"
            : "Instale o MedJourney como um aplicativo para acesso mais rápido e notificações."
          }
        </p>
        
        <div className="flex space-x-2">
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Agora não
          </button>

          {isInstallable ? (
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-blue-600 text-white text-xs font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>Instalar App</span>
            </button>
          ) : (
            <button
              onClick={handleShowInstructions}
              className="flex-1 bg-blue-600 text-white text-xs font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Ver Instruções</span>
            </button>
          )}
        </div>
      </div>
      
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Como instalar o MedJourney
              </h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'android'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Smartphone className="w-5 h-5" />
                <span className="hidden sm:inline">Android</span>
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'ios'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Smartphone className="w-5 h-5" />
                <span className="hidden sm:inline">iOS</span>
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === 'desktop'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Smartphone className="w-5 h-5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {activeTab === 'android' && (
                <ol className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <span className="text-sm text-gray-700 leading-relaxed">Abra o MedJourney no Chrome</span>
                  </li>
                   <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <span className="text-sm text-gray-700 leading-relaxed">Toque nos três pontos (⋮) no canto superior direito</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <span className="text-sm text-gray-700 leading-relaxed">Selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'</span>
                  </li>
                </ol>
              )}
              {activeTab === 'ios' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">No Safari:</h4>
                    <ol className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                        <span className="text-sm text-gray-700 leading-relaxed">Abra o MedJourney no Safari.</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                        <span className="text-sm text-gray-700 leading-relaxed">Toque no ícone de compartilhar (⬆️) na barra de navegação.</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                        <span className="text-sm text-gray-700 leading-relaxed">Role para baixo e selecione "Adicionar à Tela de Início".</span>
                      </li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">No Chrome:</h4>
                    <ol className="space-y-3">
                      <li className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                        <span className="text-sm text-gray-700 leading-relaxed">Abra o MedJourney no Chrome.</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                        <span className="text-sm text-gray-700 leading-relaxed">Toque no ícone de compartilhar (próximo à barra de busca).</span>
                      </li>
                      <li className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                        <span className="text-sm text-gray-700 leading-relaxed">Procure e selecione a opção "Adicionar à Tela de Início".</span>
                      </li>
                    </ol>
                  </div>
                </div>
              )}
              {activeTab === 'desktop' && (
                 <ol className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <span className="text-sm text-gray-700 leading-relaxed">Abra o MedJourney no Chrome, Edge ou Firefox</span>
                  </li>
                   <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <span className="text-sm text-gray-700 leading-relaxed">Procure pelo ícone de instalação (⬇️) na barra de endereços</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <span className="text-sm text-gray-700 leading-relaxed">Clique no ícone e selecione 'Instalar'</span>
                  </li>
                </ol>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Entendi, vou instalar!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}