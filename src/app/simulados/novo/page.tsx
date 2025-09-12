'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaSave, FaPlus, FaQuestionCircle } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { Exam, ExamsService } from '@/services/exams.service';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function NovoSimuladoPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { hasReachedLimit, subscriptionLimits } = useSubscription();
  
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState<string>('60');
  const [unlimitedTime, setUnlimitedTime] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  const [examTypeId, setExamTypeId] = useState<number | undefined>(undefined);
  const [examTypes, setExamTypes] = useState<{ id: number; name: string; description: string }[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  
  // Verificar limites de simulados
  const reachedWeekLimit = hasReachedLimit('simulados_per_week');
  const reachedMonthLimit = hasReachedLimit('simulados_per_month');

  useEffect(() => {
    loadExamTypes();
  }, []);

  const loadExamTypes = async () => {
    try {
      setLoadingTypes(true);
      const types = await ExamsService.getExamTypes();
      setExamTypes(types);
    } catch (error) {
      console.error('Erro ao carregar tipos de exames:', error);
      toast.error('Erro ao carregar categorias de provas');
    } finally {
      setLoadingTypes(false);
    }
  };

  if (reachedWeekLimit || reachedMonthLimit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="bg-amber-100 p-3 rounded-full mb-4">
              <FaQuestionCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Limite de simulados atingido</h2>
            <p className="text-gray-600 mb-6">
              Você já utilizou {subscriptionLimits?.simuladosUsedThisWeek || 0} de {subscriptionLimits?.maxSimuladosPerWeek || 0} simulados semanais{subscriptionLimits?.maxSimuladosPerMonth ? ` e ${subscriptionLimits?.simuladosUsedThisMonth || 0} de ${subscriptionLimits?.maxSimuladosPerMonth} simulados mensais` : ''} disponíveis no seu plano.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6 text-left w-full">
              <p className="text-blue-700">
                Faça upgrade para o plano <strong>Pro</strong> ou <strong>Pro+</strong> para criar mais simulados semanalmente e mensalmente.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Link href="/perfil/assinatura" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
                <FaPlus className="h-5 w-5 mr-2" /> Ver planos
              </Link>
              <Link href="/simulados" className="border border-gray-300 px-4 py-2 rounded-lg text-gray-700">
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Por favor, informe um título para o simulado');
      return;
    }
    
    setSaving(true);
    try {
      const newExam: Exam = {
        title: title.trim(),
        description: description.trim() || undefined,
        time_limit: unlimitedTime ? null : parseInt(timeLimit) || 60,
        is_public: isPublic,
        shuffle_questions: shuffleQuestions,
        show_answers: showAnswers,
        exam_type_id: examTypeId,
      };
      
      const examId = await ExamsService.addExam(newExam);
      
      if (examId) {
        toast.success('Simulado criado com sucesso!');
        // Redirecionar para a página de adicionar questões
        router.push(`/simulados/${examId}/editar/questoes`);
      } else {
        toast.error('Erro ao criar simulado');
      }
    } catch (error) {
      console.error('Erro ao salvar simulado:', error);
      toast.error('Ocorreu um erro ao salvar o simulado');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link 
              href="/simulados" 
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
              aria-label="Voltar"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Novo Simulado</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className={`inline-flex items-center px-5 py-2.5 ${
              saving || !title.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-medium rounded-lg transition duration-300`}
          >
            <FaSave className="mr-2" /> {saving ? 'Salvando...' : 'Salvar e Continuar'}
          </button>
        </div>
        
        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Título do Simulado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Simulado de Cardiologia"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição ou instruções sobre o simulado"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Categoria/Tipo de Exame - Apenas para Admins Específicos */}
                {(user?.id === '9e959500-f290-4457-a5d7-2a81c496d123' || user?.id === 'e6c41b94-f25c-4ef4-b723-c4a2d480cf43') && (
                  <div>
                    <label htmlFor="examType" className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria da Prova
                    </label>
                    {loadingTypes ? (
                      <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        <span className="text-gray-500">Carregando categorias...</span>
                      </div>
                    ) : (
                      <select
                        id="examType"
                        value={examTypeId || ''}
                        onChange={(e) => setExamTypeId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Selecione uma categoria (opcional)</option>
                        {examTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.description}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Escolha a categoria que melhor descreve sua prova (residência, ENEM, concursos, vestibulares)
                    </p>
                  </div>
                )}
                
                {/* Time Limit */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">
                      Tempo Limite
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="unlimitedTime"
                        checked={unlimitedTime}
                        onChange={(e) => setUnlimitedTime(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="unlimitedTime" className="ml-2 block text-sm text-gray-700">
                        Sem limite de tempo
                      </label>
                    </div>
                  </div>
                  <div className={`flex items-center ${unlimitedTime ? 'opacity-50' : ''}`}>
                    <input
                      type="number"
                      id="timeLimit"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                      min="1"
                      max="480"
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={unlimitedTime}
                    />
                    <span className="ml-2 text-gray-600">minutos</span>
                  </div>
                </div>
                
                {/* Options */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="isPublic"
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="isPublic" className="font-medium text-gray-700">Simulado Público</label>
                      <p className="text-gray-500">Permite que outros usuários vejam e façam este simulado</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="shuffleQuestions"
                        type="checkbox"
                        checked={shuffleQuestions}
                        onChange={(e) => setShuffleQuestions(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="shuffleQuestions" className="font-medium text-gray-700">Embaralhar Questões</label>
                      <p className="text-gray-500">As questões serão apresentadas em ordem aleatória</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="showAnswers"
                        type="checkbox"
                        checked={showAnswers}
                        onChange={(e) => setShowAnswers(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="showAnswers" className="font-medium text-gray-700">Mostrar Respostas</label>
                      <p className="text-gray-500">Exibe as respostas corretas ao finalizar o simulado</p>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <FaQuestionCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Próximos passos</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Após criar o simulado, você poderá adicionar questões do seu banco de questões
                  ou criar novas questões específicas para este simulado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
