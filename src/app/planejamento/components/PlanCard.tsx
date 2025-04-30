"use client";

import React from 'react';
import { Calendar, Clock, Book, ChevronRight, Cloud, CloudOff } from 'lucide-react';
import { PlanoEstudo } from '../../../services/planejamento';
import { formatarData } from '../../../utils/formatters';

interface PlanCardProps {
  plano: PlanoEstudo;
  onClick: () => void;
  isOnline: boolean;
}

export default function PlanCard({ plano, onClick, isOnline }: PlanCardProps) {
  // Calcular progresso
  const totalSessoes = plano.estatisticas.totalSessoes;
  const sessoesFeitas = plano.cronograma.filter(s => s.concluido).length;
  const progresso = totalSessoes > 0 ? Math.round((sessoesFeitas / totalSessoes) * 100) : 0;
  
  const StatusSincronizacao = () => {
    const iconSize = 'h-4 w-4';
    
    if (!isOnline) {
      return (
        <span title="Modo offline" className="text-gray-500">
          <CloudOff className={iconSize} />
        </span>
      );
    }
    
    if (plano.sincronizado) {
      return (
        <span title="Sincronizado com o servidor" className="text-green-500">
          <Cloud className={iconSize} />
        </span>
      );
    }
    
    return (
      <span title="Pendente de sincronização" className="text-amber-500">
        <Cloud className={iconSize} />
      </span>
    );
  };
  
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-gray-800 text-lg">{plano.nome}</h3>
          <StatusSincronizacao />
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-blue-500" />
            <span>Data da prova: {formatarData(plano.dataProva)}</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Book className="w-4 h-4 mr-2 text-blue-500" />
            <span>{plano.disciplinas.length} disciplinas</span>
          </div>
          
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2 text-blue-500" />
            <span>{plano.estatisticas.totalSessoes} sessões planejadas</span>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Progresso</span>
            <span>{progresso}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${progresso}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-100 p-3 flex justify-between items-center bg-gray-50 rounded-b-xl">
        <span className="text-xs text-gray-500">
          Criado em {formatarData(plano.dataCriacao)}
        </span>
        <button className="text-blue-600 hover:text-blue-800">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 