"use client";

import React from 'react';
import { Card } from '../ui/Card';
import { Play, BookOpen, Plus, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

type ActionType = {
  title: string;
  icon: React.ReactNode;
  color: string;
  onClick: (() => void) | null;
  href: string | null;
};

const QuickActions = () => {
  const actions: ActionType[] = [
    {
      title: 'Iniciar Estudo Avulso',
      icon: <Play className="h-5 w-5" />,
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => console.log('Iniciar estudo avulso'),
      href: null,
    },
    {
      title: 'Próximo Estudo Programado',
      icon: <BookOpen className="h-5 w-5" />,
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => console.log('Próximo estudo programado'),
      href: null,
    },
    {
      title: 'Nova Tarefa',
      icon: <Plus className="h-5 w-5" />,
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => console.log('Nova tarefa'),
      href: null,
    },
    {
      title: 'Novo Simulado',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: null,
      href: '/simulados/novo',
    },
  ];

  return (
    <Card className="bg-gradient-to-r from-blue-500 to-blue-400 border-0 overflow-hidden">
      <div className="text-white">
        <h3 className="text-xl font-bold">Quer ganhar tempo?</h3>
        <p className="text-blue-100 mt-2">
          Utilize os atalhos rápidos para acessar as funcionalidades mais comuns
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {actions.map((action, index) => (
          action.href ? (
            <Link
              key={index}
              href={action.href}
              className={`flex items-center justify-center gap-3 py-4 px-5 rounded-md text-white font-medium transition-colors ${action.color} shadow-sm hover:shadow-md`}
              aria-label={action.title}
              tabIndex={0}
            >
              {action.icon}
              <span>{action.title}</span>
            </Link>
          ) : (
            <button
              key={index}
              onClick={action.onClick as () => void}
              className={`flex items-center justify-center gap-3 py-4 px-5 rounded-md text-white font-medium transition-colors ${action.color} shadow-sm hover:shadow-md`}
              aria-label={action.title}
              tabIndex={0}
            >
              {action.icon}
              <span>{action.title}</span>
            </button>
          )
        ))}
      </div>
    </Card>
  );
};

export default QuickActions; 