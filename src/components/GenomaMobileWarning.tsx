"use client";

import { useEffect, useState } from 'react';
import { Monitor, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useIsMobile';

const GenomaMobileWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const isMobile = useIsMobile(1024); // Considerar mobile até 1024px para incluir tablets

  useEffect(() => {
    // Só mostrar se for mobile
    if (!isMobile) {
      return;
    }

    // Verificar se o usuário já viu o aviso
    const hasSeenWarning = localStorage.getItem('@genoma:mobile-warning-seen');
    
    // Verificar se é a primeira vez após login (pode ser implementado com contexto de auth)
    // Por enquanto, mostrar se não viu o aviso ainda
    if (!hasSeenWarning) {
      // Delay para mostrar após o carregamento da página
      const timer = setTimeout(() => {
        setShowWarning(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  const dismissWarning = () => {
    setShowWarning(false);
    localStorage.setItem('@genoma:mobile-warning-seen', 'true');
  };

  const remindLater = () => {
    setShowWarning(false);
    // Não salvar no localStorage para mostrar novamente na próxima sessão
  };

  // Não mostrar se não for mobile ou se não deve exibir o aviso
  if (!isMobile || !showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 relative">
        {/* Botão de fechar */}
        <button
          onClick={dismissWarning}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Ícones */}
        <div className="flex justify-center items-center gap-4 mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Smartphone className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-gray-300">
            <Monitor className="h-6 w-6" />
          </div>
          <div className="bg-green-100 p-3 rounded-full">
            <Monitor className="h-8 w-8 text-green-600" />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="text-center mb-6">
          <h3 className="font-semibold text-gray-800 mb-2 text-lg">
            Melhor experiência em telas maiores
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            O <span className="font-medium text-blue-600">Genoma</span> foi otimizado para funcionar melhor em computadores e tablets. 
            Para uma experiência completa com todas as funcionalidades, recomendamos usar em uma tela maior.
          </p>
        </div>

        {/* Botões */}
        <div className="flex flex-col gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={dismissWarning}
            className="bg-blue-600 hover:bg-blue-700 w-full"
          >
            Entendi, continuar mesmo assim
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={remindLater}
            className="text-gray-600 w-full"
          >
            Lembrar depois
          </Button>
        </div>

        {/* Dica adicional */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 text-center">
            💡 <span className="font-medium">Dica:</span> Você pode acessar o Genoma pelo navegador do seu computador ou tablet para ter acesso completo a todas as funcionalidades.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GenomaMobileWarning;