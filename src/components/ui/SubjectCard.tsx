"use client";

import React from 'react';
import { Star, Trash2, Clock, Edit } from 'lucide-react';
import { ThemeCircle } from './ThemeComponents';

// Interface para assunto
interface Assunto {
  id: number;
  nome: string;
  dificuldade: 'baixa' | 'média' | 'alta';
  importancia: 'baixa' | 'média' | 'alta';
  horasEstimadas: number;
}

// Props do componente
interface SubjectCardProps {
  assunto: Assunto;
  onEdit: () => void;
  onDelete: () => void;
}

// Função para obter o gradiente com base na dificuldade e importância
const getBgGradient = (dificuldade: 'baixa' | 'média' | 'alta', importancia: 'baixa' | 'média' | 'alta') => {
  // Calcula o nível de prioridade (1-9) baseado na combinação de dificuldade e importância
  const nivelDificuldade = dificuldade === 'baixa' ? 1 : dificuldade === 'média' ? 2 : 3;
  const nivelImportancia = importancia === 'baixa' ? 1 : importancia === 'média' ? 2 : 3;
  
  // Combina os níveis para determinar a intensidade da cor
  const prioridade = nivelDificuldade + nivelImportancia;
  
  // Retorna um gradiente com uma única cor quente, mais escura à esquerda e mais suave à direita
  switch (prioridade) {
    case 2: // baixa + baixa
      return 'bg-gradient-to-r from-orange-100 to-white';
    case 3: // baixa + média ou média + baixa
      return 'bg-gradient-to-r from-orange-200 to-white';
    case 4: // média + média ou baixa + alta ou alta + baixa
      return 'bg-gradient-to-r from-orange-300 to-white';
    case 5: // média + alta ou alta + média
      return 'bg-gradient-to-r from-red-300 to-white';
    case 6: // alta + alta
      return 'bg-gradient-to-r from-red-400 to-white';
    default:
      return 'bg-white';
  }
};

// Função para obter a cor da borda lateral do card
const getBorderColor = (dificuldade: 'baixa' | 'média' | 'alta', importancia: 'baixa' | 'média' | 'alta') => {
  // Calcula o nível de prioridade (1-9) baseado na combinação de dificuldade e importância
  const nivelDificuldade = dificuldade === 'baixa' ? 1 : dificuldade === 'média' ? 2 : 3;
  const nivelImportancia = importancia === 'baixa' ? 1 : importancia === 'média' ? 2 : 3;
  
  // Combina os níveis para determinar a intensidade da cor
  const prioridade = nivelDificuldade + nivelImportancia;
  
  // Retorna uma classe de borda baseada na prioridade combinada
  switch (prioridade) {
    case 2: // baixa + baixa
      return 'border-l-4 border-l-orange-300';
    case 3: // baixa + média ou média + baixa
      return 'border-l-4 border-l-orange-400';
    case 4: // média + média ou baixa + alta ou alta + baixa
      return 'border-l-4 border-l-orange-500';
    case 5: // média + alta ou alta + média
      return 'border-l-4 border-l-red-400';
    case 6: // alta + alta
      return 'border-l-4 border-l-red-500';
    default:
      return 'border-l-4 border-l-gray-300';
  }
};

const SubjectCard: React.FC<SubjectCardProps> = ({ assunto, onEdit, onDelete }) => {
  return (
    <div 
      className={`
        rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group
        ${getBgGradient(assunto.dificuldade, assunto.importancia)} 
        ${getBorderColor(assunto.dificuldade, assunto.importancia)}
      `}
    >
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
        <h4 className="font-semibold text-gray-800 truncate">{assunto.nome}</h4>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={onEdit}
            className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
            title="Editar assunto"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button 
            onClick={onDelete}
            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
            title="Remover assunto"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="p-3">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Dificuldade:</span>
            <div className="flex">
              {[1, 2, 3].map((star) => (
                <Star 
                  key={star}
                  className={`h-4 w-4 ${star <= (assunto.dificuldade === 'baixa' ? 1 : assunto.dificuldade === 'média' ? 2 : 3) 
                    ? 'text-orange-500 fill-current' 
                    : 'text-gray-300'}`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Importância:</span>
            <div className="flex">
              {[1, 2, 3].map((star) => (
                <Star 
                  key={star}
                  className={`h-4 w-4 ${star <= (assunto.importancia === 'baixa' ? 1 : assunto.importancia === 'média' ? 2 : 3) 
                    ? 'text-blue-500 fill-current' 
                    : 'text-gray-300'}`}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-xs font-medium text-gray-700">Tempo estimado:</span>
            <div className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1 text-gray-500" />
              <span className="font-semibold text-gray-800">{assunto.horasEstimadas}h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectCard; 