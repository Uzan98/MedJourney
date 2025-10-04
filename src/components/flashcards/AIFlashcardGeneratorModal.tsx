'use client';

import React, { useState, useRef } from 'react';
import { X, Wand2, Loader2, FileText, Type, Upload, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AIFlashcardGeneratorService, AIFlashcardParams, AIFlashcardResponse } from '@/services/ai-flashcard-generator.service';
import { FlashcardsService } from '@/services/flashcards.service';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface AIFlashcardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFlashcardsGenerated?: () => void;
}

type GenerationMode = 'theme' | 'text' | 'pdf';

export default function AIFlashcardGeneratorModal({
  isOpen,
  onClose,
  onFlashcardsGenerated
}: AIFlashcardGeneratorModalProps) {
  const { user } = useAuth();
  const { hasReachedLimit, subscriptionLimits, refreshLimits } = useSubscription();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<GenerationMode>('theme');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  // Estados para diferentes modos
  const [theme, setTheme] = useState('');
  const [text, setText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfContent, setPdfContent] = useState('');
  
  // Configurações gerais
  const [deckName, setDeckName] = useState('');
  const [numberOfCards, setNumberOfCards] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const handleClose = () => {
    if (!isGenerating && !isExtractingPdf) {
      setMode('theme');
      setTheme('');
      setText('');
      setPdfFile(null);
      setPdfContent('');
      setDeckName('');
      setNumberOfCards(10);
      setDifficulty('medium');
      setProcessingStatus('');
      onClose();
    }
  };

  // Função para mapear status para mensagens amigáveis
  const getStatusMessage = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Aguardando processamento...';
      case 'processing':
        return 'Gerando flashcards com IA...';
      case 'completed':
        return 'Flashcards gerados com sucesso!';
      case 'failed':
        return 'Erro no processamento';
      default:
        return 'Processando...';
    }
  };

  // Função para obter ícone baseado no status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Por favor, selecione apenas arquivos PDF.')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('O arquivo PDF deve ter no máximo 10MB.')
      return
    }

    setPdfFile(file)
    setIsExtractingPdf(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao processar PDF')
      }

      const data = await response.json()
      setPdfContent(data.text.trim())
      toast.success(`Texto extraído com sucesso! ${data.pages} páginas processadas.`)
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error)
      toast.error('Erro ao processar o PDF. Tente novamente.')
      setPdfFile(null)
    } finally {
      setIsExtractingPdf(false)
    }
  }

  const generateFlashcards = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para gerar flashcards.');
      return;
    }

    // Validações por modo
    if (mode === 'theme' && !theme.trim()) {
      toast.error('Por favor, insira um tema para gerar os flashcards.');
      return;
    }

    if (mode === 'text' && !text.trim()) {
      toast.error('Por favor, insira o texto para gerar os flashcards.');
      return;
    }

    if (mode === 'pdf' && (!pdfFile || !pdfContent.trim())) {
      toast.error('Por favor, selecione um arquivo PDF válido.');
      return;
    }

    if (!deckName.trim()) {
      toast.error('Por favor, insira um nome para o deck.');
      return;
    }

    // Verificar limites de assinatura
    const hasProAccess = subscriptionLimits?.plan !== 'free';
    if (!hasProAccess) {
      toast.error('A geração de flashcards por IA é exclusiva para usuários Pro.');
      return;
    }

    if (hasReachedLimit('ai_generations')) {
      toast.error('Você atingiu o limite de gerações de IA do seu plano.');
      return;
    }

    setIsGenerating(true);
    setProcessingStatus('pending');

    try {
      // Callback para atualizar o progresso
      const onProgress = (status: string) => {
        setProcessingStatus(status);
      };

      // Gerar flashcards com IA baseado no modo
      let response: AIFlashcardResponse;
      
      if (mode === 'theme') {
        response = await AIFlashcardGeneratorService.generateFromTheme({
          theme: theme.trim(),
          deckName: deckName.trim(),
          numberOfCards,
          difficulty
        }, onProgress);
      } else if (mode === 'text') {
        response = await AIFlashcardGeneratorService.generateFromText({
          text: text.trim(),
          deckName: deckName.trim(),
          numberOfCards,
          difficulty
        }, onProgress);
      } else { // mode === 'pdf'
        response = await AIFlashcardGeneratorService.generateFromPDF({
          pdfContent: pdfContent.trim(),
          deckName: deckName.trim(),
          numberOfCards,
          difficulty
        }, onProgress);
      }

      if (!response.flashcards || response.flashcards.length === 0) {
        throw new Error('Nenhum flashcard foi gerado');
      }

      // Criar o deck primeiro
      const deck = await FlashcardsService.createDeck({
        user_id: user!.id,
        name: deckName.trim(),
        description: `Deck gerado por IA ${mode === 'pdf' ? `a partir do PDF: ${pdfFile?.name}` : mode === 'theme' ? `sobre: ${theme}` : 'a partir de texto personalizado'}`,
        cover_color: '#8B5CF6',
        is_public: false,
        tags: mode === 'theme' ? [theme.toLowerCase()] : []
      });

      if (!deck) {
        throw new Error('Erro ao criar o deck');
      }

      // Criar os flashcards
      const flashcardPromises = response.flashcards.map(flashcard =>
        FlashcardsService.createFlashcard({
          user_id: user!.id,
          deck_id: deck.id,
          front: flashcard.front,
          back: flashcard.back,
          hint: flashcard.hint,
          tags: flashcard.tags || [],
          difficulty: flashcard.difficulty || difficulty
        })
      );

      await Promise.all(flashcardPromises);

      // Atualizar limites
      await refreshLimits();

      toast.success(`${response.flashcards.length} flashcards gerados com sucesso!`);
      
      if (onFlashcardsGenerated) {
        onFlashcardsGenerated();
      }
      
      handleClose();

    } catch (error: any) {
      console.error('Erro ao gerar flashcards:', error);
      setProcessingStatus('failed');
      toast.error(error.message || 'Erro ao gerar flashcards. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Verificar se tem acesso Pro
  const hasProAccess = subscriptionLimits?.plan !== 'free';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
              <Wand2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gerar Flashcards com IA</h2>
              <p className="text-sm text-gray-500">Crie flashcards automaticamente usando inteligência artificial</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating || isExtractingPdf}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {!hasProAccess ? (
            // Upgrade prompt
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recurso Premium</h3>
              <p className="text-gray-600 mb-6">
                A geração de flashcards por IA é exclusiva para usuários dos planos Pro e Pro+.
              </p>
              <Button
                onClick={() => window.open('/pricing', '_blank')}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                Fazer Upgrade
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Seleção do modo */}
              <div>
                <Label className="text-base font-medium text-gray-900 mb-3 block">
                  Como você quer gerar os flashcards?
                </Label>
                <RadioGroup value={mode} onValueChange={(value) => setMode(value as GenerationMode)}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="theme" id="theme" />
                      <div className="flex items-center space-x-3 flex-1">
                        <Type className="h-5 w-5 text-blue-600" />
                        <div>
                          <Label htmlFor="theme" className="font-medium cursor-pointer">Por Tema</Label>
                          <p className="text-sm text-gray-500">Digite um tema e a IA criará flashcards sobre ele</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="text" id="text" />
                      <div className="flex items-center space-x-3 flex-1">
                        <FileText className="h-5 w-5 text-green-600" />
                        <div>
                          <Label htmlFor="text" className="font-medium cursor-pointer">A partir de Texto</Label>
                          <p className="text-sm text-gray-500">Cole um texto e a IA extrairá os conceitos principais</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <div className="flex items-center space-x-3 flex-1">
                        <Upload className="h-5 w-5 text-orange-600" />
                        <div>
                          <Label htmlFor="pdf" className="font-medium cursor-pointer">A partir de PDF</Label>
                          <p className="text-sm text-gray-500">Upload de um PDF para extrair conteúdo automaticamente</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Configurações gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deckName" className="text-sm font-medium text-gray-700 mb-2 block">
                    Nome do Deck
                  </Label>
                  <Input
                    id="deckName"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    placeholder="Ex: Biologia Celular"
                    disabled={isGenerating || isExtractingPdf}
                  />
                </div>

                <div>
                  <Label htmlFor="numberOfCards" className="text-sm font-medium text-gray-700 mb-2 block">
                    Número de Cartões
                  </Label>
                  <Input
                    id="numberOfCards"
                    type="number"
                    min="5"
                    max="50"
                    value={numberOfCards}
                    onChange={(e) => setNumberOfCards(parseInt(e.target.value) || 10)}
                    disabled={isGenerating || isExtractingPdf}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Nível de Dificuldade
                </Label>
                <RadioGroup value={difficulty} onValueChange={(value) => setDifficulty(value as any)}>
                  <div className="flex space-x-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="easy" id="easy" />
                      <Label htmlFor="easy" className="cursor-pointer">Fácil</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="cursor-pointer">Médio</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hard" id="hard" />
                      <Label htmlFor="hard" className="cursor-pointer">Difícil</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Campos específicos por modo */}
              {mode === 'theme' && (
                <div>
                  <Label htmlFor="theme" className="text-sm font-medium text-gray-700 mb-2 block">
                    Tema dos Flashcards
                  </Label>
                  <Input
                    id="theme"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="Ex: Sistema cardiovascular, Revolução Francesa, Funções matemáticas..."
                    disabled={isGenerating || isExtractingPdf}
                  />
                </div>
              )}

              {mode === 'text' && (
                <div>
                  <Label htmlFor="text" className="text-sm font-medium text-gray-700 mb-2 block">
                    Texto para Análise
                  </Label>
                  <Textarea
                    id="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Cole aqui o texto que você quer transformar em flashcards..."
                    rows={6}
                    disabled={isGenerating || isExtractingPdf}
                  />
                </div>
              )}

              {mode === 'pdf' && (
                <div>
                  <Label htmlFor="pdf" className="text-sm font-medium text-gray-700 mb-2 block">
                    Arquivo PDF
                  </Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      pdfFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handlePdfUpload(file)
                        }
                      }}
                      className="hidden"
                      disabled={isGenerating || isExtractingPdf}
                    />
                    
                    {isExtractingPdf ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                        <p className="text-sm text-blue-600 font-medium">Extraindo texto do PDF...</p>
                        <p className="text-xs text-gray-500 mt-1">Isso pode levar alguns segundos</p>
                      </div>
                    ) : pdfFile ? (
                      <div className="flex flex-col items-center">
                        <FileText className="h-8 w-8 text-green-600 mb-2" />
                        <p className="text-sm text-green-600 font-medium">{pdfFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {pdfContent ? `${pdfContent.length} caracteres extraídos` : 'Processando...'}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2"
                          disabled={isGenerating || isExtractingPdf}
                        >
                          Escolher outro arquivo
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 mb-2">Clique para selecionar um arquivo PDF</p>
                        <p className="text-xs text-gray-500 mb-3">Máximo 10MB</p>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isGenerating || isExtractingPdf}
                        >
                          Selecionar PDF
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {pdfContent && (
                    <div className="mt-3">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Prévia do texto extraído
                      </Label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <p className="text-xs text-gray-600">
                          {pdfContent.substring(0, 500)}
                          {pdfContent.length > 500 && '...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de ação */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isGenerating || isExtractingPdf}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={generateFlashcards}
                  disabled={isGenerating || isExtractingPdf || (mode === 'pdf' && !pdfContent)}
                  className="relative bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-0"
                >
                  {isGenerating ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center mb-1">
                        {getStatusIcon(processingStatus)}
                        <span className="ml-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                          {getStatusMessage(processingStatus)}
                        </span>
                      </div>
                      {processingStatus === 'processing' && (
                        <div className="text-xs text-purple-100 opacity-75">
                          Isso pode levar alguns minutos...
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      <span className="bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                        Gerar Flashcards
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}