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
  Clock8
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
      <div className="container mx-auto px-4 py-6">
        {/* Cabeçalho com navegação */}
        <div className="mb-8">
          <Link href="/planejamento" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors duration-200">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Voltar para planejamento</span>
          </Link>
          
          {/* Header do plano */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              {/* Título e informações */}
              <div className="flex-1">
            {isEditing ? (
                  <div className="space-y-3 max-w-2xl">
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleInputChange}
                  className="text-2xl font-bold border-b border-gray-300 bg-transparent focus:outline-none focus:border-blue-500 w-full"
                  placeholder="Nome do plano"
                />
                    <textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descrição do plano"
                    />
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleInputChange}
                          className="text-sm border border-gray-300 rounded p-1.5 bg-white"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="concluido">Concluído</option>
                  </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                        <input
                          type="date"
                          name="startDate"
                          value={editForm.startDate}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Término</label>
                        <input
                          type="date"
                          name="endDate"
                          value={editForm.endDate}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
                        />
          </div>
        </div>
              </div>
            ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{plano.name}</h1>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor()} inline-flex items-center`}>
                        {plano.status === 'ativo' ? (
                          <><Clock className="h-3 w-3 mr-1" /> Ativo</>
                        ) : plano.status === 'pausado' ? (
                          <><AlertCircle className="h-3 w-3 mr-1" /> Pausado</>
                        ) : (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Concluído</>
                        )}
              </div>
                      <div className="ml-auto">
                  {renderSyncStatus()}
                </div>
              </div>

                    {plano.description && (
                      <p className="text-gray-600 mb-3 max-w-3xl">{plano.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {plano.startDate && (
                        <div className="flex items-center">
                          <CalendarDays className="h-4 w-4 mr-1.5 text-blue-500" />
                          <span>Início: <strong>{formatDate(plano.startDate)}</strong></span>
                        </div>
                      )}
                      
                      {plano.endDate && (
                        <div className="flex items-center">
                          <CalendarCheck className="h-4 w-4 mr-1.5 text-green-500" />
                          <span>Término: <strong>{formatDate(plano.endDate)}</strong></span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1.5 text-purple-500" />
                        <span>Atualizado: <strong>{formatDate(plano.updatedAt)}</strong></span>
                      </div>
                    </div>
                  </>
            )}
            </div>
              
              {/* Ações */}
              <div className="flex flex-wrap gap-2 mt-4 lg:mt-0">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleSynchronize}
                  disabled={isSynchronizing}
                >
                      {isSynchronizing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sincronizar
                        </>
                      )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </>
            )}
          </div>
        </div>
            
            {!isEditing && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Progresso */}
                  <div className="bg-blue-50 rounded-lg p-4 relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-blue-500" 
                      style={{ width: `${overallProgress}%` }}
                    ></div>
                    <div className="flex flex-col">
                      <span className="text-sm text-blue-700 mb-1">Progresso Geral</span>
                      <span className="text-2xl font-bold">{overallProgress}%</span>
                    </div>
                  </div>
                  
                  {/* Disciplinas */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-purple-700 mb-1">Disciplinas</span>
                      <span className="text-2xl font-bold">{totalDisciplines}</span>
                      </div>
              </div>
                  
                  {/* Assuntos */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-green-700 mb-1">Assuntos</span>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">{completedSubjects}</span>
                        <span className="text-gray-500 text-sm">/ {totalSubjects}</span>
              </div>
            </div>
                      </div>
                  
                  {/* Sessões */}
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-amber-700 mb-1">Sessões Pendentes</span>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">{pendingSessions}</span>
                        <span className="text-gray-500 text-sm">/ {totalSessions}</span>
                        </div>
            </div>
          </div>
                      </div>
              </div>
                  )}
              </div>
          
          {/* Cards de acesso rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link href={`/planejamento/${plano.id}/sessoes`} className="block">
              <div className="bg-white rounded-lg border border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors duration-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Sessões de Estudo</h3>
                    <p className="text-sm text-gray-500">Gerencie suas sessões de estudo</p>
                  </div>
                  <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full">
                    <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            </div>
          </div>
            </Link>
          
            <Link href={`/planejamento/${plano.id}/estatisticas`} className="block">
              <div className="bg-white rounded-lg border border-gray-100 p-4 hover:border-purple-200 hover:bg-purple-50 transition-colors duration-200">
                <div className="flex justify-between items-center">
              <div>
                    <h3 className="font-medium text-gray-900 mb-1">Estatísticas</h3>
                    <p className="text-sm text-gray-500">Acompanhe seu progresso</p>
              </div>
                  <div className="flex-shrink-0 bg-purple-100 p-3 rounded-full">
                    <BarChart2 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>
            </Link>
          
            <Link href={`/planejamento/${plano.id}/editar-disciplinas`} className="block">
              <div className="bg-white rounded-lg border border-gray-100 p-4 hover:border-green-200 hover:bg-green-50 transition-colors duration-200">
                <div className="flex justify-between items-center">
              <div>
                    <h3 className="font-medium text-gray-900 mb-1">Gerenciar Conteúdo</h3>
                    <p className="text-sm text-gray-500">Editar disciplinas e assuntos</p>
              </div>
                  <div className="flex-shrink-0 bg-green-100 p-3 rounded-full">
                    <BookOpen className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
            </Link>
          </div>
          </div>
          
        {/* Lista de disciplinas */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
              <CardTitle className="text-xl">Disciplinas e Assuntos</CardTitle>
              <CardDescription>
                Conteúdo do plano de estudos organizado por disciplinas
              </CardDescription>
                </div>
            <Link href={`/planejamento/${plano.id}/editar-disciplinas`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar Conteúdo
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {!plano.disciplines || plano.disciplines.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <div className="bg-white p-3 rounded-full inline-flex items-center justify-center mb-4 shadow-sm">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Nenhuma disciplina adicionada</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Este plano ainda não possui disciplinas. Adicione disciplinas e assuntos para organizar seu estudo.
                </p>
                <Link href={`/planejamento/${plano.id}/editar-disciplinas`}>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Adicionar Disciplinas
                  </Button>
                </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                {plano.disciplines.map((discipline) => {
                  // Calcular progresso da disciplina
                  const totalAssuntos = discipline.subjects?.length || 0;
                  const assuntosConcluidos = discipline.subjects?.filter(a => a.completed)?.length || 0;
                  const progressoDisciplina = totalAssuntos > 0 
                    ? Math.round((assuntosConcluidos / totalAssuntos) * 100) 
                    : 0;
                  
                  // Determinar cor da prioridade
                  const getPriorityColor = (priority?: string) => {
                    switch (priority) {
                      case 'alta': return 'text-red-700 bg-red-50 border-red-200';
                      case 'média': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
                      case 'baixa': return 'text-blue-700 bg-blue-50 border-blue-200';
                      default: return 'text-gray-700 bg-gray-50 border-gray-200';
                    }
                  };
                
                return (
                    <div key={discipline.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className={`flex items-center justify-between p-4 ${disciplinasColors[discipline.id]?.bg || 'bg-gray-100'}`}>
                        <div className="flex-1">
                        <div className="flex items-center">
                            <span className={`p-1.5 rounded-full bg-white mr-3 ${disciplinasColors[discipline.id]?.text || 'text-gray-600'}`}>
                              {getDisciplineIcon(discipline.id)}
                            </span>
                            <h3 className="font-medium text-lg mr-3">
                              {discipline.name || (discipline.id ? `Disciplina ${discipline.id}` : 'Disciplina')}
                            </h3>
                            {discipline.priority && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(discipline.priority)}`}>
                                Prioridade {discipline.priority}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center mt-2 text-sm text-gray-500">
                            <BookCheck className="h-4 w-4 mr-1.5" />
                            <span>{assuntosConcluidos} de {totalAssuntos} assuntos concluídos</span>
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 flex items-center">
                          <div className="text-right mr-4">
                            <div className="text-lg font-semibold">{progressoDisciplina}%</div>
                            <div className="text-xs text-gray-500">concluído</div>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-white relative flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-transparent" style={{
                              background: `conic-gradient(#3b82f6 ${progressoDisciplina}%, #e5e7eb ${progressoDisciplina}% 100%)`,
                              clipPath: 'circle(50%)'
                            }}></div>
                            <div className="absolute inset-1 bg-white rounded-full"></div>
                            {getDisciplineIcon(discipline.id)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Barra de progresso da disciplina */}
                      <div className="h-1.5 bg-gray-100 w-full">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${progressoDisciplina}%` }}
                        ></div>
                    </div>
                        
                        {discipline.subjects && discipline.subjects.length > 0 ? (
                        <div className="divide-y divide-gray-100 bg-white">
                              {discipline.subjects.map((subject) => (
                            <div key={subject.id} className="p-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1">
                                      <div 
                                    className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${
                                          subject.completed 
                                ? 'bg-green-500' 
                                            : subject.progress && subject.progress > 0 
                                              ? 'bg-yellow-500' 
                                              : 'bg-gray-300'
                                        }`}
                                      ></div>
                                  <span className="font-medium text-gray-900 mr-2">
                                        {subject.name || (subject.id ? `Assunto ${subject.id}` : 'Assunto')}
                                      </span>
                                  
                                  {subject.priority && (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(subject.priority)}`}>
                                      {subject.priority}
                                    </span>
                                  )}
                                    </div>
                                
                                <div className="flex items-center space-x-3">
                                  {subject.hours && (
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                      {subject.hours}h
                                    </span>
                                  )}
                                  
                                  {subject.completed ? (
                                    <span className="text-xs bg-green-100 px-2 py-1 rounded text-green-700 flex items-center">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Concluído
                                    </span>
                                  ) : (
                                    subject.progress !== undefined && (
                                      <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700">
                                        {subject.progress}%
                                      </span>
                                    )
                                  )}
                                    </div>
                                  </div>
                                  
                              {!subject.completed && subject.progress !== undefined && (
                                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                                      <div 
                                    className="bg-blue-600 h-1 rounded-full" 
                                        style={{ width: `${subject.progress}%` }}
                                      ></div>
                                </div>
                                  )}
                                </div>
                              ))}
                              </div>
                        ) : (
                        <div className="px-4 py-3 text-gray-500 text-sm bg-white">
                            Nenhum assunto adicionado para esta disciplina
                          </div>
                        )}
                  </div>
                );
              })}
          </div>
                )}
              </CardContent>
            </Card>
      </div>
    </AppLayout>
  );
}