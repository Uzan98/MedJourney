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
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function MaisPage() {
  const { user } = useAuth();
  
  const menuItems = [
    {
      path: "/banco-questoes",
      label: "Banco de Questões",
      icon: <FileQuestion className="h-6 w-6" />,
      description: "Pratique com questões"
    },
    {
      path: "/simulados",
      label: "Simulados",
      icon: <ClipboardList className="h-6 w-6" />,
      description: "Teste seus conhecimentos"
    },
    {
      path: "/comunidade",
      label: "Comunidade",
      icon: <Users className="h-6 w-6" />,
      description: "Conecte-se com outros estudantes"
    },
    {
      path: "/comunidade/feed",
      label: "Feed",
      icon: <MessageSquare className="h-6 w-6" />,
      description: "Atualizações da comunidade"
    },
    {
      path: "/estudos",
      label: "Painel de Estudos",
      icon: <Brain className="h-6 w-6" />,
      description: "Organize seus estudos"
    },
    {
      path: "/planejamento/inteligente",
      label: "Planejamento IA",
      icon: <Sparkles className="h-6 w-6" />,
      description: "Planejamento com IA"
    },
    {
      path: "/comunidade/grupos-estudos",
      label: "Grupos de Estudo",
      icon: <GraduationCap className="h-6 w-6" />,
      description: "Estude em grupo"
    },
    {
      path: "/perfil",
      label: "Perfil",
      icon: <User className="h-6 w-6" />,
      description: "Gerencie seu perfil"
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
            className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="bg-blue-50 p-3 rounded-full mb-2">
              {React.cloneElement(item.icon, { className: "h-6 w-6 text-blue-600" })}
            </div>
            <span className="font-medium text-sm text-center">{item.label}</span>
            <span className="text-xs text-gray-500 text-center mt-1">{item.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
} 