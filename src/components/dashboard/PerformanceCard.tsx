"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Clock, Target, Award, Brain } from 'lucide-react';
import { PerformanceMetrics } from '../../lib/types/dashboard';

interface PerformanceCardProps {
  metrics?: PerformanceMetrics;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({ 
  metrics = {
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
  }
}) => {
  return (
    <Card className="overflow-hidden bg-white border">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">Desempenho</h3>
          <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            Esta semana
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Focus Score */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Score de Foco</span>
              </div>
              <span className="text-lg font-bold text-purple-700">{metrics.focusScore}<span className="text-sm text-gray-500">/100</span></span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${metrics.focusScore}%` }}
              ></div>
            </div>
          </div>
          
          {/* Efficiency Rate */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Taxa de Eficiência</span>
              </div>
              <span className="text-lg font-bold text-blue-700">{metrics.efficiencyRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${metrics.efficiencyRate}%` }}
              ></div>
            </div>
          </div>
          
          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Horas Hoje</span>
              </div>
              <p className="text-xl font-bold text-gray-800">{metrics.hoursToday}h</p>
              <div className="flex items-center gap-1 mt-1">
                {metrics.hoursChange > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">+{metrics.hoursChange}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-xs text-red-600">{metrics.hoursChange}%</span>
                  </>
                )}
                <span className="text-xs text-gray-500">vs. semana passada</span>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Tarefas</span>
              </div>
              <p className="text-xl font-bold text-gray-800">{metrics.completedTasks}/{metrics.completedTasks + metrics.totalTasksPending}</p>
              <div className="flex items-center gap-1 mt-1">
                {metrics.tasksChange > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">+{metrics.tasksChange}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-xs text-red-600">{metrics.tasksChange}%</span>
                  </>
                )}
                <span className="text-xs text-gray-500">vs. semana passada</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PerformanceCard; 