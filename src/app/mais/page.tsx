"use client";

import React from 'react';
import Link from 'next/link';
import { 
  FileQuestion, 
  ClipboardList, 
  Users, 
  BarChart2, 
  Settings,
  User,
  Brain,
  GraduationCap,
  BookText,
  Award,
  MessageSquare,
  Sparkles,
  CheckSquare,
  Layers,
  School
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function MaisPage() {
  const { user } = useAuth();
  
  const menuItems = [
    {
      path: "/banco-questoes",
      label: "Banco de Questões",
      icon: <FileQuestion className="h-6 w-6" />,
      description: "Pratique com questões",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      path: "/simulados",
      label: "Simulados",
      icon: <ClipboardList className="h-6 w-6" />,
      description: "Teste seus conhecimentos",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      path: "/flashcards",
      label: "Flashcards",
      icon: <Layers className="h-6 w-6" />,
      description: "Estude com cartões",
      bgColor: "bg-teal-50",
      iconColor: "text-teal-600"
    },
    {
      path: "/estudos",
      label: "Painel de Estudos",
      icon: <Brain className="h-6 w-6" />,
      description: "Organize seus estudos",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      path: "/tarefas",
      label: "Painel de Tarefas",
      icon: <CheckSquare className="h-6 w-6" />,
      description: "Gerencie suas tarefas",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600"
    },
    {
      path: "/planejamento/inteligente",
      label: "Planejamento IA",
      icon: <Sparkles className="h-6 w-6" />,
      description: "Planejamento com IA",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600"
    },
    {
      path: "/comunidade/grupos-estudos",
      label: "Grupos de Estudo",
      icon: <GraduationCap className="h-6 w-6" />,
      description: "Estude em grupo",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600"
    },
    {
      path: "/minha-faculdade",
      label: "Minha Faculdade",
      icon: <School className="h-6 w-6" />,
      description: "Informações da faculdade",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600"
    },
    {
      path: "/perfil",
      label: "Perfil",
      icon: <User className="h-6 w-6" />,
      description: "Gerencie seu perfil",
      bgColor: "bg-pink-50",
      iconColor: "text-pink-600"
    }
  ];

  return (
    <div className="px-4 py-4 pb-24 md:pb-4">
      <h1 className="text-2xl font-bold mb-6">Mais opções</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {menuItems.map((item) => (
          <Link 
            href={item.path} 
            key={item.path}
            className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105"
          >
            <div className={`${item.bgColor} p-3 rounded-full mb-2`}>
              {React.cloneElement(item.icon, { className: `h-6 w-6 ${item.iconColor}` })}
            </div>
            <span className="font-medium text-sm text-center">{item.label}</span>
            <span className="text-xs text-gray-500 text-center mt-1">{item.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}