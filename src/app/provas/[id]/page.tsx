'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaPlay, FaClock, FaUsers, FaCalendar, FaTag, FaEdit, FaTrash } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { ExamsService, Exam } from '@/services/exams.service';
import { Modal } from '@/components/ui/Modal';

const Loading = ({ message = "Carregando..." }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh]">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-gray-600 font-medium">{message}</p>
  </div>
);

export default function ProvaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const examId = params?.id as string;
  
  useEffect(() => {
    if (examId) {
      loadExam();
    }
  }, [examId]);
  
  const loadExam = async () => {
    try {
      setLoading(true);
      const examData = await ExamsService.getExamById(Number(examId));
      setExam(examData);
    } catch (error) {
      console.error('Erro ao carregar prova:', error);
      toast.error('Erro ao carregar prova');
      router.push('/provas');
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartExam = () => {
    if (!exam) return;
    
    // Redirecionar para a página de resolução do simulado
    router.push(`/simulados/${exam.id}/resolver`);
  };
  
  const handleEdit = () => {
    if (!exam) return;
    router.push(`/simulados/${exam.id}/editar`);
  };
  
  const handleDelete = async () => {
    if (!exam) return;
    
    try {
      setDeleting(true);
      await ExamsService.deleteExam(exam.id);
      toast.success('Prova excluída com sucesso!');
      router.push('/provas');
    } catch (error) {
      console.error('Erro ao excluir prova:', error);
      toast.error('Erro ao excluir prova');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const getCategoryColor = (categoryName: string) => {
    const colors: { [key: string]: string } = {
      'residencia': 'bg-red-100 text-red-800 border-red-200',
      'concursos': 'bg-blue-100 text-blue-800 border-blue-200',
      'enem': 'bg-green-100 text-green-800 border-green-200',
      'vestibulares': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[categoryName.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };
  
  if (loading) {
    return <Loading message="Carregando prova..." />;
  }
  
  if (!exam) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Prova não encontrada</h1>
          <Link href="/provas" className="text-blue-600 hover:text-blue-800">
            Voltar para Provas
          </Link>
        </div>
      </div>
    );
  }
  
  const isOwner = user && exam.user_id === user.id;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/provas" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Voltar para Provas
        </Link>
      </div>
      
      {/* Prova Info */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
              {exam.description && (
                <p className="text-blue-100 text-lg mb-4">{exam.description}</p>
              )}
              
              {/* Badges */}
              <div className="flex flex-wrap gap-3">
                {exam.exam_type && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    getCategoryColor(exam.exam_type.name)
                  } bg-white`}>
                    <FaTag className="inline mr-1" />
                    {exam.exam_type.name}
                  </span>
                )}
                
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                  <FaClock className="inline mr-1" />
                  {formatTime(exam.time_limit)}
                </span>
                
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  exam.is_public 
                    ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                    : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
                }`}>
                  {exam.is_public ? 'Público' : 'Privado'}
                </span>
              </div>
            </div>
            
            {/* Actions */}
            {isOwner && (
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={handleEdit}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Editar prova"
                >
                  <FaEdit className="text-white" />
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                  title="Excluir prova"
                >
                  <FaTrash className="text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FaUsers className="text-2xl text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-600">Tentativas</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FaClock className="text-2xl text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{formatTime(exam.time_limit)}</div>
              <div className="text-sm text-gray-600">Tempo Limite</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FaCalendar className="text-2xl text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{formatDate(exam.created_at)}</div>
              <div className="text-sm text-gray-600">Criado em</div>
            </div>
          </div>
          
          {/* Description */}
          {exam.description && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sobre esta prova</h2>
              <p className="text-gray-700 leading-relaxed">{exam.description}</p>
            </div>
          )}
          
          {/* Category Info */}
          {exam.exam_type && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Categoria</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">{exam.exam_type.name}</h3>
                <p className="text-gray-600">{exam.exam_type.description}</p>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleStartExam}
              className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <FaPlay className="mr-2" />
              Iniciar Prova
            </button>
            
            {isOwner && (
              <button
                onClick={handleEdit}
                className="px-8 py-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <FaEdit className="mr-2" />
                Editar
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Exclusão"
      >
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Tem certeza que deseja excluir a prova "{exam.title}"? Esta ação não pode ser desfeita.
          </p>
          
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Excluindo...
                </>
              ) : (
                <>
                  <FaTrash className="mr-2" />
                  Excluir
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}