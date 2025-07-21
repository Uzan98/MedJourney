export interface StudyMetrics {
  hoursToday: number;
  hoursThisWeek: number;
  hoursChange: number;
  completedTasks: number;
  totalTasksCompleted: number;
  totalTasksPending: number;
  tasksChange: number;
  streak: number;
  streakChange: number;
  focusScore: number;
  efficiencyRate: number;
}

// Alias para compatibilidade com componentes que usam PerformanceMetrics
export interface PerformanceMetrics extends StudyMetrics {}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  discipline?: string;
}

export interface StudySession {
  id: string;
  title: string;
  disciplineName: string;
  scheduledDate: Date | string;
  duration: number; // in minutes
  completed?: boolean;
  type?: 'new-content' | 'revision' | 'practice' | 'exam-prep' | 'revisão' | 'novo conteúdo' | 'prática' | 'aplicação';
  actualDuration?: number;
  notes?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  disciplineName?: string;
}

// Alias para compatibilidade com componentes que usam StudyNote
export interface StudyNote extends Note {}

export interface StudyData {
  date: string;
  minutes: number;
}

export interface SimulatedTest {
  id: string;
  title: string;
  date: Date;
  correctAnswers: number;
  totalQuestions: number;
} 