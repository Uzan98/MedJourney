'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Book, Target, Users, BarChart } from 'lucide-react';

export default function FeaturesSection() {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Planejamento Inteligente',
      description: 'Crie planos de estudo personalizados com base em suas metas. Nossa IA organiza os temas para você.',
      image: '/screenshots/planning.png',
    },
    {
      icon: <Book className="w-8 h-8" />,
      title: 'Banco de Questões',
      description: 'Acesse milhares de questões e crie simulados ilimitados para testar seus conhecimentos.',
      image: '/screenshots/questions.png',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Comunidade Ativa',
      description: 'Participe de salas de estudo focadas e compartilhe conhecimento com outros estudantes.',
      image: '/screenshots/community.png',
    },
    {
      icon: <BarChart className="w-8 h-8" />,
      title: 'Análise de Desempenho',
      description: 'Acompanhe seu progresso com estatísticas detalhadas e identifique seus pontos fracos.',
      image: '/screenshots/stats.png',
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Tudo que você precisa para ser aprovado</h2>
          <p className="mt-4 text-lg text-gray-600">
            Ferramentas poderosas para cada etapa da sua preparação.
          </p>
        </div>
        
        <div className="mt-12 md:grid md:grid-cols-12 md:gap-6">
          <div className="max-w-xl md:max-w-none md:w-full mx-auto md:col-span-7 lg:col-span-6" data-aos="fade-right">
            <div className="md:pr-4 lg:pr-12 xl:pr-16 mb-8">
              <h3 className="text-2xl font-bold mb-3">Organização poderosa, resultados incríveis.</h3>
              <p className="text-gray-600">O MedJourney centraliza tudo que você precisa, da teoria à prática, com ferramentas que se adaptam a você.</p>
            </div>
            {features.map((feature, index) => (
              <button
                key={index}
                className={`w-full text-left p-4 rounded-lg transition duration-300 ease-in-out mb-3 ${activeTab === index ? 'bg-blue-50 shadow-md' : 'bg-white hover:bg-gray-50'}`}
                onClick={() => setActiveTab(index)}
              >
                <div className="flex items-center">
                  <div className={`flex items-center justify-center h-12 w-12 rounded-full mr-4 ${activeTab === index ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="max-w-xl md:max-w-none md:w-full mx-auto md:col-span-5 lg:col-span-6 mb-8 md:mb-0 md:order-1" data-aos="zoom-y-out">
            <div className="relative w-full h-80">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`absolute w-full h-full transition-opacity duration-300 ease-in-out ${activeTab === index ? 'opacity-100' : 'opacity-0'}`}
                >
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    layout="fill"
                    objectFit="contain"
                    className="rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 