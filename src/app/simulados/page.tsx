'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaPlus, FaPlay, FaEdit, FaTrash, FaClipboard, FaHistory } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { Exam, ExamsService } from '@/services/exams.service';
import { Modal } from '@/components/ui/modal';

// Simple Loading component
const Loading = ({ message = "Carregando..." }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh]">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-gray-600 font-medium">{message}</p>
  </div>
);

export default function SimuladosPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [myExams, setMyExams] = useState<Exam[]>([]);
  const [publicExams, setPublicExams] = useState<Exam[]>([]);
  const [showMyExams, setShowMyExams] = useState(true);
  const [deleteExamId, setDeleteExamId] = useState<number | null>(null);
  const [showExamInfo, setShowExamInfo] = useState<Exam | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  useEffect(() => {
    loadExams();
  }, []);
  
  const loadExams = async () => {
    setLoading(true);
    try {
      // Carregar simulados do usuário
      const exams = await ExamsService.getUserExams();
      setMyExams(exams);
      
      // Carregar simulados públicos
      const pubExams = await ExamsService.getPublicExams();
      // Filtrar para não mostrar os próprios simulados novamente
      const filteredPublicExams = pubExams.filter(exam => 
        !exams.some(myExam => myExam.id === exam.id)
      );
      setPublicExams(filteredPublicExams);
    } catch (error) {
      console.error('Erro ao carregar simulados:', error);
      toast.error('Ocorreu um erro ao carregar os simulados');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteExam = async () => {
    if (deleteExamId) {
      try {
        const success = await ExamsService.deleteExam(deleteExamId);
        if (success) {
          toast.success('Simulado excluído com sucesso');
          // Atualizar a lista removendo o simulado excluído
          setMyExams(myExams.filter(exam => exam.id !== deleteExamId));
        } else {
          toast.error('Erro ao excluir simulado');
        }
      } catch (error) {
        console.error('Erro ao excluir simulado:', error);
        toast.error('Ocorreu um erro ao excluir o simulado');
      } finally {
        setDeleteExamId(null);
        setShowDeleteConfirmation(false);
      }
    }
  };
  
  const formatTime = (minutes: number | null | undefined) => {
    if (!minutes) return 'Sem limite de tempo';
    if (minutes < 60) return `${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };
  
  if (loading) {
    return <Loading message="Carregando simulados..." />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-8 mb-8">
        <div className="max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simulados Médicos
          </h1>
          <p className="text-blue-100 text-lg mb-6">
            Prepare-se para provas e avaliações com simulados personalizados. Crie seus próprios simulados 
            ou pratique com simulados compartilhados pela comunidade.
          </p>
          <Link 
            href="/simulados/novo" 
            className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:bg-blue-50 transition duration-300 ease-in-out"
          >
            <FaPlus className="mr-2" /> Criar Novo Simulado
          </Link>
          <Link 
            href="/simulados/meus-resultados" 
            className="inline-flex items-center px-6 py-3 ml-4 bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:bg-blue-800 transition duration-300 ease-in-out"
          >
            <FaHistory className="mr-2" /> Meus Resultados
          </Link>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-3 px-6 font-medium ${
            showMyExams
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setShowMyExams(true)}
        >
          Meus Simulados
        </button>
        <button
          className={`py-3 px-6 font-medium ${
            !showMyExams
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setShowMyExams(false)}
        >
          Simulados Públicos
        </button>
      </div>
      
      {/* Simulados Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showMyExams ? (
          myExams.length > 0 ? (
            myExams.map(exam => (
              <div key={exam.id} className="bg-white rounded-xl shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 line-clamp-2">{exam.title}</h3>
                    <button 
                      onClick={() => setShowExamInfo(exam)}
                      className="text-blue-500 hover:text-blue-700"
                      aria-label="Informações do simulado"
                    >
                      <FaClipboard />
                    </button>
                  </div>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">{exam.description || 'Sem descrição'}</p>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-5">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">
                      {formatTime(exam.time_limit)}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${exam.is_public ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {exam.is_public ? 'Público' : 'Privado'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <Link 
                      href={`/simulados/${exam.id}/iniciar`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-300"
                    >
                      <FaPlay className="mr-1" /> Iniciar
                    </Link>
                    
                    <div className="flex space-x-2">
                      <Link 
                        href={`/simulados/${exam.id}/editar`}
                        className="inline-flex items-center p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-300"
                        aria-label="Editar"
                      >
                        <FaEdit />
                      </Link>
                      <button 
                        onClick={() => {
                          if (exam.id) {
                          setDeleteExamId(exam.id);
                          setShowDeleteConfirmation(true);
                          }
                        }}
                        className="inline-flex items-center p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors duration-300"
                        aria-label="Excluir"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <div className="bg-white rounded-xl shadow p-8 text-center">
                <div className="bg-blue-100 inline-block p-4 rounded-full mb-4">
                  <FaClipboard className="text-blue-500 text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Você ainda não tem simulados</h3>
                <p className="text-gray-600 mb-6">
                  Crie seu primeiro simulado para começar a praticar e testar seus conhecimentos
                </p>
                <Link 
                  href="/simulados/novo" 
                  className="inline-flex items-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300"
                >
                  <FaPlus className="mr-2" /> Criar Simulado
                </Link>
              </div>
            </div>
          )
        ) : publicExams.length > 0 ? (
          publicExams.map(exam => (
            <div key={exam.id} className="bg-white rounded-xl shadow-md overflow-hidden transition-transform duration-300 hover:shadow-lg">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 line-clamp-2">{exam.title}</h3>
                  <button 
                    onClick={() => setShowExamInfo(exam)}
                    className="text-blue-500 hover:text-blue-700"
                    aria-label="Informações do simulado"
                  >
                    <FaClipboard />
                  </button>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-3">{exam.description || 'Sem descrição'}</p>
                
                <div className="flex items-center text-sm text-gray-500 mb-5">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full mr-2">
                    {formatTime(exam.time_limit)}
                  </span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Público
                  </span>
                </div>
                
                <div className="flex justify-center">
                  <Link 
                    href={`/simulados/${exam.id}/iniciar`}
                    className="inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-300"
                  >
                    <FaPlay className="mr-1" /> Iniciar Simulado
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full">
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="bg-blue-100 inline-block p-4 rounded-full mb-4">
                <FaClipboard className="text-blue-500 text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum simulado público disponível</h3>
              <p className="text-gray-600 mb-6">
                No momento não há simulados públicos para praticar. Que tal criar o seu próprio?
              </p>
              <Link 
                href="/simulados/novo" 
                className="inline-flex items-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300"
              >
                <FaPlus className="mr-2" /> Criar Simulado
              </Link>
            </div>
          </div>
        )}
      </div>
      
      {/* Confirmation Modal for Delete */}
      {showDeleteConfirmation && (
        <Modal
          title="Excluir Simulado"
          isOpen={showDeleteConfirmation}
          onClose={() => {
            setDeleteExamId(null);
            setShowDeleteConfirmation(false);
          }}
        >
          <div className="p-6">
            <p className="text-gray-700 mb-6">Tem certeza que deseja excluir este simulado? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setDeleteExamId(null);
                  setShowDeleteConfirmation(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteExam}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Exam Info Modal */}
      {showExamInfo && (
        <Modal
          title={showExamInfo.title}
          isOpen={!!showExamInfo}
          onClose={() => setShowExamInfo(null)}
        >
          <div className="py-2">
            <div className="mb-4">
              <p className="text-gray-700">{showExamInfo.description || 'Sem descrição'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">Tempo Limite</h4>
                <p className="text-gray-800 font-medium">{formatTime(showExamInfo.time_limit)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">Visibilidade</h4>
                <p className="text-gray-800 font-medium">
                  {showExamInfo.is_public ? 'Público' : 'Privado'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">Ordem das Questões</h4>
                <p className="text-gray-800 font-medium">
                  {showExamInfo.shuffle_questions ? 'Aleatória' : 'Fixa'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">Feedback</h4>
                <p className="text-gray-800 font-medium">
                  {showExamInfo.show_answers ? 'Mostra respostas corretas' : 'Apenas pontuação'}
                </p>
              </div>
            </div>
            
            <div className="flex justify-center mt-6">
              <Link 
                href={`/simulados/${showExamInfo.id}/iniciar`}
                className="inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300 mr-4"
              >
                <FaPlay className="mr-2" /> Iniciar
              </Link>
              
              {showMyExams && (
                <Link 
                  href={`/simulados/${showExamInfo.id}/editar`}
                  className="inline-flex items-center px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-300"
                >
                  <FaEdit className="mr-2" /> Editar
                </Link>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
} 