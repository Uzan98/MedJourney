"use client";

import { useState, useEffect } from 'react';
import { inicializarPlanejamento } from '@/services';

type StartupProps = {
  onCompleteAction: () => void;
};

export default function Startup({ onCompleteAction }: StartupProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showStartupScreen, setShowStartupScreen] = useState(true);

  useEffect(() => {
    // Verificar se é a primeira execução do aplicativo
    const isFirstRun = !localStorage.getItem('@medjourney:app_initialized');
    
    // Inicializar o serviço de planejamento
    console.log('Inicializando serviço de planejamento...');
    try {
      inicializarPlanejamento();
      console.log('Serviço de planejamento inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar serviço de planejamento:', error);
    }
    
    // Se não for a primeira execução, pular a tela de inicialização
    if (!isFirstRun) {
      setShowStartupScreen(false);
      onCompleteAction();
      return;
    }
    
    // Marcar como inicializado
    localStorage.setItem('@medjourney:app_initialized', 'true');
    
    // Simular um tempo de carregamento
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [onCompleteAction]);

  const handleContinue = () => {
    // Continuar para o aplicativo
    setShowStartupScreen(false);
    onCompleteAction();
  };

  // Se a tela de inicialização não deve ser exibida, retornar null
  if (!showStartupScreen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">MedJourney</h1>
          <p className="text-gray-600">Inicializando o aplicativo...</p>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : (
          <div>
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded">
              <h3 className="font-medium text-green-800">Tudo pronto!</h3>
              <p className="text-sm text-green-700">
                Bem-vindo ao MedJourney. Clique em continuar para começar a usar o aplicativo.
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleContinue}
                className="px-4 py-2 rounded text-white bg-blue-500 hover:bg-blue-600"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 