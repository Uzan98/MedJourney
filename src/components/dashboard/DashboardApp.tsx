"use client";

import React, { useState, useEffect } from 'react';
import { StudySession, Task, StudyNote, StudyMetrics } from '../../lib/types/dashboard';
import QuickActions from './QuickActions';
import NextStudySession from './NextStudySession';

const DashboardApp: React.FC = () => {
  // Estados compartilhados
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [metrics, setMetrics] = useState<StudyMetrics>({
    hoursToday: 2,
    hoursThisWeek: 14,
    hoursChange: 20,
    completedTasks: 8,
    totalTasksCompleted: 45,
    totalTasksPending: 3,
    tasksChange: 15,
    streak: 5,
    streakChange: 2,
    focusScore: 85,
    efficiencyRate: 78
  });
  const [loading, setLoading] = useState(true);
  
  // Carregar dados simulados
  useEffect(() => {
    setLoading(true);
    console.log("DashboardApp: Carregando dados...");
    
    // Simular carregamento de dados
    setTimeout(() => {
      // Sessões de estudo programadas
      const mockStudySessions: StudySession[] = [
        {
          id: '1',
          title: 'Revisão de Anatomia do Sistema Nervoso',
          disciplineName: 'Anatomia',
          scheduledDate: new Date(Date.now() + 1000 * 60 * 30), // 30 minutos no futuro
          duration: 60,
          type: 'revisão'
        },
        {
          id: '2',
          title: 'Estudo de Fisiologia Cardíaca',
          disciplineName: 'Fisiologia',
          scheduledDate: new Date(Date.now() + 1000 * 60 * 60 * 3), // 3 horas no futuro
          duration: 90,
          type: 'novo conteúdo'
        },
        {
          id: '3',
          title: 'Prática com Questões de Bioquímica',
          disciplineName: 'Bioquímica',
          scheduledDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 dia no futuro
          duration: 45,
          type: 'prática'
        },
        {
          id: '4',
          title: 'Revisão de Microbiologia',
          disciplineName: 'Microbiologia',
          scheduledDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 dias no futuro
          duration: 75,
          type: 'revisão'
        },
        {
          id: '5',
          title: 'Farmacologia Aplicada',
          disciplineName: 'Farmacologia',
          scheduledDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4), // 4 dias no futuro
          duration: 60,
          type: 'aplicação'
        }
      ];
      
      setStudySessions(mockStudySessions);
      setLoading(false);
      console.log("DashboardApp: Dados carregados com sucesso");
    }, 1000);
  }, []);
  
  // Função para iniciar uma sessão de estudo
  const handleStartSession = (session: StudySession) => {
    console.log("DashboardApp: Iniciando sessão de estudo:", session);
    alert(`Sessão de estudo iniciada: ${session.title} (${session.disciplineName}) - ${session.duration} minutos`);
    // Aqui você implementaria a integração com o componente de estudo
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 gap-6">
        <QuickActions 
          studySessions={studySessions}
          onStartSession={handleStartSession}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <NextStudySession 
              studySessions={studySessions}
              loading={loading}
              onStartSession={handleStartSession}
            />
          </div>
          
          <div className="space-y-6">
            {/* Conteúdo para futuras implementações */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardApp; 
