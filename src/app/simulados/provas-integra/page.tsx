'use client';

import React, { useEffect, useState } from 'react';
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  BookOpen, 
  GraduationCap, 
  Building, 
  Award,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Trophy,
  Target,
  Zap,
  Star,
  Crown,
  Flame,
  Rocket,
  Diamond
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';


// Metadata moved to layout.tsx for client component

const examTypes = [
  {
    id: 'residencia',
    title: 'Residência Médica',
    description: 'Provas completas de residência médica de diversas instituições',
    icon: GraduationCap,
    gradient: 'from-cyan-400 via-blue-500 to-purple-600',
    bgGradient: 'from-cyan-50 via-blue-50 to-purple-50',
    iconColor: 'text-cyan-600',
    glowColor: 'shadow-cyan-500/50',
    badge: 'ELITE',
    badgeColor: 'from-cyan-400 to-blue-500',
    count: 847,
    difficulty: 'Avançado',
    xp: 150
  },
  {
    id: 'concurso',
    title: 'Concursos Públicos',
    description: 'Provas de concursos públicos na área da saúde',
    icon: Building,
    gradient: 'from-emerald-400 via-green-500 to-teal-600',
    bgGradient: 'from-emerald-50 via-green-50 to-teal-50',
    iconColor: 'text-emerald-600',
    glowColor: 'shadow-emerald-500/50',
    badge: 'POPULAR',
    badgeColor: 'from-emerald-400 to-green-500',
    count: 623,
    difficulty: 'Intermediário',
    xp: 120
  },
  {
    id: 'enem',
    title: 'ENEM',
    description: 'Provas do Exame Nacional do Ensino Médio',
    icon: BookOpen,
    gradient: 'from-violet-400 via-purple-500 to-fuchsia-600',
    bgGradient: 'from-violet-50 via-purple-50 to-fuchsia-50',
    iconColor: 'text-violet-600',
    glowColor: 'shadow-violet-500/50',
    badge: 'TRENDING',
    badgeColor: 'from-violet-400 to-purple-500',
    count: 1205,
    difficulty: 'Básico',
    xp: 80
  },
  {
    id: 'vestibular',
    title: 'Vestibulares',
    description: 'Provas de vestibulares de universidades renomadas',
    icon: Award,
    gradient: 'from-orange-400 via-red-500 to-pink-600',
    bgGradient: 'from-orange-50 via-red-50 to-pink-50',
    iconColor: 'text-orange-600',
    glowColor: 'shadow-orange-500/50',
    badge: 'HOT',
    badgeColor: 'from-orange-400 to-red-500',
    count: 934,
    difficulty: 'Intermediário',
    xp: 100
  }
];



export default function ProvasIntegraPage() {
  const { user, isAdmin, checkAdminStatus } = useAuth();

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user, checkAdminStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-200 shadow-sm">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Sistema Inteligente de Provas</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent leading-tight">
              Provas na Íntegra
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
              {isAdmin 
                ? 'Sistema completo para importação e organização de provas com parser inteligente e tecnologia avançada.'
                : 'Acesse milhares de provas organizadas por categoria com tecnologia de ponta para seus estudos.'
              }
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">1000+</div>
                <div className="text-sm text-gray-600">Provas Disponíveis</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">50+</div>
                <div className="text-sm text-gray-600">Instituições</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-gray-600">Acesso Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {isAdmin ? (
            // Admin Dashboard
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Painel Administrativo</h2>
                <p className="text-gray-600">Gerencie e organize provas com ferramentas avançadas</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/simulados/provas-integra/upload" className="group">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-6 transition-all duration-300 transform group-hover:scale-105 shadow-lg">
                    <Plus className="h-8 w-8 mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Nova Prova</h3>
                    <p className="text-blue-100 text-sm">Upload e importação</p>
                  </div>
                </Link>
                
                <Link href="/simulados/provas-integra/text-parser" className="group">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-6 transition-all duration-300 transform group-hover:scale-105 shadow-lg">
                    <FileText className="h-8 w-8 mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Parser de Texto</h3>
                    <p className="text-purple-100 text-sm">Processamento inteligente</p>
                  </div>
                </Link>
                
                <Link href="/simulados/provas-integra/gerenciar" className="group">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-6 transition-all duration-300 transform group-hover:scale-105 shadow-lg">
                    <TrendingUp className="h-8 w-8 mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Gerenciar</h3>
                    <p className="text-green-100 text-sm">Organizar e editar</p>
                  </div>
                </Link>
              </div>
            </div>
          ) : (
            // User Welcome
            <div className="text-center bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg p-8">
              <Users className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo ao Sistema</h2>
              <p className="text-lg text-gray-600 mb-6">
                Explore milhares de provas organizadas por categoria e acelere seus estudos
              </p>
              <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Navegue pelas categorias abaixo</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Categories Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Categorias de Provas
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Escolha a categoria que melhor se adapta aos seus objetivos de estudo
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {examTypes.map((type, index) => {
            const IconComponent = type.icon;
            return (
              <div 
                key={type.id} 
                className="group relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${type.bgGradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                {/* Card */}
                <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2 h-full">
                  {/* Icon */}
                  <div className="text-center mb-6">
                    <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${type.bgGradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className={`h-10 w-10 ${type.iconColor}`} />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-800">
                      {type.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {type.description}
                    </p>
                    
                    {/* Stats */}
                    <div className="flex justify-center">
                      <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${type.bgGradient} px-3 py-1 rounded-full`}>
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${type.gradient}`}></div>
                        <span className={`text-xs font-medium ${type.iconColor}`}>
                          {type.count} provas disponíveis
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <Link href={`/simulados/provas-integra/categoria/${type.id}`} className="block">
                      <button className={`w-full bg-gradient-to-r ${type.gradient} hover:shadow-lg text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 transform group-hover:scale-105`}>
                        Explorar Provas
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
       </div>

       {/* Footer Section */}
       <div className="container mx-auto px-4 py-16">
         <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-center text-white">
           <div className="max-w-3xl mx-auto space-y-6">
             <h3 className="text-2xl md:text-3xl font-bold">
               Pronto para começar seus estudos?
             </h3>
             <p className="text-lg text-gray-300">
               Junte-se a milhares de estudantes que já estão usando nossa plataforma para alcançar seus objetivos acadêmicos.
             </p>
             
             <div className="flex flex-wrap justify-center gap-6 pt-6">
               <div className="text-center">
                 <div className="text-2xl font-bold text-blue-400">98%</div>
                 <div className="text-sm text-gray-400">Taxa de Satisfação</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-green-400">15k+</div>
                 <div className="text-sm text-gray-400">Estudantes Ativos</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-purple-400">500+</div>
                 <div className="text-sm text-gray-400">Aprovações</div>
               </div>
             </div>
             
             {!isAdmin && (
               <div className="pt-6">
                 <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg">
                   Começar Agora
                 </button>
               </div>
             )}
           </div>
         </div>
       </div>

    </div>
  );
}