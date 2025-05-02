'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/Card';
import { 
  ArrowLeft, Save, Clock, Calendar, Trash2, Edit, BookOpen, 
  CheckCircle, Play, Pause, FileText, BookCheck, Brain,
  ChevronLeft, Award, Timer, CircleCheck, LucideIcon, AlarmClock, Flag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { obterPlanosLocais, obterSessaoEstudo, atualizarSessaoEstudo, excluirSessaoEstudo } from '@/services';
import { StudyPlan, StudySession, StudySessionUpdate } from '@/lib/types/planning';
import PlanningSessionTimer from '@/components/planning/PlanningSessionTimer';

// Componente Badge inline
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
      className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ${styles[variant]} transition-all duration-300 hover:shadow-sm hover:scale-105`}
      title={title}
    >
      {children}
    </div>
  );
}

export default function EditarSessaoPage() {
  const params = useParams();
  const router = useRouter();
  const planoId = params.id as string;
  const sessaoId = params.sessaoId as string;
  
  const [plano, setPlano] = useState<StudyPlan | null>(null);
  const [sessao, setSessao] = useState<StudySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  
  const [formData, setFormData] = useState<StudySessionUpdate>({
    id: sessaoId,
    title: '',
    disciplineName: '',
    subjectName: '',
    scheduledDate: '',
    duration: 60,
    completed: false,
    notes: '',
    actualDuration: 0
  });
  
  // Função para salvar alterações (movida para dentro do componente)
  const salvarAlteracoes = async (dados?: StudySessionUpdate) => {
    const dadosParaSalvar = dados || formData;
    
    setIsSubmitting(true);
    
    try {
      const sessaoAtualizada = await atualizarSessaoEstudo(dadosParaSalvar);
      
      if (sessaoAtualizada) {
        setSessao(sessaoAtualizada);
        toast.success('Sessão atualizada com sucesso');
        setEditMode(false);
      } else {
        toast.error('Erro ao atualizar sessão');
      }
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast.error('Não foi possível atualizar a sessão de estudo');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Carregar o plano e a sessão
  const carregarDados = async () => {
      try {
      setIsLoading(true);
        // Carregar o plano
        const planosLocais = obterPlanosLocais();
        const planoEncontrado = planosLocais.find(p => p.id === planoId);
        
        if (!planoEncontrado) {
          toast.error('Plano não encontrado');
          router.push('/planejamento');
          return;
        }
        
        setPlano(planoEncontrado);
        
        // Carregar a sessão
        const sessaoEncontrada = obterSessaoEstudo(sessaoId);
        
        if (!sessaoEncontrada) {
          toast.error('Sessão não encontrada');
          router.push(`/planejamento/${planoId}/sessoes`);
          return;
        }
        
        setSessao(sessaoEncontrada);
        
        // Inicializar formulário com dados da sessão
        setFormData({
          id: sessaoId,
          title: sessaoEncontrada.title || '',
          disciplineName: sessaoEncontrada.disciplineName || '',
          subjectName: sessaoEncontrada.subjectName || '',
          scheduledDate: sessaoEncontrada.scheduledDate ? new Date(sessaoEncontrada.scheduledDate).toISOString().slice(0, 16) : '',
          duration: sessaoEncontrada.duration || 60,
          completed: sessaoEncontrada.completed || false,
          actualDuration: sessaoEncontrada.actualDuration || 0,
          notes: sessaoEncontrada.notes || ''
        });
        
        // Se a sessão tiver duração real registrada, inicializar o contador
        if (sessaoEncontrada.actualDuration) {
          setFormData(prev => ({ ...prev, actualDuration: sessaoEncontrada.actualDuration }));
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Não foi possível carregar os dados da sessão');
      } finally {
        setIsLoading(false);
      }
  };

  // Carregar o plano e a sessão
  useEffect(() => {
    if (!planoId || !sessaoId) return;
    carregarDados();
  }, [planoId, sessaoId]);

  // Função para lidar com mudanças no formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Função para lidar com mudanças nas disciplinas
  const handleDisciplinaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const disciplineName = e.target.value;
    setFormData({ 
      ...formData, 
      disciplineName,
      subjectName: '' // Reset do assunto ao mudar a disciplina
    });
  };

  // Função para iniciar a sessão com o timer
  const iniciarSessao = () => {
    if (sessao?.completed) {
      toast.error('Esta sessão já foi concluída');
      return;
    }
    setShowTimer(true);
  };
  
  // Função para concluir a sessão manualmente (sem usar o timer)
  const concluirSessao = async () => {
    // Atualizar o estado do formulário
    const dadosAtualizados = {
      ...formData,
      completed: true,
      actualDuration: sessao?.duration || 0 // Usar a duração planejada como valor padrão
    };
    
    setFormData(dadosAtualizados);
    
    // Salvar imediatamente
    await salvarAlteracoes(dadosAtualizados);
  };

  // Função para atualizar a sessão
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error('O título da sessão é obrigatório');
      return;
    }
    
    if (!formData.scheduledDate) {
      toast.error('A data da sessão é obrigatória');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const sessaoAtualizada = await atualizarSessaoEstudo(formData);
      
      if (sessaoAtualizada) {
        toast.success('Sessão de estudo atualizada com sucesso');
        setSessao(sessaoAtualizada);
        router.push(`/planejamento/${planoId}/sessoes`);
      } else {
        toast.error('Erro ao atualizar sessão de estudo');
      }
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      toast.error('Não foi possível atualizar a sessão de estudo');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para excluir a sessão
  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta sessão de estudo? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const sucesso = await excluirSessaoEstudo(sessaoId);
      
      if (sucesso) {
        toast.success('Sessão de estudo excluída com sucesso');
        router.push(`/planejamento/${planoId}/sessoes`);
      } else {
        toast.error('Erro ao excluir sessão de estudo');
      }
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      toast.error('Não foi possível excluir a sessão de estudo');
    } finally {
      setIsDeleting(false);
    }
  };

  // Obter a lista de disciplinas disponíveis do plano
  const disciplinas = plano?.disciplines || [];
  
  // Obter a lista de assuntos da disciplina selecionada
  const assuntos = disciplinas.find(d => d.name === formData.disciplineName)?.subjects || [];
  
  // Função para lidar com a conclusão da sessão pelo timer
  const handleSessionComplete = async (actualDuration: number, notes?: string) => {
    if (sessao) {
      toast.success(`Sessão de estudo concluída com sucesso! Duração: ${actualDuration} minutos`);
      await carregarDados(); // Recarregar dados após conclusão
    }
  };

  // Renderização condicional para estado de carregamento
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-blue-600 font-medium">Carregando sessão...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Caso o plano ou a sessão não seja encontrado
  if (!plano || !sessao) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700">Sessão não encontrada</h2>
            <p className="text-gray-500 mt-2">A sessão que você está procurando não existe ou foi removida.</p>
            <Link href={`/planejamento/${planoId}/sessoes`}>
              <Button className="mt-4">Voltar para Sessões</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Cabeçalho da página aprimorado */}
        <div className="relative rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border border-blue-100 shadow-sm p-6 mb-8 overflow-hidden">
          {/* Elementos decorativos de fundo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300 rounded-full opacity-10 transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-300 rounded-full opacity-10 transform -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start">
              <Link href={`/planejamento/${planoId}/sessoes`} className="mr-4">
                <Button 
                  variant="ghost" 
                  className="p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 backdrop-blur-sm border border-blue-100 shadow-sm hover:shadow transition-all duration-300"
                >
                  <ChevronLeft className="h-5 w-5 text-blue-600" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-800">{editMode ? 'Editar Sessão' : sessao.title}</h1>
                  {!editMode && sessao.completed && (
                    <InlineBadge variant="success">
                      <CircleCheck className="h-3.5 w-3.5 mr-1" />
                      Concluída
                    </InlineBadge>
                  )}
                  {!editMode && !sessao.completed && (
                    <InlineBadge variant="warning">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Pendente
                    </InlineBadge>
                  )}
                </div>
                <div className="flex items-center mt-1 text-gray-600">
                  <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm font-medium">{plano.name}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {!editMode && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setEditMode(true)}
                    disabled={isSubmitting}
                    className="bg-white hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow transition-all duration-300"
                  >
                    <Edit className="h-4 w-4 mr-2 text-blue-500" />
                    Editar
                  </Button>
                  
                  {!sessao.completed && (
                    <Button 
                      onClick={iniciarSessao}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-none shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Iniciar Sessão
                    </Button>
                  )}
                  
                  <Button 
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-white hover:bg-red-50 text-red-500 hover:text-red-600 border border-red-200 shadow-sm hover:shadow transition-all duration-300"
                  >
                    {isDeleting ? 'Excluindo...' : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        {editMode ? (
          <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <CardTitle className="flex items-center text-gray-800">
                <Edit className="h-5 w-5 mr-2 text-blue-600" />
                Editar Detalhes da Sessão
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título da Sessão
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duração Real (minutos)
                  </label>
                  <input
                    type="number"
                    name="actualDuration"
                    value={formData.actualDuration}
                    onChange={handleInputChange}
                    min="1"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas/Resultados
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Descreva os resultados obtidos, dificuldades encontradas ou pontos a revisar..."
                  />
                </div>
                
                <div className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <input
                    type="checkbox"
                    id="completed"
                    name="completed"
                    checked={formData.completed}
                    onChange={handleInputChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200"
                  />
                  <label htmlFor="completed" className="ml-2 block font-medium text-gray-700">
                    Marcar sessão como concluída
                  </label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setEditMode(false)}
                  disabled={isSubmitting}
                  className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => salvarAlteracoes()}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Detalhes da sessão melhorados */}
            <div className="md:col-span-2">
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl bg-white">
                <CardHeader className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
                  <CardTitle className="flex items-center text-gray-800">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    Detalhes da Sessão
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Informações básicas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 transition-all duration-300 hover:shadow-md group">
                        <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                          Data Agendada
                        </h3>
                        <p className="mt-1 text-lg font-semibold text-gray-800">
                          {sessao.scheduledDate ? formatarData(sessao.scheduledDate) : 'Não definida'}
                        </p>
                      </div>
                      
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 transition-all duration-300 hover:shadow-md group">
                        <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                          Duração Estimada
                        </h3>
                        <p className="mt-1 text-lg font-semibold text-gray-800">
                          {formatarDuracao(sessao.duration)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-50 p-4 rounded-xl border border-green-100 transition-all duration-300 hover:shadow-md group">
                        <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                          <BookOpen className="h-4 w-4 mr-2 text-green-500 group-hover:scale-110 transition-transform duration-300" />
                          Disciplina
                        </h3>
                        <p className="mt-1 text-lg font-semibold text-gray-800">
                          {sessao.disciplineName || 'Não especificada'}
                        </p>
                      </div>
                      
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 transition-all duration-300 hover:shadow-md group">
                        <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
                          <BookCheck className="h-4 w-4 mr-2 text-amber-500 group-hover:scale-110 transition-transform duration-300" />
                          Assunto
                        </h3>
                        <p className="mt-1 text-lg font-semibold text-gray-800">
                          {sessao.subjectName || 'Não especificado'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Notas com design melhorado */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                        <Brain className="h-4 w-4 mr-2 text-indigo-500" />
                        Notas e Anotações
                      </h3>
                      <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 transition-all duration-300 hover:shadow-md">
                        {sessao.notes ? (
                          <p className="whitespace-pre-line text-gray-700">{sessao.notes}</p>
                        ) : (
                          <p className="text-gray-400 italic">Nenhuma nota registrada para esta sessão. Ao concluir a sessão, você poderá adicionar observações sobre o que aprendeu.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Status e temporizador com visual aprimorado */}
            <div>
              <Card className="border-0 shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl bg-white h-full">
                <CardHeader className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-green-50">
                  <CardTitle className="flex items-center text-gray-800">
                    <Timer className="h-5 w-5 mr-2 text-green-500" />
                    Status de Estudo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center space-y-6">
                    {/* Status com ícones e cores */}
                    <div className={`p-5 rounded-xl border transition-all duration-300 transform hover:scale-[1.02] ${
                      sessao.completed 
                        ? "bg-green-50 border-green-200" 
                        : "bg-yellow-50 border-yellow-200"
                    }`}>
                      <p className="text-sm text-gray-500 mb-2">Status da Sessão</p>
                      {sessao.completed ? (
                        <div className="text-green-600 font-bold flex items-center justify-center text-lg">
                          <CheckCircle className="h-6 w-6 mr-2" />
                          Concluída
                        </div>
                      ) : (
                        <div className="text-yellow-600 font-bold flex items-center justify-center text-lg">
                          <AlarmClock className="h-6 w-6 mr-2" />
                          Pendente
                        </div>
                      )}
                    </div>
                    
                    {/* Tempo de estudo com visual mais atraente */}
                    <div className="py-6">
                      <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 shadow-inner">
                        <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center justify-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-500" />
                          Tempo de Estudo
                        </h3>
                        <div className="text-4xl font-bold text-blue-700 mb-1">
                          {formatarDuracao(sessao.actualDuration || 0)}
                        </div>
                        <div className="text-xs text-blue-600 opacity-75">
                          {sessao.completed ? "Tempo real utilizado" : "Tempo estimado"}
                        </div>
                      </div>
                    </div>
                    
                    {/* Comparação de tempo com barras de progresso */}
                    {sessao.completed && sessao.duration && sessao.actualDuration && (
                      <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 transition-all duration-300 hover:shadow-md">
                        <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center justify-center">
                          <Award className="h-4 w-4 mr-2 text-indigo-500" />
                          Comparação de Tempo
                        </h3>
                        
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-600">Estimado:</span>
                              <span className="text-sm font-medium">{formatarDuracao(sessao.duration)}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gray-400 rounded-full" style={{width: '100%'}}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-gray-600">Real:</span>
                              <span className="text-sm font-medium">{formatarDuracao(sessao.actualDuration)}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  sessao.actualDuration > sessao.duration ? 'bg-red-500' : 'bg-green-500'
                                }`} 
                                style={{width: `${Math.min(100, (sessao.actualDuration / sessao.duration) * 100)}%`}}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-indigo-100">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Diferença:</span>
                              <span className={`font-medium ${
                                sessao.actualDuration > sessao.duration ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {sessao.actualDuration > sessao.duration 
                                  ? `+${formatarDuracao(sessao.actualDuration - sessao.duration)}`
                                  : `-${formatarDuracao(sessao.duration - sessao.actualDuration)}`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                {!sessao.completed && (
                  <CardFooter className="p-5 border-t border-gray-100 bg-gray-50">
                    <Button 
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-none shadow-md hover:shadow-lg transition-all duration-300 font-medium flex items-center justify-center gap-2 py-2.5"
                      onClick={iniciarSessao}
                    >
                      <Play className="h-5 w-5" />
                      Iniciar Sessão de Estudo
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Timer component */}
        {sessao && (
          <PlanningSessionTimer
            isOpen={showTimer}
            onClose={() => setShowTimer(false)}
            onComplete={handleSessionComplete}
            session={sessao}
          />
        )}
      </div>
    </AppLayout>
  );
}

// Função para formatar data
function formatarData(data?: string | Date) {
  if (!data) return 'Data não definida';
  
  try {
    return new Date(data).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    return 'Data inválida';
  }
}

// Função para formatar duração
function formatarDuracao(minutos?: number) {
  if (!minutos) return '0 min';
  
  if (minutos < 60) {
    return `${minutos} min`;
  }
  
  const horas = Math.floor(minutos / 60);
  const min = minutos % 60;
  
  return min > 0 ? `${horas}h ${min}min` : `${horas}h`;
} 