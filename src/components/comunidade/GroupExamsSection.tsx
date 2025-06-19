'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Plus, Clock, User, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { StudyGroupService, GroupExam } from '@/services/study-group.service';
import { Button } from '@/components/ui/button';
import AddExamModal from './AddExamModal';

interface GroupExamsSectionProps {
  groupId: string;
  userId: string;
  isAdmin?: boolean;
}

export default function GroupExamsSection({ groupId, userId, isAdmin = false }: GroupExamsSectionProps) {
  const [groupExams, setGroupExams] = useState<GroupExam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [removingExamId, setRemovingExamId] = useState<number | null>(null);
  
  useEffect(() => {
    loadGroupExams();
  }, [groupId]);
  
  // Função para carregar simulados do grupo
  const loadGroupExams = async () => {
    setLoadingExams(true);
    try {
      const exams = await StudyGroupService.getGroupExams(groupId);
      setGroupExams(exams);
    } catch (error) {
      console.error('Erro ao carregar simulados do grupo:', error);
      toast.error('Erro ao carregar simulados do grupo');
    } finally {
      setLoadingExams(false);
    }
  };
  
  // Função para remover um simulado do grupo
  const handleRemoveExam = async (examId: number) => {
    if (!confirm('Tem certeza que deseja remover este simulado do grupo?')) {
      return;
    }
    
    setRemovingExamId(examId);
    try {
      const success = await StudyGroupService.removeExamFromGroup(groupId, examId);
      if (success) {
        toast.success('Simulado removido do grupo com sucesso');
        // Atualizar a lista de simulados
        loadGroupExams();
      } else {
        toast.error('Erro ao remover simulado do grupo');
      }
    } catch (error) {
      console.error('Erro ao remover simulado:', error);
      toast.error('Ocorreu um erro ao remover o simulado');
    } finally {
      setRemovingExamId(null);
    }
  };
  
  return (
    <>
      <div className="bg-gradient-to-r from-green-500 via-green-600 to-teal-600 p-6 text-white shadow-sm relative overflow-hidden">
        {/* Efeito de luz de fundo */}
        <div className="absolute -bottom-6 right-12 w-24 h-24 bg-green-300/30 rounded-full blur-xl"></div>
        <div className="absolute -top-6 left-12 w-20 h-20 bg-teal-300/20 rounded-full blur-xl"></div>
        
        <h3 className="text-lg font-bold mb-2 flex items-center relative z-10">
          <FileText className="h-5 w-5 mr-2"/> 
          Simulados do Grupo
        </h3>
        <p className="text-white/90 text-sm relative z-10">
          Simulados compartilhados para estudo em grupo. Pratique com seus colegas!
        </p>
      </div>
    
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-semibold text-gray-800">
            Simulados Disponíveis
          </h4>
          <Button 
            onClick={() => setShowAddExamModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar Simulado
          </Button>
        </div>
        
        {loadingExams ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
          </div>
        ) : groupExams.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <h5 className="text-xl font-semibold text-gray-800 mb-2">Nenhum simulado disponível</h5>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Compartilhe seus simulados com o grupo para que todos possam praticar juntos.
            </p>
            <Button 
              onClick={() => setShowAddExamModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar Simulado
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {groupExams.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-800 mb-1">{item.exam?.title}</h5>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.exam?.description || 'Sem descrição'}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {item.exam?.time_limit && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Clock className="h-3 w-3 mr-1" />
                          {item.exam.time_limit} min
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <User className="h-3 w-3 mr-1" />
                        {item.user?.username || 'Usuário'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/simulados/${item.exam_id}/iniciar`}
                      className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Iniciar
                    </Link>
                    {(item.added_by === userId || isAdmin) && (
                      <button
                        onClick={() => handleRemoveExam(item.exam_id)}
                        disabled={removingExamId === item.exam_id}
                        className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                      >
                        {removingExamId === item.exam_id ? (
                          <span className="animate-pulse">Removendo...</span>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-1.5" />
                            Remover
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal para adicionar simulados - Agora usando o componente real AddExamModal */}
      {showAddExamModal && (
        <AddExamModal
          groupId={groupId}
          isOpen={showAddExamModal}
          onClose={() => setShowAddExamModal(false)}
          onExamAdded={loadGroupExams}
        />
      )}
    </>
  );
}
 