"use client";

import { useState, useEffect } from 'react';
import { 
  Brain, 
  Clock, 
  GraduationCap, 
  Calendar, 
  Lightbulb, 
  BarChart4, 
  PlusCircle,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  InfoIcon,
  Loader2,
  ChevronDown,
  ChevronRight,
  Search,
  Trash2,
  Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SmartPlanFormData } from '@/services/smart-planning.service';
import { Button } from '@/components/ui/button';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { Discipline, Subject } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

interface SmartPlanFormProps {
  onSubmit?: (data: SmartPlanFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

// Definindo interface para TimeSlot para melhor tipagem
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

// Definindo interface para DaySchedule para melhor tipagem
interface DaySchedule {
  day: number;
  name: string;
  shortName: string;
  enabled: boolean;
  timeSlots: TimeSlot[];
}

export default function SmartPlanForm({ onSubmit, onCancel, isSubmitting = false }: SmartPlanFormProps) {
  const [step, setStep] = useState(1);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjects, setSubjects] = useState<{[key: number]: Subject[]}>({});
  const [expandedDisciplines, setExpandedDisciplines] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para armazenar a agenda semanal do usuário
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([
    { day: 0, name: 'Domingo', shortName: 'Dom', enabled: false, timeSlots: [] },
    { day: 1, name: 'Segunda-feira', shortName: 'Seg', enabled: true, timeSlots: [{ id: '1-1', startTime: '19:00', endTime: '21:00' }] },
    { day: 2, name: 'Terça-feira', shortName: 'Ter', enabled: true, timeSlots: [{ id: '2-1', startTime: '19:00', endTime: '21:00' }] },
    { day: 3, name: 'Quarta-feira', shortName: 'Qua', enabled: true, timeSlots: [{ id: '3-1', startTime: '19:00', endTime: '21:00' }] },
    { day: 4, name: 'Quinta-feira', shortName: 'Qui', enabled: true, timeSlots: [{ id: '4-1', startTime: '19:00', endTime: '21:00' }] },
    { day: 5, name: 'Sexta-feira', shortName: 'Sex', enabled: true, timeSlots: [{ id: '5-1', startTime: '19:00', endTime: '21:00' }] },
    { day: 6, name: 'Sábado', shortName: 'Sáb', enabled: false, timeSlots: [] }
  ]);
  
  const [formData, setFormData] = useState<SmartPlanFormData>({
    selectedDisciplines: [] as number[],
    selectedSubjects: [] as number[],
    availableTimes: [] as {day: number, startTime: string, endTime: string}[],
    planName: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias a partir de hoje
    revisionsEnabled: true,
    balanceStrategy: 'balanced' as 'balanced' | 'focus' | 'variety',
    averageDailyMinutes: 120, // 2 horas por dia como padrão
    mainSessionDuration: {
      min: 30,
      max: 120
    },
    revisionSessionDuration: {
      percentage: 20
    },
    revisionConflictStrategy: 'next-available' // Estratégia padrão para lidar com conflitos de revisão
  });

  // Adicionando estado para armazenar o tempo diário médio
  const [averageDailyTime, setAverageDailyTime] = useState('120');

  // Load disciplines
  useEffect(() => {
    loadDisciplines();
  }, []);

  // Load subjects when a discipline is expanded
  useEffect(() => {
    // Carregar assuntos para disciplinas expandidas
    expandedDisciplines.forEach(disciplineId => {
      if (!subjects[disciplineId] || subjects[disciplineId].length === 0) {
        loadSubjectsForDiscipline(disciplineId);
      }
    });
  }, [expandedDisciplines]);
  
  // Atualizar formData.availableTimes quando weekSchedule mudar
  useEffect(() => {
    const availableTimes = weekSchedule
      .filter(day => day.enabled)
      .flatMap(day => 
        day.timeSlots.map(slot => ({
          day: day.day,
          startTime: slot.startTime,
          endTime: slot.endTime
        }))
      );
    
    setFormData(prev => ({
      ...prev,
      availableTimes
    }));
  }, [weekSchedule]);

    const loadDisciplines = async () => {
      try {
        setLoading(true);
        
      // Usar Supabase diretamente para buscar disciplinas em vez da API HTTP
      const { data: disciplines, error } = await supabase
        .from('disciplines')
        .select('id, name')
        .order('name');
      
      if (error) {
        throw new Error(`Erro do Supabase: ${error.message}`);
      }
      
      if (disciplines && disciplines.length > 0) {
        console.log('Disciplinas carregadas:', disciplines.length);
        setDisciplines(disciplines);
        } else {
        console.log('Nenhuma disciplina encontrada, usando dados mock');
          // Fallback para disciplinas mockadas
        setDisciplines(getMockDisciplines());
        }
      } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Não foi possível carregar as disciplinas');
      
      // Em caso de erro, usar disciplinas mockadas
      setDisciplines(getMockDisciplines());
      } finally {
        setLoading(false);
      }
    };

  const loadSubjectsForDiscipline = async (disciplineId: number) => {
    try {
      setLoadingSubjects(true);
      
      // Verificar se já temos esses assuntos em cache
      if (subjects[disciplineId] && subjects[disciplineId].length > 0) {
        return;
      }
      
      // Buscar assuntos da disciplina usando Supabase
      const { data: subjectsData, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('discipline_id', disciplineId)
        .order('title');
      
      if (error) {
        throw new Error(`Erro ao carregar assuntos: ${error.message}`);
      }
      
      if (subjectsData && subjectsData.length > 0) {
        console.log(`Assuntos carregados para disciplina ${disciplineId}:`, subjectsData.length);
        // Atualizar o estado com os novos assuntos
        setSubjects(prev => ({
          ...prev,
          [disciplineId]: subjectsData
        }));
      } else {
        console.log(`Nenhum assunto encontrado para disciplina ${disciplineId}, usando dados mock`);
        // Se não encontrar assuntos reais, usar dados mockados
        setSubjects(prev => ({
          ...prev,
          [disciplineId]: getMockSubjectsForDiscipline(disciplineId)
        }));
      }
    } catch (error) {
      console.error(`Erro ao carregar assuntos para disciplina ${disciplineId}:`, error);
      toast.error('Não foi possível carregar os assuntos');
      
      // Em caso de erro, usar assuntos mockados
      setSubjects(prev => ({
        ...prev,
        [disciplineId]: getMockSubjectsForDiscipline(disciplineId)
      }));
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Função auxiliar para gerar disciplinas mockadas
  const getMockDisciplines = (): Discipline[] => {
    return [
      { id: 1, name: 'Anatomia', created_at: '', updated_at: '', user_id: '', description: '', is_system: false, theme: null },
      { id: 2, name: 'Fisiologia', created_at: '', updated_at: '', user_id: '', description: '', is_system: false, theme: null },
      { id: 3, name: 'Bioquímica', created_at: '', updated_at: '', user_id: '', description: '', is_system: false, theme: null },
      { id: 4, name: 'Farmacologia', created_at: '', updated_at: '', user_id: '', description: '', is_system: false, theme: null },
      { id: 5, name: 'Patologia', created_at: '', updated_at: '', user_id: '', description: '', is_system: false, theme: null }
    ];
  };

  // Função auxiliar para gerar assuntos mockados para uma disciplina
  const getMockSubjectsForDiscipline = (disciplineId: number): Subject[] => {
    const mockSubjects: {[key: number]: Subject[]} = {
      1: [ // Anatomia
        { id: 101, discipline_id: 1, user_id: '', title: 'Sistema Cardiovascular', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 102, discipline_id: 1, user_id: '', title: 'Sistema Respiratório', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 103, discipline_id: 1, user_id: '', title: 'Sistema Digestório', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
      ],
      2: [ // Fisiologia
        { id: 201, discipline_id: 2, user_id: '', title: 'Fisiologia Cardíaca', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 202, discipline_id: 2, user_id: '', title: 'Fisiologia Respiratória', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 203, discipline_id: 2, user_id: '', title: 'Fisiologia Renal', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
      ],
      3: [ // Bioquímica
        { id: 301, discipline_id: 3, user_id: '', title: 'Metabolismo de Carboidratos', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 302, discipline_id: 3, user_id: '', title: 'Metabolismo de Lipídios', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 303, discipline_id: 3, user_id: '', title: 'Metabolismo de Proteínas', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
      ],
      4: [ // Farmacologia
        { id: 401, discipline_id: 4, user_id: '', title: 'Farmacocinética', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 402, discipline_id: 4, user_id: '', title: 'Farmacodinâmica', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 403, discipline_id: 4, user_id: '', title: 'Antibióticos', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
      ],
      5: [ // Patologia
        { id: 501, discipline_id: 5, user_id: '', title: 'Inflamação', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 502, discipline_id: 5, user_id: '', title: 'Neoplasias', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
        { id: 503, discipline_id: 5, user_id: '', title: 'Doenças Autoimunes', content: '', status: 'pending', created_at: '', updated_at: '', due_date: null },
      ]
    };
    
    return mockSubjects[disciplineId] || [];
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else if (onCancel) onCancel();
  };

  const handleSubmit = () => {
    if (!formData.planName.trim()) {
      toast.error("Por favor, dê um nome ao seu plano");
      return;
    }
    
    if (formData.selectedDisciplines.length === 0 && formData.selectedSubjects.length === 0) {
      toast.error("Selecione pelo menos uma disciplina ou assunto específico");
      setStep(1);
      return;
    }
    
    // Verificar se há pelo menos um dia com horário disponível
    const hasAvailableTimes = weekSchedule.some(day => day.enabled && day.timeSlots.length > 0);
    if (!hasAvailableTimes) {
      toast.error("Selecione pelo menos um dia com horário disponível");
      setStep(2);
      return;
    }

    // Se não tiver nome, usar um nome padrão
    let finalData = { ...formData };
    if (!finalData.planName) {
      finalData.planName = `Plano de estudos ${new Date().toLocaleDateString('pt-BR')}`;
    }

    // Se não houver assuntos específicos selecionados, mas houver disciplinas,
    // podemos considerar que todos os assuntos dessas disciplinas estão selecionados
    if (finalData.selectedSubjects.length === 0 && finalData.selectedDisciplines.length > 0) {
      const allSubjects: number[] = [];
      
      // Coletar todos os assuntos das disciplinas selecionadas
      finalData.selectedDisciplines.forEach(disciplineId => {
        if (subjects[disciplineId]) {
          allSubjects.push(...subjects[disciplineId].map(s => s.id));
        }
      });
      
      // Atualizar o formData
      finalData.selectedSubjects = allSubjects;
    }
    
    // Adicionar o tempo diário médio
    finalData.averageDailyMinutes = parseInt(averageDailyTime, 10);

    if (onSubmit) {
      onSubmit(finalData);
    }
  };

  const toggleDiscipline = (id: number) => {
    setFormData(prev => {
      const isSelected = prev.selectedDisciplines.includes(id);
      
      // Se estiver removendo uma disciplina, também remova seus assuntos
      if (isSelected) {
        const subjectsToRemove = subjects[id]?.map(s => s.id) || [];
        return {
          ...prev,
          selectedDisciplines: prev.selectedDisciplines.filter(d => d !== id),
          selectedSubjects: prev.selectedSubjects.filter(s => !subjectsToRemove.includes(s))
        };
      }
      
      // Se estiver adicionando uma disciplina, expanda-a para mostrar os assuntos
      if (!expandedDisciplines.includes(id)) {
        setExpandedDisciplines([...expandedDisciplines, id]);
      }
      
      return {
        ...prev,
        selectedDisciplines: [...prev.selectedDisciplines, id]
      };
    });
  };

  const toggleSubject = (id: number) => {
    setFormData(prev => {
      const isSelected = prev.selectedSubjects.includes(id);
      return {
        ...prev,
        selectedSubjects: isSelected 
          ? prev.selectedSubjects.filter(s => s !== id)
          : [...prev.selectedSubjects, id]
      };
    });
  };

  const toggleExpandDiscipline = (id: number) => {
    if (expandedDisciplines.includes(id)) {
      setExpandedDisciplines(expandedDisciplines.filter(d => d !== id));
    } else {
      setExpandedDisciplines([...expandedDisciplines, id]);
    }
  };

  // Filtrar as disciplinas e seus assuntos com base na pesquisa
  const filteredDisciplines = searchTerm.trim() === '' 
    ? disciplines 
    : disciplines.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subjects[d.id]?.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()))
      );

  // Contador de assuntos selecionados por disciplina
  const getSelectedSubjectsCountByDiscipline = (disciplineId: number) => {
    if (!subjects[disciplineId]) return 0;
    return subjects[disciplineId].filter(subject => 
      formData.selectedSubjects.includes(subject.id)
    ).length;
  };

  // Total de assuntos selecionados
  const totalSelectedSubjects = formData.selectedSubjects.length;

  // Função para alternar a ativação de um dia da semana
  const toggleDay = (dayIndex: number) => {
    setWeekSchedule(prev => 
      prev.map(day => 
        day.day === dayIndex 
          ? { 
              ...day, 
              enabled: !day.enabled,
              // Se ativar um dia que não tem slots, adicionar um slot padrão
              timeSlots: !day.enabled && day.timeSlots.length === 0 
                ? [{ id: `${dayIndex}-1`, startTime: '19:00', endTime: '21:00' }] 
                : day.timeSlots 
            } 
          : day
      )
    );
  };

  // Função para adicionar um novo slot de tempo a um dia
  const addTimeSlot = (dayIndex: number) => {
    setWeekSchedule(prev => 
      prev.map(day => 
        day.day === dayIndex 
          ? { 
              ...day, 
              timeSlots: [
                ...day.timeSlots, 
                { 
                  id: `${dayIndex}-${day.timeSlots.length + 1}`, 
                  startTime: '19:00', 
                  endTime: '21:00' 
                }
              ] 
            } 
          : day
      )
    );
  };

  // Função para remover um slot de tempo
  const removeTimeSlot = (dayIndex: number, slotId: string) => {
    setWeekSchedule(prev => 
      prev.map(day => 
        day.day === dayIndex 
          ? { 
              ...day, 
              timeSlots: day.timeSlots.filter(slot => slot.id !== slotId) 
            } 
          : day
      )
    );
  };

  // Função para atualizar um slot de tempo
  const updateTimeSlot = (dayIndex: number, slotId: string, field: 'startTime' | 'endTime', value: string) => {
    setWeekSchedule(prev => 
      prev.map(day => 
        day.day === dayIndex 
          ? { 
              ...day, 
              timeSlots: day.timeSlots.map(slot => 
                slot.id === slotId 
                  ? { ...slot, [field]: value } 
                  : slot
              ) 
            } 
          : day
      )
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                Selecione suas disciplinas e assuntos
              </h3>
              <p className="text-gray-600">
                Escolha as disciplinas e assuntos específicos que deseja incluir no seu plano de estudos inteligente
              </p>
              {totalSelectedSubjects > 0 && (
                <div className="mt-2 text-sm text-indigo-600 font-medium">
                  {totalSelectedSubjects} {totalSelectedSubjects === 1 ? 'assunto selecionado' : 'assuntos selecionados'}
                </div>
              )}
            </div>

            {/* Barra de pesquisa */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar disciplinas e assuntos..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              {filteredDisciplines.map(discipline => (
                <div key={discipline.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Cabeçalho da disciplina */}
                  <div 
                    className={`p-4 border-b border-gray-200 cursor-pointer ${
                    formData.selectedDisciplines.includes(discipline.id)
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          onClick={() => toggleDiscipline(discipline.id)}
                          className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                        formData.selectedDisciplines.includes(discipline.id)
                              ? 'bg-indigo-500 border-indigo-500 text-white'
                              : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                          }`}
                        >
                          {formData.selectedDisciplines.includes(discipline.id) && (
                            <CheckCircle className="h-4 w-4" />
                        )}
                      </div>
                        <div 
                          onClick={() => toggleExpandDiscipline(discipline.id)}
                          className="flex items-center space-x-2 cursor-pointer flex-1"
                        >
                          {expandedDisciplines.includes(discipline.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                        <h4 className="font-medium text-gray-800">{discipline.name}</h4>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {subjects[discipline.id]?.length || 0} assuntos
                      {getSelectedSubjectsCountByDiscipline(discipline.id) > 0 && (
                        <span className="ml-1 text-indigo-600 font-medium">
                          ({getSelectedSubjectsCountByDiscipline(discipline.id)} selecionados)
                        </span>
                      )}
                    </div>
                  </div>
                  </div>

                  {/* Lista de assuntos (expandível) */}
                  {expandedDisciplines.includes(discipline.id) && (
                    <div className="p-3 bg-gray-50">
                      {loadingSubjects ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                        </div>
                      ) : subjects[discipline.id]?.length ? (
                        <div className="space-y-2 pl-9">
                          {subjects[discipline.id]
                            .filter(subject => !searchTerm.trim() || subject.title.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(subject => (
                              <div 
                                key={subject.id} 
                                className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-md transition-colors"
                              >
                                <div 
                                  onClick={() => toggleSubject(subject.id)}
                                  className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                    formData.selectedSubjects.includes(subject.id)
                                      ? 'bg-indigo-500 border-indigo-500 text-white'
                                      : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                                  }`}
                                >
                                  {formData.selectedSubjects.includes(subject.id) && (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                </div>
                                <span className="text-sm text-gray-700">{subject.title}</span>
                              </div>
                            ))
                          }
                        </div>
                      ) : (
                        <div className="text-center py-3 text-sm text-gray-500">
                          Nenhum assunto encontrado para esta disciplina
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
              <div className="flex gap-2">
                <InfoIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                <p className="text-sm text-blue-700">
                    <span className="font-medium">Dica:</span> Selecione disciplinas inteiras ou apenas assuntos específicos.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Se selecionar apenas a disciplina, todos os assuntos serão incluídos no plano.
                </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-5">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Defina sua disponibilidade
              </h3>
              <p className="text-gray-600">
                Informe os horários em que você está disponível para estudar durante a semana
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 border border-gray-200 rounded-lg bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-purple-100 p-1.5 rounded">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-800">Período do plano</h4>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Data de início</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.startDate.toISOString().split('T')[0]}
                      onChange={(e) => setFormData({...formData, startDate: new Date(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Data de término</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.endDate.toISOString().split('T')[0]}
                      onChange={(e) => setFormData({...formData, endDate: new Date(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-green-100 p-1.5 rounded">
                    <BarChart4 className="h-4 w-4 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-800">Seu tempo diário</h4>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-gray-600 mb-1">Tempo disponível por dia (em média)</label>
                  <select 
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={averageDailyTime}
                    onChange={(e) => setAverageDailyTime(e.target.value)}
                  >
                    <option value="60">1 hora</option>
                    <option value="90">1 hora e 30 minutos</option>
                    <option value="120">2 horas</option>
                    <option value="180">3 horas</option>
                    <option value="240">4 horas</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800 mb-3">Tempo médio diário de estudo</h4>
              
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <label className="text-sm text-gray-600">Minutos por dia</label>
                  <span className="text-sm font-medium">
                    {formData.averageDailyMinutes || 120} min
                    {formData.averageDailyMinutes && formData.averageDailyMinutes >= 60 ? 
                      ` (${Math.floor(formData.averageDailyMinutes / 60)}h${formData.averageDailyMinutes % 60 > 0 ? ` ${formData.averageDailyMinutes % 60}min` : ''})` : 
                      ''}
                  </span>
                </div>
                
                <input
                  type="range"
                  min="60"
                  max="360"
                  step="15"
                  value={formData.averageDailyMinutes || 120}
                  onChange={(e) => setFormData({
                    ...formData,
                    averageDailyMinutes: parseInt(e.target.value)
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              <p className="text-xs text-gray-600">
                Defina quanto tempo, em média, você pretende estudar por dia. O plano distribuirá as sessões 
                respeitando este limite, considerando sua disponibilidade semanal.
              </p>
            </div>
            
            {/* Seleção de horários por dia da semana */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    <h4 className="font-medium text-gray-800">Horários disponíveis por dia</h4>
                  </div>
                  <div className="text-xs text-gray-500">
                    {weekSchedule.filter(day => day.enabled).length} dias selecionados
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {weekSchedule.map(day => (
                    <div 
                      key={day.day} 
                      className={`
                        text-center p-2 rounded-md cursor-pointer transition-colors
                        ${day.enabled 
                          ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                        }
                      `}
                      onClick={() => toggleDay(day.day)}
                    >
                      <div className="text-xs font-medium">{day.shortName}</div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-6">
                  {weekSchedule
                    .filter(day => day.enabled)
                    .map(day => (
                      <div key={day.day} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium text-gray-800">{day.name}</h5>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => addTimeSlot(day.day)}
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar horário
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          {day.timeSlots.length === 0 ? (
                            <div className="text-center py-2 text-sm text-gray-500">
                              Nenhum horário definido para este dia
                            </div>
                          ) : (
                            day.timeSlots.map(slot => (
                              <div key={slot.id} className="flex items-center gap-2">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Início</label>
                                    <input
                                      type="time"
                                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                      value={slot.startTime}
                                      onChange={(e) => updateTimeSlot(day.day, slot.id, 'startTime', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Fim</label>
                                    <input
                                      type="time"
                                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                      value={slot.endTime}
                                      onChange={(e) => updateTimeSlot(day.day, slot.id, 'endTime', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="p-2 text-gray-400 hover:text-red-500 transition-colors mt-5"
                                  onClick={() => removeTimeSlot(day.day, slot.id)}
                                  aria-label="Remover horário"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                </div>
                
                {weekSchedule.filter(day => day.enabled).length === 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm text-yellow-700">
                      Selecione pelo menos um dia da semana para definir seus horários de estudo.
                  </p>
                </div>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
              <div className="flex gap-2">
                <InfoIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Dica:</span> Você pode adicionar vários intervalos de horário em um mesmo dia.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Quanto mais detalhada for sua disponibilidade, mais preciso será seu plano de estudos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-5">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-600" />
                Configuração do plano inteligente
              </h3>
              <p className="text-gray-600">
                Ajuste as configurações do seu plano de estudos
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <h4 className="font-medium text-gray-800">Preferências do plano</h4>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome do plano</label>
                  <input 
                    type="text"
                    placeholder="Ex: Plano de estudos para o semestre"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={formData.planName}
                    onChange={(e) => setFormData({...formData, planName: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estratégia de distribuição</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div 
                      className={`p-3 border-2 rounded-lg cursor-pointer ${
                        formData.balanceStrategy === 'balanced' 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200'
                      }`}
                      onClick={() => setFormData({...formData, balanceStrategy: 'balanced'})}
                    >
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium text-gray-800">Equilibrado</h5>
                        {formData.balanceStrategy === 'balanced' && (
                          <CheckCircle className="h-4 w-4 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Distribui o estudo entre todas as disciplinas de forma balanceada
                      </p>
                    </div>
                    
                    <div 
                      className={`p-3 border-2 rounded-lg cursor-pointer ${
                        formData.balanceStrategy === 'focus' 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200'
                      }`}
                      onClick={() => setFormData({...formData, balanceStrategy: 'focus'})}
                    >
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium text-gray-800">Foco</h5>
                        {formData.balanceStrategy === 'focus' && (
                          <CheckCircle className="h-4 w-4 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Concentra-se mais em uma disciplina por vez
                      </p>
                    </div>
                    
                    <div 
                      className={`p-3 border-2 rounded-lg cursor-pointer ${
                        formData.balanceStrategy === 'variety' 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200'
                      }`}
                      onClick={() => setFormData({...formData, balanceStrategy: 'variety'})}
                    >
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium text-gray-800">Variedade</h5>
                        {formData.balanceStrategy === 'variety' && (
                          <CheckCircle className="h-4 w-4 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Alterna frequentemente entre disciplinas para evitar fadiga
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Incluir revisões espaçadas</label>
                    <p className="text-xs text-gray-500">
                      Programa revisões automáticas em intervalos crescentes
                    </p>
                  </div>
                  <div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.revisionsEnabled}
                        onChange={() => setFormData({...formData, revisionsEnabled: !formData.revisionsEnabled})}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <h4 className="font-medium text-gray-800">Configuração de sessões</h4>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Duração das sessões de estudo
                  </label>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Mínimo (minutos)</label>
                      <input
                        type="number"
                        min="15"
                        max="120"
                        step="5"
                        value={formData.mainSessionDuration?.min}
                        onChange={(e) => setFormData({
                          ...formData,
                          mainSessionDuration: {
                            ...formData.mainSessionDuration!,
                            min: Math.max(15, parseInt(e.target.value) || 30)
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Máximo (minutos)</label>
                      <input
                        type="number"
                        min="30"
                        max="180"
                        step="5"
                        value={formData.mainSessionDuration?.max}
                        onChange={(e) => setFormData({
                          ...formData,
                          mainSessionDuration: {
                            ...formData.mainSessionDuration!,
                            max: Math.max(formData.mainSessionDuration?.min || 30, parseInt(e.target.value) || 120)
                          }
                        })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-2">
                    O algoritmo ajustará a duração de cada sessão entre esses valores, baseado na prioridade de cada assunto.
                  </p>
                  
                  <div className="bg-blue-50 p-2 rounded-md text-xs text-blue-700">
                    <span className="font-medium">Dica:</span> Sessões de estudo mais curtas (30-45 min) são ideais para manter o foco, 
                    enquanto sessões mais longas (60-120 min) permitem aprofundamento em tópicos complexos.
                  </div>
                </div>
                
                {formData.revisionsEnabled && (
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Duração das revisões
                    </label>
                    
                    <div className="mb-2">
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-600">Porcentagem da sessão principal</label>
                        <span className="text-xs font-medium">{formData.revisionSessionDuration?.percentage || 20}%</span>
                      </div>
                      
                      <input
                        type="range"
                        min="10"
                        max="50"
                        step="5"
                        value={formData.revisionSessionDuration?.percentage || 20}
                        onChange={(e) => setFormData({
                          ...formData,
                          revisionSessionDuration: {
                            percentage: parseInt(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      As sessões de revisão terão duração de {formData.revisionSessionDuration?.percentage || 20}% 
                      do tempo da sessão principal. Por exemplo, um assunto com 60 minutos 
                      terá revisões de {Math.round(60 * (formData.revisionSessionDuration?.percentage || 20) / 100)} minutos.
                    </p>
                  </div>
                )}
                
                {formData.revisionsEnabled && (
                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Como lidar com revisões em dias sem disponibilidade?
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div 
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.revisionConflictStrategy === 'next-available' 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setFormData({
                          ...formData, 
                          revisionConflictStrategy: 'next-available'
                        })}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="font-medium text-gray-800">Próximo dia disponível</h5>
                          {formData.revisionConflictStrategy === 'next-available' && (
                            <CheckCircle className="h-4 w-4 text-indigo-600" />
                          )}
              </div>
                        <p className="text-xs text-gray-600">
                          Move a revisão para o próximo dia disponível mais próximo
                        </p>
                      </div>
                      
                      <div 
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.revisionConflictStrategy === 'adjust-interval' 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setFormData({
                          ...formData, 
                          revisionConflictStrategy: 'adjust-interval'
                        })}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="font-medium text-gray-800">Ajustar intervalos</h5>
                          {formData.revisionConflictStrategy === 'adjust-interval' && (
                            <CheckCircle className="h-4 w-4 text-indigo-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          Adapta os intervalos de revisão para dias disponíveis
                        </p>
                      </div>
                      
                      <div 
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.revisionConflictStrategy === 'skip' 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setFormData({
                          ...formData, 
                          revisionConflictStrategy: 'skip'
                        })}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="font-medium text-gray-800">Pular revisões</h5>
                          {formData.revisionConflictStrategy === 'skip' && (
                            <CheckCircle className="h-4 w-4 text-indigo-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          Ignora revisões que cairiam em dias sem disponibilidade
                        </p>
                      </div>
                      
                      <div 
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.revisionConflictStrategy === 'strict-days' 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setFormData({
                          ...formData, 
                          revisionConflictStrategy: 'strict-days'
                        })}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="font-medium text-gray-800">Dias fixos</h5>
                          {formData.revisionConflictStrategy === 'strict-days' && (
                            <CheckCircle className="h-4 w-4 text-indigo-600" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600">
                          Só programa revisões nos dias da semana configurados
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 bg-yellow-50 p-2 rounded-md text-xs text-yellow-700">
                      <span className="font-medium">Dica:</span> As revisões espaçadas são mais eficazes quando seguem 
                      intervalos específicos. A opção "Próximo dia disponível" equilibra eficácia e praticidade.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Renderização do progresso e botões de navegação
  return (
    <div className="max-w-3xl mx-auto">
      {/* Cabeçalho e indicador de progresso */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800">Criar Plano Inteligente</h2>
          <div className="text-sm font-medium text-gray-500">
            Passo {step} de 3
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>
      
      {/* Conteúdo do formulário */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {renderStepContent()}
      </div>
      
      {/* Botões de navegação */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          disabled={isSubmitting}
        >
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </button>
        
        <button
          onClick={handleNext}
          className={`px-5 py-2 rounded-lg text-white font-medium transition-colors flex items-center gap-2 ${
            isSubmitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
          }`}
          disabled={(step === 1 && formData.selectedDisciplines.length === 0 && formData.selectedSubjects.length === 0) || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processando...</span>
            </>
          ) : step === 3 ? (
            <>
              <span>Gerar Plano</span>
              <Brain className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>Próximo</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
} 