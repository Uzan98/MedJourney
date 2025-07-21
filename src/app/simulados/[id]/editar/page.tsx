'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaSave, FaEdit, FaTrash } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { Exam, ExamsService } from '@/services/exams.service';
import Loading from '@/components/Loading';

export default function EditarSimuladoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const examId = parseInt(params.id);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  
  // Campos do formulário
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState<string>('60');
  const [unlimitedTime, setUnlimitedTime] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  
  useEffect(() => {
    loadExamData();
  }, [examId]);
  
  const loadExamData = async () => {
    setLoading(true);
    try {
      // Carregar dados do simulado
      const examData = await ExamsService.getExamById(examId);
      if (!examData) {
        toast.error('Simulado não encontrado');
        router.push('/simulados');
        return;
      }
      
      // Verificar se o usuário é o proprietário do simulado
      if (examData.user_id !== user?.id) {
        toast.error('Você não tem permissão para editar este simulado');
        router.push('/simulados');
        return;
      }
      
      setExam(examData);
      
      // Preencher os campos do formulário com os dados do simulado
      setTitle(examData.title || '');
      setDescription(examData.description || '');
      setTimeLimit(examData.time_limit?.toString() || '60');
      setUnlimitedTime(examData.time_limit === null);
      setIsPublic(examData.is_public || false);
      setShuffleQuestions(examData.shuffle_questions || true);
      setShowAnswers(examData.show_answers || true);
    } catch (error) {
      console.error('Erro ao carregar dados do simulado:', error);
      toast.error('Ocorreu um erro ao carregar o simulado');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Por favor, informe um título para o simulado');
      return;
    }
    
    setSaving(true);
    try {
      const updatedExam: Exam = {
        title: title.trim(),
        description: description.trim() || undefined,
        time_limit: unlimitedTime ? null : parseInt(timeLimit) || 60,
        is_public: isPublic,
        shuffle_questions: shuffleQuestions,
        show_answers: showAnswers,
      };
      
      const success = await ExamsService.updateExam(examId, updatedExam);
      
      if (success) {
        toast.success('Simulado atualizado com sucesso!');
        router.push(`/simulados/${examId}`);
      } else {
        toast.error('Erro ao atualizar simulado');
      }
    } catch (error) {
      console.error('Erro ao salvar simulado:', error);
      toast.error('Ocorreu um erro ao salvar o simulado');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <Loading message="Carregando simulado..." />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link 
              href={`/simulados/${examId}`}
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
              aria-label="Voltar"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Editar Simulado</h1>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/simulados/${examId}/editar/questoes`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
            >
              <FaEdit className="mr-2" /> Gerenciar Questões
            </Link>
            <button
              onClick={handleSubmit}
              disabled={saving || !title.trim()}
              className={`inline-flex items-center px-5 py-2.5 ${
                saving || !title.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-medium rounded-lg transition duration-300`}
            >
              <FaSave className="mr-2" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
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
        
        {/* Danger Zone */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mt-8">
          <div className="p-6">
            <h2 className="text-lg font-medium text-red-600 mb-4">Zona de Perigo</h2>
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div>
                <h3 className="font-medium text-red-800">Excluir Simulado</h3>
                <p className="text-sm text-red-600">Esta ação não pode ser desfeita.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este simulado? Esta ação não pode ser desfeita.')) {
                    ExamsService.deleteExam(examId).then((success) => {
                      if (success) {
                        toast.success('Simulado excluído com sucesso');
                        router.push('/simulados');
                      } else {
                        toast.error('Erro ao excluir simulado');
                      }
                    });
                  }
                }}
                className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50"
              >
                <FaTrash className="inline-block mr-2" /> Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 