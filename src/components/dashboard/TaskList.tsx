"use client";

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { 
  CheckCircle, Clock, ChevronRight, Filter, 
  CheckSquare, AlertTriangle, ArrowUpCircle
} from 'lucide-react';
import { Task } from '../../lib/types/dashboard';
import Link from 'next/link';

interface TaskListProps {
  tasks?: Task[];
}

const TaskList: React.FC<TaskListProps> = ({ 
  tasks = [
    {
      id: '1',
      title: 'Revisar capítulo sobre Sistema Respiratório',
      description: 'Foco nos mecanismos de ventilação e trocas gasosas',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      status: 'pending',
      priority: 'high',
      discipline: 'Fisiologia'
    },
    {
      id: '2',
      title: 'Resolver questões de Farmacologia',
      description: 'Lista de exercícios sobre anti-inflamatórios',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'in-progress',
      priority: 'medium',
      discipline: 'Farmacologia'
    },
    {
      id: '3',
      title: 'Preparar resumo de Bioquímica',
      description: 'Metabolismo de lipídios',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'pending',
      priority: 'low',
      discipline: 'Bioquímica'
    }
  ] 
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress'>('all');
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };
  
  const isOverdue = (date: Date) => {
    return date < new Date();
  };
  
  const getDaysLeft = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-orange-600 bg-orange-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-orange-600" />;
      default:
        return <CheckSquare className="h-5 w-5 text-gray-400" />;
    }
  };
  
  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });
  
  // Ordenar tarefas: primeiro por status, depois por data de vencimento, depois por prioridade
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Primeiro, classificar por status (em andamento primeiro, depois pendentes)
    if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
    if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;
    
    // Depois, classificar por data de vencimento (mais próximas primeiro)
    const dateComparison = a.dueDate.getTime() - b.dueDate.getTime();
    if (dateComparison !== 0) return dateComparison;
    
    // Por último, classificar por prioridade (alta primeiro)
    const priorityMap: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });
  
  return (
    <Card className="overflow-hidden bg-white border">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Tarefas</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-gray-500" />
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-sm text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
              >
                <option value="all">Todas</option>
                <option value="pending">Pendentes</option>
                <option value="in-progress">Em andamento</option>
              </select>
            </div>
            <Link 
              href="/tarefas"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              Ver todas <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        
        {sortedTasks.length === 0 ? (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-3">
              <CheckSquare className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-gray-600 font-medium">Nenhuma tarefa encontrada</p>
            <p className="text-sm text-gray-500 mt-1">
              {filter === 'all' 
                ? 'Adicione sua primeira tarefa'
                : filter === 'pending' 
                  ? 'Não há tarefas pendentes'
                  : 'Não há tarefas em andamento'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <div 
                key={task.id} 
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-gray-800">{task.title}</h4>
                      <div className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'high' && <ArrowUpCircle className="h-3 w-3 inline mr-1" />}
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1 mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        {task.discipline && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {task.discipline}
                          </span>
                        )}
                        <span className={`text-xs flex items-center gap-1 ${isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-500'}`}>
                          {isOverdue(task.dueDate) ? (
                            <>
                              <AlertTriangle className="h-3 w-3" />
                              Atrasada: {formatDate(task.dueDate)}
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              {getDaysLeft(task.dueDate) === 0 
                                ? 'Hoje' 
                                : getDaysLeft(task.dueDate) === 1 
                                  ? 'Amanhã' 
                                  : `${getDaysLeft(task.dueDate)} dias: ${formatDate(task.dueDate)}`}
                            </>
                          )}
                        </span>
                      </div>
                      
                      <button 
                        className="p-1.5 rounded-full text-gray-500 hover:text-green-600 hover:bg-green-50"
                        aria-label="Marcar como concluída"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TaskList; 