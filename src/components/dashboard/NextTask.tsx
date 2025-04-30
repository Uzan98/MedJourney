"use client";

import React from 'react';
import { CalendarClock, ChevronRight, ClipboardList } from 'lucide-react';
import { Card } from '../ui/Card';
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
        className="h-full"
        icon={<ClipboardList className="h-5 w-5" />}
        showOptions
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CalendarClock className="h-12 w-12 text-blue-200 mb-2" />
          <p className="text-gray-500">Não há tarefas pendentes</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Próxima Tarefa" 
      className="h-full"
      icon={<ClipboardList className="h-5 w-5" />}
      showOptions
    >
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-gray-800 text-lg">{task.title}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${
            task.priority === 'high' 
              ? 'bg-red-100 text-red-800' 
              : task.priority === 'medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-blue-100 text-blue-800'
          }`}>
            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
          </span>
        </div>
        
        {task.description && (
          <p className="text-gray-600 text-sm">{task.description}</p>
        )}
        
        <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            <CalendarClock className="h-4 w-4 mr-1 text-gray-400" />
            <span>Vence: {formatDate(task.dueDate)}</span>
          </div>
          
          <button 
            className="flex items-center text-blue-600 text-sm hover:text-blue-800 transition-colors"
            aria-label="Ver detalhes da tarefa"
            tabIndex={0}
          >
            Ver detalhes
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default NextTask; 