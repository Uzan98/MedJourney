import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

// Mapeamento dos valores de dificuldade para cores
export const difficultyColorMap = {
  alta: 'bg-red-100 text-red-800',
  média: 'bg-yellow-100 text-yellow-800',
  baixa: 'bg-green-100 text-green-800',
  default: 'bg-gray-100 text-gray-800'
};

// Mapeamento dos valores de importância para cores
export const importanceColorMap = {
  alta: 'bg-purple-100 text-purple-800',
  média: 'bg-blue-100 text-blue-800',
  baixa: 'bg-gray-100 text-gray-800',
  default: 'bg-gray-100 text-gray-800'
};

export interface SmartPlanFormData {
  selectedDisciplines: number[];
  selectedSubjects: number[];
  availableTimes: {day: number, startTime: string, endTime: string}[];
  planName: string;
  startDate: Date;
  endDate: Date;
  revisionsEnabled: boolean;
  balanceStrategy: 'balanced' | 'focus' | 'variety';
  averageDailyMinutes?: number; // Tempo médio disponível por dia em minutos
  mainSessionDuration?: {
    min: number; // Duração mínima das sessões principais em minutos
    max: number; // Duração máxima das sessões principais em minutos
  };
  revisionSessionDuration?: {
    percentage: number; // Porcentagem da duração da sessão principal (0-100)
  };
  revisionConflictStrategy?: 'next-available' | 'adjust-interval' | 'skip' | 'strict-days';
  // next-available: Move para o próximo dia disponível
  // adjust-interval: Ajusta os intervalos para cair em dias disponíveis
  // skip: Pula revisões que cairiam em dias sem disponibilidade
  // strict-days: Só programa revisões nos dias da semana configurados
}

export interface SmartPlanSession {
  id: number;
  title: string;
  discipline_id: number;
  subject_id: number | null;
  discipline_name: string;
  subject_title?: string | null;  // Nome/título da matéria
  subject_difficulty?: string | null;  // Nível de dificuldade do assunto (baixa, média, alta)
  subject_importance?: string | null;  // Nível de importância do assunto (baixa, média, alta)
  start_time: string;
  end_time: string;
  date: string;
  duration_minutes: number;
  is_revision: boolean;
  revision_interval?: number | null;  // Intervalo de revisão (1, 3, 7 ou 14 dias)
  original_session_id: number | null;
  plan_id: number;
  created_at?: string;
  metadata?: string | Record<string, any>;  // Campo para armazenar metadados, incluindo informações de conclusão
  completed?: boolean;
  completed_at?: string;
  actual_duration_minutes?: number;
}

export interface SmartPlan {
  id: number;
  name: string;
  description?: string;  // Descrição opcional do plano
  user_id: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  settings: {
    revisionsEnabled: boolean;
    balanceStrategy: string;
    selectedDisciplines: number[];
    selectedSubjects?: number[];
    availableTimes?: {day: number, startTime: string, endTime: string}[];
    averageDailyMinutes?: number;
    sessions_per_day?: number;  // Número de sessões por dia
  };
  sessions_per_day?: number;  // Número de sessões por dia (disponível no nível raiz para facilitar acesso)
  total_sessions?: number;    // Total de sessões planejadas
  total_minutes?: number;     // Total de minutos planejados
  created_at: string;
  updated_at: string;
  completion_rate?: number;   // Taxa de conclusão do plano (porcentagem)
  completed_sessions?: number; // Número de sessões concluídas
}

// Interface para representar a estrutura da sessão retornada pelo Supabase
interface RawPlanSession {
  id: number;
  title: string;
  discipline_id: number;
  subject_id: number | null;
  discipline?: { name: string };
  subject?: { name: string };
  start_time: string;
  end_time: string;
  date: string;
  duration_minutes: number;
  is_revision: boolean;
  original_session_id: number | null;
  plan_id: number;
  created_at: string;
}

class SmartPlanningService {
  /**
   * Cria um novo plano inteligente com base nos dados fornecidos
   */
  async createSmartPlan(formData: SmartPlanFormData): Promise<SmartPlan | null> {
    try {
      // Adicionar logs para depuração da autenticação
      console.log('SmartPlanningService: Verificando sessão atual...');
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('SmartPlanningService: Sessão atual:', sessionData?.session ? 'Existe' : 'Não existe');
      
      // Obter o usuário atual
      console.log('SmartPlanningService: Tentando obter usuário...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('SmartPlanningService: Usuário:', user ? `ID: ${user.id}` : 'Não autenticado');
      
      if (!user) {
        console.error('SmartPlanningService: Usuário não autenticado');
        toast.error('Usuário não autenticado');
        return null;
      }

      toast.loading('Criando seu plano inteligente...', { id: 'creating-plan' });
      
      // Preparar os dados do plano
      const planData = {
        name: formData.planName || `Plano de estudos ${new Date().toLocaleDateString('pt-BR')}`,
        user_id: user.id,
        start_date: formData.startDate.toISOString(),
        end_date: formData.endDate.toISOString(),
        status: 'draft' as const,
        settings: {
          revisionsEnabled: formData.revisionsEnabled,
          balanceStrategy: formData.balanceStrategy,
          selectedDisciplines: formData.selectedDisciplines,
          selectedSubjects: formData.selectedSubjects,
          availableTimes: formData.availableTimes,
          averageDailyMinutes: formData.averageDailyMinutes || 120 // Valor padrão de 2 horas se não for especificado
        }
      };
      
      // Inserir o plano no banco de dados
      const { data: plan, error } = await supabase
        .from('smart_plans')
        .insert(planData)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar plano inteligente:', error);
        toast.error('Não foi possível criar o plano inteligente', { id: 'creating-plan' });
        return null;
      }
      
      toast.loading('Gerando sessões de estudo...', { id: 'creating-plan' });
      
      // Gerar sessões do plano inteligente
      const sessionsGenerated = await this.generatePlanSessions(plan.id, formData);
      
      if (sessionsGenerated) {
        toast.success('Plano inteligente criado com sucesso!', { id: 'creating-plan' });
      } else {
        toast.error('Plano criado, mas houve um problema ao gerar sessões', { id: 'creating-plan' });
      }
      
      return plan;
    } catch (error) {
      console.error('Erro ao criar plano inteligente:', error);
      toast.error('Ocorreu um erro ao criar o plano inteligente', { id: 'creating-plan' });
      return null;
    }
  }
  
  /**
   * Obtém todos os planos inteligentes do usuário
   */
  async getUserPlans(): Promise<SmartPlan[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Usuário não autenticado');
        return [];
      }
      
      const { data: plans, error } = await supabase
        .from('smart_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar planos:', error);
        toast.error('Não foi possível carregar seus planos');
        return [];
      }
      
      return plans || [];
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      toast.error('Ocorreu um erro ao buscar seus planos');
      return [];
    }
  }
  
  /**
   * Obtém um plano específico pelo ID
   */
  async getPlanById(planId: number): Promise<SmartPlan | null> {
    try {
      const { data: plan, error } = await supabase
        .from('smart_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (error) {
        console.error('Erro ao buscar plano:', error);
        toast.error('Não foi possível carregar o plano solicitado');
        return null;
      }
      
      return plan;
    } catch (error) {
      console.error('Erro ao buscar plano:', error);
      toast.error('Ocorreu um erro ao buscar o plano');
      return null;
    }
  }
  
  /**
   * Obtém as sessões associadas a um plano inteligente
   * @param planId ID do plano
   * @returns Array de sessões ou null em caso de erro
   */
  public async getPlanSessions(planId: number): Promise<SmartPlanSession[] | null> {
    try {
      // Buscar as sessões do plano (sem usar sintaxe de relacionamento)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('smart_plan_sessions')
        .select('*')
        .eq('plan_id', planId);
      
      if (sessionsError) {
        console.error('Erro ao buscar sessões do plano:', sessionsError);
        toast.error('Erro ao buscar sessões do plano');
        return null;
      }
      
      if (!sessionsData || sessionsData.length === 0) {
        return [];
      }
      
      // Log diagnóstico para verificar as datas e dias da semana
      console.log('Sessões recuperadas do banco de dados:');
      sessionsData.forEach(session => {
        const sessionDate = new Date(session.date);
        const dayOfWeek = sessionDate.getDay();
        const isFriday = dayOfWeek === 5;
        console.log(`- Sessão ID ${session.id}: Data ${session.date}, Dia da semana: ${dayOfWeek}${isFriday ? ' (SEXTA-FEIRA)' : ''}`);
        
        // Verificar se a sessão está marcada como concluída nos metadados
        if (session.metadata) {
          try {
            const metadata = typeof session.metadata === 'string' 
              ? JSON.parse(session.metadata) 
              : session.metadata;
              
            if (metadata.completed) {
              console.log(`  - Sessão ${session.id} está CONCLUÍDA`);
            }
          } catch (e) {
            console.warn('Erro ao analisar metadados da sessão:', e);
          }
        }
      });
      
      // Contar sessões por dia da semana
      const sessionsByDay = [0, 0, 0, 0, 0, 0, 0]; // domingo a sábado
      sessionsData.forEach(session => {
        const dayOfWeek = new Date(session.date).getDay();
        sessionsByDay[dayOfWeek]++;
      });
      console.log('Contagem de sessões por dia da semana:', sessionsByDay);
      console.log('Sexta-feira (dia 5) tem', sessionsByDay[5], 'sessões');
      
      // Extrair IDs únicos de disciplinas e matérias para buscas separadas
      const disciplineIds = Array.from(new Set(sessionsData.map(s => s.discipline_id)));
      const subjectIds = Array.from(new Set(sessionsData.map(s => s.subject_id)));

      // Buscar disciplinas
      const { data: disciplinesData, error: disciplinesError } = await supabase
          .from('disciplines')
          .select('id, name')
          .in('id', disciplineIds);
        
        if (disciplinesError) {
          console.error('Erro ao buscar disciplinas:', disciplinesError);
        toast.error('Erro ao buscar informações de disciplinas');
        return null;
      }

      // Buscar matérias
      const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, title, difficulty, importance')
          .in('id', subjectIds);
        
        if (subjectsError) {
        console.error('Erro ao buscar matérias:', subjectsError);
        toast.error('Erro ao buscar informações de matérias');
        return null;
      }

      // Criar mapeamentos para facilitar acesso
      const disciplineMap: Record<number, string> = {};
      disciplinesData?.forEach(d => {
        disciplineMap[d.id] = d.name;
      });

      const subjectMap: Record<number, { title: string, difficulty?: string, importance?: string }> = {};
      subjectsData?.forEach(s => {
        subjectMap[s.id] = {
          title: s.title,
          difficulty: s.difficulty,
          importance: s.importance
        };
      });

      // Transformar os dados das sessões
      const sessions: SmartPlanSession[] = sessionsData.map(session => {
        // Processar metadados se existirem
        let metadata: any = {};
        let completed = false;
        let completed_at: string | undefined = undefined;
        let actual_duration_minutes: number | undefined = undefined;
        
        if (session.metadata) {
          try {
            metadata = typeof session.metadata === 'string' 
              ? JSON.parse(session.metadata) 
              : session.metadata;
              
            // Extrair informações de conclusão
            if (metadata.completed) {
              completed = true;
              completed_at = metadata.completed_at;
              actual_duration_minutes = metadata.actual_duration_minutes;
            }
          } catch (e) {
            console.warn('Erro ao analisar metadados da sessão:', e);
          }
        }

        // Se for uma sessão de revisão, calcular o intervalo baseado nos metadados
        // ou na diferença de datas se os metadados não estiverem disponíveis
        let revisionInterval: number | undefined = undefined;
        
        if (session.is_revision) {
          if (metadata && metadata.revision_interval) {
            revisionInterval = metadata.revision_interval;
          }
        }
        
        return {
          id: session.id,
          plan_id: session.plan_id,
          title: session.title,
          discipline_id: session.discipline_id,
          discipline_name: disciplineMap[session.discipline_id] || 'Disciplina desconhecida',
          subject_id: session.subject_id,
          subject_title: subjectMap[session.subject_id]?.title || 'Matéria desconhecida',
          subject_difficulty: metadata.subject_difficulty || subjectMap[session.subject_id]?.difficulty,
          subject_importance: metadata.subject_importance || subjectMap[session.subject_id]?.importance,
          date: session.date,
          start_time: session.start_time,
          end_time: session.end_time,
          duration_minutes: session.duration_minutes,
          is_revision: session.is_revision,
          original_session_id: session.original_session_id,
          revision_interval: revisionInterval,
          metadata: session.metadata,
          // Adicionar campos de conclusão
          completed,
          completed_at,
          actual_duration_minutes
        };
      });
      
      return sessions;
    } catch (error) {
      console.error('Erro ao obter sessões do plano:', error);
      toast.error('Não foi possível carregar as sessões do plano');
      return null;
    }
  }
  
  /**
   * Atualiza o status de um plano
   */
  async updatePlanStatus(planId: number, status: 'draft' | 'active' | 'completed' | 'archived'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('smart_plans')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', planId);
      
      if (error) {
        console.error('Erro ao atualizar status do plano:', error);
        toast.error('Não foi possível atualizar o status do plano');
        return false;
      }
      
      toast.success('Status do plano atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status do plano:', error);
      toast.error('Ocorreu um erro ao atualizar o status do plano');
      return false;
    }
  }
  
  /**
   * Exclui um plano e todas as suas sessões
   */
  async deletePlan(planId: number): Promise<boolean> {
    try {
      // Primeiramente, excluir as sessões do plano
      const { error: sessionsError } = await supabase
        .from('smart_plan_sessions')
        .delete()
        .eq('plan_id', planId);
      
      if (sessionsError) {
        console.error('Erro ao excluir sessões do plano:', sessionsError);
        toast.error('Não foi possível excluir as sessões do plano');
        return false;
      }
      
      // Em seguida, excluir o plano
      const { error: planError } = await supabase
        .from('smart_plans')
        .delete()
        .eq('id', planId);
      
      if (planError) {
        console.error('Erro ao excluir plano:', planError);
        toast.error('Não foi possível excluir o plano');
        return false;
      }
      
      toast.success('Plano excluído com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Ocorreu um erro ao excluir o plano');
      return false;
    }
  }
  
  /**
   * Gera sessões de estudo com base no plano inteligente
   * @param planId ID do plano criado
   * @param formData Dados do formulário usado para criar o plano
   */
  async generatePlanSessions(planId: number, formData: SmartPlanFormData): Promise<boolean> {
    try {
      // Buscar detalhes dos assuntos selecionados
      let subjectsDetails: any[] = [];
      
      // Se houver assuntos específicos, buscar só eles
      if (formData.selectedSubjects.length > 0) {
        // Alterado para não usar o relacionamento automático que está falhando
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .in('id', formData.selectedSubjects);
        
        if (subjectsError) throw subjectsError;
        
        // Se conseguiu os assuntos, busca as disciplinas relacionadas separadamente
        if (subjectsData && subjectsData.length > 0) {
          // Extrair IDs únicos de disciplinas para buscar
          const disciplineIds = [...new Set(subjectsData.map(s => s.discipline_id))];
          
          // Buscar disciplinas relacionadas
          const { data: disciplinesData, error: disciplinesError } = await supabase
            .from('disciplines')
            .select('id, name')
            .in('id', disciplineIds);
          
          if (disciplinesError) throw disciplinesError;
          
          // Criar um mapa de ID da disciplina -> nome para facilitar o preenchimento
          const disciplineMap = (disciplinesData || []).reduce((map, discipline) => {
            map[discipline.id] = discipline.name;
            return map;
          }, {} as Record<number, string>);
          
          // Combinar os dados de assuntos com nomes de disciplinas
          subjectsDetails = subjectsData.map(subject => ({
            ...subject,
            discipline: {
              name: disciplineMap[subject.discipline_id] || 'Disciplina'
            }
          }));
        }
      } 
      // Caso contrário, buscar todos os assuntos das disciplinas selecionadas
      else if (formData.selectedDisciplines.length > 0) {
        // Alterado para não usar o relacionamento automático que está falhando
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .in('discipline_id', formData.selectedDisciplines);
        
        if (subjectsError) throw subjectsError;
        
        // Se conseguiu os assuntos, busca as disciplinas relacionadas separadamente
        if (subjectsData && subjectsData.length > 0) {
          // Extrair IDs únicos de disciplinas para buscar
          const disciplineIds = [...new Set(subjectsData.map(s => s.discipline_id))];
          
          // Buscar disciplinas relacionadas
          const { data: disciplinesData, error: disciplinesError } = await supabase
            .from('disciplines')
            .select('id, name')
            .in('id', disciplineIds);
          
          if (disciplinesError) throw disciplinesError;
          
          // Criar um mapa de ID da disciplina -> nome para facilitar o preenchimento
          const disciplineMap = (disciplinesData || []).reduce((map, discipline) => {
            map[discipline.id] = discipline.name;
            return map;
          }, {} as Record<number, string>);
          
          // Combinar os dados de assuntos com nomes de disciplinas
          subjectsDetails = subjectsData.map(subject => ({
            ...subject,
            discipline: {
              name: disciplineMap[subject.discipline_id] || 'Disciplina'
            }
          }));
        }
      }
      
      if (subjectsDetails.length === 0) {
        console.warn('Nenhum assunto encontrado para gerar sessões');
        return false;
      }
      
      console.log(`Gerando plano para ${subjectsDetails.length} assuntos`);
      
      // Calcular a prioridade de cada assunto
      // prioridade = (importância * 2 + dificuldade) / (dias_restantes + 1)
      const prioritizedSubjects = subjectsDetails.map(subject => {
        // Converter strings de dificuldade/importância em valores numéricos
        const difficultyMap: {[key: string]: number} = { 'baixa': 1, 'média': 2, 'alta': 3 };
        const importanceMap: {[key: string]: number} = { 'baixa': 1, 'média': 2, 'alta': 3 };
        
        // Valores padrão caso não definidos
        const difficulty = difficultyMap[subject.difficulty || 'média'] || 2;
        const importance = importanceMap[subject.importance || 'média'] || 2;
        
        // Calcular dias restantes até o final do plano
        const dueDate = subject.due_date ? new Date(subject.due_date) : new Date(formData.endDate);
        const today = new Date();
        const daysRemaining = Math.max(1, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Calcular a prioridade usando a fórmula
        const priority = (importance * 2 + difficulty) / (daysRemaining + 1);
        
        return {
          ...subject,
          priority,
          difficultyValue: difficulty,
          importanceValue: importance,
          daysRemaining
        };
      }).sort((a, b) => b.priority - a.priority); // Ordenar por prioridade (maior primeiro)
      
      // Configurar variáveis para distribuição no tempo
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Organizar os horários disponíveis por dia da semana
      let availableTimesByDayOfWeek: { [key: number]: Array<{startTime: string, endTime: string}> } = {};
      
      // Verificar se o usuário forneceu horários disponíveis
      if (formData.availableTimes && formData.availableTimes.length > 0) {
        // Agrupar os horários disponíveis por dia da semana
        formData.availableTimes.forEach(timeSlot => {
          if (!availableTimesByDayOfWeek[timeSlot.day]) {
            availableTimesByDayOfWeek[timeSlot.day] = [];
          }
          
          availableTimesByDayOfWeek[timeSlot.day].push({
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime
          });
        });
        
        // Ordenar os horários de cada dia por horário de início
        Object.keys(availableTimesByDayOfWeek).forEach(dayKey => {
          const day = parseInt(dayKey);
          availableTimesByDayOfWeek[day].sort((a, b) => {
            return a.startTime.localeCompare(b.startTime);
          });
        });
        
        console.log('Horários disponíveis por dia da semana:', availableTimesByDayOfWeek);
      } else {
        console.log('Nenhum horário específico fornecido pelo usuário. Usando horários padrão.');
        
        // Criar horários padrão (2 horas por dia, das 18h às 20h)
        for (let day = 0; day < 7; day++) {
          availableTimesByDayOfWeek[day] = [{
            startTime: '18:00',
            endTime: '20:00'
          }];
        }
      }
      
      // Calcular o tempo disponível total em minutos
      let totalAvailableMinutes = 0;

      // Inicializar array como tipo number explícito e vazio
      const daysWithAvailability: number[] = [];

      // Log para diagnóstico
      console.log('Horários disponíveis recebidos:', formData.availableTimes);

      Object.entries(availableTimesByDayOfWeek).forEach(([day, slots]) => {
        // Converter explicitamente para número
        const dayNumber = parseInt(day, 10);
        
        // Verificar se o dia é válido (0-6) e não está duplicado
        if (!isNaN(dayNumber) && dayNumber >= 0 && dayNumber <= 6 && !daysWithAvailability.includes(dayNumber)) {
          daysWithAvailability.push(dayNumber);
          
          // Log para diagnóstico com identificação clara do dia da semana
          const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
          console.log(`Adicionando dia ${dayNumber} (${dayNames[dayNumber]}) como disponível, tipo: ${typeof dayNumber}`);
        }
        
        slots.forEach(slot => {
          // Converter horários para minutos e calcular a diferença
          const startParts = slot.startTime.split(':').map(Number);
          const endParts = slot.endTime.split(':').map(Number);
          
          const startMinutes = startParts[0] * 60 + startParts[1];
          const endMinutes = endParts[0] * 60 + endParts[1];
          
          // Pode acontecer de o horário de término ser menor que o de início (por exemplo, se o usuário definir um horário que vai até meia-noite)
          const slotDuration = endMinutes >= startMinutes ? endMinutes - startMinutes : (24 * 60 - startMinutes) + endMinutes;
          
          totalAvailableMinutes += slotDuration;
        });
      });

      // Log para diagnóstico após processar, verificando o tipo de cada elemento
      console.log('Dias disponíveis processados:', daysWithAvailability);
      console.log('Tipos dos dias disponíveis:', daysWithAvailability.map(day => typeof day).join(', '));

      // Verificação adicional para sexta-feira (dia 5)
      console.log('Verificação de sexta-feira:');
      console.log(' - Lista contém sexta-feira (5)?', daysWithAvailability.includes(5));
      console.log(' - Lista contém sexta-feira como string ("5")?', daysWithAvailability.includes('5' as any));
      console.log(' - Índice de sexta-feira na lista:', daysWithAvailability.indexOf(5));
      
      // Se não houver dias com disponibilidade, usar todos os dias da semana
      if (daysWithAvailability.length === 0) {
        for (let i = 0; i < 7; i++) {
          daysWithAvailability.push(i);
        }
      }
      
      // Tempo médio disponível por dia - considerar preferências de duração
      // Se o usuário especificou um tempo médio diário, usá-lo
      // Caso contrário, calcular baseado nos slots disponíveis, mas garantir que seja compatível
      // com as preferências de duração das sessões
      const userAverageDailyTime = formData.averageDailyMinutes;
      const calculatedAverageDailyMinutes = Math.floor(totalAvailableMinutes / daysWithAvailability.length) || 120;
      
      // Calcular um valor mínimo razoável baseado nas preferências de duração
      // Se o usuário definiu duração mínima e máxima, considerar estas para calcular um valor mínimo aceitável
      const minSessionDuration = formData.mainSessionDuration?.min || 30;
      const maxSessionDuration = formData.mainSessionDuration?.max || 120;
      const averageSessionDuration = (minSessionDuration + maxSessionDuration) / 2;
      
      // Garantir que o tempo médio seja suficiente para pelo menos 2 sessões de duração média
      const recommendedMinimumDaily = Math.max(averageSessionDuration * 2, 60);
      
      // Usar o valor especificado pelo usuário, ou o calculado dos slots, ou o mínimo recomendado
      const averageDailyMinutes = userAverageDailyTime || 
        Math.max(calculatedAverageDailyMinutes, recommendedMinimumDaily);
      
      // Distribuir o tempo total disponível entre os assuntos, considerando prioridades
      const totalPriorityPoints = prioritizedSubjects.reduce((sum, subject) => sum + subject.priority, 0);
      
      // Rastrear slots de tempo já utilizados para cada data
      const usedTimeSlots: Map<string, Array<{start: string, end: string}>> = new Map();
      
      // Função para verificar se um horário está disponível em uma data específica
      const isTimeSlotAvailable = (date: string, startTime: string, endTime: string): boolean => {
        if (!usedTimeSlots.has(date)) return true;
        
        const usedSlots = usedTimeSlots.get(date)!;
        const newStart = parseTimeToMinutes(startTime);
        const newEnd = parseTimeToMinutes(endTime);
        
        // Verificar se há sobreposição com algum slot existente
        for (const slot of usedSlots) {
          const existingStart = parseTimeToMinutes(slot.start);
          const existingEnd = parseTimeToMinutes(slot.end);
          
          // Checa sobreposição
          if (!(newEnd <= existingStart || newStart >= existingEnd)) {
            return false;
          }
        }
        
        return true;
      };
      
      // Função auxiliar para converter horário (HH:MM) em minutos desde meia-noite
      const parseTimeToMinutes = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      // Função auxiliar para converter minutos desde meia-noite em horário (HH:MM)
      const minutesToTimeStr = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      };
      
      // Função para arredondar horários para intervalos mais naturais (horas ou meias-horas)
      const roundToNaturalInterval = (minutes: number): number => {
        // Arredondar para intervalos de 5 minutos
        return Math.ceil(minutes / 5) * 5;
      };
      
      // Registrar um slot de tempo como usado
      const markTimeSlotAsUsed = (date: string, startTime: string, endTime: string) => {
        if (!usedTimeSlots.has(date)) {
          usedTimeSlots.set(date, []);
        }
        
        usedTimeSlots.get(date)!.push({
          start: startTime,
          end: endTime
        });
        
        // Ordenar os slots usados por horário de início para facilitar a verificação de adjacência
        usedTimeSlots.get(date)!.sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));
      };
      
      // Encontrar um slot de tempo disponível para a data especificada
      const findAvailableTimeSlot = (date: Date, durationMinutes: number): { startTime: string, endTime: string } | null => {
        const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Segunda, etc.
        const dateStr = formatDateIso(date);
        
        // Verificar se há slots disponíveis para este dia da semana
        if (!availableTimesByDayOfWeek[dayOfWeek] || availableTimesByDayOfWeek[dayOfWeek].length === 0) {
          return null;
        }
        
        // Tentar cada slot de tempo disponível para este dia da semana
        for (const slot of availableTimesByDayOfWeek[dayOfWeek]) {
          const startMinutes = parseTimeToMinutes(slot.startTime);
          const endMinutes = parseTimeToMinutes(slot.endTime);
          
          // Calcular a duração do slot
          const slotDuration = endMinutes >= startMinutes ? 
            endMinutes - startMinutes : 
            (24 * 60 - startMinutes) + endMinutes;
          
          // Verificar se o slot é grande o suficiente
          if (slotDuration < durationMinutes) continue;
          
          // 1. Tentar horários exatos (horas)
          // Por exemplo: 8:00, 9:00, 10:00...
          for (let hour = Math.ceil(startMinutes / 60); hour * 60 + durationMinutes <= endMinutes; hour++) {
            const sessionStartMinutes = hour * 60;
            const sessionEndMinutes = sessionStartMinutes + durationMinutes;
            
            const startTimeStr = minutesToTimeStr(sessionStartMinutes);
            const endTimeStr = minutesToTimeStr(sessionEndMinutes);
            
            if (isTimeSlotAvailable(dateStr, startTimeStr, endTimeStr)) {
              markTimeSlotAsUsed(dateStr, startTimeStr, endTimeStr);
              return { startTime: startTimeStr, endTime: endTimeStr };
            }
          }
          
          // 2. Tentar meias-horas (xx:30)
          // Por exemplo: 8:30, 9:30, 10:30...
          for (let halfHour = Math.ceil(startMinutes / 30); halfHour * 30 + durationMinutes <= endMinutes; halfHour++) {
            if ((halfHour * 30) % 60 !== 0) { // Não repetir as horas exatas
              const sessionStartMinutes = halfHour * 30;
              const sessionEndMinutes = sessionStartMinutes + durationMinutes;
              
              const startTimeStr = minutesToTimeStr(sessionStartMinutes);
              const endTimeStr = minutesToTimeStr(sessionEndMinutes);
              
              if (isTimeSlotAvailable(dateStr, startTimeStr, endTimeStr)) {
                markTimeSlotAsUsed(dateStr, startTimeStr, endTimeStr);
                return { startTime: startTimeStr, endTime: endTimeStr };
              }
            }
          }
          
          // 3. Tentar horário de início do slot
          if (startMinutes + durationMinutes <= endMinutes) {
            const startTimeStr = minutesToTimeStr(startMinutes);
            const endTimeStr = minutesToTimeStr(startMinutes + durationMinutes);
            
            if (isTimeSlotAvailable(dateStr, startTimeStr, endTimeStr)) {
              markTimeSlotAsUsed(dateStr, startTimeStr, endTimeStr);
              return { startTime: startTimeStr, endTime: endTimeStr };
            }
          }
          
          // 4. Tentar intervalos de 15 minutos se ainda não encontrou
          for (let quarter = Math.ceil(startMinutes / 15); quarter * 15 + durationMinutes <= endMinutes; quarter++) {
            const sessionStartMinutes = quarter * 15;
            // Pular se já tentamos esse horário (hora exata ou meia-hora)
            if (sessionStartMinutes % 30 === 0) continue;
            
            const sessionEndMinutes = sessionStartMinutes + durationMinutes;
            
            const startTimeStr = minutesToTimeStr(sessionStartMinutes);
            const endTimeStr = minutesToTimeStr(sessionEndMinutes);
            
            if (isTimeSlotAvailable(dateStr, startTimeStr, endTimeStr)) {
              markTimeSlotAsUsed(dateStr, startTimeStr, endTimeStr);
              return { startTime: startTimeStr, endTime: endTimeStr };
            }
          }
          
          // 5. Por fim, tentar qualquer horário que funcione
          for (let i = 0; i <= slotDuration - durationMinutes; i += 5) {
            const sessionStartMinutes = startMinutes + i;
            const sessionEndMinutes = sessionStartMinutes + durationMinutes;
            
            // Pular se é um múltiplo de 15 minutos (já tentamos)
            if (sessionStartMinutes % 15 === 0) continue;
            
            const startTimeStr = minutesToTimeStr(sessionStartMinutes);
            const endTimeStr = minutesToTimeStr(sessionEndMinutes);
            
            if (isTimeSlotAvailable(dateStr, startTimeStr, endTimeStr)) {
              markTimeSlotAsUsed(dateStr, startTimeStr, endTimeStr);
              return { startTime: startTimeStr, endTime: endTimeStr };
            }
          }
        }
        
        // Nenhum slot disponível encontrado
        return null;
      };
      
      // Sessões a serem criadas
      const sessionsToCreate: Array<{
        plan_id: number;
        title: string;
        discipline_id: number;
        subject_id: number;
        date: string;
        start_time: string;
        end_time: string;
        duration_minutes: number;
        is_revision: boolean;
        original_session_id?: number;
        metadata?: string;
      }> = [];
      
      let currentDate = new Date(startDate);
      let sessionsCreated = 0;
      
      // Função para avançar para o próximo dia
      const advanceToNextDay = () => {
        // Guardar a data atual para comparação
        const oldDate = new Date(currentDate);
        
        // Avançar um dia
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Se passar da data final, voltar ao início e começar a sobrepor
        if (currentDate > endDate) {
          currentDate = new Date(startDate);
        }
        
        // Se o dia não estiver disponível, continuar avançando até encontrar um dia disponível
        // Limite de tentativas para evitar loop infinito
        let attempts = 0;
        const maxAttempts = 10; // Aumentar o número máximo de tentativas
        
        // Registrar os dias já tentados para evitar loops
        const triedDates = new Set<string>();
        
        while (!isDayAvailable(currentDate) && attempts < maxAttempts) {
          // Registrar esta data como já tentada
          triedDates.add(currentDate.toISOString().split('T')[0]);
          
          attempts++;
          console.log(`Dia avançado não disponível (${currentDate.toISOString().split('T')[0]}, dia ${currentDate.getDay()}), tentando próximo...`);
          currentDate.setDate(currentDate.getDate() + 1);
          
          // Se passar da data final, voltar ao início
          if (currentDate > endDate) {
            currentDate = new Date(startDate);
          }
          
          // Evitar tentar a mesma data novamente
          if (triedDates.has(currentDate.toISOString().split('T')[0])) {
            console.log(`Loop detectado, recorrendo a findNextAvailableDay para encontrar o próximo dia disponível`);
            // Usar findNextAvailableDay como fallback
            currentDate = findNextAvailableDay(oldDate, 'forward');
            break;
          }
        }
        
        // Se após todas as tentativas ainda não encontrou um dia disponível,
        // usar findNextAvailableDay como última opção
        if (!isDayAvailable(currentDate)) {
          console.log(`Não foi possível encontrar um dia disponível após ${attempts} tentativas, usando findNextAvailableDay como fallback`);
          currentDate = findNextAvailableDay(oldDate, 'forward');
        }
        
        console.log(`Avançou de ${oldDate.toISOString().split('T')[0]} (dia ${oldDate.getDay()}) para ${currentDate.toISOString().split('T')[0]} (dia ${currentDate.getDay()})`);
      };
      
      // Função ajustada para usar o fuso horário local em vez de UTC
      const formatDateIso = (date: Date) => {
        // Usamos o formato local para garantir que a data seja a correta no fuso horário do Brasil
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        // Log para diagnóstico
        console.log(`Formatando data: ${date.toString()} para formato ISO: ${year}-${month}-${day}, dia da semana: ${date.getDay()}`);
        
        return `${year}-${month}-${day}`;
      };
      
      // Função para verificar se um dia está disponível com verificação extra para sexta-feira
      const isDayAvailable = (date: Date): boolean => {
        const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Segunda-feira, ..., 5 = Sexta-feira
        
        // Verificar se o dia está na lista de dias disponíveis
        const isAvailable = daysWithAvailability.includes(dayOfWeek);
        
        // Log especial para sexta-feira
        if (dayOfWeek === 5) {
          console.log(`VERIFICAÇÃO CRÍTICA - SEXTA-FEIRA: ${date.toISOString().split('T')[0]} - disponível? ${isAvailable}`);
          console.log(`  - Dias disponíveis: [${daysWithAvailability.join(', ')}]`);
          console.log(`  - Tipo do dia 5 na lista: ${typeof daysWithAvailability.find(d => d === 5)}`);
          console.log(`  - Lista inclui '5'? ${daysWithAvailability.includes('5' as any)}`);
          console.log(`  - Lista inclui 5? ${daysWithAvailability.includes(5)}`);
        }
        
        // Log para diagnóstico detalhado
        console.log(`Verificando disponibilidade para ${date.toISOString().split('T')[0]} (dia da semana: ${dayOfWeek}): ${isAvailable ? 'Disponível' : 'Indisponível'}, dias disponíveis: [${daysWithAvailability.join(', ')}]`);
        
        return isAvailable;
      };
      
      // Encontra o próximo dia disponível a partir de uma data
      function findNextAvailableDay(startDate: Date, direction: 'forward' | 'backward' | 'both' = 'forward'): Date {
        // Clone a data para não modificar a original
        const date = new Date(startDate);
        const origDate = new Date(startDate);
        let daysChecked = 0;
        const maxDaysToCheck = 14; // Limite para evitar loops infinitos
        
        // Log detalhado sobre a data de início
        console.log(`INÍCIO findNextAvailableDay: Data inicial ${date.toISOString().split('T')[0]} (dia ${date.getDay()}), direção: ${direction}`);
        console.log(`  Dias disponíveis: [${daysWithAvailability.join(', ')}]`);
        
        // Verificar se a data inicial já é um dia disponível
        if (isDayAvailable(date)) {
          console.log(`  Data inicial já está disponível: ${date.toISOString().split('T')[0]}`);
          return date;
        }
        
        if (direction === 'both') {
          // Verificar em ambas as direções, começando com o dia mais próximo
          const forwardDate = findNextAvailableDay(startDate, 'forward');
          const backwardDate = findNextAvailableDay(startDate, 'backward');
          
          // Calcular qual está mais próximo da data original
          const forwardDiff = Math.abs(forwardDate.getTime() - origDate.getTime());
          const backwardDiff = Math.abs(backwardDate.getTime() - origDate.getTime());
          
          console.log(`  Comparando distâncias para direção 'both':
            - Data original: ${origDate.toISOString().split('T')[0]}
            - Próximo dia para frente: ${forwardDate.toISOString().split('T')[0]} (diferença: ${forwardDiff}ms)
            - Próximo dia para trás: ${backwardDate.toISOString().split('T')[0]} (diferença: ${backwardDiff}ms)`);
          
          // Retornar o mais próximo
          if (forwardDiff <= backwardDiff) {
            console.log(`  Selecionando direção 'forward' como a mais próxima`);
            return forwardDate;
          } else {
            console.log(`  Selecionando direção 'backward' como a mais próxima`);
            return backwardDate;
          }
        }
        
        // Busca sequencial por dias
        console.log(`  Iniciando busca sequencial, direção: ${direction}`);
        // Iteramos pelos próximos dias da semana verificando a disponibilidade
        for (let i = 0; i < maxDaysToCheck; i++) {
          // Avançar para o próximo dia na direção correta
          if (i > 0) { // Pular o primeiro dia pois já verificamos acima
            if (direction === 'forward') {
              date.setDate(date.getDate() + 1);
            } else {
              date.setDate(date.getDate() - 1);
            }
          }
          
          // Verificar se o dia atual é disponível
          console.log(`  Verificando: ${date.toISOString().split('T')[0]} (dia ${date.getDay()})`);
          
          if (isDayAvailable(date)) {
            console.log(`  ENCONTRADO dia disponível: ${date.toISOString().split('T')[0]} (dia ${date.getDay()})`);
            return date;
          }
        }
        
        // Se não encontramos um dia disponível por busca sequencial,
        // tentamos uma abordagem baseada em dias da semana disponíveis
        console.log(`  Busca sequencial falhou, tentando abordagem baseada em dias da semana`);
        
        // Ordenar os dias da semana disponíveis pelo mais próximo do dia atual
        const currentDayOfWeek = origDate.getDay();
        let closestAvailableDay: number | null = null;
        let minDistance = Infinity;
        
        // Encontrar o dia da semana disponível mais próximo
        for (const dayOfWeek of daysWithAvailability) {
          // Calcular a distância em dias para o próximo dia deste tipo
          let distance = dayOfWeek - currentDayOfWeek;
          
          // Ajustar para respeitar a direção
          if (direction === 'forward') {
            if (distance <= 0) distance += 7; // Se for anterior ou o mesmo dia, pegar o próximo na semana seguinte
          } else { // backward
            if (distance >= 0) distance = 7 - distance; // Se for posterior ou o mesmo dia, pegar o anterior
            else distance = Math.abs(distance);
          }
          
          // Se este dia está mais próximo, atualizar
          if (distance < minDistance) {
            minDistance = distance;
            closestAvailableDay = dayOfWeek;
          }
        }
        
        // Se encontramos um dia da semana próximo, calcular a data
        if (closestAvailableDay !== null) {
          const result = new Date(origDate);
          let daysToAdd = 0;
          
          if (direction === 'forward') {
            daysToAdd = (closestAvailableDay - currentDayOfWeek + 7) % 7;
            if (daysToAdd === 0) daysToAdd = 7; // Se for o mesmo dia, ir para o próximo
          } else {
            daysToAdd = (currentDayOfWeek - closestAvailableDay + 7) % 7;
            daysToAdd = -daysToAdd; // Negativo pois estamos indo para trás
            if (daysToAdd === 0) daysToAdd = -7; // Se for o mesmo dia, ir para o anterior
          }
          
          result.setDate(result.getDate() + daysToAdd);
          console.log(`  Encontrado dia disponível: ${result.toISOString().split('T')[0]} (dia ${result.getDay()})`);
          
          return result;
        }
        
        console.log(`  FALHA: Não foi possível encontrar um dia disponível`);
        // Se tudo falhar, retorna a data original
        return new Date(origDate);
      }
      
      // Garantir que a data inicial seja um dia disponível
      if (!isDayAvailable(currentDate)) {
        console.log(`Data inicial ${currentDate.toISOString().split('T')[0]} (dia ${currentDate.getDay()}) não disponível, buscando próximo dia disponível...`);
        currentDate = findNextAvailableDay(currentDate, 'forward');
        console.log(`Nova data inicial: ${currentDate.toISOString().split('T')[0]} (dia ${currentDate.getDay()})`);
      }
      
      // Função para ajustar o intervalo de revisão para cair em um dia disponível
      const adjustRevisionInterval = (originalDate: Date, targetInterval: number): Date | null => {
        const idealDate = new Date(originalDate);
        idealDate.setDate(idealDate.getDate() + targetInterval);
        
        console.log(`Ajustando intervalo: data original ${originalDate.toISOString().split('T')[0]}, intervalo ${targetInterval}, data ideal ${idealDate.toISOString().split('T')[0]} (dia ${idealDate.getDay()})`);
        
        // Se o dia ideal já for disponível, usar ele
        if (isDayAvailable(idealDate) && idealDate <= endDate) {
          console.log(`Data ideal ${idealDate.toISOString().split('T')[0]} já está disponível`);
          return idealDate;
        }
        
        // Caso contrário, procurar o dia disponível mais próximo
        // Limitação: ±3 dias do intervalo ideal para manter a eficácia da revisão espaçada
        const maxAdjustment = 3;
        
        // Primeiro tentar depois (preferência para datas futuras)
        for (let i = 1; i <= maxAdjustment; i++) {
          // Tentar i dias depois do intervalo ideal
          const laterDate = new Date(idealDate);
          laterDate.setDate(laterDate.getDate() + i);
          if (laterDate <= endDate && isDayAvailable(laterDate)) {
            console.log(`Encontrou data disponível ${i} dias após a ideal: ${laterDate.toISOString().split('T')[0]} (dia ${laterDate.getDay()})`);
            return laterDate;
          }
        }
        
        // Depois tentar antes
        for (let i = 1; i <= maxAdjustment; i++) {
          // Tentar i dias antes do intervalo ideal
          const earlierDate = new Date(idealDate);
          earlierDate.setDate(earlierDate.getDate() - i);
          if (earlierDate >= startDate && isDayAvailable(earlierDate)) {
            console.log(`Encontrou data disponível ${i} dias antes da ideal: ${earlierDate.toISOString().split('T')[0]} (dia ${earlierDate.getDay()})`);
            return earlierDate;
          }
        }
        
        // Se não encontrar um dia dentro da faixa de ajuste, tentar qualquer dia disponível próximo
        console.log(`Não encontrou data disponível no intervalo de ajuste ±${maxAdjustment}, tentando qualquer dia disponível...`);
        
        // Verificar todos os dias da semana
        for (const day of daysWithAvailability) {
          // Calcular quantos dias precisamos avançar para atingir o próximo dia da semana deste tipo
          const currentDayOfWeek = idealDate.getDay();
          let daysToAdd = day - currentDayOfWeek;
          if (daysToAdd <= 0) daysToAdd += 7; // Se for negativo, pegar a próxima semana
          
          const nextAvailableDate = new Date(idealDate);
          nextAvailableDate.setDate(nextAvailableDate.getDate() + daysToAdd);
          
          if (nextAvailableDate <= endDate) {
            console.log(`Encontrou próximo dia disponível (dia da semana ${day}): ${nextAvailableDate.toISOString().split('T')[0]}`);
            return nextAvailableDate;
          }
        }
        
        // Se não encontrar nenhum dia disponível que satisfaça as condições, retornar null (pular esta revisão)
        console.log(`Não foi possível encontrar nenhum dia disponível para esta revisão, pulando`);
        return null;
      };
      
      // Distribuir sessões principais para cada assunto
      for (const subject of prioritizedSubjects) {
        // Ajustar a duração com base na prioridade, entre 30 e 120 minutos
        // Usar configurações definidas pelo usuário, se disponíveis
        const minDuration = formData.mainSessionDuration?.min || 30;
        const maxDuration = formData.mainSessionDuration?.max || 120;
        
        const baseDurationMinutes = Math.min(maxDuration, Math.max(minDuration, 
          Math.round((subject.priority / totalPriorityPoints) * averageDailyMinutes * 0.7 / prioritizedSubjects.length)
        ));
        
        // Arredondar a duração para intervalos de 5 minutos para horários mais naturais
        const roundedDuration = Math.ceil(baseDurationMinutes / 5) * 5;
        
        // Procurar um dia com horário disponível
        let foundTimeSlot = false;
        let attempts = 0;
        const maxAttempts = 14; // Tentar por até 14 dias (2 semanas)
        
        while (!foundTimeSlot && attempts < maxAttempts) {
          // Verificar se a data atual está dentro do período do plano
          if (currentDate <= endDate) {
            // Procurar um slot de tempo disponível para esta data
            const timeSlot = findAvailableTimeSlot(currentDate, roundedDuration);
            
            if (timeSlot) {
              // Criar sessão principal
              const sessionDate = formatDateIso(currentDate);
              const mainSessionTitle = `${subject.discipline?.name || 'Disciplina'} - ${subject.title}`;
              
              const mainSession = {
                plan_id: planId,
                title: mainSessionTitle,
                discipline_id: subject.discipline_id,
                subject_id: subject.id,
                date: sessionDate,
                start_time: timeSlot.startTime,
                end_time: timeSlot.endTime,
                duration_minutes: roundedDuration,
                is_revision: false
              };
              
              sessionsToCreate.push(mainSession);
              sessionsCreated++;
              foundTimeSlot = true;
              
              // Se a revisão estiver habilitada, criar sessões de revisão
              if (formData.revisionsEnabled) {
                // Obter a estratégia de conflito de revisão
                const conflictStrategy = formData.revisionConflictStrategy || 'next-available';
                
                // Para cada sessão principal, criar as sessões de revisão
                for (const interval of [1, 3, 7, 14, 30]) {
                  // Calcular a data ideal para esta revisão
                  const idealRevisionDate = new Date(currentDate);
                  idealRevisionDate.setDate(idealRevisionDate.getDate() + interval);
                  
                  // Verificar se a data da revisão está dentro do período do plano
                  if (idealRevisionDate > endDate) {
                    continue; // Pular esta revisão se estiver fora do período do plano
                  }
                  
                  // Aplicar a estratégia de conflito selecionada pelo usuário
                  let revisionDate: Date | null = null;
                  
                  switch (conflictStrategy) {
                    case 'next-available':
                      // Verificar se a data ideal para revisão está disponível
                      if (isDayAvailable(idealRevisionDate) && idealRevisionDate <= endDate) {
                        revisionDate = idealRevisionDate;
                        console.log(`Data ideal de revisão ${idealRevisionDate.toISOString().split('T')[0]} (dia ${idealRevisionDate.getDay()}) já está disponível`);
                      } else {
                        // Caso contrário, buscar o próximo dia disponível
                        const idealDayOfWeek = idealRevisionDate.getDay();
                        console.log(`NEXT-AVAILABLE: Data ideal de revisão ${idealRevisionDate.toISOString().split('T')[0]} (dia ${idealDayOfWeek}) não está disponível, buscando próximo dia disponível`);
                        console.log(`NEXT-AVAILABLE: Lista de dias disponíveis: [${daysWithAvailability.join(', ')}]`);
                        
                        // Verificação especial para sexta-feira
                        if (idealDayOfWeek === 5) {
                          console.log(`NEXT-AVAILABLE: Verificação especial para SEXTA-FEIRA`);
                          console.log(`NEXT-AVAILABLE: daysWithAvailability inclui 5? ${daysWithAvailability.includes(5)}`);
                          console.log(`NEXT-AVAILABLE: indexOf(5) = ${daysWithAvailability.indexOf(5)}`);
                        }
                        
                        // Verificar explicitamente cada dia disponível
                        console.log(`NEXT-AVAILABLE: Verificação individual de cada dia disponível:`);
                        for (const day of daysWithAvailability) {
                          console.log(`  - Dia ${day} (${typeof day})`);
                        }
                        
                        // Usar nossa versão melhorada da função findNextAvailableDay
                        revisionDate = findNextAvailableDay(idealRevisionDate, 'forward');
                        console.log(`NEXT-AVAILABLE: Próximo dia disponível encontrado: ${revisionDate.toISOString().split('T')[0]} (dia ${revisionDate.getDay()})`);
                        
                        // Verificação final para garantir que o dia retornado é realmente disponível
                        if (!isDayAvailable(revisionDate)) {
                          console.log(`ERRO: Próximo dia disponível não está realmente disponível: ${revisionDate.toISOString().split('T')[0]} (dia ${revisionDate.getDay()})`);
                          revisionDate = null;
                        }
                      }
                      break;
                      
                    case 'adjust-interval':
                      // Ajustar o intervalo para o dia disponível mais próximo
                      // Vamos começar tentando a data ideal
                      if (isDayAvailable(idealRevisionDate) && idealRevisionDate <= endDate) {
                        revisionDate = idealRevisionDate;
                        console.log(`Data ideal de revisão ${idealRevisionDate.toISOString().split('T')[0]} (dia ${idealRevisionDate.getDay()}) já está disponível`);
                      } else {
                        // Se a data ideal não estiver disponível, procurar a data disponível mais próxima
                        console.log(`Ajustando intervalo: data original ${currentDate.toISOString().split('T')[0]}, intervalo ${interval}, data ideal ${idealRevisionDate.toISOString().split('T')[0]} (dia ${idealRevisionDate.getDay()})`);
                        
                        // Usar o novo findNextAvailableDay que já procura o dia disponível mais próximo
                        revisionDate = findNextAvailableDay(idealRevisionDate, 'both');
                        
                        // Verificação final
                        if (!isDayAvailable(revisionDate)) {
                          console.log(`ERRO: Ainda não encontrou dia disponível para ajuste de intervalo: ${revisionDate.toISOString().split('T')[0]} (dia ${revisionDate.getDay()})`);
                          revisionDate = null;
                        } else {
                          console.log(`Intervalo ajustado para dia disponível: ${revisionDate.toISOString().split('T')[0]} (dia ${revisionDate.getDay()})`);
                        }
                      }
                      break;
                      
                    case 'skip':
                      // Verificar se o dia ideal da revisão está disponível
                      if (isDayAvailable(idealRevisionDate) && idealRevisionDate <= endDate) {
                        revisionDate = idealRevisionDate;
                        console.log(`Data de revisão ${revisionDate.toISOString().split('T')[0]} (dia ${revisionDate.getDay()}) está disponível para 'skip'`);
                      } else {
                        // Se não estiver disponível, pular esta revisão
                        console.log(`Estratégia 'skip': Pulando revisão programada para ${idealRevisionDate.toISOString().split('T')[0]} (dia ${idealRevisionDate.getDay()}) por falta de disponibilidade`);
                        revisionDate = null;
                      }
                      break;
                      
                    case 'strict-days':
                      // Verificar se o dia ideal da revisão está disponível
                      if (isDayAvailable(idealRevisionDate) && idealRevisionDate <= endDate) {
                        revisionDate = idealRevisionDate;
                        console.log(`Data de revisão ${revisionDate.toISOString().split('T')[0]} (dia ${revisionDate.getDay()}) está disponível dentro dos dias definidos`);
                      } else {
                        // Se não estiver disponível, não agenda a revisão
                        console.log(`Pulando revisão: data ideal ${idealRevisionDate.toISOString().split('T')[0]} (dia ${idealRevisionDate.getDay()}) não está dentro dos dias disponíveis`);
                        revisionDate = null;
                      }
                      break;
                  }
                  
                  // Se não conseguir encontrar uma data válida para a revisão, pular
                  if (!revisionDate) {
                    console.log(`Nenhuma data válida encontrada para revisão com a estratégia "${conflictStrategy}", pulando`);
                    continue;
                  }
                  
                  // Verificação final para garantir que o dia é realmente disponível
                  if (!isDayAvailable(revisionDate)) {
                    console.log(`ERRO: A estratégia "${conflictStrategy}" resultou em uma data indisponível: ${revisionDate.toISOString().split('T')[0]} (dia ${revisionDate.getDay()}), pulando`);
                    continue;
                  }
                  
                  console.log(`Agendando revisão para ${revisionDate.toISOString().split('T')[0]} (dia ${revisionDate.getDay()}) usando estratégia "${conflictStrategy}"`);
                  
                  // Encontrar um horário disponível para a sessão de revisão
                  const revisionPercentage = formData.revisionSessionDuration?.percentage || 30;
                  const revisionDuration = Math.round((roundedDuration * revisionPercentage) / 100);
                  
                  // Garantir que a duração da revisão não seja menor que 15 minutos
                  const finalRevisionDuration = Math.max(revisionDuration, 15);
                  
                  // Encontrar um slot disponível na data da revisão
                  const timeSlot = findAvailableTimeSlot(revisionDate, finalRevisionDuration);
                  
                  // Se não encontrar horário disponível, pular esta revisão
                  if (!timeSlot) {
                    continue;
                  }
                  
                  // Adicionar a sessão de revisão
                  sessionsToCreate.push({
                    plan_id: planId,
                    title: `Revisão: ${mainSessionTitle}`,
                    discipline_id: subject.discipline_id,
                    subject_id: subject.id,
                    date: formatDateIso(revisionDate),
                    start_time: timeSlot.startTime,
                    end_time: timeSlot.endTime,
                    duration_minutes: finalRevisionDuration,
                    is_revision: true,
                    original_session_id: sessionsCreated,
                    metadata: JSON.stringify({
                      revision_interval: interval,
                      subject_difficulty: subject.difficulty,
                      subject_importance: subject.importance
                    })
                  });
                }
              }
            }
          }
          
          // Avançar para o próximo dia e incrementar tentativas
          advanceToNextDay();
          attempts++;
        }
        
        // Se não conseguiu encontrar um horário, força a criação de uma sessão em qualquer dia
        if (!foundTimeSlot) {
          // Reiniciar à data de início
          currentDate = new Date(startDate);
          const sessionDate = formatDateIso(currentDate);
          
          // Tentar usar um horário alinhado com os slots disponíveis do usuário
          let startTimeStr, endTimeStr;
          
          // Verificar se há disponibilidade para o dia da semana
          if (availableTimesByDayOfWeek[currentDate.getDay()] && 
              availableTimesByDayOfWeek[currentDate.getDay()].length > 0) {
            
            // Pegar o primeiro slot disponível deste dia
            const availableSlot = availableTimesByDayOfWeek[currentDate.getDay()][0];
            const slotStartMinutes = parseTimeToMinutes(availableSlot.startTime);
            
            // Arredondar para hora/meia-hora mais próxima
            const roundedStartMinutes = Math.floor(slotStartMinutes / 30) * 30;
            startTimeStr = minutesToTimeStr(roundedStartMinutes);
            
            // Calcular horário de término baseado na duração arredondada
            const endTimeMinutes = roundedStartMinutes + roundedDuration;
            endTimeStr = minutesToTimeStr(endTimeMinutes);
          } else {
            // Fallback para um horário fixo se não houver disponibilidade definida
            startTimeStr = "18:00"; // 6 pm
            const endMinutes = parseTimeToMinutes(startTimeStr) + roundedDuration;
            endTimeStr = minutesToTimeStr(endMinutes);
          }
          
          const mainSessionTitle = `${subject.discipline?.name || 'Disciplina'} - ${subject.title}`;
          
          const mainSession = {
            plan_id: planId,
            title: mainSessionTitle,
            discipline_id: subject.discipline_id,
            subject_id: subject.id,
            date: sessionDate,
            start_time: startTimeStr,
            end_time: endTimeStr,
            duration_minutes: roundedDuration,
            is_revision: false
          };
          
          sessionsToCreate.push(mainSession);
          sessionsCreated++;
          
          // Avançar para o próximo dia
          advanceToNextDay();
        }
      }
      
      // Separar sessões principais das revisões
      const mainSessions = sessionsToCreate.filter(session => !session.is_revision);
      const revisionSessions = sessionsToCreate.filter(session => session.is_revision);

      console.log(`Preparando para criar ${mainSessions.length} sessões principais e ${revisionSessions.length} revisões`);

      // Inserir primeiro as sessões principais
      let mainSessionsIds: Record<number, number> = {};
      if (mainSessions.length > 0) {
        const { data: createdMainSessions, error: mainSessionsError } = await supabase
          .from('smart_plan_sessions')
          .insert(mainSessions)
          .select('id, plan_id, title');
        
        if (mainSessionsError) {
          console.error('Erro ao criar sessões principais do plano:', mainSessionsError);
          toast.error('Não foi possível criar as sessões principais do plano');
          return false;
        }
        
        // Mapear as sessões criadas por índice para poder atualizar os IDs das revisões
        if (createdMainSessions) {
          createdMainSessions.forEach((session, index) => {
            mainSessionsIds[index] = session.id;
          });
          console.log(`${createdMainSessions.length} sessões principais criadas com sucesso`);
        }
      }

      // Atualizar as referências de original_session_id nas revisões
      if (revisionSessions.length > 0) {
        // Atualizar a referência para a sessão original usando o ID real
        revisionSessions.forEach(revision => {
          if (revision.original_session_id !== null && revision.original_session_id !== undefined) {
            // O original_session_id aqui é o índice da sessão principal em mainSessions
            const originalIndex = Number(revision.original_session_id);
            // Atualizar para o ID real da sessão principal
            if (!isNaN(originalIndex) && mainSessionsIds[originalIndex]) {
              revision.original_session_id = mainSessionsIds[originalIndex];
            } else {
              // Se não encontrar o ID correspondente, usar um valor padrão para evitar erros
              // Usar o primeiro ID de sessão principal ou 0 se não houver nenhum
              console.warn(`Não foi possível encontrar sessão original para o índice ${originalIndex}`);
              const fallbackId = Object.values(mainSessionsIds)[0] || 0;
              revision.original_session_id = fallbackId;
            }
          }
        });
        
        // Inserir as revisões
        const { error: revisionsError } = await supabase
          .from('smart_plan_sessions')
          .insert(revisionSessions);
        
        if (revisionsError) {
          console.error('Erro ao criar revisões do plano:', revisionsError);
          toast.error('Algumas revisões podem não ter sido criadas corretamente');
          // Não retornar false, pois as sessões principais já foram criadas
        } else {
          console.log(`${revisionSessions.length} revisões criadas com sucesso`);
        }
      }

      // Atualizar o plano com as estatísticas
      const totalSessions = mainSessions.length + revisionSessions.length;
      const totalMinutes = [...mainSessions, ...revisionSessions].reduce(
        (sum, session) => sum + session.duration_minutes, 0
      );
      const sessionsPerDay = Math.round(totalSessions / totalDays * 10) / 10; // Arredondar para 1 casa decimal

      await supabase
        .from('smart_plans')
        .update({
          total_sessions: totalSessions,
          total_minutes: totalMinutes,
          sessions_per_day: sessionsPerDay
        })
        .eq('id', planId);

      return true;
    } catch (error) {
      console.error('Erro ao gerar sessões do plano:', error);
      toast.error('Não foi possível gerar as sessões do plano');
      return false;
    }
  }

  /**
   * Método estático para obter todos os planos do usuário
   */
  static async getPlans() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: { message: 'Usuário não autenticado' } };
      }
      
      const { data: plans, error } = await supabase
        .from('smart_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      return { data: plans || [], error };
    } catch (error) {
      console.error('Erro ao buscar planos:', error);
      return { data: [], error };
    }
  }

  /**
   * Adiciona uma nova sessão a um plano existente
   * @param planId ID do plano
   * @param session Dados da sessão
   * @returns Sucesso da operação
   */
  public async addPlanSession(planId: number, session: Omit<SmartPlanSession, 'id' | 'created_at'>): Promise<boolean> {
    try {
      // Verificar se o plano existe
      const { data: plan, error: planError } = await supabase
        .from('smart_plans')
        .select('id')
        .eq('id', planId)
        .single();
      
      if (planError || !plan) {
        console.error('Erro ao verificar plano:', planError);
        toast.error('Plano não encontrado');
        return false;
      }
      
      // Preparar dados da sessão para inserção no banco
      const sessionData = {
        plan_id: planId,
        title: session.title,
        discipline_id: session.discipline_id,
        subject_id: session.subject_id,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        duration_minutes: session.duration_minutes,
        is_revision: session.is_revision,
        original_session_id: session.original_session_id,
        metadata: JSON.stringify({
          subject_difficulty: session.subject_difficulty,
          subject_importance: session.subject_importance,
          revision_interval: session.revision_interval
        })
      };
      
      // Inserir a sessão no banco
      const { error: sessionError } = await supabase
        .from('smart_plan_sessions')
        .insert(sessionData);
      
      if (sessionError) {
        console.error('Erro ao adicionar sessão:', sessionError);
        toast.error('Não foi possível adicionar a sessão');
        return false;
      }
      
      // Atualizar estatísticas do plano
      await this.updatePlanStats(planId);
      
      toast.success('Sessão adicionada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao adicionar sessão:', error);
      toast.error('Ocorreu um erro ao adicionar a sessão');
      return false;
    }
  }

  /**
   * Atualiza uma sessão existente
   * @param sessionId ID da sessão
   * @param updates Atualizações a serem aplicadas
   * @returns Sucesso da operação
   */
  public async updatePlanSession(sessionId: number, updates: Partial<SmartPlanSession>): Promise<boolean> {
    try {
      // Obter a sessão atual para verificar se ela existe
      const { data: currentSession, error: sessionError } = await supabase
        .from('smart_plan_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionError || !currentSession) {
        console.error('Erro ao buscar sessão:', sessionError);
        toast.error('Sessão não encontrada');
        return false;
      }
      
      // Preparar dados para atualização
      const sessionData: any = {};
      
      // Atualizar apenas os campos fornecidos
      if (updates.title !== undefined) sessionData.title = updates.title;
      if (updates.discipline_id !== undefined) sessionData.discipline_id = updates.discipline_id;
      if (updates.subject_id !== undefined) sessionData.subject_id = updates.subject_id;
      if (updates.date !== undefined) sessionData.date = updates.date;
      if (updates.start_time !== undefined) sessionData.start_time = updates.start_time;
      if (updates.end_time !== undefined) sessionData.end_time = updates.end_time;
      if (updates.duration_minutes !== undefined) sessionData.duration_minutes = updates.duration_minutes;
      if (updates.is_revision !== undefined) sessionData.is_revision = updates.is_revision;
      if (updates.original_session_id !== undefined) sessionData.original_session_id = updates.original_session_id;
      
      // Atualizar metadados
      let metadata = {};
      try {
        metadata = currentSession.metadata ? JSON.parse(currentSession.metadata) : {};
      } catch (e) {
        console.warn('Erro ao analisar metadados existentes:', e);
      }
      
      // Atualizar campos de metadados se fornecidos
      if (updates.subject_difficulty !== undefined) metadata = { ...metadata, subject_difficulty: updates.subject_difficulty };
      if (updates.subject_importance !== undefined) metadata = { ...metadata, subject_importance: updates.subject_importance };
      if (updates.revision_interval !== undefined) metadata = { ...metadata, revision_interval: updates.revision_interval };
      
      sessionData.metadata = JSON.stringify(metadata);
      
      // Executar a atualização no banco
      const { error: updateError } = await supabase
        .from('smart_plan_sessions')
        .update(sessionData)
        .eq('id', sessionId);
      
      if (updateError) {
        console.error('Erro ao atualizar sessão:', updateError);
        toast.error('Não foi possível atualizar a sessão');
        return false;
      }
      
      // Atualizar estatísticas do plano
      await this.updatePlanStats(currentSession.plan_id);
      
      toast.success('Sessão atualizada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      toast.error('Ocorreu um erro ao atualizar a sessão');
      return false;
    }
  }

  /**
   * Exclui uma sessão do plano
   * @param sessionId ID da sessão
   * @returns Sucesso da operação
   */
  public async deletePlanSession(sessionId: number): Promise<boolean> {
    try {
      // Obter a sessão para saber o planId
      const { data: session, error: sessionError } = await supabase
        .from('smart_plan_sessions')
        .select('plan_id')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) {
        console.error('Erro ao buscar sessão:', sessionError);
        toast.error('Sessão não encontrada');
        return false;
      }
      
      const planId = session.plan_id;
      
      // Excluir a sessão
      const { error: deleteError } = await supabase
        .from('smart_plan_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (deleteError) {
        console.error('Erro ao excluir sessão:', deleteError);
        toast.error('Não foi possível excluir a sessão');
        return false;
      }
      
      // Verificar se é uma sessão principal com revisões e excluir as revisões também
      const { data: revisions, error: revisionsError } = await supabase
        .from('smart_plan_sessions')
        .select('id')
        .eq('original_session_id', sessionId);
      
      if (!revisionsError && revisions && revisions.length > 0) {
        const revisionIds = revisions.map(r => r.id);
        
        // Excluir revisões associadas
        const { error: deleteRevisionsError } = await supabase
          .from('smart_plan_sessions')
          .delete()
          .in('id', revisionIds);
        
        if (deleteRevisionsError) {
          console.error('Erro ao excluir revisões associadas:', deleteRevisionsError);
          toast.error('Algumas revisões associadas podem não ter sido excluídas');
        }
      }
      
      // Atualizar estatísticas do plano
      await this.updatePlanStats(planId);
      
      toast.success('Sessão excluída com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      toast.error('Ocorreu um erro ao excluir a sessão');
      return false;
    }
  }

  /**
   * Atualiza as estatísticas de um plano com base nas sessões
   * @param planId ID do plano
   * @returns Sucesso da operação
   */
  private async updatePlanStats(planId: number): Promise<boolean> {
    try {
      // Contar sessões e calcular tempo total
      const { data: sessions, error: sessionsError } = await supabase
        .from('smart_plan_sessions')
        .select('duration_minutes')
        .eq('plan_id', planId);
      
      if (sessionsError) {
        console.error('Erro ao contar sessões do plano:', sessionsError);
        return false;
      }
      
      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce((sum, session) => sum + session.duration_minutes, 0);
      
      // Obter informações do plano para calcular sessões por dia
      const { data: plan, error: planError } = await supabase
        .from('smart_plans')
        .select('start_date, end_date')
        .eq('id', planId)
        .single();
      
      if (planError || !plan) {
        console.error('Erro ao buscar plano:', planError);
        return false;
      }
      
      // Calcular o número de dias
      const startDate = new Date(plan.start_date);
      const endDate = new Date(plan.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Calcular sessões por dia
      const sessionsPerDay = totalDays > 0 ? Math.round(totalSessions / totalDays * 10) / 10 : 0;
      
      // Atualizar o plano
      const { error: updateError } = await supabase
        .from('smart_plans')
        .update({
          total_sessions: totalSessions,
          total_minutes: totalMinutes,
          sessions_per_day: sessionsPerDay,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);
      
      if (updateError) {
        console.error('Erro ao atualizar estatísticas do plano:', updateError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar estatísticas do plano:', error);
      return false;
    }
  }

  /**
   * Converte uma SmartPlanSession para o formato de StudySession
   * compatível com o componente StudySessionTimer e a página de estudos
   * @param session Sessão do planejamento inteligente
   * @returns Sessão no formato compatível com estudos
   */
  public static convertToStudySession(session: SmartPlanSession): any {
    // Criar objeto de data a partir da data e hora
    const dateObj = new Date(`${session.date}T${session.start_time}`);
    
    // Verificar se a sessão está marcada como concluída nos metadados
    let completed = false;
    let status = 'agendada';
    let actual_duration_minutes = undefined;
    
    if (session.metadata) {
      try {
        const metadata = typeof session.metadata === 'string' 
          ? JSON.parse(session.metadata) 
          : session.metadata;
          
        if (metadata.completed) {
          completed = true;
          status = 'concluida';
          actual_duration_minutes = metadata.actual_duration_minutes;
        }
      } catch (e) {
        console.warn('Erro ao analisar metadados da sessão:', e);
      }
    }
    
    // Ajustar para o fuso horário local (Brasília)
    const adjustedDate = this.adjustDateToLocalTimezone(`${session.date}T${session.start_time}`);
    
    return {
      id: session.id,
      title: session.title,
      discipline_id: session.discipline_id,
      disciplineName: session.discipline_name,
      subject_id: session.subject_id,
      scheduled_date: adjustedDate,
      duration_minutes: session.duration_minutes,
      actual_duration_minutes,
      user_id: '', // Será preenchido automaticamente pelo serviço
      status,
      completed,
      type: session.is_revision ? 'revision' : 'new-content'
    };
  }
  
  /**
   * Ajusta uma data para o fuso horário local (Brasília)
   * Isso resolve problemas de datas que podem estar sendo interpretadas como UTC
   * @param dateTimeString String de data e hora no formato ISO (YYYY-MM-DDTHH:MM:SS)
   * @returns Data ISO ajustada para o fuso horário local
   */
  public static adjustDateToLocalTimezone(dateTimeString: string): string {
    try {
      // Extrair a data e hora da string
      const [datePart, timePart] = dateTimeString.split('T');
      
      // Forçar a interpretação da data como sendo no fuso horário local
      // Criando uma string de data no formato YYYY-MM-DDTHH:MM:SS sem o Z no final
      // para que o JavaScript não interprete como UTC
      const localDateString = `${datePart}T${timePart || '00:00:00'}`;
      
      // Criar um objeto de data no fuso horário local
      const date = new Date(localDateString);
      
      // Adicionar 1 dia para compensar o problema de fuso horário
      // Isso é uma solução temporária para garantir que a data seja exibida corretamente
      date.setDate(date.getDate() + 1);
      
      return date.toISOString();
    } catch (error) {
      console.error('Erro ao ajustar fuso horário:', error);
      return new Date(dateTimeString).toISOString(); // Fallback para o comportamento anterior
    }
  }
}

export default SmartPlanningService; 