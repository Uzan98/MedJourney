// src/mocks/db-mocks.js
// Mocks para substituir consultas ao banco de dados durante o build

// Mock para tarefas
export const tasksMock = {
  completedTasks: 8,
  pendingTasks: 3,
  totalTasks: 11,
  completionRate: 72.7
};

// Mock para estatísticas de estudo
export const studyStatsMock = {
  totalMinutes: 1450,
  studyStreak: 9,
  focusScore: 87,
  lastWeekHours: [2, 3, 1.5, 4, 2.5, 1, 0],
  lastSessionDate: new Date().toISOString(),
  dailyGoalAchievement: 85
};

// Mock para métricas de desempenho
export const performanceMock = {
  weeklyProgress: [
    { day: 'Dom', tasks: 2, hours: 1.5 },
    { day: 'Seg', tasks: 5, hours: 3.2 },
    { day: 'Ter', tasks: 3, hours: 2.7 },
    { day: 'Qua', tasks: 7, hours: 4.1 },
    { day: 'Qui', tasks: 4, hours: 2.8 },
    { day: 'Sex', tasks: 6, hours: 3.5 },
    { day: 'Sáb', tasks: 1, hours: 0.8 }
  ],
  subjectPerformance: [
    { subject: 'Anatomia', score: 78 },
    { subject: 'Fisiologia', score: 85 },
    { subject: 'Patologia', score: 72 },
    { subject: 'Farmacologia', score: 91 },
    { subject: 'Microbiologia', score: 80 }
  ]
};

// Mock para calendário e eventos
export const calendarMock = {
  events: [
    { id: 1, title: 'Estudo de Anatomia', start: new Date().toISOString(), duration: 120 },
    { id: 2, title: 'Revisão de Fisiologia', start: new Date(Date.now() + 86400000).toISOString(), duration: 90 },
    { id: 3, title: 'Prova de Patologia', start: new Date(Date.now() + 172800000).toISOString(), duration: 180 }
  ]
};

// Função auxiliar para simular um resultado de consulta ao banco de dados
export function mockDbQuery(queryType, params = {}) {
  switch (queryType) {
    case 'tasks':
      return Promise.resolve(tasksMock);
    case 'studyStats':
      return Promise.resolve(studyStatsMock);
    case 'performance':
      return Promise.resolve(performanceMock);
    case 'calendar':
      return Promise.resolve(calendarMock);
    default:
      return Promise.resolve({ message: 'Mock data not available for this query type' });
  }
}

// Interceptor para substituir chamadas em ambiente de build/teste
export function setupMockDb(isTest = false) {
  // Esta função seria usada para configurar interceptores em ambiente de teste
  console.log('Mock DB configured for', isTest ? 'testing' : 'build');
  return {
    query: mockDbQuery,
    disconnect: () => console.log('Mock DB disconnected')
  };
} 