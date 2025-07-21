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
import PlanLoadWarning from './PlanLoadWarning';
import { toast } from 'react-hot-toast';
import { SmartPlanFormData } from '@/services/smart-planning.service';
import { Button } from '@/components/ui/button';
import { Calendar as UiCalendar } from '@/components/ui/calendar';
import { Discipline, Subject } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import ConfirmationModal from '../ConfirmationModal';

interface SmartPlanFormProps {
  onSubmit?: (data: SmartPlanFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

// Definindo interface para DayAvailability para melhor tipagem
interface DayAvailability {
  day: number;
  name: string;
  shortName: string;
  enabled: boolean;
  availableMinutes: number;
}

export default function SmartPlanForm({ onSubmit, onCancel, isSubmitting = false }: SmartPlanFormProps) {
  const [step, setStep] = useState(1);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjects, setSubjects] = useState<{[key: number]: Subject[]}>({});
  const [expandedDisciplines, setExpandedDisciplines] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para armazenar a disponibilidade semanal do usuário
  const [weekAvailability, setWeekAvailability] = useState<DayAvailability[]>([
    { day: 0, name: 'Domingo', shortName: 'Dom', enabled: false, availableMinutes: 120 },
    { day: 1, name: 'Segunda-feira', shortName: 'Seg', enabled: true, availableMinutes: 120 },
    { day: 2, name: 'Terça-feira', shortName: 'Ter', enabled: true, availableMinutes: 120 },
    { day: 3, name: 'Quarta-feira', shortName: 'Qua', enabled: true, availableMinutes: 120 },
    { day: 4, name: 'Quinta-feira', shortName: 'Qui', enabled: true, availableMinutes: 120 },
    { day: 5, name: 'Sexta-feira', shortName: 'Sex', enabled: true, availableMinutes: 120 },
    { day: 6, name: 'Sábado', shortName: 'Sáb', enabled: false, availableMinutes: 120 }
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
      max: 60
    },
    revisionSessionDuration: {
      percentage: 20,
      fixedMinutes: 20
    },
    revisionConflictStrategy: 'next-available', // Estratégia padrão para lidar com conflitos de revisão
    availableMinutesByDay: [] // Novo campo para armazenar minutos disponíveis por dia
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

  useEffect(() => {
    if (disciplines.length > 0) {
      disciplines.forEach(discipline => {
        loadSubjectsForDiscipline(discipline.id);
      });
    }
  }, [disciplines]);
  
  // Atualizar formData.availableMinutesByDay quando weekAvailability mudar
  useEffect(() => {
    const availableMinutesByDay = weekAvailability
      .filter(day => day.enabled)
      .map(day => ({
          day: day.day,
        minutes: day.availableMinutes
      }));
    
    setFormData(prev => ({
      ...prev,
      availableMinutesByDay,
      // Calcular a média de minutos disponíveis por dia
      averageDailyMinutes: Math.round(
        availableMinutesByDay.reduce((sum, day) => sum + day.minutes, 0) / 
        Math.max(1, availableMinutesByDay.length)
      )
    }));
  }, [weekAvailability]);

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

  const [showOverloadModal, setShowOverloadModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

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
    
    // Verificar se há pelo menos um dia disponível
    const hasAvailableDays = weekAvailability.some(day => day.enabled);
    if (!hasAvailableDays) {
      toast.error("Selecione pelo menos um dia da semana disponível para estudo");
      setStep(2);
      return;
    }
    
    // Verificar se o plano pode estar sobrecarregado
    const loadPercentage = calculatePlanLoad();
    if (loadPercentage > 80 && !pendingSubmit) {
      setShowOverloadModal(true);
      setPendingSubmit(true);
      return;
    }
    setPendingSubmit(false);
    
    // Adicionar log para debug
    console.log(`Verificação de sobrecarga:
      - Total de assuntos: ${formData.selectedSubjects.length}
      - Dias disponíveis por semana: ${weekAvailability.filter(day => day.enabled).length}
      - Período total: ${Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24))} dias
      - Tempo médio diário: ${averageDailyTime} minutos
      - Carga estimada: ${calculatePlanLoad()}%
    `);

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
    
    // Garantir que temos os minutos disponíveis por dia
    finalData.availableMinutesByDay = weekAvailability
      .filter(day => day.enabled)
      .map(day => ({
        day: day.day,
        minutes: day.availableMinutes
      }));
    
    // Garantir que temos duração fixa para revisões
    if (finalData.revisionsEnabled && finalData.revisionSessionDuration) {
      if (!finalData.revisionSessionDuration.fixedMinutes) {
        finalData.revisionSessionDuration.fixedMinutes = 20; // Valor padrão
      }
    }

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
      // Encontrar a disciplina do assunto
      let disciplineId: number | undefined;
      for (const dId in subjects) {
        if (subjects[dId].some(s => s.id === id)) {
          disciplineId = parseInt(dId);
          break;
        }
      }
      let newSelectedDisciplines = prev.selectedDisciplines;
      if (!isSelected && disciplineId !== undefined && !prev.selectedDisciplines.includes(disciplineId)) {
        newSelectedDisciplines = [...prev.selectedDisciplines, disciplineId];
      }
      return {
        ...prev,
        selectedSubjects: isSelected 
          ? prev.selectedSubjects.filter(s => s !== id)
          : [...prev.selectedSubjects, id],
        selectedDisciplines: newSelectedDisciplines
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
    setWeekAvailability(prev => 
      prev.map(day => 
        day.day === dayIndex 
          ? { ...day, enabled: !day.enabled } 
          : day
      )
    );
  };

  const updateDayMinutes = (dayIndex: number, minutes: number) => {
    setWeekAvailability(prev => 
      prev.map(day => 
        day.day === dayIndex 
          ? { ...day, availableMinutes: minutes } 
          : day
      )
    );
  };

  // Função para formatar minutos em formato legível (ex: 90 -> "1h 30min")
  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  // Função para calcular a carga do plano
  const calculatePlanLoad = () => {
    if (!formData.selectedSubjects.length) return 0;

    const totalSubjects = formData.selectedSubjects.length;
    const totalDays = Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calcular o número de semanas completas e dias restantes
    const weeks = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;

    // Soma dos minutos disponíveis por semana
    const enabledDays = weekAvailability.filter(day => day.enabled);
    const minutesPerWeek = enabledDays.reduce((sum, day) => sum + day.availableMinutes, 0);

    // Para os dias restantes, pegar os primeiros dias habilitados
    let minutesForRemainingDays = 0;
    if (remainingDays > 0 && enabledDays.length > 0) {
      for (let i = 0, count = 0; count < remainingDays && i < 7; i++) {
        const day = weekAvailability[i];
        if (day.enabled) {
          minutesForRemainingDays += day.availableMinutes;
          count++;
        }
      }
    }

    const totalAvailableMinutes = (weeks * minutesPerWeek) + minutesForRemainingDays;

    // Estimar o tempo necessário por assunto (considerando sessão principal + revisões)
    const estimatedMinutesPerSubject = 120; // 2 horas em média por assunto (sessão principal + revisões)
    const totalEstimatedMinutes = totalSubjects * estimatedMinutesPerSubject;

    // Evitar divisão por zero
    if (totalAvailableMinutes === 0) return 100;

    // Retornar a porcentagem de carga (limitada a 100%)
    return Math.min(100, Math.round((totalEstimatedMinutes / totalAvailableMinutes) * 100));
  };
  
  // Função para obter a cor da barra de carga com base na porcentagem
  const getPlanLoadColor = (loadPercentage: number) => {
    if (loadPercentage < 70) return 'bg-green-500';
    if (loadPercentage < 90) return 'bg-yellow-500';
    return 'bg-red-500';
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
              {/* Botão geral selecionar/desmarcar todos */}
              {filteredDisciplines.length > 0 && (
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    className="text-xs px-3 py-1 rounded border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                    onClick={() => {
                      // Pega todos os ids de assuntos e disciplinas
                      const allSubjectIds = filteredDisciplines.flatMap(d => subjects[d.id]?.map(s => s.id) || []);
                      const allDisciplineIds = filteredDisciplines.map(d => d.id);
                      const allSelected = allSubjectIds.length > 0 && allSubjectIds.every(id => formData.selectedSubjects.includes(id));
                      setFormData(prev => ({
                        ...prev,
                        selectedSubjects: allSelected ? prev.selectedSubjects.filter(id => !allSubjectIds.includes(id)) : Array.from(new Set([...prev.selectedSubjects, ...allSubjectIds])),
                        selectedDisciplines: allSelected ? prev.selectedDisciplines.filter(id => !allDisciplineIds.includes(id)) : Array.from(new Set([...prev.selectedDisciplines, ...allDisciplineIds]))
                      }));
                    }}
                  >
                    {(() => {
                      const allSubjectIds = filteredDisciplines.flatMap(d => subjects[d.id]?.map(s => s.id) || []);
                      const allSelected = allSubjectIds.length > 0 && allSubjectIds.every(id => formData.selectedSubjects.includes(id));
                      return allSelected ? 'Desmarcar todos os assuntos' : 'Selecionar todos os assuntos';
                    })()}
                  </button>
                </div>
              )}
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
                    {/* Botão Selecionar/Desmarcar todos */}
                    {expandedDisciplines.includes(discipline.id) && subjects[discipline.id]?.length > 0 && (
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                        onClick={e => {
                          e.stopPropagation();
                          const allSubjectIds = subjects[discipline.id].map(s => s.id);
                          const allSelected = allSubjectIds.every(id => formData.selectedSubjects.includes(id));
                          setFormData(prev => {
                            let newSelectedSubjects = allSelected
                              ? prev.selectedSubjects.filter(id => !allSubjectIds.includes(id))
                              : Array.from(new Set([...prev.selectedSubjects, ...allSubjectIds]));
                            let newSelectedDisciplines = prev.selectedDisciplines;
                            // Se for selecionar todos, também marca a disciplina
                            if (!allSelected && !prev.selectedDisciplines.includes(discipline.id)) {
                              newSelectedDisciplines = [...prev.selectedDisciplines, discipline.id];
                            }
                            // Se for desmarcar todos, e nenhum assunto da disciplina ficar selecionado, desmarca a disciplina
                            if (allSelected) {
                              const remainingSubjects = newSelectedSubjects.filter(id => subjects[discipline.id].some(s => s.id === id));
                              if (remainingSubjects.length === 0) {
                                newSelectedDisciplines = prev.selectedDisciplines.filter(id => id !== discipline.id);
                              }
                            }
                            return {
                              ...prev,
                              selectedSubjects: newSelectedSubjects,
                              selectedDisciplines: newSelectedDisciplines
                            };
                          });
                        }}
                      >
                        {(() => {
                          const allSubjectIds = subjects[discipline.id].map(s => s.id);
                          const allSelected = allSubjectIds.every(id => formData.selectedSubjects.includes(id));
                          return allSelected ? 'Desmarcar todos' : 'Selecionar todos';
                        })()}
                      </button>
                    )}
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
                Informe quanto tempo você tem disponível para estudar em cada dia da semana
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
            </div>
            
            {/* Seleção de dias da semana e tempo disponível */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-indigo-600" />
                    <h4 className="font-medium text-gray-800">Tempo disponível por dia</h4>
                  </div>
                  <div className="text-xs text-gray-500">
                    {weekAvailability.filter(day => day.enabled).length} dias selecionados
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {weekAvailability.map(day => (
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
                
                <div className="space-y-4 mt-6">
                  {weekAvailability
                    .filter(day => day.enabled)
                    .map(day => (
                      <div key={day.day} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium text-gray-800">{day.name}</h5>
                          <span className="text-sm font-medium text-indigo-600">
                            {formatMinutes(day.availableMinutes)}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600">Tempo disponível para estudo</label>
                          <div className="flex items-center gap-2">
                                    <input
                              type="range"
                              min="30"
                              max="360"
                              step="15"
                              value={day.availableMinutes}
                              onChange={(e) => updateDayMinutes(day.day, parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <select
                              value={day.availableMinutes}
                              onChange={(e) => updateDayMinutes(day.day, parseInt(e.target.value))}
                              className="p-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="30">30min</option>
                              <option value="60">1h</option>
                              <option value="90">1h 30min</option>
                              <option value="120">2h</option>
                              <option value="180">3h</option>
                              <option value="240">4h</option>
                              <option value="300">5h</option>
                              <option value="360">6h</option>
                            </select>
                              </div>
                        </div>
                      </div>
                    ))}
                </div>
                
                {weekAvailability.filter(day => day.enabled).length === 0 && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm text-yellow-700">
                      Selecione pelo menos um dia da semana para definir seu tempo de estudo.
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
                    <span className="font-medium">Dica:</span> Defina um tempo realista que você consegue dedicar aos estudos em cada dia.
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    É melhor ter menos tempo, mas consistente, do que muitas horas que você não conseguirá cumprir.
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
                {/* Indicador de carga do plano */}
                {formData.selectedSubjects.length > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Carga estimada do plano</label>
                      <span className={`text-sm font-medium ${calculatePlanLoad() > 90 ? 'text-red-600' : calculatePlanLoad() > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {calculatePlanLoad()}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${getPlanLoadColor(calculatePlanLoad())}`} 
                        style={{ width: `${calculatePlanLoad()}%` }}
                      ></div>
                    </div>
                    
                    {calculatePlanLoad() > 90 && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-md flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700">
                          Seu plano parece estar sobrecarregado. Considere reduzir o número de assuntos, aumentar o período do plano ou aumentar o tempo disponível para estudo.
                        </p>
                      </div>
                    )}
                    
                    {calculatePlanLoad() > 70 && calculatePlanLoad() <= 90 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded-md flex items-start gap-2">
                        <InfoIcon className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-700">
                          Seu plano está com uma carga moderada. Algumas sessões podem precisar ser ajustadas para caber no tempo disponível.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
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
                    Duração máxima das sessões de estudo
                  </label>
                  
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <label className="text-sm text-gray-600">Duração (minutos)</label>
                      <span className="text-sm font-medium">{formData.mainSessionDuration?.max || 60} min</span>
                    </div>
                    
                      <input
                      type="range"
                      min="30"
                      max="180"
                      step="15"
                      value={formData.mainSessionDuration?.max || 60}
                        onChange={(e) => setFormData({
                          ...formData,
                          mainSessionDuration: {
                          min: 30, // Manter um mínimo fixo
                          max: parseInt(e.target.value)
                          }
                        })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <select
                      value={formData.mainSessionDuration?.max || 60}
                        onChange={(e) => setFormData({
                          ...formData,
                          mainSessionDuration: {
                          min: 30, // Manter um mínimo fixo
                          max: parseInt(e.target.value)
                          }
                        })}
                      className="p-2 border border-gray-300 rounded-md"
                    >
                      <option value="30">30 minutos</option>
                      <option value="45">45 minutos</option>
                      <option value="60">60 minutos (1 hora)</option>
                      <option value="90">90 minutos (1h30)</option>
                      <option value="120">120 minutos (2 horas)</option>
                      <option value="150">150 minutos (2h30)</option>
                      <option value="180">180 minutos (3 horas)</option>
                    </select>
                    <span className="text-sm text-gray-600">por sessão</span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-2">
                    Este é o tempo máximo que você deseja dedicar a cada sessão de estudo. O sistema criará sessões com duração adequada, respeitando este limite.
                  </p>
                  
                  <div className="bg-blue-50 p-2 rounded-md text-xs text-blue-700">
                    <span className="font-medium">Dica:</span> Sessões de estudo mais curtas (30-45 min) são ideais para manter o foco, 
                    enquanto sessões mais longas (60-120 min) permitem aprofundamento em tópicos complexos.
                  </div>
                </div>
                
                {formData.revisionsEnabled && (
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Duração das sessões de revisão
                    </label>
                    
                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <label className="text-sm text-gray-600">Duração (minutos)</label>
                        <span className="text-sm font-medium">{formData.revisionSessionDuration?.fixedMinutes || 20} min</span>
                      </div>
                      
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="5"
                        value={formData.revisionSessionDuration?.fixedMinutes || 20}
                        onChange={(e) => setFormData({
                          ...formData,
                          revisionSessionDuration: {
                            fixedMinutes: parseInt(e.target.value),
                            percentage: 0 // Não usamos mais porcentagem
                          }
                        })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <select
                        value={formData.revisionSessionDuration?.fixedMinutes || 20}
                        onChange={(e) => setFormData({
                          ...formData,
                          revisionSessionDuration: {
                            fixedMinutes: parseInt(e.target.value),
                            percentage: 0 // Não usamos mais porcentagem
                          }
                        })}
                        className="p-2 border border-gray-300 rounded-md"
                      >
                        <option value="10">10 minutos</option>
                        <option value="15">15 minutos</option>
                        <option value="20">20 minutos</option>
                        <option value="30">30 minutos</option>
                        <option value="45">45 minutos</option>
                        <option value="60">60 minutos (1 hora)</option>
                      </select>
                      <span className="text-sm text-gray-600">por revisão</span>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      As sessões de revisão terão duração fixa de {formData.revisionSessionDuration?.fixedMinutes || 20} minutos, 
                      independente da duração da sessão principal. As revisões são mais curtas e focadas.
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

      {/* Modal de confirmação de sobrecarga */}
      <ConfirmationModal
        isOpen={showOverloadModal}
        onClose={() => { setShowOverloadModal(false); setPendingSubmit(false); }}
        onConfirm={() => { setShowOverloadModal(false); setTimeout(() => handleSubmit(), 0); }}
        title="Plano sobrecarregado!"
        message={`A carga estimada do seu plano está muito alta. Algumas sessões podem não ser agendadas ou ultrapassar o tempo diário configurado.\n\nDeseja continuar mesmo assim?`}
        confirmText="Sim, continuar"
        cancelText="Cancelar"
      />
    </div>
  );
} 
