"use client";

import { useState } from 'react';
import { ChevronLeft, Edit, Trash2, Globe, Lock, Plus, Menu, X, ChevronDown, ChevronUp, Image } from 'lucide-react';
import { Question } from '@/services/questions-bank.service';
import Link from 'next/link';
import './question-card-mobile.css';

interface MobileQuestionViewProps {
  question: Question;
  questionId: string;
  disciplineName: string;
  subjectName: string;
  isQuestionOwner: boolean;
  isUpdatingPublicStatus: boolean;
  isAddingToBank: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublicStatus: () => void;
  onAddToMyBank: () => void;
  getDifficultyColor: (difficulty?: string) => string;
  normalizeDifficulty: (difficulty?: string) => string;
  getQuestionTypeLabel: (type?: string) => string;
  formatDate: (date?: string) => string;
}

export default function MobileQuestionView({
  question,
  questionId,
  disciplineName,
  subjectName,
  isQuestionOwner,
  isUpdatingPublicStatus,
  isAddingToBank,
  onEdit,
  onDelete,
  onTogglePublicStatus,
  onAddToMyBank,
  getDifficultyColor,
  normalizeDifficulty,
  getQuestionTypeLabel,
  formatDate
}: MobileQuestionViewProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; description?: string } | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Link href="/banco-questoes" className="flex items-center text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Voltar
          </Link>
          
          <h1 className="text-lg font-semibold text-gray-900 truncate mx-4">
            Questão #{questionId}
          </h1>
          
          <button
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        
        {/* Menu de Ações */}
        {showActionsMenu && (
          <div className="absolute top-full right-0 w-full bg-white border-b border-gray-200 shadow-lg">
            <div className="p-4 space-y-3">
              {isQuestionOwner && (
                <>
                  <button 
                    onClick={() => {
                      onTogglePublicStatus();
                      setShowActionsMenu(false);
                    }}
                    disabled={isUpdatingPublicStatus}
                    className={`w-full flex items-center justify-center px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                      question?.is_public
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isUpdatingPublicStatus ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Atualizando...
                      </span>
                    ) : question?.is_public ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Tornar Privada
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Adicionar ao Genoma Bank
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => {
                      onEdit();
                      setShowActionsMenu(false);
                    }}
                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </button>
                  
                  <button 
                    onClick={() => {
                      onDelete();
                      setShowActionsMenu(false);
                    }}
                    className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </button>
                </>
              )}
              
              {!isQuestionOwner && question?.is_public && (
                <button 
                  onClick={() => {
                    onAddToMyBank();
                    setShowActionsMenu(false);
                  }}
                  disabled={isAddingToBank}
                  className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  {isAddingToBank ? (
                    <span className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adicionando...
                    </span>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar ao meu banco
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo Principal */}
      <div className="p-4 space-y-6">
        {/* Tags e Informações */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question?.difficulty)}`}>
              {normalizeDifficulty(question?.difficulty)}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {getQuestionTypeLabel(question?.question_type)}
            </span>
            
            {question?.is_public && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center">
                <Globe className="h-3 w-3 mr-1" />
                Genoma Bank
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>Criada em: {formatDate(question?.created_at)}</p>
            {question?.updated_at && question.updated_at !== question.created_at && (
              <p>Última atualização: {formatDate(question.updated_at)}</p>
            )}
          </div>
        </div>

        {/* Genoma Bank Info */}
        {question?.is_public && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <Globe className="h-4 w-4 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Questão compartilhada no Genoma Bank</h3>
                <p className="mt-1 text-xs text-blue-600">
                  Esta questão está disponível para todos os usuários da plataforma no Genoma Bank.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Informações da questão */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Disciplina</h3>
              <p className="text-sm text-gray-800">{disciplineName || 'Não especificada'}</p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Assunto</h3>
              <p className="text-sm text-gray-800">{subjectName || 'Não especificado'}</p>
            </div>
          </div>
          
          {question?.tags && question.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {question.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Conteúdo da questão */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Enunciado</h2>
          <div className="bg-gray-50 p-4 rounded-lg quill-content max-w-none">
            <div 
              className={`quill-content ${isContentExpanded ? '' : 'line-clamp-4'}`}
              style={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto'
              }}
              dangerouslySetInnerHTML={{ __html: question?.content || 'Conteúdo não disponível' }} 
            />
          </div>
          
          {/* Botão expandir/recolher */}
          <button
            onClick={() => setIsContentExpanded(!isContentExpanded)}
            className="mt-3 flex items-center text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors touch-manipulation"
          >
            {isContentExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Mostrar mais
              </>
            )}
          </button>
        </div>
        
        {/* Imagens da questão */}
        {question?.images && question.images.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <Image className="h-4 w-4 mr-2" />
              Imagens ({question.images.length})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {question.images.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.image_url || image.url}
                      alt={image.description || `Imagem ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                      onClick={() => setFullscreenImage({ url: image.image_url || image.url, description: image.description })}
                    />
                  </div>
                  {image.description && (
                    <p className="mt-2 text-xs text-gray-600 text-center">
                      {image.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Opções de resposta */}
        {question?.question_type !== 'essay' && question?.answer_options && question.answer_options.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {question.question_type === 'multiple_choice' ? 'Alternativas' : 'Opções'}
            </h2>
            <div className="space-y-3">
              {question.answer_options.map((option) => {
                const isCorrect = question.question_type === 'multiple_choice' 
                  ? option.is_correct 
                  : (question.correct_answer === 'true' && option.id?.toString() === 'true') || 
                    (question.correct_answer === 'false' && option.id?.toString() === 'false');

                return (
                  <div
                    key={option.id || Math.random()}
                    className={`p-3 rounded-lg border-2 flex items-start ${
                      isCorrect 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mr-3 text-xs ${
                      isCorrect 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {isCorrect ? '✓' : ''}
                    </div>
                    <div className="flex-1 text-sm">
                      <div dangerouslySetInnerHTML={{ 
                        __html: question.question_type === 'true_false'
                          ? (option.id?.toString() === 'true' ? 'Verdadeiro' : 'Falso') 
                          : option.text || '' 
                      }} />
                    </div>
                    {isCorrect && (
                      <div className="ml-2 text-xs text-green-600 font-medium">
                        Correta
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Resposta correta para questões dissertativas */}
        {question?.question_type === 'essay' && question?.correct_answer && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Resposta</h2>
            <div className="bg-gray-50 p-4 rounded-lg quill-content max-w-none">
              <div dangerouslySetInnerHTML={{ __html: question.correct_answer }} />
            </div>
          </div>
        )}
        
        {/* Explicação */}
        {question?.explanation && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Explicação</h2>
            <div className="bg-gray-50 p-4 rounded-lg quill-content max-w-none">
              <div dangerouslySetInnerHTML={{ __html: question.explanation }} />
            </div>
          </div>
        )}
      </div>

      {/* Modal de imagem em tela cheia */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img 
              src={fullscreenImage.url}
              alt={fullscreenImage.description || 'Imagem em tela cheia'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {fullscreenImage.description && (
              <div className="absolute bottom-4 left-4 right-4 text-white bg-black bg-opacity-50 rounded p-2 text-center">
                {fullscreenImage.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}