// Utilitário para agendar sessões de estudo automaticamente
import { v4 as uuidv4 } from 'uuid';
import { 
  PlanDiscipline, 
  StudySessionCreate,
  TimeAvailability
} from '@/lib/types/planning';

// Tipos de sessão e suas durações fixas
const SESSION_TYPES = {
  ESTUDO: {
    name: 'Estudo',
    duration: 60 // 1 hora em minutos
  },
  REVISAO: {
    name: 'Revisão',
    duration: 30 // 30 minutos
  }
};

/**
 * Calcula a prioridade do assunto com base na dificuldade e importância
 * @param difficulty Dificuldade do assunto ('baixa', 'média', 'alta')
 * @param importance Importância do assunto ('baixa', 'média', 'alta')
 * @returns Pontuação de prioridade (quanto maior, mais prioritário)
 */
function calculateSubjectPriority(difficulty: string, importance: string): number {
  const difficultyScore = { 'baixa': 1, 'média': 2, 'alta': 3 };
  const importanceScore = { 'baixa': 1, 'média': 2, 'alta': 3 };
  
  // Fórmula de prioridade: dificuldade * importância
  // Isso dará mais peso para assuntos difíceis E importantes
  return (difficultyScore[difficulty as keyof typeof difficultyScore] || 2) * 
         (importanceScore[importance as keyof typeof importanceScore] || 2);
}

/**
 * Determina os intervalos de revisão com base na dificuldade do assunto
 * @param difficulty Dificuldade do assunto ('baixa', 'média', 'alta')
 * @returns Array com os dias para revisão após a sessão de estudo
 */
function getRevisionIntervals(difficulty: string): number[] {
  switch (difficulty) {
    case 'alta':
      // Assuntos difíceis precisam de mais revisões e mais próximas
      return [1, 3, 7, 14, 21];
    case 'média':
      // Assuntos médios precisam de revisões regulares
      return [2, 7, 14];
    case 'baixa':
      // Assuntos fáceis precisam de menos revisões
      return [3, 10];
    default:
      return [2, 7]; // Padrão para casos não especificados
  }
}

// Interface para gerenciar horários ocupados
interface TimeSlot {
  startMinutes: number; // Minutos desde 00:00
  endMinutes: number;   // Minutos desde 00:00
  disciplineId: number;
  subjectId: number;
  sessionType: 'ESTUDO' | 'REVISAO';
}

/**
 * Gera sessões de estudo automaticamente com base na disponibilidade do usuário
 * @param planoId ID do plano de estudo
 * @param disciplinas Disciplinas do plano
 * @param disponibilidade Array de disponibilidade de tempo
 * @param dataInicio Data de início do plano (formato ISO)
 * @param dataFim Data de término do plano (formato ISO)
 * @returns Array de sessões de estudo geradas
 */
export function gerarSessoesAutomaticas(
  planoId: string,
  disciplinas: PlanDiscipline[],
  disponibilidade: TimeAvailability[],
  dataInicio: string,
  dataFim: string
): StudySessionCreate[] {
  console.log("=== INICIANDO GERAÇÃO DE SESSÕES AUTOMÁTICAS ===");
  console.log("ID do plano:", planoId);
  console.log("Disciplinas:", JSON.stringify(disciplinas));
  console.log("Disponibilidade:", JSON.stringify(disponibilidade));
  console.log("Data início:", dataInicio);
  console.log("Data fim:", dataFim);
  
  // Verificar se há dados suficientes para gerar sessões
  if (!disciplinas.length || !disponibilidade.length) {
    console.log("Dados insuficientes para gerar sessões. Disciplinas ou disponibilidade vazios.");
    return [];
  }
  
  // Validar formato das datas
  if (!dataInicio || !dataFim) {
    console.log("Datas de início ou fim não fornecidas, usando datas padrão");
    // Usar data atual como início e adicionar 3 meses como fim
    const hoje = new Date();
    dataInicio = hoje.toISOString();
    
    const fimPadrao = new Date();
    fimPadrao.setMonth(fimPadrao.getMonth() + 3);
    dataFim = fimPadrao.toISOString();
  }
  
  // Validar disponibilidade
  if (disponibilidade.some(d => typeof d.dayOfWeek !== 'number' || !d.startTime || !d.endTime)) {
    console.log("Formato de disponibilidade inválido!");
    return [];
  }
  
  // Verificar se cada disciplina tem assuntos válidos
  const temAssuntosValidos = disciplinas.some(d => 
    d.subjects && d.subjects.length > 0 && d.subjects.some(s => s.hours && s.hours > 0)
  );
  
  if (!temAssuntosValidos) {
    console.log("Nenhuma disciplina tem assuntos com horas definidas!");
    return [];
  }
  
  const sessoes: StudySessionCreate[] = [];
  
  // Data inicial e final
  const startDate = new Date(dataInicio);
  const endDate = new Date(dataFim);
  
  // Remover componente de horas para iniciar no começo do dia
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  
  console.log("Data início (após ajuste):", startDate.toISOString());
  console.log("Data fim (após ajuste):", endDate.toISOString());
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.log("Erro: Data inválida após conversão!");
    return [];
  }
  
  // Ordenar disponibilidade por dia da semana para ter melhor distribuição
  const disponibilidadeOrdenada = [...disponibilidade].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  
  // Mapear assuntos para distribuir melhor
  const assuntos: {
    id: string; // ID único para identificar o assunto (estudoId + subjectId)
    discipline: PlanDiscipline;
    subjectId: number;
    subjectName: string;
    difficulty: string;
    importance: string;
    priority: number; // Pontuação calculada de prioridade
    remainingHours: number; // Horas que ainda precisam ser estudadas
    lastStudyDate?: Date; // Última data de estudo para calcular revisões
    revisionIntervals: number[]; // Dias para revisão após estudo
    pendingRevisions: Date[]; // Datas programadas para revisão
  }[] = [];
  
  // Criar lista de assuntos para distribuição
  let assuntoCounter = 0;
  disciplinas.forEach(discipline => {
    if (discipline.subjects && discipline.subjects.length > 0) {
      discipline.subjects.forEach(subject => {
        if (subject.hours && subject.hours > 0) {
          // Determinar dificuldade e importância (valores padrão se não fornecidos)
          const difficulty = subject.difficulty || 'média';
          const importance = subject.importance || 'média';
          
          // Calcular prioridade do assunto
          const priority = calculateSubjectPriority(difficulty, importance);
          
          // Calcular horas totais de estudo para este assunto
          const totalHours = subject.hours;
          
          // Definir intervalos de revisão baseados na dificuldade
          const revisionIntervals = getRevisionIntervals(difficulty);
          
          assuntos.push({
            id: `${discipline.id}-${subject.id}-${assuntoCounter++}`,
            discipline,
            subjectId: subject.id,
            subjectName: subject.name,
            difficulty,
            importance,
            priority,
            remainingHours: totalHours,
            revisionIntervals,
            pendingRevisions: []
          });
        }
      });
    }
  });
  
  console.log(`Total de assuntos para agendar: ${assuntos.length}`);
  
  if (assuntos.length === 0) {
    console.log("Nenhum assunto válido para agendar!");
    return [];
  }
  
  // Ordenar assuntos por prioridade para alocar os mais importantes primeiro
  assuntos.sort((a, b) => b.priority - a.priority);
  
  // Converter hora:minuto para minutos totais desde 00:00
  const parseTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Converter minutos totais para hora:minuto
  const parseMinutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Mapear disponibilidade por dia da semana para facilitar acesso
  const disponibilidadePorDia: Record<number, Array<{startMinutes: number, endMinutes: number}>> = {};
  
  disponibilidadeOrdenada.forEach(slot => {
    const dia = slot.dayOfWeek;
    
    if (!disponibilidadePorDia[dia]) {
      disponibilidadePorDia[dia] = [];
    }
    
    const startMinutes = parseTimeToMinutes(slot.startTime);
    const endMinutes = parseTimeToMinutes(slot.endTime);
    
    disponibilidadePorDia[dia].push({
      startMinutes,
      endMinutes: endMinutes < startMinutes ? endMinutes + 24 * 60 : endMinutes // Lidar com slots que passam da meia-noite
    });
  });
  
  // Mapa para controlar quais datas e horários já estão ocupados
  // Formato: Map<data_ISO, Array<{startMinutes, endMinutes, disciplineId, subjectId}>>
  const horariosOcupados = new Map<string, TimeSlot[]>();
  
  // Função para verificar se um horário está disponível
  const verificarDisponibilidade = (
    dia: number, // 0-6 (domingo a sábado)
    inicioMinutos: number,
    duracaoMinutos: number,
    dateKey: string
  ): boolean => {
    // Calcular fim em minutos
    const fimMinutos = inicioMinutos + duracaoMinutos;
    
    // 1. Verificar se está dentro do período de disponibilidade do usuário
    const disponibilidadeDia = disponibilidadePorDia[dia] || [];
    
    if (disponibilidadeDia.length === 0) {
      console.log(`Sem disponibilidade para o dia da semana ${dia}`);
      return false;
    }
    
    // Verificar se o horário da sessão cabe completamente em pelo menos um slot de disponibilidade
    // Uma sessão só pode ser agendada se estiver totalmente contida em um único slot
    const dentroDeAlgumaDisponibilidade = disponibilidadeDia.some(slot => {
      return inicioMinutos >= slot.startMinutes && fimMinutos <= slot.endMinutes;
    });
    
    if (!dentroDeAlgumaDisponibilidade) {
      // console.log(`Horário ${inicioMinutos}-${fimMinutos} fora do período de disponibilidade para o dia ${dia}`);
      return false; // Não está dentro de nenhum período de disponibilidade
    }
    
    // 2. Verificar se não há sobreposição com outros horários já agendados
    const ocupados = horariosOcupados.get(dateKey) || [];
    
    const temSobreposicao = ocupados.some(slot => {
      // Verifica se há sobreposição de horários:
      // Duas sessões se sobrepõem se o início de uma é antes do fim da outra, 
      // e o fim de uma é depois do início da outra
      return (inicioMinutos < slot.endMinutes && fimMinutos > slot.startMinutes);
    });
    
    if (temSobreposicao) {
      // console.log(`Sobreposição detectada para o horário ${inicioMinutos}-${fimMinutos} na data ${dateKey}`);
    }
    
    return !temSobreposicao;
  };
  
  // Função para registrar um horário como ocupado
  const registrarHorarioOcupado = (
    dia: number,
    inicioMinutos: number,
    duracaoMinutos: number,
    dateKey: string,
    disciplineId: number,
    subjectId: number,
    sessionType: 'ESTUDO' | 'REVISAO'
  ) => {
    if (!horariosOcupados.has(dateKey)) {
      horariosOcupados.set(dateKey, []);
    }
    
    // Adicionar à lista de horários ocupados
    horariosOcupados.get(dateKey)!.push({
      startMinutes: inicioMinutos,
      endMinutes: inicioMinutos + duracaoMinutos,
      disciplineId,
      subjectId,
      sessionType
    });
  };
  
  // Função para agendar uma sessão em um dia específico
  const agendarSessao = (
    date: Date,
    assunto: typeof assuntos[0],
    tipo: 'ESTUDO' | 'REVISAO',
    cicloRevisao: number = 0
  ): boolean => {
    const diaSemana = date.getDay(); // 0-6, domingo a sábado
    const dateKey = date.toISOString().split('T')[0];
    
    // Verificar se o dia tem disponibilidade
    if (!disponibilidadePorDia[diaSemana] || disponibilidadePorDia[diaSemana].length === 0) {
      // console.log(`Dia ${diaSemana} (${dateKey}) sem disponibilidade configurada`);
      return false;
    }
    
    // Duração da sessão baseada no tipo
    const duracao = SESSION_TYPES[tipo].duration;
    
    // Verificar se a duração é menor que algum slot disponível
    const temSlotDisponivel = disponibilidadePorDia[diaSemana].some(slot => 
      (slot.endMinutes - slot.startMinutes) >= duracao
    );
    
    if (!temSlotDisponivel) {
      // console.log(`Nenhum slot do dia ${diaSemana} tem duração suficiente (${duracao} min) para a sessão`);
      return false;
    }
    
    // Gerar lista de possíveis horários de início (em intervalos de 30 minutos)
    const possiveisHorarios: number[] = [];
    
    // Para cada slot de disponibilidade do dia
    disponibilidadePorDia[diaSemana].forEach(slot => {
      // Gerar horários a cada 30 minutos dentro deste slot
      // Garantir que há pelo menos a duração da sessão disponível até o fim do slot
      for (let minuto = slot.startMinutes; minuto <= slot.endMinutes - duracao; minuto += 30) {
        possiveisHorarios.push(minuto);
      }
    });
    
    if (possiveisHorarios.length === 0) {
      // console.log(`Nenhum horário possível para agendar no dia ${dateKey} (${diaSemana})`);
      return false;
    }
    
    // Embaralhar os horários possíveis para não privilegiar sempre os mesmos horários
    possiveisHorarios.sort(() => Math.random() - 0.5);
    
    // Tentar agendar em um dos horários possíveis
    for (const inicioMinutos of possiveisHorarios) {
      if (verificarDisponibilidade(diaSemana, inicioMinutos, duracao, dateKey)) {
        // Converter minutos para hora:minuto
        const horaInicio = parseMinutesToTime(inicioMinutos);
        
        // Criar data ISO completa com horário
        const dataISO = new Date(date);
        const [horas, minutos] = horaInicio.split(':').map(Number);
        dataISO.setHours(horas, minutos, 0, 0);
        
        // Registrar horário como ocupado
        registrarHorarioOcupado(
          diaSemana, 
          inicioMinutos, 
          duracao, 
          dateKey,
          assunto.discipline.id,
          assunto.subjectId,
          tipo
        );
        
        // Criar título baseado no tipo de sessão
        const sessionType = SESSION_TYPES[tipo].name;
        const title = `${sessionType}: ${assunto.discipline.name} - ${assunto.subjectName}`;
        
        // Criar nova sessão
        const novaSessao: StudySessionCreate = {
          studyPlanId: planoId,
          title: title,
          disciplineName: assunto.discipline.name,
          subjectName: assunto.subjectName,
          scheduledDate: dataISO.toISOString(),
          duration: duracao,
          completed: false,
          notes: `Sessão de ${sessionType.toLowerCase()} gerada automaticamente para "${assunto.subjectName}" da disciplina "${assunto.discipline.name}"`
        };
        
        sessoes.push(novaSessao);
        
        // Se for sessão de estudo, agendar revisões futuras
        if (tipo === 'ESTUDO') {
          // Atualizar última data de estudo
          assunto.lastStudyDate = new Date(dataISO);
          
          // Programar revisões futuras
          assunto.pendingRevisions = assunto.revisionIntervals.map(dias => {
            const dataRevisao = new Date(dataISO);
            dataRevisao.setDate(dataRevisao.getDate() + dias);
            return dataRevisao;
          });
          
          // Reduzir horas restantes (apenas para sessão de estudo)
          assunto.remainingHours -= 1; // Sessão de estudo = 1 hora
        }
        
        console.log(`Sessão de ${tipo} agendada para ${assunto.subjectName} em ${dataISO.toISOString()}`);
        return true;
      }
    }
    
    // console.log(`Não foi possível agendar a sessão para ${assunto.subjectName} no dia ${dateKey}`);
    return false; // Não foi possível agendar a sessão neste dia
  };
  
  // Loop principal: percorrer todos os dias entre início e fim do plano
  const currentDate = new Date(startDate);
  
  console.log("Disponibilidade por dia:", Object.keys(disponibilidadePorDia).length, "dias configurados");
  
  let diasProcessados = 0;
  while (currentDate <= endDate) {
    diasProcessados++;
    if (diasProcessados > 100) {
      console.log("Alerta: Mais de 100 dias processados, verificar loop infinito!");
      break; // Segurança para evitar loop infinito
    }
    
    const dateKey = currentDate.toISOString().split('T')[0];
    const diaSemana = currentDate.getDay();
    
    // Verificar se este dia da semana tem alguma disponibilidade
    if (!disponibilidadePorDia[diaSemana] || disponibilidadePorDia[diaSemana].length === 0) {
      // console.log(`Pulando dia ${dateKey} (${diaSemana}) por falta de disponibilidade`);
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // Primeiro, verificar as revisões pendentes para esta data
    let revisoesCriadas = 0;
    for (const assunto of assuntos) {
      // Verificar se o assunto tem revisões pendentes para esta data
      const revisoesPendentesIndex = assunto.pendingRevisions.findIndex(
        dataRevisao => dataRevisao.toISOString().split('T')[0] === dateKey
      );
      
      if (revisoesPendentesIndex >= 0) {
        // Tenta agendar a revisão
        const revisaoAgendada = agendarSessao(
          currentDate, 
          assunto, 
          'REVISAO',
          revisoesPendentesIndex + 1
        );
        
        // Se conseguiu agendar, remove da lista de pendentes
        if (revisaoAgendada) {
          assunto.pendingRevisions.splice(revisoesPendentesIndex, 1);
          revisoesCriadas++;
        }
      }
    }
    
    // Depois, agendar novas sessões de estudo para assuntos que ainda precisam
    // Ordenar por prioridade (assuntos com mais prioridade primeiro)
    const assuntosParaEstudo = assuntos
      .filter(a => a.remainingHours > 0)
      .sort((a, b) => b.priority - a.priority);
    
    // console.log(`${assuntosParaEstudo.length} assuntos para estudo no dia ${dateKey}`);
    
    // Agendar estudo para os assuntos com horas restantes
    let estudiosCriados = 0;
    for (const assunto of assuntosParaEstudo) {
      // Verificar se já passou tempo suficiente desde o último estudo (pelo menos 1 dia)
      const podeDarAula = !assunto.lastStudyDate || 
        Math.floor((currentDate.getTime() - assunto.lastStudyDate.getTime()) / (24 * 60 * 60 * 1000)) >= 1;
      
      if (podeDarAula) {
        const agendado = agendarSessao(currentDate, assunto, 'ESTUDO');
        if (agendado) estudiosCriados++;
      }
    }
    
    // console.log(`Dia ${dateKey}: ${revisoesCriadas} revisões e ${estudiosCriados} estudos agendados`);
    
    // Avançar para o próximo dia
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`Total de dias processados: ${diasProcessados}`);
  console.log(`Total de sessões geradas: ${sessoes.length}`);
  
  // Ordenar sessões por data
  sessoes.sort((a, b) => {
    if (!a.scheduledDate || !b.scheduledDate) return 0;
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });
  
  return sessoes;
} 