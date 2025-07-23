"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ChevronLeft, AlertCircle, CreditCard } from 'lucide-react';
import QuestionModal from '@/components/banco-questoes/QuestionModal';
import { Question, AnswerOption, QuestionsBankService } from '@/services/questions-bank.service';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionTier } from '@/types/subscription';

export default function NovaQuestaoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { subscriptionLimits, hasReachedLimit, isLoading, refreshLimits } = useSubscription();
  const [hasReachedQuestionsLimit, setHasReachedQuestionsLimit] = useState(false);

  // Verificar se o usuário atingiu o limite de questões
  useEffect(() => {
    if (!isLoading) {
      const limitReached = hasReachedLimit('questions_per_day');
      setHasReachedQuestionsLimit(limitReached);
      
      if (limitReached) {
        toast.error(`Você atingiu o limite diário de ${subscriptionLimits?.questionsLimitPerDay} questões do seu plano.`);
      }
    }
  }, [isLoading, hasReachedLimit, subscriptionLimits]);

  // Função para salvar a nova questão
  const handleSaveQuestion = async (questionData: Question, answerOptions: AnswerOption[]): Promise<boolean> => {
    // Verificar novamente o limite antes de salvar
    if (hasReachedQuestionsLimit) {
      toast.error(`Você atingiu o limite diário de ${subscriptionLimits?.questionsLimitPerDay} questões do seu plano.`);
      return false;
    }
    
    setIsSubmitting(true);
    
    try {
      // Usar o serviço para salvar a questão
      const result = await QuestionsBankService.createQuestion(questionData, answerOptions);
      
      if (result) {
        await refreshLimits(); // <--- Atualiza os limites imediatamente após adicionar
        router.push('/banco-questoes');
        toast.success('Questão adicionada com sucesso!');
        return true;
      } else {
        toast.error('Erro ao salvar questão.');
        return false;
      }
    } catch (error) {
      console.error('Erro ao salvar questão:', error);
      toast.error('Ocorreu um erro ao salvar a questão.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Criando um objeto de questão vazio para inicialData
  const emptyQuestion: Question = {
    content: '',
    question_type: 'multiple_choice',
    difficulty: 'média',
  };

  // Se o usuário atingiu o limite, mostrar mensagem de upgrade
  if (hasReachedQuestionsLimit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/banco-questoes" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Voltar para o Banco de Questões
        </Link>
        
        <div className="bg-white rounded-xl shadow-md p-8 max-w-2xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="bg-amber-100 p-3 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Limite de questões atingido</h2>
            <p className="text-gray-600 mb-6">
              Você já utilizou {subscriptionLimits?.questionsUsedToday} de {subscriptionLimits?.questionsLimitPerDay} questões diárias disponíveis no seu plano.
            </p>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6 text-left w-full">
              <p className="text-blue-700">
                Faça upgrade para o plano <strong>Pro</strong> ou <strong>Pro+</strong> para adicionar mais questões diariamente.
              </p>
            </div>
            
            <div className="flex gap-4">
              <Link href="/perfil/assinatura" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Ver planos
              </Link>
              <Link href="/banco-questoes" className="border border-gray-300 px-4 py-2 rounded-lg text-gray-700">
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <Link 
          href="/banco-questoes" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Voltar para o Banco de Questões
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Nova Questão</h1>
        <p className="text-gray-600 mt-2">
          Crie uma nova questão para seu banco de questões
        </p>
      </div>

      {/* Container para o modal */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <QuestionModal
          isOpen={true}
          onClose={() => router.push('/banco-questoes')}
          onSave={handleSaveQuestion}
          title="Nova Questão"
          initialData={emptyQuestion}
        />
      </div>
    </div>
  );
} 
