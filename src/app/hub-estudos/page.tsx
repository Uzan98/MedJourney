"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  BookOpen, 
  Brain, 
  Trello, 
  Clock, 
  ArrowRight,
  Sparkles,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';

interface StudyHubCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  features: string[];
  badge?: string;
  badgeColor?: string;
}

const studyHubItems: StudyHubCard[] = [
  {
    title: 'Disciplinas',
    description: 'Organize suas matérias de estudo, adicione assuntos importantes e acompanhe seu progresso acadêmico.',
    href: '/disciplinas',
    icon: <BookOpen className="h-8 w-8" />,
    gradient: 'from-blue-500 to-cyan-500',
    features: ['Organização por matérias', 'Controle de progresso', 'Priorização de assuntos']
  },
  {
    title: 'Planejamento AI',
    description: 'Crie planos de estudo personalizados com inteligência artificial adaptados ao seu perfil e objetivos.',
    href: '/planejamento/inteligente',
    icon: <Brain className="h-8 w-8" />,
    gradient: 'from-purple-500 to-pink-500',
    features: ['IA personalizada', 'Planos adaptativos', 'Otimização automática'],
    badge: 'PRO',
    badgeColor: 'bg-gradient-to-r from-purple-500 to-pink-500'
  },
  {
    title: 'Painel de Tarefas',
    description: 'Gerencie suas atividades acadêmicas, defina prazos e acompanhe o cumprimento de suas metas.',
    href: '/tarefas',
    icon: <Trello className="h-8 w-8" />,
    gradient: 'from-green-500 to-emerald-500',
    features: ['Gestão de tarefas', 'Controle de prazos', 'Acompanhamento de metas']
  },
  {
    title: 'Painel de Estudos',
    description: 'Monitore seu tempo de estudo, use técnicas como Pomodoro e analise sua produtividade.',
    href: '/estudos',
    icon: <Clock className="h-8 w-8" />,
    gradient: 'from-orange-500 to-red-500',
    features: ['Cronômetro Pomodoro', 'Análise de produtividade', 'Histórico de sessões']
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const HubEstudosPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-8">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
          Hub de Estudos
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Seu centro de comando para uma jornada de estudos mais eficiente e organizada. 
          Acesse rapidamente todas as ferramentas que você precisa para alcançar seus objetivos acadêmicos.
        </p>
      </motion.div>

      {/* Stats Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto"
      >
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20 shadow-lg">
          <Target className="h-8 w-8 text-blue-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-1">Foco Total</h3>
          <p className="text-sm text-gray-600">Ferramentas para manter sua concentração</p>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20 shadow-lg">
          <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-1">Progresso Visível</h3>
          <p className="text-sm text-gray-600">Acompanhe sua evolução em tempo real</p>
        </div>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20 shadow-lg">
          <Zap className="h-8 w-8 text-purple-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-1">IA Integrada</h3>
          <p className="text-sm text-gray-600">Inteligência artificial a seu favor</p>
        </div>
      </motion.div>

      {/* Main Cards Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto"
      >
        {studyHubItems.map((item, index) => (
          <motion.div
            key={item.title}
            variants={cardVariants}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href={item.href} className="block h-full">
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 h-full group overflow-hidden">
                {/* Background Gradient Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />
                
                {/* Badge */}
                {item.badge && (
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold text-white ${item.badgeColor} shadow-lg`}>
                    {item.badge}
                  </div>
                )}
                
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${item.gradient} rounded-xl mb-6 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                
                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-gray-700 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  
                  {/* Features List */}
                  <div className="space-y-2">
                    {item.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-sm text-gray-500">
                        <div className={`w-2 h-2 bg-gradient-to-r ${item.gradient} rounded-full mr-3 flex-shrink-0`} />
                        {feature}
                      </div>
                    ))}
                  </div>
                  
                  {/* Action Button */}
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
                      Acessar ferramenta
                    </span>
                    <ArrowRight className={`h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300`} />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
      
      {/* Bottom CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="text-center mt-16"
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 max-w-2xl mx-auto text-white shadow-2xl">
          <h3 className="text-2xl font-bold mb-4">Pronto para começar?</h3>
          <p className="text-blue-100 mb-6">
            Escolha uma das ferramentas acima e transforme sua forma de estudar hoje mesmo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/disciplinas" 
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Começar com Disciplinas
            </Link>
            <Link 
              href="/estudos" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors border border-blue-400"
            >
              Iniciar Sessão de Estudos
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HubEstudosPage;