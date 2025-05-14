"use client";

import React from 'react';
import { CalendarClock, ChevronRight, ClipboardList, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Task } from '../../lib/types/dashboard';
import { formatDate } from '../../lib/utils';

interface NextTaskProps {
  task: Task | null;
}

const NextTask = ({ task }: NextTaskProps) => {
  if (!task) {
    return (
      <Card 
        title="Próxima Tarefa" 
        className="h-full bg-gradient-to-br from-purple-50 to-indigo-50 border-0 shadow-md"
        icon={<ClipboardList className="h-5 w-5 text-purple-600" />}
        showOptions
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="p-4 bg-white rounded-full shadow-sm mb-3">
            <CalendarClock className="h-10 w-10 text-purple-300" />
          </div>
          <p className="text-gray-600 font-medium">Sem tarefas pendentes</p>
          <p className="text-sm text-gray-500 mt-1">Seus estudos estão em dia!</p>
        </div>
      </Card>
    );
  }

  // Funções para exibição de prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'from-red-500 to-red-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      case 'low': return 'from-blue-500 to-blue-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Normal';
    }
  };

  return (
    <Card 
      title="Próxima Tarefa" 
      className="h-full bg-gradient-to-br from-purple-50 to-indigo-50 border-0 shadow-md"
      icon={<ClipboardList className="h-5 w-5 text-purple-600" />}
      showOptions
    >
      <div className="space-y-4">
        <div className="flex justify-between items-start gap-3">
          <h3 className="font-semibold text-gray-800 text-lg">{task.title}</h3>
          <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${getPriorityColor(task.priority)} text-white font-medium shadow-sm`}>
            {getPriorityText(task.priority)}
          </span>
        </div>
        
        {task.description && (
          <p className="text-gray-600 text-sm bg-white p-3 rounded-lg shadow-sm">{task.description}</p>
        )}
        
        <div className="flex flex-col gap-3 bg-white p-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CalendarClock className="h-4 w-4 text-purple-500" />
            <span>Vence: <strong>{formatDate(task.dueDate)}</strong></span>
          </div>

          {task.discipline && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span>Disciplina: <strong>{task.discipline}</strong></span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Concluir
          </button>
          
          <button 
            className="flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-md text-sm transition-colors"
          >
            Ver detalhes
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default NextTask; 