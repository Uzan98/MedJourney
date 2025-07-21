/**
 * Tipos e interfaces para o módulo de planejamento de estudos
 */

// Status possíveis para um plano de estudos
export type PlanStatus = 'ativo' | 'pausado' | 'concluido';

// Prioridade para disciplinas e assuntos
export type Priority = 'alta' | 'média' | 'baixa';

// Interface para disponibilidade de tempo para estudo
export interface TimeAvailability {
  dayOfWeek: number; // 0-6, onde 0 é domingo
  startTime: string; // formato "HH:MM"
  endTime: string; // formato "HH:MM"
  durationMinutes: number; // calculado automaticamente
}

// Interface para assunto dentro de um plano
export interface PlanSubject {
  id: number;
  name: string;
  hours: number;
  priority: Priority;
  completed?: boolean;
  progress?: number; // 0-100
  difficulty?: string; // baixa, média, alta
  importance?: string; // baixa, média, alta
}

// Interface para disciplina dentro de um plano
export interface PlanDiscipline {
  id: number;
  name: string;
  subjects: PlanSubject[];
  priority?: Priority;
  color?: string;
  progress?: number; // 0-100
  completed?: boolean;
}

// Interface para sessão de estudo agendada
export interface PlanSession {
  id: string;
  disciplineId: number;
  subjectId?: number;
  date: Date | string;
  duration: number; // em minutos
  completed: boolean;
  actualDuration?: number; // em minutos
  notes?: string;
}

// Status de sincronização
export interface SyncStatus {
  synced: boolean;
  lastSyncedAt?: Date | string;
  syncFailed?: boolean;
  errorMessage?: string;
  pendingSync?: boolean;
  lastSyncDate?: Date | string | null;
}

// Interface principal do plano de estudos
export interface StudyPlan {
  id: string;            // ID local (usado antes da sincronização)
  backendId?: number;    // ID do backend após sincronização
  name: string;          // Nome do plano
  description?: string;  // Descrição opcional
  startDate?: Date | string;      // Data de início 
  endDate?: Date | string;        // Data de término
  status: PlanStatus;    // Status do plano
  disciplines: PlanDiscipline[]; // Disciplinas incluídas no plano
  schedule?: {           // Cronograma opcional
    sessions: PlanSession[];
  };
  synchronizationStatus: SyncStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId?: string;
  sessions?: StudySession[];
}

// Interface para criar um novo plano
export interface StudyPlanCreate {
  name: string;
  description?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: PlanStatus;
  disciplines: {
    id: number;
    subjects?: {
      id: number;
      hours: number;
      priority?: Priority;
    }[];
    priority?: Priority;
  }[];
}

// Interface para atualizar um plano existente
export interface StudyPlanUpdate {
  id: string;
  backendId?: number;
  name?: string;
  description?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: PlanStatus;
  disciplines?: {
    id: number;
    subjects?: {
      id: number;
      hours?: number;
      priority?: Priority;
      completed?: boolean;
      progress?: number;
    }[];
    priority?: Priority;
  }[];
}

// Interface para criar uma sessão de estudo
export interface StudySessionCreate {
  studyPlanId: string;
  title: string;
  disciplineName?: string;
  subjectName?: string;
  scheduledDate?: string;
  duration?: number;
  completed?: boolean;
  notes?: string;
}

// Interface para atualizar uma sessão de estudo
export interface StudySessionUpdate {
  id: string;
  studyPlanId?: string;
  title?: string;
  disciplineName?: string;
  subjectName?: string;
  scheduledDate?: string;
  duration?: number;
  completed?: boolean;
  actualDuration?: number;
  notes?: string;
}

// Resultado de sincronização
export interface SyncResult {
  success: boolean;
  plansCreated: number;
  plansUpdated: number;
  plansDeleted: number;
  errors?: string[];
}

// Resultado de processamento de fila
export interface ProcessingResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

// Estrutura das filas de sincronização
export interface SyncQueues {
  create: string[]; // IDs de planos para criar no backend
  update: string[]; // IDs de planos para atualizar no backend
  delete: number[]; // IDs de backend para excluir
  timestamps: Record<string, number>; // Timestamp de quando cada item foi adicionado à fila
}

export interface StudySession {
  id: string;
  userId?: string;
  studyPlanId: string;
  title: string;
  disciplineName?: string;
  subjectName?: string;
  scheduledDate?: string | Date;
  duration?: number; // em minutos
  completed: boolean;
  actualDuration?: number;
  notes?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  syncStatus?: SyncStatus;
} 