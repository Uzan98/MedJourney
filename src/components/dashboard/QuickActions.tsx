"use client";

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Play, BookOpen, Plus, FileSpreadsheet, Sparkles, Clock, CheckCircle, X, Calendar, Target, CheckSquare, CalendarClock, Loader2, GraduationCap, Search } from 'lucide-react';
import Link from 'next/link';
import { StudySession } from '../../lib/types/dashboard';
import { formatDate, formatTime } from '../../lib/utils';

// Componente para o Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
}

const Modal = ({ isOpen, onClose, title, children, icon, iconColor = 'bg-indigo-600' }: ModalProps) => {
  if (!isOpen) return null;
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Fecha o modal apenas se o clique for diretamente no backdrop
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`p-2 rounded-md text-white ${iconColor}`}>
                  {icon}
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
};

// Componente para iniciar estudo avulso
const StartStudyModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [duration, setDuration] = useState('30');
  
  const subjects = [
    { id: '1', name: 'Anatomia', color: 'bg-red-500' },
    { id: '2', name: 'Fisiologia', color: 'bg-blue-500' },
    { id: '3', name: 'Bioquímica', color: 'bg-green-500' },
    { id: '4', name: 'Patologia', color: 'bg-purple-500' },
    { id: '5', name: 'Farmacologia', color: 'bg-yellow-600' },
  ];
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Iniciando estudo:', { selectedSubject, duration });
    // Aqui seria implementada a lógica para iniciar o estudo
    alert(`Sessão de estudo iniciada: ${selectedSubject} por ${duration} minutos`);
    onClose();
  };
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Iniciar Estudo Avulso" 
      icon={<Play className="h-5 w-5" />}
      iconColor="bg-blue-600"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disciplina
            </label>
            <select
              className="w-full border border-gray-300 rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              required
            >
              <option value="">Selecione uma disciplina</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.name}>{subject.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duração (minutos)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex-1 accent-blue-600"
              />
              <span className="font-medium text-gray-800 min-w-[40px] text-right">{duration} min</span>
            </div>
          </div>
          
          <div className="mt-6 flex items-center p-3 bg-blue-50 text-blue-800 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-sm">Sessão cronometrada de <span className="font-bold">{duration} minutos</span> para <span className="font-bold">{selectedSubject || 'a disciplina selecionada'}</span></p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Play className="h-4 w-4" /> 
            Iniciar sessão
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Componente para nova tarefa
const NewTaskModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  
  const subjects = [
    { id: '1', name: 'Anatomia', color: 'bg-red-500' },
    { id: '2', name: 'Fisiologia', color: 'bg-blue-500' },
    { id: '3', name: 'Bioquímica', color: 'bg-green-500' },
    { id: '4', name: 'Patologia', color: 'bg-purple-500' },
    { id: '5', name: 'Farmacologia', color: 'bg-yellow-600' },
  ];
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Nova tarefa:', { title, description, subject, dueDate, priority });
    // Aqui seria implementada a lógica para salvar a tarefa
    alert(`Tarefa criada: ${title}`);
    onClose();
  };
  
  // Definir data mínima como hoje
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Nova Tarefa" 
      icon={<CheckSquare className="h-5 w-5" />}
      iconColor="bg-purple-600"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Revisar capítulo de Neuroanatomia"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais da tarefa"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disciplina
              </label>
              <select
                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data limite
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={today}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prioridade
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-md border ${priority === 'low' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setPriority('low')}
              >
                Baixa
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-md border ${priority === 'medium' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setPriority('medium')}
              >
                Média
              </button>
              <button
                type="button"
                className={`flex-1 py-2 px-3 rounded-md border ${priority === 'high' ? 'bg-red-100 border-red-300 text-red-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                onClick={() => setPriority('high')}
              >
                Alta
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> 
            Adicionar tarefa
          </button>
        </div>
      </form>
    </Modal>
  );
};

type ActionType = {
  title: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
  onClick: (() => void) | null;
  href: string | null;
};

interface QuickActionsProps {
  studySessions?: StudySession[];
  onStartSession?: (session: StudySession) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ 
  studySessions = [], 
  onStartSession 
}: QuickActionsProps) => {
  const [showStartStudyModal, setShowStartStudyModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  const actions: ActionType[] = [
    {
      title: 'Iniciar Estudo',
      description: 'Comece uma sessão rápida',
      icon: <Play className="h-5 w-5" />,
      color: 'from-blue-500 to-blue-600',
      onClick: () => setShowStartStudyModal(true),
      href: null,
    },
    {
      title: 'Estudo Programado',
      description: 'Próxima sessão no plano',
      icon: <BookOpen className="h-5 w-5" />,
      color: 'from-green-500 to-green-600',
      onClick: null,
      href: '/planejamento',
    },
    {
      title: 'Nova Tarefa',
      description: 'Adicionar uma pendência',
      icon: <Plus className="h-5 w-5" />,
      color: 'from-purple-500 to-purple-600',
      onClick: () => setShowNewTaskModal(true),
      href: null,
    },
    {
      title: 'Simulado',
      description: 'Testar conhecimentos',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      color: 'from-orange-500 to-orange-600',
      onClick: null,
      href: '/simulados/novo',
    },
  ];

  return (
    <>
      <Card className="border-0 overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md">
        <div className="relative z-10 p-2">
          <div className="flex items-center gap-3 text-white mb-5">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Ações Rápidas</h3>
              <p className="text-blue-100 text-sm mt-1">
                Utilize os atalhos para acessar funcionalidades principais
              </p>
            </div>
      </div>
      
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          action.href ? (
            <Link
              key={index}
              href={action.href}
                  className="group bg-white/10 backdrop-blur-sm hover:bg-white/15 rounded-xl p-4 text-white transition-all duration-200 hover:shadow-lg border border-white/20 hover:border-white/30 flex flex-col"
              aria-label={action.title}
              tabIndex={0}
            >
                  <div className={`rounded-lg p-3 mb-3 bg-gradient-to-br ${action.color} shadow-sm`}>
              {action.icon}
                  </div>
                  <h4 className="font-semibold text-white group-hover:text-white/90">{action.title}</h4>
                  {action.description && (
                    <p className="text-xs text-blue-100 mt-1">{action.description}</p>
                  )}
            </Link>
          ) : (
            <button
              key={index}
              onClick={action.onClick as () => void}
                  className="group bg-white/10 backdrop-blur-sm hover:bg-white/15 rounded-xl p-4 text-white transition-all duration-200 hover:shadow-lg border border-white/20 hover:border-white/30 flex flex-col text-left"
              aria-label={action.title}
              tabIndex={0}
            >
                  <div className={`rounded-lg p-3 mb-3 bg-gradient-to-br ${action.color} shadow-sm`}>
              {action.icon}
                  </div>
                  <h4 className="font-semibold text-white group-hover:text-white/90">{action.title}</h4>
                  {action.description && (
                    <p className="text-xs text-blue-100 mt-1">{action.description}</p>
                  )}
            </button>
          )
        ))}
          </div>
      </div>
    </Card>

      {/* Modais */}
      <StartStudyModal isOpen={showStartStudyModal} onClose={() => setShowStartStudyModal(false)} />
      <NewTaskModal isOpen={showNewTaskModal} onClose={() => setShowNewTaskModal(false)} />
    </>
  );
};

export default QuickActions; 