'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { AIExplanationGeneratorService } from '@/services/ai-explanation-generator.service';
import { toast } from 'react-hot-toast';

interface AIExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionContent: string;
  alternatives: string[];
  correctAnswer: string;
  discipline?: string;
  subject?: string;
  onExplanationGenerated?: (explanation: string) => void;
}

export function AIExplanationModal({
  isOpen,
  onClose,
  questionContent,
  alternatives,
  correctAnswer,
  discipline,
  subject,
  onExplanationGenerated
}: AIExplanationModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState<string>('');

  const handleGenerateExplanation = async () => {
    if (!questionContent || !alternatives.length || !correctAnswer) {
      toast.error('Dados da questão incompletos para gerar explicação');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await AIExplanationGeneratorService.generateExplanation({
        questionContent,
        alternatives,
        correctAnswer,
        discipline,
        subject
      });

      setGeneratedExplanation(result.explanation);
      toast.success('Explicação gerada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar explicação:', error);
      toast.error(error.message || 'Erro ao gerar explicação');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveExplanation = () => {
    if (generatedExplanation && onExplanationGenerated) {
      onExplanationGenerated(generatedExplanation);
      toast.success('Explicação salva!');
      onClose();
    }
  };

  const handleClose = () => {
    setGeneratedExplanation('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Gerar Explicação com IA
              </h2>
              <p className="text-sm text-gray-500">
                Crie uma explicação detalhada para esta questão
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Question Preview */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Questão:</h3>
            <p className="text-gray-700 mb-4">{questionContent}</p>
            
            <h4 className="font-medium text-gray-900 mb-2">Alternativas:</h4>
            <div className="space-y-2">
              {alternatives?.map((alt, index) => {
                const letter = String.fromCharCode(65 + index);
                const isCorrect = letter === correctAnswer;
                return (
                  <div 
                    key={index} 
                    className={`p-2 rounded ${isCorrect ? 'bg-green-100 border border-green-300' : 'bg-white border border-gray-200'}`}
                  >
                    <span className={`font-medium ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>
                      {letter})
                    </span>
                    <span className={`ml-2 ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>
                      {alt}
                      {isCorrect && <span className="ml-2 text-green-600 font-medium">(Correta)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generated Explanation */}
          {generatedExplanation ? (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Explicação Gerada:</h3>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {generatedExplanation}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="p-4 bg-purple-50 rounded-lg inline-block mb-4">
                <Sparkles className="h-8 w-8 text-purple-600 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Pronto para gerar uma explicação?
              </h3>
              <p className="text-gray-600 mb-4">
                A IA analisará a questão e criará uma explicação detalhada sobre por que a resposta está correta.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {discipline && (
              <span>Disciplina: {discipline}{subject && ` • ${subject}`}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            
            {!generatedExplanation ? (
              <button
                onClick={handleGenerateExplanation}
                disabled={isGenerating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar Explicação
                  </>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setGeneratedExplanation('')}
                  className="px-4 py-2 text-purple-700 bg-purple-100 border border-purple-300 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Gerar Nova
                </button>
                <button
                  onClick={handleSaveExplanation}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Salvar Explicação
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}