"use client";

import React from 'react';
import { Clock, CheckCircle, Calendar, BarChart2, Zap, Activity } from 'lucide-react';
import { Card, CardStat, CardGrid } from '../ui/Card';
import { StudyMetrics } from '../../lib/types/dashboard';

interface StudySummaryProps {
  metrics: StudyMetrics;
}

const StudySummary = ({ metrics }: StudySummaryProps) => {
  // Convert numeric trends to string trends for the CardStat component
  const getStringTrend = (value: number): 'up' | 'down' | 'neutral' => {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  };

  // Função para converter minutos em formato de horas
  const formatMinutesToHours = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}min`;
  };

  return (
    <Card 
      title="Resumo de Estudos" 
      className="h-full"
      icon={<BarChart2 className="h-5 w-5" />}
      showOptions
    >
      <CardGrid columns={3}>
        <CardStat 
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          label="Tempo esta semana"
          value={formatMinutesToHours(metrics.hoursThisWeek)}
          trend={getStringTrend(metrics.hoursChange)}
          trendLabel={metrics.hoursChange > 0 ? `+${metrics.hoursChange}%` : `${metrics.hoursChange}%`}
        />
        <CardStat 
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          label="Tarefas concluídas"
          value={metrics.completedTasks}
          trend={getStringTrend(metrics.tasksChange)}
          trendLabel={metrics.tasksChange > 0 ? `+${metrics.tasksChange}%` : `${metrics.tasksChange}%`}
        />
        <CardStat 
          icon={<Calendar className="h-5 w-5 text-purple-500" />}
          label="Sequência atual"
          value={`${metrics.streak} dias`}
          trend={getStringTrend(metrics.streakChange)}
          trendLabel={metrics.streakChange > 0 ? `+${metrics.streakChange}` : `${metrics.streakChange}`}
        />
        <CardStat 
          icon={<Zap className="h-5 w-5 text-yellow-500" />}
          label="Pontuação de Foco"
          value={`${metrics.focusScore}/100`}
          trend="neutral"
        />
        <CardStat 
          icon={<Activity className="h-5 w-5 text-red-500" />}
          label="Taxa de Eficiência"
          value={`${metrics.efficiencyRate}%`}
          trend="neutral"
        />
      </CardGrid>
    </Card>
  );
};

export default StudySummary; 