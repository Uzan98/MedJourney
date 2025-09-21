'use client';

import { useState } from 'react';
import { FaCheckCircle, FaClock, FaEye, FaBrain, FaTimes } from 'react-icons/fa';

interface ExamModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (mode: 'normal' | 'exercise') => void;
  examTitle: string;
  questionsCount: number;
  timeLimit?: number;
}

export default function ExamModeModal({
  isOpen,
  onClose,
  onStart,
  examTitle,
  questionsCount,
  timeLimit
}: ExamModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<'normal' | 'exercise'>('normal');

  if (!isOpen) {
    return null;
  }

  const handleStart = () => {
    onStart(selectedMode);
  };

  // Renderizar diretamente sem createPortal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Escolha o Modo de Estudo</h2>
            <p className="text-gray-600 mt-1">{examTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Exam Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-2">Informações do Simulado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-blue-700">
              <div className="flex items-center">
                <FaCheckCircle className="mr-2 text-blue-600" />
                <span>{questionsCount} questões</span>
              </div>
              <div className="flex items-center">
                <FaClock className="mr-2 text-blue-600" />
                <span>{timeLimit ? `${timeLimit} minutos` : 'Sem limite de tempo'}</span>
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Selecione como deseja estudar:</h3>
            
            {/* Normal Mode */}
            <div 
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                selectedMode === 'normal' 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => setSelectedMode('normal')}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="examMode"
                  value="normal"
                  checked={selectedMode === 'normal'}
                  onChange={() => setSelectedMode('normal')}
                  className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-4 flex-1">
                  <div className="flex items-center mb-2">
                    <FaClock className="text-blue-600 mr-2" />
                    <h4 className="text-lg font-semibold text-gray-800">Modo Simulado</h4>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Experiência completa de prova. Responda todas as questões e veja o resultado apenas no final.
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <h5 className="font-medium text-gray-700 mb-2">Características:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Cronômetro ativo (se houver limite de tempo)</li>
                      <li>• Sem feedback imediato das respostas</li>
                      <li>• Resultado completo ao finalizar</li>
                      <li>• Simula condições reais de prova</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Exercise Mode */}
            <div 
              className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                selectedMode === 'exercise' 
                  ? 'border-green-500 bg-green-50 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => setSelectedMode('exercise')}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="examMode"
                  value="exercise"
                  checked={selectedMode === 'exercise'}
                  onChange={() => setSelectedMode('exercise')}
                  className="mt-1 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300"
                />
                <div className="ml-4 flex-1">
                  <div className="flex items-center mb-2">
                    <FaBrain className="text-green-600 mr-2" />
                    <h4 className="text-lg font-semibold text-gray-800">Lista de Exercícios</h4>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Modo de estudo focado no aprendizado. Veja a resposta correta e explicação após cada questão.
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <h5 className="font-medium text-gray-700 mb-2">Características:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Feedback imediato após cada resposta</li>
                      <li>• Explicações detalhadas disponíveis</li>
                      <li>• Possibilidade de usar IA para explicações</li>
                      <li>• Ideal para fixação do conteúdo</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <FaEye className="text-yellow-600 mr-2 mt-1" />
              <div>
                <h5 className="font-medium text-yellow-800 mb-1">Recomendação</h5>
                <p className="text-sm text-yellow-700">
                  {selectedMode === 'normal' 
                    ? 'Ideal para testar seus conhecimentos e simular condições reais de prova.' 
                    : 'Perfeito para estudar e aprender com feedback imediato sobre cada questão.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleStart}
            className={`px-6 py-3 font-medium rounded-lg transition-all duration-200 ${
              selectedMode === 'normal'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {selectedMode === 'normal' ? 'Iniciar Simulado' : 'Iniciar Lista de Exercícios'}
          </button>
        </div>
      </div>
    </div>
  );
}