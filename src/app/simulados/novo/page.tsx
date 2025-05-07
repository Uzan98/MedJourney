'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaSave, FaPlus, FaQuestionCircle } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { Exam, ExamsService } from '@/services/exams.service';

export default function NovoSimuladoPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState<string>('60');
  const [unlimitedTime, setUnlimitedTime] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [showAnswers, setShowAnswers] = useState(true);
  
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
                      <label htmlFor="showAnswers" className="font-medium text-gray-700">Mostrar Respostas Corretas</label>
                      <p className="text-gray-500">Ao finalizar, o usuário verá quais respostas estão corretas</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-5 border-t border-gray-200">
                <div className="flex justify-end">
                  <Link
                    href="/simulados"
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md mr-4 hover:bg-gray-50"
                  >
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    disabled={saving || !title.trim()}
                    className={`inline-flex items-center px-4 py-2 ${
                      saving || !title.trim()
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white font-medium rounded-md transition duration-300`}
                  >
                    <FaPlus className="mr-2" /> Criar e Adicionar Questões
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        {/* Help Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FaQuestionCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Dicas para criar um bom simulado</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Use um título descritivo que indique o conteúdo ou tema do simulado</li>
                  <li>Defina um tempo adequado para a dificuldade e quantidade de questões</li>
                  <li>Para simulados de treinamento, é recomendável mostrar as respostas corretas no final</li>
                  <li>Inclua questões de diferentes níveis de dificuldade para um aprendizado progressivo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 