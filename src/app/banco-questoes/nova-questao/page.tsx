"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';
import QuestionModal from '@/components/banco-questoes/QuestionModal';
import { Question, AnswerOption, QuestionsBankService } from '@/services/questions-bank.service';

export default function NovaQuestaoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Função para salvar a nova questão
  const handleSaveQuestion = async (questionData: Question, answerOptions: AnswerOption[]): Promise<boolean> => {
    setIsSubmitting(true);
    
    try {
      // Usar o serviço para salvar a questão
      const result = await QuestionsBankService.createQuestion(questionData, answerOptions);
      
      if (result) {
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