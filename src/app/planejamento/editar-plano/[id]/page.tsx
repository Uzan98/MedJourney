"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Plus, 
  Save, 
  Edit, 
  Trash, 
  BookOpen,
  RefreshCw,
  Loader2,
  BookMarked,
  CheckCircle,
  XCircle,
  Search,
  GraduationCap,
  PlayCircle
} from 'lucide-react';
import SmartPlanningService, { 
  SmartPlan, 
  SmartPlanSession 
} from '@/services/smart-planning.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';

export default function EditPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = Number(params.id);

  const [plan, setPlan] = useState<SmartPlan | null>(null);
  const [sessions, setSessions] = useState<SmartPlanSession[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Map<number, Subject[]>>(new Map());
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Estado para o formulário de nova sessão
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    title: '',
    disciplineId: 0,
    subjectId: null as number | null,
    date: '',
    startTime: '',
    endTime: '',
    durationMinutes: 30,
    isRevision: false,
    originalSessionId: null as number | null,
    revisionInterval: null as number | null
  });

  // Estado para edição de sessão
  const [editingSession, setEditingSession] = useState<number | null>(null);

  // Filtro e organização
  const [filterDate, setFilterDate] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyRevisions, setShowOnlyRevisions] = useState(false);

  useEffect(() => {
    if (isNaN(planId)) {
      toast.error('ID do plano inválido');
      router.push('/planejamento');
      return;
    }

    loadPlanData();
  }, [planId]);

  const loadPlanData = async () => {
    try {
      setLoading(true);
      
      // Carregar o plano
      const smartPlanService = new SmartPlanningService();
      const planData = await smartPlanService.getPlanById(planId);
      
      if (!planData) {
        toast.error('Plano não encontrado');
        router.push('/planejamento');
        return;
      }
      
      setPlan(planData);
      
      // Carregar sessões do plano
      const sessionsData = await smartPlanService.getPlanSessions(planId);
      if (sessionsData) {
        setSessions(sessionsData);
      }
      
      // Carregar disciplinas e assuntos para o formulário
      const disciplinesData = await DisciplinesRestService.getDisciplines(true);
      setDisciplines(disciplinesData || []);
      
      // Pré-carregar assuntos para cada disciplina
      const subjectsMap = new Map<number, Subject[]>();
      for (const discipline of disciplinesData) {
        const disciplineSubjects = await DisciplinesRestService.getSubjects(discipline.id);
        subjectsMap.set(discipline.id, disciplineSubjects || []);
      }
      setSubjects(subjectsMap);
      
    } catch (error) {
      console.error('Erro ao carregar dados do plano:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewSession = () => {
    // Definir valores padrão
    const today = new Date().toISOString().split('T')[0];
    
    setSessionForm({
      title: '',
      disciplineId: disciplines.length > 0 ? disciplines[0].id : 0,
      subjectId: null,
      date: today,
      startTime: '08:00',
      endTime: '09:00',
      durationMinutes: 60,
      isRevision: false,
      originalSessionId: null,
      revisionInterval: null
    });
    
    setShowSessionForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Manipular campos de checkbox
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSessionForm(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    // Se for campo de disciplina, resetar o assunto
    if (name === 'disciplineId') {
      setSessionForm(prev => ({ ...prev, [name]: Number(value), subjectId: null }));
      return;
    }
    
    // Calcular duração automaticamente quando horários são alterados
    if (name === 'startTime' || name === 'endTime') {
      let startMinutes = parseTimeToMinutes(name === 'startTime' ? value : sessionForm.startTime);
      let endMinutes = parseTimeToMinutes(name === 'endTime' ? value : sessionForm.endTime);
      
      // Lidar com casos em que o horário de término é no dia seguinte
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60; // Adicionar 24 horas
      }
      
      const duration = endMinutes - startMinutes;
      
      setSessionForm(prev => ({ 
        ...prev, 
        [name]: value,
        durationMinutes: duration
      }));
      return;
    }
    
    // Para todos os outros campos
    setSessionForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitSessionForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const smartPlanService = new SmartPlanningService();
      
      // Encontrar o nome da disciplina a partir do ID
      const disciplineName = getDisciplineName(sessionForm.disciplineId);
      
      // Preparar dados da sessão
      const sessionData = {
        title: sessionForm.title,
        discipline_id: sessionForm.disciplineId,
        discipline_name: disciplineName,
        subject_id: sessionForm.subjectId,
        date: sessionForm.date,
        start_time: sessionForm.startTime,
        end_time: sessionForm.endTime,
        duration_minutes: sessionForm.durationMinutes,
        is_revision: sessionForm.isRevision,
        original_session_id: sessionForm.originalSessionId,
        plan_id: planId,
        revision_interval: sessionForm.revisionInterval
      };
      
      // Se estamos editando uma sessão existente
      if (editingSession !== null) {
        const success = await smartPlanService.updatePlanSession(editingSession, sessionData);
        if (success) {
          toast.success('Sessão atualizada com sucesso');
          setEditingSession(null);
          setShowSessionForm(false);
          // Recarregar sessões
          const updatedSessions = await smartPlanService.getPlanSessions(planId);
          if (updatedSessions) setSessions(updatedSessions);
        }
      } else {
        // Criar nova sessão
        const success = await smartPlanService.addPlanSession(planId, sessionData);
        if (success) {
          toast.success('Sessão adicionada com sucesso');
          setShowSessionForm(false);
          // Recarregar sessões
          const updatedSessions = await smartPlanService.getPlanSessions(planId);
          if (updatedSessions) setSessions(updatedSessions);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
      toast.error('Erro ao salvar sessão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSession = (session: SmartPlanSession) => {
    // Preencher o formulário com os dados da sessão
    setSessionForm({
      title: session.title,
      disciplineId: session.discipline_id,
      subjectId: session.subject_id,
      date: session.date,
      startTime: session.start_time,
      endTime: session.end_time,
      durationMinutes: session.duration_minutes,
      isRevision: session.is_revision,
      originalSessionId: session.original_session_id,
      revisionInterval: session.revision_interval || null
    });
    
    setEditingSession(session.id);
    setShowSessionForm(true);
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta sessão?')) return;
    
    try {
      setSubmitting(true);
      const smartPlanService = new SmartPlanningService();
      const success = await smartPlanService.deletePlanSession(sessionId);
      
      if (success) {
        toast.success('Sessão excluída com sucesso');
        // Recarregar sessões
        const updatedSessions = await smartPlanService.getPlanSessions(planId);
        if (updatedSessions) setSessions(updatedSessions);
      }
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      toast.error('Erro ao excluir sessão');
    } finally {
      setSubmitting(false);
    }
  };

  // Função para iniciar uma sessão de estudo
  const handleStartSession = (session: SmartPlanSession) => {
    // Converter a sessão para o formato compatível com a página de estudos
    const convertedSession = SmartPlanningService.convertToStudySession(session);
    
    // Redirecionar para a página de estudos com o id da sessão
    router.push(`/estudos?session=${convertedSession.id}&start=true`);
  };

  // Helpers
  const parseTimeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDisciplineName = (id: number): string => {
    const discipline = disciplines.find(d => d.id === id);
    return discipline ? discipline.name : 'Disciplina não encontrada';
  };

  const getSubjectName = (disciplineId: number, subjectId: number | null): string => {
    if (!subjectId) return '';
    
    const disciplineSubjects = subjects.get(disciplineId);
    if (!disciplineSubjects) return '';
    
    const subject = disciplineSubjects.find(s => s.id === subjectId);
    return subject ? subject.title || subject.name || '' : '';
  };

  // Filtrar e agrupar sessões
  const filteredSessions = sessions.filter(session => {
    // Filtro por data
    if (filterDate && session.date !== filterDate) return false;
    
    // Filtro por disciplina
    if (filterDiscipline !== null && session.discipline_id !== filterDiscipline) return false;
    
    // Filtro por revisão
    if (showOnlyRevisions && !session.is_revision) return false;
    
    // Filtro por termo de busca
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      if (!session.title.toLowerCase().includes(lowerSearchTerm) && 
          !session.discipline_name.toLowerCase().includes(lowerSearchTerm)) {
        return false;
      }
    }
    
    return true;
  });

  // Agrupar sessões por data
  const groupedSessions: { [date: string]: SmartPlanSession[] } = {};
  filteredSessions.forEach(session => {
    if (!groupedSessions[session.date]) {
      groupedSessions[session.date] = [];
    }
    groupedSessions[session.date].push(session);
  });

  // Ordenar as datas
  const orderedDates = Object.keys(groupedSessions).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });
  
  // Função para calcular as estatísticas
  const calculateStats = () => {
    if (!sessions.length) return { total: 0, revisions: 0, mainSessions: 0, totalMinutes: 0 };
    
    const revisions = sessions.filter(s => s.is_revision).length;
    const mainSessions = sessions.filter(s => !s.is_revision).length;
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    
    return {
      total: sessions.length,
      revisions,
      mainSessions,
      totalMinutes
    };
  };
  
  const stats = calculateStats();

  // Obter datas únicas para o filtro
  const uniqueDates = [...new Set(sessions.map(s => s.date))].sort();

  // Obter o próximo dia de acordo com a data selecionada ou a primeira data disponível
  const getNextDate = (currentDate: string): string => {
    if (!uniqueDates.length) return '';
    
    const currentIndex = uniqueDates.indexOf(currentDate);
    if (currentIndex === -1 || currentIndex === uniqueDates.length - 1) {
      return uniqueDates[0];
    }
    
    return uniqueDates[currentIndex + 1];
  };

  // Obter o dia anterior de acordo com a data selecionada ou a última data disponível
  const getPrevDate = (currentDate: string): string => {
    if (!uniqueDates.length) return '';
    
    const currentIndex = uniqueDates.indexOf(currentDate);
    if (currentIndex <= 0) {
      return uniqueDates[uniqueDates.length - 1];
    }
    
    return uniqueDates[currentIndex - 1];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <h2 className="text-xl font-medium">Carregando plano...</h2>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <Link href="/planejamento" className="hover:text-blue-600 flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Planejamento
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/planejamento/visualizar-plano/${planId}`} className="hover:text-blue-600">
          Visualizar Plano
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">Editar Plano</span>
      </div>
      
      {/* Cabeçalho do plano */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg mb-6">
        <h1 className="text-2xl font-bold mb-2">{plan?.name}</h1>
        <div className="flex flex-wrap gap-4 text-blue-100">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {plan && new Date(plan.start_date).toLocaleDateString('pt-BR')} - {plan && new Date(plan.end_date).toLocaleDateString('pt-BR')}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}min de estudo
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            {stats.total} sessões ({stats.mainSessions} principais, {stats.revisions} revisões)
          </span>
        </div>
      </div>
      
      {/* Filtros e ações */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full md:w-1/3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar sessões..."
              className="w-full border border-gray-300 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="w-full md:w-2/3 flex flex-wrap gap-2 items-center">
          {/* Filtro por data */}
          <select 
            className="border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          >
            <option value="">Todas as datas</option>
            {uniqueDates.map(date => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('pt-BR')}
              </option>
            ))}
          </select>
          
          {/* Filtro por disciplina */}
          <select 
            className="border border-gray-300 rounded-lg py-2 px-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={filterDiscipline || ''}
            onChange={(e) => setFilterDiscipline(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todas as disciplinas</option>
            {disciplines.map(discipline => (
              <option key={discipline.id} value={discipline.id}>
                {discipline.name}
              </option>
            ))}
          </select>
          
          {/* Filtro por tipo */}
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={showOnlyRevisions}
              onChange={() => setShowOnlyRevisions(!showOnlyRevisions)}
            />
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showOnlyRevisions ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showOnlyRevisions ? 'translate-x-4' : 'translate-x-1'}`} />
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700">Somente revisões</span>
          </label>
          
          <div className="flex-grow"></div>
          
          {/* Botão para adicionar nova sessão */}
          <button
            onClick={handleAddNewSession}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center gap-1.5 hover:bg-blue-700 transition-colors"
            disabled={submitting}
          >
            <Plus className="h-4 w-4" />
            Nova Sessão
          </button>
        </div>
      </div>
      
      {/* Navegação entre datas quando filtro ativo */}
      {filterDate && (
        <div className="flex items-center justify-center mb-6 gap-4">
          <button 
            className="bg-white rounded-lg shadow px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => setFilterDate(getPrevDate(filterDate))}
          >
            Dia anterior
          </button>
          <span className="font-medium">{formatDate(filterDate)}</span>
          <button 
            className="bg-white rounded-lg shadow px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => setFilterDate(getNextDate(filterDate))}
          >
            Próximo dia
          </button>
        </div>
      )}
      
      {/* Lista de sessões */}
      <div className="space-y-8 mb-6">
        {orderedDates.length > 0 ? (
          orderedDates.map(date => (
            <div key={date} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 text-white">
                <h3 className="text-lg font-semibold capitalize">
                  {formatDate(date)}
                </h3>
              </div>
              
              <div className="divide-y divide-gray-100">
                {groupedSessions[date].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((session) => (
                  <div key={session.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      {/* Horário e duração */}
                      <div className="flex flex-col items-center min-w-[80px]">
                        <div className={`rounded-lg px-3 py-2 text-center w-full ${
                          session.is_revision 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          <div className="text-sm font-bold">{session.start_time.substring(0, 5)}</div>
                          <div className="text-xs">{session.duration_minutes} min</div>
                        </div>
                        <div className="h-full w-0.5 bg-gray-200 my-1 mx-auto"></div>
                        <div className="text-xs text-gray-500">{session.end_time.substring(0, 5)}</div>
                      </div>
                      
                      {/* Conteúdo da sessão */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-800">{session.title}</h4>
                          
                          {session.is_revision && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              <RefreshCw className="h-3 w-3" />
                              Revisão {session.revision_interval ? `(${session.revision_interval} dias)` : ''}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
                          <GraduationCap className="h-4 w-4 text-indigo-500" />
                          <span className="font-medium">{session.discipline_name}</span>
                        </div>
                        
                        {/* Ações */}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleStartSession(session)}
                            className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50 transition-colors flex items-center gap-1"
                            title="Iniciar sessão"
                          >
                            <PlayCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Iniciar</span>
                          </button>

                          <button
                            onClick={() => handleEditSession(session)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors"
                            disabled={submitting}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                            disabled={submitting}
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">Nenhuma sessão encontrada</h3>
            <p className="text-gray-500 mb-4">
              {sessions.length === 0 
                ? 'Este plano não possui sessões. Adicione uma nova sessão para começar.'
                : 'Nenhuma sessão corresponde aos filtros selecionados.'}
            </p>
            
            {sessions.length === 0 && (
              <button
                onClick={handleAddNewSession}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 inline-flex items-center gap-1.5 hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nova Sessão
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Modal para adicionar/editar sessão */}
      {showSessionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              {editingSession !== null ? 'Editar Sessão' : 'Nova Sessão'}
              {editingSession !== null && <span className="text-sm font-normal text-gray-500 ml-2">(ID: {editingSession})</span>}
            </h2>
            
            <form onSubmit={handleSubmitSessionForm}>
              <div className="space-y-4 mb-6">
                {/* Título */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={sessionForm.title}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Título da sessão"
                  />
                </div>
                
                {/* Disciplina */}
                <div>
                  <label htmlFor="disciplineId" className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                  <select
                    id="disciplineId"
                    name="disciplineId"
                    required
                    value={sessionForm.disciplineId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione uma disciplina</option>
                    {disciplines.map(discipline => (
                      <option key={discipline.id} value={discipline.id}>{discipline.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Assunto (se disciplina for selecionada) */}
                {sessionForm.disciplineId > 0 && (
                  <div>
                    <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 mb-1">Assunto (opcional)</label>
                    <select
                      id="subjectId"
                      name="subjectId"
                      value={sessionForm.subjectId || ''}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione um assunto</option>
                      {subjects.get(sessionForm.disciplineId)?.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.title || subject.name || 'Sem título'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Data */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    required
                    value={sessionForm.date}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Horário de início e fim */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">Horário de início</label>
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      required
                      value={sessionForm.startTime}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">Horário de término</label>
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      required
                      value={sessionForm.endTime}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Duração (calculada automaticamente) */}
                <div>
                  <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700 mb-1">Duração (minutos)</label>
                  <input
                    type="number"
                    id="durationMinutes"
                    name="durationMinutes"
                    required
                    min="1"
                    value={sessionForm.durationMinutes}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Tipo de sessão (normal ou revisão) */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRevision"
                    name="isRevision"
                    checked={sessionForm.isRevision}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, isRevision: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isRevision" className="text-sm font-medium text-gray-700">
                    Sessão de revisão
                  </label>
                </div>
                
                {/* Campos específicos para revisão */}
                {sessionForm.isRevision && (
                  <>
                    {/* Intervalo de revisão */}
                    <div>
                      <label htmlFor="revisionInterval" className="block text-sm font-medium text-gray-700 mb-1">
                        Intervalo de revisão (dias)
                      </label>
                      <select
                        id="revisionInterval"
                        name="revisionInterval"
                        value={sessionForm.revisionInterval || ''}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, revisionInterval: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Selecione um intervalo</option>
                        <option value="1">1 dia</option>
                        <option value="3">3 dias</option>
                        <option value="7">7 dias</option>
                        <option value="14">14 dias</option>
                        <option value="30">30 dias</option>
                      </select>
                    </div>
                    
                    {/* Sessão original */}
                    <div>
                      <label htmlFor="originalSessionId" className="block text-sm font-medium text-gray-700 mb-1">
                        Sessão original (opcional)
                      </label>
                      <select
                        id="originalSessionId"
                        name="originalSessionId"
                        value={sessionForm.originalSessionId || ''}
                        onChange={(e) => setSessionForm(prev => ({ ...prev, originalSessionId: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Selecione uma sessão</option>
                        {sessions.filter(s => !s.is_revision && s.discipline_id === sessionForm.disciplineId).map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSessionForm(false);
                    setEditingSession(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="animate-spin h-4 w-4" />}
                  {editingSession !== null ? 'Atualizar Sessão' : 'Adicionar Sessão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 