"use client";

import { useState, useEffect } from 'react';
import { inicializarPlanejamento } from '@/services';
import { inicializarSincronizacao } from '@/services/data-sync';

type StartupProps = {
  onCompleteAction: () => void;
};

export default function Startup({ onCompleteAction }: StartupProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Inicializando...');

  useEffect(() => {
    // Sempre mostrar splash screen por pelo menos 2 segundos
    const initializeApp = async () => {
      try {
        // Simular progresso de carregamento
        setCurrentStep('Carregando recursos...');
        setLoadingProgress(25);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Inicializar o serviço de planejamento
        setCurrentStep('Inicializando planejamento...');
        setLoadingProgress(50);
        inicializarPlanejamento();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Inicializar o serviço de sincronização
        setCurrentStep('Configurando sincronização...');
        setLoadingProgress(75);
        inicializarSincronizacao();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCurrentStep('Finalizando...');
        setLoadingProgress(100);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setIsLoading(false);
        
        // Auto-close splash screen após 1 segundo
        setTimeout(() => {
          setShowSplashScreen(false);
          onCompleteAction();
        }, 1000);
        
      } catch (error) {
        console.error('Erro ao inicializar aplicativo:', error);
        setCurrentStep('Erro na inicialização');
        // Mesmo com erro, continuar após 2 segundos
        setTimeout(() => {
          setShowSplashScreen(false);
          onCompleteAction();
        }, 2000);
      }
    };
    
    initializeApp();
  }, [onCompleteAction]);

  // Se a splash screen não deve ser exibida, retornar null
  if (!showSplashScreen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center z-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                           radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>
      
      <div className="relative flex flex-col items-center justify-center text-center px-8">
        {/* Logo/Icon */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 bg-white rounded-2xl shadow-2xl flex items-center justify-center mb-4 animate-pulse">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12C19.5817 12 16 15.5817 16 20V28C16 32.4183 19.5817 36 24 36C28.4183 36 32 32.4183 32 28V20C32 15.5817 28.4183 12 24 12Z" fill="#3B82F6"/>
              <path d="M24 16C21.7909 16 20 17.7909 20 20V28C20 30.2091 21.7909 32 24 32C26.2091 32 28 30.2091 28 28V20C28 17.7909 26.2091 16 24 16Z" fill="white"/>
              <circle cx="24" cy="20" r="2" fill="#3B82F6"/>
              <rect x="22" y="24" width="4" height="6" rx="1" fill="#3B82F6"/>
            </svg>
          </div>
          
          {/* Animated rings */}
          <div className="absolute inset-0 -m-4">
            <div className="w-32 h-32 border-2 border-white/20 rounded-full animate-ping"></div>
          </div>
          <div className="absolute inset-0 -m-8">
            <div className="w-40 h-40 border border-white/10 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
          </div>
        </div>
        
        {/* App Name */}
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          MedJourney
        </h1>
        <p className="text-blue-100 text-lg mb-8 font-medium">
          Sua jornada de estudos médicos
        </p>
        
        {/* Loading Section */}
        {isLoading ? (
          <div className="w-full max-w-xs">
            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-2 mb-4 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            
            {/* Loading Text */}
            <p className="text-white/80 text-sm font-medium">
              {currentStep}
            </p>
            
            {/* Loading Dots */}
            <div className="flex justify-center mt-4 space-x-1">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-medium">
              Pronto para começar!
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 
