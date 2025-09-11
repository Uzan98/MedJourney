'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaPlus, FaPlay, FaEdit, FaTrash, FaClipboard, FaHistory, FaSearch, FaTimes, FaShare } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { Exam, ExamsService } from '@/services/exams.service';
import { Modal } from '@/components/ui/Modal';
import { ShareExamModal } from '@/components/comunidade/ShareExamModal';
import { FacultyService } from '@/services/faculty.service';
import { Faculty } from '@/types/faculty';

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
  // Sempre manter como true para mostrar apenas Meus Simulados
  const [showMyExams, setShowMyExams] = useState(true);
  const [deleteExamId, setDeleteExamId] = useState<number | null>(null);
  const [showExamInfo, setShowExamInfo] = useState<Exam | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para compartilhamento
  const [shareExamModalOpen, setShareExamModalOpen] = useState(false);
  const [examToShare, setExamToShare] = useState<Exam | null>(null);
  const [userFaculties, setUserFaculties] = useState<Faculty[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [showSelectFacultyModal, setShowSelectFacultyModal] = useState(false);
  
  useEffect(() => {
    loadExams();
  }, []);
  
  // Carregar faculdades do usuário
  useEffect(() => {
    if (user) {
      setLoadingFaculties(true);
      FacultyService.getUserFaculties(user.id)
        .then(faculties => {
          setUserFaculties(faculties);
        })
        .catch(error => {
          console.error('Erro ao carregar faculdades:', error);
        })
        .finally(() => {
          setLoadingFaculties(false);
        });
    }
  }, [user]);
  
  // Efeito para depuração quando a aba muda
  useEffect(() => {
    if (!showMyExams) {
      console.log('Aba de simulados públicos ativa. Verificando dados:', publicExams);
      // Se não tiver simulados públicos, tenta carregar novamente
      if (publicExams.length === 0) {
        console.log('Recarregando simulados públicos...');
        const loadPublicExams = async () => {
          try {
            // Carregar simulados do usuário para marcar quais são próprios
            const userExams = await ExamsService.getUserExams();
            
            // Carregar simulados públicos
            const pubExams = await ExamsService.getPublicExams();
            console.log('Simulados públicos recarregados:', pubExams.length, pubExams);
            
            // Marcar quais simulados são do usuário atual
            const processedPublicExams = pubExams.map(exam => ({
              ...exam,
              isOwn: userExams.some(myExam => myExam.id === exam.id)
            }));
            
            console.log('Simulados públicos processados após recarga:', processedPublicExams.length);
            
            setPublicExams(processedPublicExams);
          } catch (error) {
            console.error('Erro ao recarregar simulados públicos:', error);
          }
        };
        loadPublicExams();
      }
    }
  }, [showMyExams, publicExams.length]);
  
  // Filtrar simulados públicos com base na pesquisa
  const filteredPublicExams = publicExams.filter(exam => {
    // Filtrar por termo de pesquisa (título, descrição ou nome do criador)
    return searchTerm.trim() === '' || 
      (exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       exam.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       exam.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const loadExams = async () => {
    setLoading(true);
    try {
      // Carregar simulados do usuário
      const exams = await ExamsService.getUserExams();
      setMyExams(exams);
      console.log('Simulados do usuário carregados:', exams.length);
      
      // Carregar simulados públicos
      const pubExams = await ExamsService.getPublicExams();
      console.log('Simulados públicos recebidos do serviço:', pubExams.length, pubExams);
      
      // Não filtrar os próprios simulados, mas marcar quais são do usuário atual
      const processedPublicExams = pubExams.map(exam => ({
        ...exam,
        isOwn: exams.some(myExam => myExam.id === exam.id)
      }));
      
      console.log('Simulados públicos processados:', processedPublicExams.length);
      
      setPublicExams(processedPublicExams);
      console.log('Estado publicExams atualizado:', processedPublicExams.length);
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
  
  // Função para iniciar o compartilhamento de um simulado
  const handleShareExam = (exam: Exam) => {
    setExamToShare(exam);
    
    // Se o usuário tiver apenas uma faculdade, abrir diretamente o modal de compartilhamento
    if (userFaculties.length === 1) {
      setSelectedFacultyId(userFaculties[0].id);
      setShareExamModalOpen(true);
    } else if (userFaculties.length > 1) {
      // Se tiver mais de uma faculdade, abrir o modal de seleção
      setShowSelectFacultyModal(true);
    } else {
      // Se não tiver faculdades, mostrar mensagem
      toast.error('Você precisa participar de pelo menos uma faculdade para compartilhar simulados.');
    }
  };
  
  // Função para confirmar a faculdade selecionada
  const handleConfirmFaculty = () => {
    if (selectedFacultyId) {
      setShowSelectFacultyModal(false);
      setShareExamModalOpen(true);
    } else {
      toast.error('Selecione uma faculdade para compartilhar o simulado.');
    }
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
            Simulados
          </h1>
          <p className="text-blue-100 text-lg mb-6">
            Prepare-se para provas e avaliações com simulados personalizados. Crie seus próprios simulados 
            ou pratique com simulados compartilhados pela comunidade.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/simulados/novo" 
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:bg-blue-50 transition duration-300 ease-in-out"
            >
              <FaPlus className="mr-2" /> Criar Novo Simulado
            </Link>
            <Link 
              href="/provas" 
              className="inline-flex items-center px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:bg-blue-800 transition duration-300 ease-in-out"
            >
              <FaClipboard className="mr-2" /> Explorar Provas
            </Link>
            <Link 
              href="/simulados/meus-resultados" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out"
            >
              <FaHistory className="mr-2" /> Meus Resultados
            </Link>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className="py-3 px-6 font-medium text-blue-600 border-b-2 border-blue-600"
        >
          Meus Simulados
        </button>
        {/* Botão de Simulados Públicos removido temporariamente */}
      </div>
      
      {/* Barra de pesquisa e filtros (apenas para simulados públicos) - mantido mas oculto */}
      {!showMyExams && (
        <div className="mb-6 hidden">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar simulados públicos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              {filteredPublicExams.length} simulados encontrados
            </div>
          </div>
        </div>
      )}
      
      {/* Simulados Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showMyExams ? (
          myExams.length > 0 ? (
            myExams.map(exam => (
              <div key={exam.id} className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100">
                {/* Header com gradiente */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold line-clamp-2 pr-4">{exam.title}</h3>
                      <button 
                        onClick={() => setShowExamInfo(exam)}
                        className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
                        aria-label="Informações do simulado"
                      >
                        <FaClipboard className="text-sm" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/90">
                      <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-medium">
                        {formatTime(exam.time_limit)}
                      </span>
                      <span className={`px-3 py-1 rounded-full font-medium ${
                        exam.is_public 
                          ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                          : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
                      }`}>
                        {exam.is_public ? 'Público' : 'Privado'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Conteúdo */}
                <div className="p-6">
                  <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">
                    {exam.description || 'Sem descrição disponível'}
                  </p>
                  
                  {/* Botões principais */}
                  <div className="flex gap-3 mb-4">
                    <Link 
                      href={`/simulados/${exam.id}/iniciar`}
                      className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                    >
                      <FaPlay className="mr-2 text-sm" /> Iniciar Simulado
                    </Link>
                    
                    <Link 
                      href={`/simulados/${exam.id}`}
                      className="flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                    >
                      <FaClipboard className="text-sm" />
                    </Link>
                  </div>
                  
                  {/* Botões secundários */}
                  <div className="grid grid-cols-3 gap-2">
                    <Link 
                      href={`/simulados/${exam.id}/editar`}
                      className="flex items-center justify-center px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-all duration-200 text-sm font-medium border border-amber-200"
                    >
                      <FaEdit className="mr-1 text-xs" /> Editar
                    </Link>
                    
                    <button 
                      onClick={() => handleShareExam(exam)}
                      className="flex items-center justify-center px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-all duration-200 text-sm font-medium border border-purple-200"
                    >
                      <FaShare className="mr-1 text-xs" /> Compartilhar
                    </button>
                    
                    <button 
                      onClick={() => {
                        setDeleteExamId(exam.id!);
                        setShowDeleteConfirmation(true);
                      }}
                      className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all duration-200 text-sm font-medium border border-red-200"
                    >
                      <FaTrash className="mr-1 text-xs" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 bg-white rounded-xl shadow-md p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="text-6xl text-gray-300 mb-4">
                  <FaClipboard />
                </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">Nenhum simulado encontrado</h3>
                <p className="text-gray-500 mb-6">
                  Você ainda não criou nenhum simulado. Crie seu primeiro simulado agora!
                </p>
                <Link 
                  href="/simulados/novo" 
                  className="flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition"
                >
                  <FaPlus className="mr-2" /> Criar Novo Simulado
                </Link>
              </div>
            </div>
          )
        ) : (
          filteredPublicExams.length > 0 ? (
          filteredPublicExams.map(exam => (
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
                  {exam.isOwn && (
                    <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      Seu simulado
                    </span>
                  )}
                </div>
                
                {/* Mostrar o criador do simulado */}
                <div className="flex items-center mb-4">
                  <span className="text-sm text-gray-600">
                    Criado por: <span className="font-medium">{exam.isOwn ? 'Você' : exam.creator_name || 'Usuário anônimo'}</span>
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
          )
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
      
      {/* Modal para selecionar faculdade */}
      <Modal
        isOpen={showSelectFacultyModal}
        onClose={() => setShowSelectFacultyModal(false)}
        title="Selecionar Faculdade"
      >
        <div className="p-6">
          <p className="mb-4 text-gray-700">
            Selecione a faculdade onde deseja compartilhar este simulado:
          </p>
          
          {loadingFaculties ? (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {userFaculties.map(faculty => (
                <div 
                  key={faculty.id}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedFacultyId === faculty.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedFacultyId(faculty.id)}
                >
                  <div className="font-medium">{faculty.name}</div>
                  <div className="text-sm text-gray-500">{faculty.institution}</div>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowSelectFacultyModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmFaculty}
              disabled={!selectedFacultyId || loadingFaculties}
              className={`px-4 py-2 rounded-md transition ${
                !selectedFacultyId || loadingFaculties
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Continuar
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Modal para compartilhar simulado */}
      {examToShare && selectedFacultyId && (
        <ShareExamModal
          open={shareExamModalOpen}
          onOpenChange={setShareExamModalOpen}
          exam={examToShare}
          facultyId={selectedFacultyId}
          onSuccess={() => {
            setExamToShare(null);
            setSelectedFacultyId(null);
          }}
        />
      )}
    </div>
  );
}
