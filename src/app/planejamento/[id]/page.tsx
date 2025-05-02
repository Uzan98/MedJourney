'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  Trash2, 
  Calendar, 
  BookOpen, 
  BarChart2, 
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ClipboardList,
  BookCheck,
  PlusCircle,
  ListChecks,
  CalendarCheck,
  Heart,
  Filter,
  Search,
  Clock8,
  CalendarClock
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { obterPlanosLocais, atualizarPlano, excluirPlano, sincronizarPlanos } from '@/services';
import { StudyPlan, StudyPlanUpdate } from '@/lib/types/planning';

// Componente Badge inline para evitar problemas de importação
type InlineBadgeProps = {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
  children: React.ReactNode;
  title?: string;
}

function InlineBadge({ variant = 'default', children, title }: InlineBadgeProps) {
  const styles = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    outline: 'bg-transparent border border-gray-300 text-gray-700',
    success: 'bg-green-100 text-green-800',
    destructive: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    secondary: 'bg-purple-100 text-purple-800'
  };

  return (
    <div 
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${styles[variant]}`}
      title={title}
    >
      {children}
    </div>
  );
}

// Função para obter ícone baseado no ID da disciplina
const getDisciplineIcon = (id: number) => {
  // Se for uma disciplina do usuário (ID > 8), usar ícone padrão
  if (id > 8) {
    return <BookOpen className="h-5 w-5" />;
  }
  
  switch (id) {
    case 1: return <Heart className="h-5 w-5" />; // Anatomia
    case 2: return <BarChart2 className="h-5 w-5" />; // Fisiologia
    case 3: return <Filter className="h-5 w-5" />; // Bioquímica
    case 4: return <BookCheck className="h-5 w-5" />; // Farmacologia
    case 5: return <AlertCircle className="h-5 w-5" />; // Patologia
    case 6: return <Search className="h-5 w-5" />; // Microbiologia
    case 7: return <CheckCircle2 className="h-5 w-5" />; // Semiologia
    case 8: return <Clock8 className="h-5 w-5" />; // Clínica Médica
    default: return <BookOpen className="h-5 w-5" />;
  }
};

// Cores para as disciplinas
const disciplinasColors: Record<number, { bg: string, text: string }> = {
  1: { bg: 'bg-red-100', text: 'text-red-600' }, // Anatomia
  2: { bg: 'bg-blue-100', text: 'text-blue-600' }, // Fisiologia
  3: { bg: 'bg-green-100', text: 'text-green-600' }, // Bioquímica
  4: { bg: 'bg-orange-100', text: 'text-orange-600' }, // Farmacologia
  5: { bg: 'bg-purple-100', text: 'text-purple-600' }, // Patologia
  6: { bg: 'bg-yellow-100', text: 'text-yellow-600' }, // Microbiologia
  7: { bg: 'bg-teal-100', text: 'text-teal-600' }, // Semiologia
  8: { bg: 'bg-indigo-100', text: 'text-indigo-600' }, // Clínica Médica
};

const isUserDiscipline = (id: number): boolean => {
  // As disciplinas pré-definidas têm IDs de 1 a 8
  // Qualquer ID maior que 8 é considerado uma disciplina personalizada do usuário
  return id > 8;
};

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planoId = params.id as string;
  
  const [plano, setPlano] = useState<StudyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [showTip, setShowTip] = useState(true);
  
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: ''
  });

  // Função original de carregarPlano sem modificações
  function carregarPlano() {
    try {
      const planosLocais = obterPlanosLocais();
      const planoEncontrado = planosLocais.find(p => p.id === planoId);
      
      if (planoEncontrado) {
        setPlano(planoEncontrado);
        
        // Inicializar o formulário de edição
        setEditForm({
          name: planoEncontrado.name || '',
          description: planoEncontrado.description || '',
          startDate: planoEncontrado.startDate ? String(planoEncontrado.startDate) : '',
          endDate: planoEncontrado.endDate ? String(planoEncontrado.endDate) : '',
          status: planoEncontrado.status || 'ativo'
        });
      } else {
        toast.error('Plano não encontrado');
        router.push('/planejamento');
      }
    } catch (error) {
      console.error('Erro ao carregar plano:', error);
      toast.error('Não foi possível carregar o plano de estudo');
    } finally {
      setIsLoading(false);
    }
  }

  // Código para carregar o plano
  useEffect(() => {
    if (!planoId) return;
    
    carregarPlano();
  }, [planoId, router]);

  // Efeito adicional para garantir nomes corretos das disciplinas e assuntos
  useEffect(() => {
    if (!plano || isLoading) return;
    
    // Verificar e atualizar nomes das disciplinas e assuntos personalizados
    const storedDisciplinas = localStorage.getItem('disciplinas');
    if (!storedDisciplinas) return;
    
    try {
      const userDisciplines = JSON.parse(storedDisciplinas);
      // Mapear disciplinas do usuário por ID para acesso rápido
      const userDisciplinesMap = userDisciplines.reduce((acc: any, d: any) => {
        acc[d.id] = d;
      return acc;
    }, {});

      let precisaAtualizar = false;
      const disciplinasAtualizadas = plano.disciplines.map(disc => {
        // Verificar apenas disciplinas personalizadas (ID > 8)
        if (disc.id > 8) {
          const userDiscipline = userDisciplinesMap[disc.id];
          
          if (userDiscipline && (!disc.name || disc.name === `Disciplina ${disc.id}`)) {
            precisaAtualizar = true;
            
            // Criar cópia com nome atualizado
            const discAtualizada = { 
              ...disc, 
              name: userDiscipline.nome || disc.name 
            };
            
            // Verificar assuntos
            if (disc.subjects && disc.subjects.length > 0) {
              discAtualizada.subjects = disc.subjects.map(subj => {
                const userSubject = userDiscipline.assuntos?.find((a: any) => a.id === subj.id);
                
                if (userSubject && (!subj.name || subj.name === `Assunto ${subj.id}`)) {
                  return { ...subj, name: userSubject.nome };
                }
                
                return subj;
              });
            }
            
            return discAtualizada;
          }
        }
        
        return disc;
      });
      
      // Se precisar atualizar, atualize o estado
      if (precisaAtualizar) {
        console.log('Atualizando nomes de disciplinas/assuntos personalizados');
        const planoAtualizado = { ...plano, disciplines: disciplinasAtualizadas };
        setPlano(planoAtualizado);
        
        // Opcional: salvar as mudanças permanentemente
        atualizarPlano({
          id: plano.id,
          disciplines: disciplinasAtualizadas
        });
      }
    } catch (error) {
      console.error('Erro ao processar disciplinas do usuário:', error);
    }
  }, [plano, isLoading]);

  // Função para lidar com mudanças no formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  // Salvar edições
  const handleSaveEdit = async () => {
    if (!plano) return;
    
    setIsSubmitting(true);
    try {
      const planData: StudyPlanUpdate = {
        id: plano.id,
        name: editForm.name,
        description: editForm.description,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        status: editForm.status as any || 'ativo'
      };

      const updatedPlan = atualizarPlano(planData);
      
      if (updatedPlan) {
        setPlano(updatedPlan);
        toast.success('Plano atualizado com sucesso');
        setIsEditing(false);
      } else {
        toast.error('Erro ao atualizar plano');
      }
    } catch (error) {
      console.error('Erro ao salvar edições:', error);
      toast.error('Não foi possível salvar as alterações');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lidar com exclusão do plano
  const handleDelete = () => {
    if (!plano) return;
    
    if (window.confirm('Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.')) {
      try {
        excluirPlano(plano.id);
        toast.success('Plano excluído com sucesso');
        router.push('/planejamento');
      } catch (error) {
        console.error('Erro ao excluir plano:', error);
        toast.error('Não foi possível excluir o plano');
      }
    }
  };

  // Função para sincronizar com o backend
  const handleSynchronize = async () => {
    setIsSynchronizing(true);
    try {
      const resultado = await sincronizarPlanos();
      
      if (resultado.success) {
        toast.success('Plano sincronizado com sucesso');
        
        // Atualizar o plano após sincronização
        const planosAtualizados = obterPlanosLocais();
        const planoAtualizado = planosAtualizados.find(p => p.id === planoId);
        if (planoAtualizado) {
          setPlano(planoAtualizado);
        }
      } else {
        toast.error(`Erro na sincronização: ${resultado.errors?.join(', ')}`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Falha ao sincronizar com o servidor');
    } finally {
      setIsSynchronizing(false);
    }
  };
  
  // Renderizar status de sincronização
  const renderSyncStatus = () => {
    if (!plano?.synchronizationStatus) {
      return <InlineBadge variant="outline">Pendente</InlineBadge>;
    }

    if (plano.synchronizationStatus.synced) {
      return <InlineBadge variant="success">Sincronizado</InlineBadge>;
    } else if (plano.synchronizationStatus.syncFailed) {
      return (
        <InlineBadge 
          variant="destructive" 
          title={plano.synchronizationStatus.errorMessage || 'Erro desconhecido'}
        >
          Falha na sincronização
        </InlineBadge>
      );
    } else {
      return <InlineBadge variant="outline">Pendente</InlineBadge>;
    }
  };

  // Formatar data para exibição
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'Não definida';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Calcular progresso geral do plano
  const calculateOverallProgress = () => {
    if (!plano || !plano.disciplines) return 0;
    
    let totalSubjects = 0;
    let completedSubjects = 0;
    
    plano.disciplines.forEach(discipline => {
      if (discipline.subjects && discipline.subjects.length > 0) {
        discipline.subjects.forEach(subject => {
          totalSubjects++;
          if (subject.completed) {
            completedSubjects++;
          }
        });
      }
    });
    
    return totalSubjects === 0 ? 0 : Math.round((completedSubjects / totalSubjects) * 100);
  };

  // Função para lidar com conclusão do assunto
  const toggleSubjectCompletion = (disciplineId: number, subjectId: number) => {
    if (!plano) return;
    
    // Cria uma cópia profunda do plano atual
    const updatedPlan = JSON.parse(JSON.stringify(plano)) as StudyPlan;
    
    // Encontra a disciplina e o assunto
    const discipline = updatedPlan.disciplines.find(d => d.id === disciplineId);
    if (!discipline || !discipline.subjects) return;
    
    const subject = discipline.subjects.find(s => s.id === subjectId);
    if (!subject) return;
    
    // Alterna o status de conclusão
    subject.completed = !subject.completed;
    
    // Se marcar como concluído, definir progresso como 100%
    if (subject.completed) {
      subject.progress = 100;
    }
    
    // Atualiza o plano no armazenamento local
    try {
      const updatedPlanFromStorage = atualizarPlano({
        id: updatedPlan.id,
        disciplines: updatedPlan.disciplines
      });
      
      if (updatedPlanFromStorage) {
        setPlano(updatedPlanFromStorage);
        toast.success(subject.completed ? `${subject.name} marcado como concluído` : `${subject.name} marcado como pendente`);
      }
    } catch (error) {
      console.error('Erro ao atualizar status do assunto:', error);
      toast.error('Não foi possível atualizar o status do assunto');
    }
  };

  // Função para marcar todos os assuntos de uma disciplina como concluídos ou pendentes
  const toggleAllSubjectsCompletion = (disciplineId: number, markAsCompleted: boolean) => {
    if (!plano) return;
    
    // Cria uma cópia profunda do plano atual
    const updatedPlan = JSON.parse(JSON.stringify(plano)) as StudyPlan;
    
    // Encontra a disciplina
    const discipline = updatedPlan.disciplines.find(d => d.id === disciplineId);
    if (!discipline || !discipline.subjects || discipline.subjects.length === 0) return;
    
    // Atualiza todos os assuntos
    discipline.subjects.forEach(subject => {
      subject.completed = markAsCompleted;
      if (markAsCompleted) {
        subject.progress = 100;
      }
    });
    
    // Atualiza o plano no armazenamento local
    try {
      const updatedPlanFromStorage = atualizarPlano({
        id: updatedPlan.id,
        disciplines: updatedPlan.disciplines
      });
      
      if (updatedPlanFromStorage) {
        setPlano(updatedPlanFromStorage);
        toast.success(markAsCompleted 
          ? `Todos os assuntos de ${discipline.name} marcados como concluídos` 
          : `Todos os assuntos de ${discipline.name} marcados como pendentes`
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar status dos assuntos:', error);
      toast.error('Não foi possível atualizar o status dos assuntos');
    }
  };

  // Função para fechar a dica
  const closeTip = () => {
    setShowTip(false);
    // Opcionalmente, salvar no localStorage para não mostrar novamente
    localStorage.setItem('assuntoDicaVista', 'true');
  };

  // Verificar se a dica já foi vista
  useEffect(() => {
    const tipAlreadySeen = localStorage.getItem('assuntoDicaVista');
    if (tipAlreadySeen) {
      setShowTip(false);
    }
  }, []);

  // Renderizar conteúdo principal
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <span className="text-gray-600">Carregando plano de estudo...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!plano) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="bg-red-50 p-4 rounded-full inline-flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Plano não encontrado</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">O plano que você está procurando não existe ou foi removido.</p>
            <Link href="/planejamento">
              <Button className="mt-4">Voltar para Planejamento</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Calcular estatísticas
  const overallProgress = calculateOverallProgress();
  const totalDisciplines = plano.disciplines?.length || 0;
  const totalSubjects = plano.disciplines?.reduce((total, disc) => total + (disc.subjects?.length || 0), 0) || 0;
  const completedSubjects = plano.disciplines?.reduce((total, disc) => {
    return total + (disc.subjects?.filter(subject => subject.completed)?.length || 0);
  }, 0) || 0;
  const totalSessions = plano.sessions?.length || 0;
  const pendingSessions = plano.sessions?.filter(s => !s.completed)?.length || 0;

  // Determinar a cor de status
  const getStatusColor = () => {
    switch (plano.status) {
      case 'ativo': return 'text-green-500 bg-green-50';
      case 'pausado': return 'text-yellow-500 bg-yellow-50';
      case 'concluido': return 'text-blue-500 bg-blue-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <AppLayout>
      <div className="overflow-x-hidden">
      <div className="container mx-auto px-4 py-6">
        {/* Hero Section com Visual Aprimorado */}
          <div className="mb-8 overflow-hidden">
          {/* Navegação com breadcrumbs */}
          <div className="flex items-center text-sm text-gray-500 mb-6">
            <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
              Dashboard
          </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <Link href="/planejamento" className="hover:text-blue-600 transition-colors">
              Planejamento
            </Link>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-blue-600 font-medium">Detalhes do Plano</span>
          </div>
          
          {/* Header do plano com visual moderno */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-md border border-blue-100 overflow-hidden">
            {/* Elementos decorativos */}
            <div className="absolute top-0 right-0 w-56 h-56 bg-blue-200 rounded-full opacity-10 transform translate-x-20 -translate-y-20"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-300 rounded-full opacity-10 transform -translate-x-20 translate-y-10"></div>
            
            <div className="relative p-8">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              {/* Título e informações */}
                <div className="flex-1 z-10">
            {isEditing ? (
                    <div className="space-y-4 max-w-2xl">
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleInputChange}
                        className="text-3xl font-bold border-b-2 border-blue-300 bg-transparent focus:outline-none focus:border-blue-500 w-full px-1 py-1"
                  placeholder="Nome do plano"
                />
                    <textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleInputChange}
                      rows={2}
                        className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 backdrop-blur-sm"
                      placeholder="Descrição do plano"
                    />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Status
                          </label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleInputChange}
                            className="w-full text-sm border border-blue-200 rounded-xl p-3 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="concluido">Concluído</option>
                  </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Data de Início
                          </label>
                        <input
                          type="date"
                          name="startDate"
                          value={editForm.startDate}
                          onChange={handleInputChange}
                            className="w-full px-3 py-2.5 border border-blue-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Data de Término
                          </label>
                        <input
                          type="date"
                          name="endDate"
                          value={editForm.endDate}
                          onChange={handleInputChange}
                            className="w-full px-3 py-2.5 border border-blue-200 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
          </div>
        </div>
              </div>
            ) : (
                  <>
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h1 className="text-3xl font-bold text-gray-800">{plano.name}</h1>
                        <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor()} shadow-sm border border-opacity-20 inline-flex items-center gap-1.5`}>
                        {plano.status === 'ativo' ? (
                            <><Clock className="h-4 w-4" /> Ativo</>
                        ) : plano.status === 'pausado' ? (
                            <><AlertCircle className="h-4 w-4" /> Pausado</>
                        ) : (
                            <><CheckCircle2 className="h-4 w-4" /> Concluído</>
                        )}
              </div>
                      <div className="ml-auto">
                  {renderSyncStatus()}
                </div>
              </div>

                    {plano.description && (
                        <p className="text-gray-600 mb-4 max-w-3xl text-lg">{plano.description}</p>
                    )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-blue-100 shadow-sm">
                      {plano.startDate && (
                        <div className="flex items-center">
                            <CalendarDays className="h-4 w-4 mr-2 text-blue-500" />
                          <span>Início: <strong>{formatDate(plano.startDate)}</strong></span>
                        </div>
                      )}
                      
                      {plano.endDate && (
                        <div className="flex items-center">
                            <CalendarCheck className="h-4 w-4 mr-2 text-green-500" />
                          <span>Término: <strong>{formatDate(plano.endDate)}</strong></span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-purple-500" />
                        <span>Atualizado: <strong>{formatDate(plano.updatedAt)}</strong></span>
                      </div>
                    </div>
                  </>
            )}
            </div>
              
              {/* Ações */}
                <div className="z-10">
            {isEditing ? (
                    <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                        className="bg-white border-gray-300 hover:bg-gray-50 shadow-sm"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                            Salvar Mudanças
                    </>
                  )}
                </Button>
                    </div>
            ) : (
                    <div className="flex flex-col gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleSynchronize}
                  disabled={isSynchronizing}
                        className="bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-300 shadow-sm"
                >
                      {isSynchronizing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                            Sincronizar Plano
                        </>
                      )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                        className="bg-white hover:bg-indigo-50 border-indigo-200 hover:border-indigo-300 shadow-sm text-indigo-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                        Editar Plano
                </Button>
                <Button 
                        variant="outline" 
                  onClick={handleDelete}
                        className="bg-white hover:bg-red-50 border-red-200 hover:border-red-300 shadow-sm text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Plano
                </Button>
                    </div>
            )}
          </div>
        </div>
            
              {/* Métricas */}
            {!isEditing && (
                <div className="mt-8 z-10 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Progresso Geral */}
                    <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-5 border border-blue-200 shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                      <div 
                        className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-pulse group-hover:h-1.5 transition-all duration-300" 
                      style={{ width: `${overallProgress}%` }}
                    ></div>
                    <div className="flex flex-col">
                        <span className="text-sm text-blue-700 mb-1.5 flex items-center">
                          <BarChart2 className="h-4 w-4 mr-1.5 text-blue-600" />
                          Progresso Geral
                        </span>
                        <span className="text-2xl font-bold text-blue-900">{overallProgress}%</span>
                    </div>
                  </div>
                  
                  {/* Disciplinas */}
                    <div className="bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl p-5 border border-indigo-200 shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    <div className="flex flex-col">
                        <span className="text-sm text-indigo-700 mb-1.5 flex items-center">
                          <BookOpen className="h-4 w-4 mr-1.5 text-indigo-600" />
                          Disciplinas
                        </span>
                        <span className="text-2xl font-bold text-indigo-900">{totalDisciplines}</span>
                      </div>
              </div>
                  
                  {/* Assuntos */}
                    <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-xl p-5 border border-green-200 shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-green-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    <div className="flex flex-col">
                        <span className="text-sm text-green-700 mb-1.5 flex items-center">
                          <BookCheck className="h-4 w-4 mr-1.5 text-green-600" />
                          Assuntos
                        </span>
                      <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-green-900">{completedSubjects}</span>
                        <span className="text-gray-500 text-sm">/ {totalSubjects}</span>
              </div>
            </div>
                      </div>
                  
                  {/* Sessões */}
                    <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl p-5 border border-amber-200 shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                      <div className="absolute inset-0 bg-amber-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                    <div className="flex flex-col">
                        <span className="text-sm text-amber-700 mb-1.5 flex items-center">
                          <CalendarCheck className="h-4 w-4 mr-1.5 text-amber-600" />
                          Sessões Pendentes
                        </span>
                      <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-amber-900">{pendingSessions}</span>
                        <span className="text-gray-500 text-sm">/ {totalSessions}</span>
                        </div>
            </div>
          </div>
                      </div>
              </div>
                  )}
              </div>
            </div>
          </div>
              </div>
          
        {/* Dica de como concluir assuntos */}
        {showTip && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-start justify-between p-5">
              <div className="flex gap-4">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">Dica: Gerencie seu progresso</h3>
                  <p className="text-gray-600">
                    Agora você pode <strong>clicar diretamente nos assuntos</strong> ou no <strong>checkbox</strong> para marcar como concluído. 
                    Também adicionamos botões para marcar todos os assuntos de uma disciplina como concluídos ou pendentes de uma só vez.
                  </p>
                </div>
              </div>
              <button 
                onClick={closeTip}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Fechar dica"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Cards de acesso rápido com visual melhorado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 overflow-hidden">
          <Link href={`/planejamento/${plano.id}/sessoes`} className="group block rounded-xl overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 h-full relative overflow-hidden">
              {/* Elemento decorativo */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-200 rounded-full opacity-20 transition-transform duration-500 group-hover:scale-150"></div>
              
              <div className="p-6 relative">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1 group-hover:text-blue-700 transition-colors">Sessões de Estudo</h3>
                    <p className="text-sm text-gray-500 max-w-[80%]">Organize e acompanhe seu cronograma de sessões</p>
                    
                    {/* Mini estatística */}
                    <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-100/80 text-blue-700 text-sm font-medium">
                      <CalendarClock className="h-4 w-4 mr-1.5" />
                      {pendingSessions} sessões pendentes
                  </div>
                  </div>
                  <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm p-3.5 rounded-full shadow-sm border border-blue-100 transform transition-all group-hover:scale-110 group-hover:shadow-md group-hover:bg-blue-500 group-hover:border-blue-400 group-hover:text-white duration-300">
                    <Calendar className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
                
                <div className="mt-4 flex">
                  <div className="text-sm text-blue-700 font-medium flex items-center group-hover:translate-x-1 transition-transform">
                    Ver sessões <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
            </div>
            </div>
          </div>
            </Link>
          
          <Link href={`/planejamento/${plano.id}/estatisticas`} className="group block rounded-xl overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 h-full relative overflow-hidden">
              {/* Elemento decorativo */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-200 rounded-full opacity-20 transition-transform duration-500 group-hover:scale-150"></div>
              
              <div className="p-6 relative">
                <div className="flex justify-between items-center">
              <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1 group-hover:text-purple-700 transition-colors">Estatísticas</h3>
                    <p className="text-sm text-gray-500 max-w-[80%]">Visualize seu desempenho e progresso detalhado</p>
                    
                    {/* Mini estatística */}
                    <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-100/80 text-purple-700 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {overallProgress}% concluído
              </div>
                  </div>
                  <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm p-3.5 rounded-full shadow-sm border border-purple-100 transform transition-all group-hover:scale-110 group-hover:shadow-md group-hover:bg-purple-500 group-hover:border-purple-400 group-hover:text-white duration-300">
                    <BarChart2 className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
                
                <div className="mt-4 flex">
                  <div className="text-sm text-purple-700 font-medium flex items-center group-hover:translate-x-1 transition-transform">
                    Ver estatísticas <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
              </div>
            </div>
          </div>
            </Link>
          
          <Link href={`/planejamento/${plano.id}/editar-disciplinas`} className="group block rounded-xl overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="bg-gradient-to-br from-white to-green-50 border border-green-100 h-full relative overflow-hidden">
              {/* Elemento decorativo */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-green-200 rounded-full opacity-20 transition-transform duration-500 group-hover:scale-150"></div>
              
              <div className="p-6 relative">
                <div className="flex justify-between items-center">
              <div>
                    <h3 className="font-semibold text-lg text-gray-800 mb-1 group-hover:text-green-700 transition-colors">Gerenciar Conteúdo</h3>
                    <p className="text-sm text-gray-500 max-w-[80%]">Edite disciplinas, assuntos e organize seu material</p>
                    
                    {/* Mini estatística */}
                    <div className="mt-3 inline-flex items-center px-3 py-1.5 rounded-lg bg-green-100/80 text-green-700 text-sm font-medium">
                      <BookOpen className="h-4 w-4 mr-1.5" />
                      {totalDisciplines} disciplinas
              </div>
            </div>
                  <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm p-3.5 rounded-full shadow-sm border border-green-100 transform transition-all group-hover:scale-110 group-hover:shadow-md group-hover:bg-green-500 group-hover:border-green-400 group-hover:text-white duration-300">
                    <BookCheck className="h-6 w-6 text-green-600 group-hover:text-white transition-colors" />
          </div>
        </div>
                
                <div className="mt-4 flex">
                  <div className="text-sm text-green-700 font-medium flex items-center group-hover:translate-x-1 transition-transform">
                    Editar conteúdo <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
                </div>
              </div>
            </div>
          </Link>
          </div>
          
        {/* Lista de disciplinas com design aprimorado */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border border-gray-200 shadow-md overflow-hidden mb-8">
          <div className="bg-white p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  Disciplinas e Assuntos
                </h2>
                <p className="text-gray-500">
                Conteúdo do plano de estudos organizado por disciplinas
                </p>
                </div>
            <Link href={`/planejamento/${plano.id}/editar-disciplinas`}>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all duration-300 flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                Editar Conteúdo
                  </Button>
                </Link>
                </div>
                  </div>
          
          <div className="p-6 overflow-hidden">
            <div className="space-y-8 overflow-hidden">
              {plano.disciplines && plano.disciplines.length > 0 ? (
                plano.disciplines.map((discipline) => {
                  // Calcular progresso da disciplina
                  const totalAssuntos = discipline.subjects?.length || 0;
                  const assuntosConcluidos = discipline.subjects?.filter(a => a.completed)?.length || 0;
                  const progressoDisciplina = totalAssuntos > 0 
                    ? Math.round((assuntosConcluidos / totalAssuntos) * 100) 
                    : 0;
                  
                  // Determinar cor da prioridade
                  const getPriorityColor = (priority?: string) => {
                    switch (priority) {
                      case 'alta': return 'text-red-700 bg-red-50 border border-red-200';
                      case 'média': return 'text-yellow-700 bg-yellow-50 border border-yellow-200';
                      case 'baixa': return 'text-blue-700 bg-blue-50 border border-blue-200';
                      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
                    }
                  };
                
                  // Cores personalizadas com base no ID da disciplina
                  const getDisciplineColors = (id: number) => {
                    const colors = disciplinasColors[id];
                    if (colors) return colors;
                    
                    // Para disciplinas sem cor definida, usei um esquema baseado no ID
                    const baseColors = [
                      { bg: 'bg-blue-100', text: 'text-blue-600' },
                      { bg: 'bg-green-100', text: 'text-green-600' },
                      { bg: 'bg-purple-100', text: 'text-purple-600' },
                      { bg: 'bg-red-100', text: 'text-red-600' },
                      { bg: 'bg-amber-100', text: 'text-amber-600' },
                      { bg: 'bg-teal-100', text: 'text-teal-600' },
                      { bg: 'bg-indigo-100', text: 'text-indigo-600' },
                      { bg: 'bg-sky-100', text: 'text-sky-600' },
                    ];
                    
                    return baseColors[id % baseColors.length] || { bg: 'bg-gray-100', text: 'text-gray-600' };
                  };
                  
                  const colors = getDisciplineColors(discipline.id);
                
                return (
                    <div key={discipline.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
                      {/* Cabeçalho da disciplina com layout melhorado */}
                      <div className={`overflow-hidden border-b border-gray-100 ${colors.bg}`}>
                        <div className="p-6">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-start gap-3 flex-grow">
                              <div className="p-3 rounded-xl bg-white shadow-sm border border-gray-100 shrink-0">
                              <div className={colors.text}>
                              {getDisciplineIcon(discipline.id)}
                              </div>
                            </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-xl text-gray-800 mb-1 group-hover:text-blue-700 transition-colors truncate">
                              {discipline.name || (discipline.id ? `Disciplina ${discipline.id}` : 'Disciplina')}
                            </h3>
                              <div className="flex flex-wrap items-center gap-3">
                            {discipline.priority && (
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(discipline.priority)}`}>
                                Prioridade {discipline.priority}
                              </span>
                            )}
                                <span className="text-sm text-gray-500 flex items-center">
                            <BookCheck className="h-4 w-4 mr-1.5" />
                                  {assuntosConcluidos} de {totalAssuntos} assuntos concluídos
                                </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                              <div className="flex flex-col items-end mr-4">
                            <div className="text-2xl font-bold">
                              {progressoDisciplina}%
                          </div>
                            <div className="text-xs text-gray-500">
                              progresso
                          </div>
                          </div>
                          
                          <div className="flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-full relative flex items-center justify-center shrink-0">
                            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                              {/* Fundo cinza */}
                              <circle 
                                cx="50" cy="50" r="45" 
                                className="stroke-current text-gray-200" 
                                strokeWidth="8" 
                                fill="none"
                              />
                              {/* Progresso colorido */}
                              <circle 
                                cx="50" cy="50" r="45" 
                                className={`stroke-current ${colors.text.replace('text', 'text')}`}
                                strokeWidth="8" 
                                strokeLinecap="round"
                                strokeDasharray={`${progressoDisciplina * 2.83} 283`}
                                fill="none"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              {getDisciplineIcon(discipline.id)}
                        </div>
                      </div>
                      
                                {/* Botões para marcar todos assuntos - layout mais compacto */}
                            {discipline.subjects && discipline.subjects.length > 0 && (
                              <div className="flex gap-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAllSubjectsCompletion(discipline.id, true);
                                  }}
                                  className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-xs font-medium transition-colors"
                                  title="Marcar todos como concluídos"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAllSubjectsCompletion(discipline.id, false);
                                  }}
                                  className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-xs font-medium transition-colors"
                                  title="Marcar todos como pendentes"
                                >
                                  <AlertCircle className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                              </div>
                            </div>
                          </div>
                        </div>
                    </div>
                        
                      {/* Lista de assuntos com layout melhorado */}
                        {discipline.subjects && discipline.subjects.length > 0 ? (
                        <div className="divide-y divide-gray-100 bg-white p-2 overflow-hidden">
                              {discipline.subjects.map((subject) => (
                            <div 
                              key={subject.id} 
                              className="p-3 hover:bg-gray-50 transition-colors rounded-lg my-1 group/subject cursor-pointer overflow-hidden"
                              onClick={() => toggleSubjectCompletion(discipline.id, subject.id)}
                              title={subject.completed ? "Clique para marcar como pendente" : "Clique para marcar como concluído"}
                            >
                              <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2">
                                <div className="flex items-center min-w-0 flex-1">
                                  <div 
                                    className={`w-5 h-5 rounded-md mr-3 flex-shrink-0 flex items-center justify-center transition-all duration-200 border ${
                                          subject.completed 
                                        ? 'bg-green-500 border-green-600 text-white' 
                                        : 'bg-white border-gray-300 hover:border-blue-400'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSubjectCompletion(discipline.id, subject.id);
                                    }}
                                  >
                                    {subject.completed && <CheckCircle2 className="h-4 w-4" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className={`font-medium text-gray-900 mr-2 group-hover/subject:text-blue-700 transition-colors ${subject.completed ? 'line-through text-gray-500' : ''} block truncate`}>
                                        {subject.name || (subject.id ? `Assunto ${subject.id}` : 'Assunto')}
                                      </span>
                                  
                                  {subject.priority && (
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getPriorityColor(subject.priority)}`}>
                                      {subject.priority}
                                    </span>
                                  )}
                                  </div>
                                    </div>
                                
                                <div className="flex items-center space-x-3 flex-shrink-0">
                                  {subject.hours && (
                                    <span className="text-xs bg-gray-100 px-2.5 py-1 rounded-full text-gray-600 font-medium whitespace-nowrap">
                                      {subject.hours}h
                                    </span>
                                  )}
                                  
                                  {subject.completed ? (
                                    <span className="text-xs bg-green-100 px-2.5 py-1 rounded-full text-green-700 flex items-center whitespace-nowrap">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Concluído
                                    </span>
                                  ) : (
                                    subject.progress !== undefined && (
                                      <span className="text-xs bg-blue-100 px-2.5 py-1 rounded-full text-blue-700 font-medium whitespace-nowrap">
                                        {subject.progress}%
                                      </span>
                                    )
                                  )}
                                    </div>
                                  </div>
                                  
                              {!subject.completed && subject.progress !== undefined && subject.progress > 0 && (
                                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                      <div 
                                    className="bg-blue-600 h-1.5 rounded-full group-hover/subject:animate-pulse" 
                                        style={{ width: `${subject.progress}%` }}
                                      ></div>
                                </div>
                                  )}
                                </div>
                              ))}
                              </div>
                        ) : (
                        <div className="p-5 text-gray-500 text-sm bg-white text-center">
                            Nenhum assunto adicionado para esta disciplina
                          </div>
                        )}
                  </div>
                );
                })
              ) : (
                <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 p-10">
                  <div className="p-4 bg-gray-100 rounded-full mb-4">
                    <BookOpen className="h-6 w-6 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma disciplina adicionada</h3>
                  <p className="text-gray-600 mb-6 text-center">Adicione disciplinas ao seu plano para começar a acompanhar seus estudos</p>
                  <Link href="/disciplinas" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Gerenciar disciplinas
                  </Link>
          </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}