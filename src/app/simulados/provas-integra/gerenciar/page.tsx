'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Calendar,
  User,
  Building,
  X,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { CompleteExamsService } from '@/services/complete-exams.service';
import { CompleteExam } from '@/services/complete-exams.service';
import { toast } from 'sonner';

interface ExamForManagement extends CompleteExam {
  status: 'pending_review' | 'approved' | 'rejected';
  uploadedBy: string;
  processingAccuracy: number;
}

const statusConfig = {
  pending_review: {
    label: 'Aguardando Revisão',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  approved: {
    label: 'Aprovada',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  rejected: {
    label: 'Rejeitada',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  }
};

const typeConfig = {
  residencia: {
    label: 'Residência Médica',
    color: 'bg-blue-100 text-blue-800'
  },
  concurso: {
    label: 'Concurso Público',
    color: 'bg-green-100 text-green-800'
  },
  enem: {
    label: 'ENEM',
    color: 'bg-purple-100 text-purple-800'
  },
  vestibular: {
    label: 'Vestibular',
    color: 'bg-orange-100 text-orange-800'
  }
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getAccuracyColor(accuracy: number) {
  if (accuracy >= 95) return 'text-green-600';
  if (accuracy >= 85) return 'text-yellow-600';
  return 'text-red-600';
}

export default function GerenciarProvasPage() {
  const [exams, setExams] = useState<ExamForManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const allExams = await CompleteExamsService.getAllCompleteExamsForManagement();
      
      // Mapear para incluir campos de gerenciamento
      const examsForManagement: ExamForManagement[] = allExams.map(exam => ({
        ...exam,
        status: exam.is_approved === null ? 'pending_review' : 
                exam.is_approved ? 'approved' : 'rejected',
        uploadedBy: 'Sistema', // Pode ser expandido para incluir informações do usuário
        processingAccuracy: 95 // Valor padrão, pode ser calculado baseado na qualidade do processamento
      }));
      
      setExams(examsForManagement);
    } catch (error) {
      console.error('Erro ao carregar provas:', error);
      toast.error('Erro ao carregar provas');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExam = async (examId: number) => {
    try {
      const success = await CompleteExamsService.approveCompleteExam(examId);
      
      if (success) {
        toast.success('Prova aprovada com sucesso!');
        loadExams(); // Recarregar a lista
      } else {
        toast.error('Erro ao aprovar prova');
      }
    } catch (error) {
      console.error('Erro ao aprovar prova:', error);
      toast.error('Erro ao aprovar prova');
    }
  };

  const handleRejectExam = async (examId: number) => {
    try {
      const success = await CompleteExamsService.rejectCompleteExam(examId);
      
      if (success) {
        toast.success('Prova rejeitada com sucesso!');
        loadExams(); // Recarregar a lista
      } else {
        toast.error('Erro ao rejeitar prova');
      }
    } catch (error) {
      console.error('Erro ao rejeitar prova:', error);
      toast.error('Erro ao rejeitar prova');
    }
  };

  const handleViewExam = (examId: number) => {
    // Navegar para página de visualização da prova
    window.open(`/simulados/provas-integra/resolver/${examId}`, '_blank');
  };

  const handleDeleteExam = async (examId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta prova? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const success = await CompleteExamsService.deleteCompleteExam(examId);
      
      if (success) {
        // Remover do estado local
        setExams(prev => prev.filter(exam => exam.id !== examId));
        toast.success('Prova excluída com sucesso!');
      } else {
        toast.error('Erro ao excluir prova');
      }
    } catch (error) {
      console.error('Erro ao excluir prova:', error);
      toast.error('Erro ao excluir prova');
    }
  };

  // Filtrar provas
  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.institution?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    const matchesType = typeFilter === 'all' || exam.exam_type_id?.toString() === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/simulados/provas-integra">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciar Provas
            </h1>
            <p className="text-gray-600 mt-1">
              Visualize, revise e aprove provas importadas no sistema
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Provas</p>
                <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aguardando Revisão</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {exams.filter(e => e.status === 'pending_review').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aprovadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {exams.filter(e => e.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejeitadas</p>
                <p className="text-2xl font-bold text-red-600">
                  {exams.filter(e => e.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por título ou instituição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending_review">Aguardando Revisão</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="1">Residência Médica</SelectItem>
                <SelectItem value="2">Concurso Público</SelectItem>
                <SelectItem value="3">ENEM</SelectItem>
                <SelectItem value="4">Vestibular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Provas */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Carregando provas...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma prova encontrada.</p>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const statusInfo = statusConfig[exam.status];
            const StatusIcon = statusInfo.icon;
            
            // Mapear exam_type_id para tipo de prova
            const getExamTypeLabel = (typeId: number | null) => {
              switch(typeId) {
                case 1: return 'Residência Médica';
                case 2: return 'Concurso Público';
                case 3: return 'ENEM';
                case 4: return 'Vestibular';
                default: return 'Outros';
              }
            };
            
            return (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Informações Principais */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {exam.title}
                        </h3>
                        <div className="flex gap-2">
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                          <Badge variant="outline">
                            {getExamTypeLabel(exam.exam_type_id)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          <span>{exam.institution || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{exam.year || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span>{exam.total_questions} questões</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{exam.uploadedBy}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                        <span className="text-gray-600">
                          Criado em: {formatDate(exam.created_at)}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className={`font-medium ${getAccuracyColor(exam.processingAccuracy)}`}>
                          Precisão: {exam.processingAccuracy}%
                        </span>
                        {exam.hasImages && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-blue-600">Com imagens</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Ações */}
                     <div className="flex flex-col sm:flex-row gap-2">
                       <Button 
                         variant="outline" 
                         size="sm"
                         onClick={() => handleViewExam(exam.id!)}
                       >
                         <Eye className="h-4 w-4 mr-2" />
                         Visualizar
                       </Button>
                       
                       {exam.status === 'pending_review' && (
                         <>
                           <Button 
                             size="sm" 
                             className="bg-green-600 hover:bg-green-700"
                             onClick={() => handleApproveExam(exam.id!)}
                           >
                             <Check className="h-4 w-4 mr-2" />
                             Aprovar
                           </Button>
                           <Button 
                             variant="outline" 
                             size="sm"
                             className="border-red-500 text-red-500 hover:bg-red-50"
                             onClick={() => handleRejectExam(exam.id!)}
                           >
                             <X className="h-4 w-4 mr-2" />
                             Rejeitar
                           </Button>
                         </>
                       )}
                       
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="text-red-600 hover:text-red-700"
                         onClick={() => handleDeleteExam(exam.id!)}
                       >
                         <Trash2 className="h-4 w-4 mr-2" />
                         Excluir
                       </Button>
                     </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Paginação */}
      <div className="mt-8 flex justify-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="outline" size="sm">
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}