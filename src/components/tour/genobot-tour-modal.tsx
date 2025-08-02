'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import Image from 'next/image';

interface GenobotTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourSlide {
  id: number;
  title: string;
  description: string;
  image: string;
  features: string[];
  color: string;
}

const tourSlides: TourSlide[] = [
  {
    id: 1,
    title: "Bem-vindo ao Genoma!",
    description: "Olá! Eu sou o Genobot, seu assistente de estudos. Vou te mostrar todas as funcionalidades incríveis da nossa plataforma!",
    image: "/Genobot.png",
    features: [
      "Plataforma completa de estudos",
      "Inteligência artificial integrada",
      "Acompanhamento de progresso",
      "Comunidade de estudantes"
    ],
    color: "from-blue-500 to-purple-500"
  },
  {
    id: 2,
    title: "Dashboard Inteligente",
    description: "Visualize todo seu progresso de estudos em um painel completo e intuitivo com estatísticas detalhadas.",
    image: "/dashboard.png",
    features: [
      "Estatísticas de desempenho",
      "Gráficos de progresso",
      "Metas e objetivos (Em breve)",
      "Streak de estudos"
    ],
    color: "from-cyan-500 to-blue-500"
  },
  {
    id: 3,
    title: "Planejamento Inteligente",
    description: "Organize seus estudos com IA que adapta seu cronograma baseado no sua dificuldade e disponibilidade.",
    image: "/planejamento-screenshot.svg",
    features: [
      "Cronograma personalizado",
      "Adaptação automática",
      "Lembretes inteligentes (em breve)",
      "Otimização de tempo"
    ],
    color: "from-green-500 to-emerald-500"
  },
  {
    id: 4,
    title: "Banco de Questões",
    description: "Acesse o Genoma Bank: o banco de questões compartilhadas pela comunidade",
    image: "/banco-questoes-screenshot.svg",
    features: [
      "Milhares de questões",
      "Filtros avançados",
      "Explicações detalhadas",
      "Histórico de respostas"
    ],
    color: "from-orange-500 to-red-500"
  },
  {
    id: 5,
    title: "Simulados Personalizados",
    description: "Pratique com simulados que se adaptam ao seu nível e focam nas suas áreas de maior dificuldade.",
    image: "/simulados-screenshot.svg",
    features: [
      "Simulados adaptativos",
      "Análise de desempenho",
      "Cronômetro integrado",
      "Relatórios detalhados com IA (em breve)"
    ],
    color: "from-purple-500 to-pink-500"
  },
  {
    id: 6,
    title: "Flashcards Inteligentes",
    description: "Memorize conceitos com flashcards que usam repetição espaçada para otimizar sua retenção.",
    image: "/flashcards-screenshot.svg",
    features: [
      "Repetição espaçada",
      "Criação personalizada",
      "Algoritmo de memorização",
      "Sincronização em nuvem"
    ],
    color: "from-indigo-500 to-purple-500"
  },
  {
    id: 7,
    title: "Grupos de Estudo",
    description: "Conecte-se com outros estudantes, compartilhe conhecimento e tire dúvidas em nossa comunidade.",
    image: "/comunidade-screenshot.svg",
    features: [
      "Chat em tempo real",
      "Grupos de estudo",
      "Compartilhamento de simulados",
      "Cronometro pomodoro integrado"
    ],
    color: "from-teal-500 to-cyan-500"
  },
  {
    id: 8,
    title: "Pronto para começar?",
    description: "Agora que você conhece todas as funcionalidades, está na hora de começar sua jornada de estudos!",
    image: "/Genobot.png",
    features: [
      "Cadastro gratuito",
      "Acesso imediato",
      "Suporte 24/7",
      "Atualizações constantes"
    ],
    color: "from-gradient-to-r from-cyan-500 to-purple-500"
  }
];

export default function GenobotTourModal({ isOpen, onClose }: GenobotTourModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % tourSlides.length);
      setIsAnimating(false);
    }, 150);
  };

  const prevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + tourSlides.length) % tourSlides.length);
      setIsAnimating(false);
    }, 150);
  };

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlide) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsAnimating(false);
    }, 150);
  };

  if (!isOpen) return null;

  const slide = tourSlides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${slide.color} p-6 text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              {slide.id === 1 || slide.id === 8 ? (
                <Image
                  src="/Genobot.png"
                  alt="Genobot"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{slide.title}</h2>
              <p className="text-white/90">Slide {currentSlide + 1} de {tourSlides.length}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {(slide.id === 1 || slide.id === 8) ? (
            /* Layout especial para slides do Genobot */
            <div className="flex items-center gap-8">
              {/* Genobot na lateral esquerda */}
              <div className="flex-shrink-0">
                <div className={`relative bg-gradient-to-br ${slide.color} p-6 rounded-3xl`}>
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    width={200}
                    height={200}
                    className={`w-48 h-48 object-contain transition-transform duration-300 ${
                      isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
                    }`}
                  />
                </div>
              </div>

              {/* Conteúdo na direita */}
              <div className={`flex-1 space-y-6 transition-all duration-300 ${
                isAnimating ? 'opacity-50 translate-x-4' : 'opacity-100 translate-x-0'
              }`}>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {slide.description}
                </p>
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Principais recursos:</h3>
                  <ul className="space-y-2">
                    {slide.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${slide.color}`}></div>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* Layout padrão para outros slides */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Image */}
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-10 rounded-2xl blur-xl`}></div>
                <div className="relative bg-gray-50 rounded-2xl p-6 border-2 border-gray-100">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    width={400}
                    height={300}
                    className={`w-full h-64 object-cover rounded-xl transition-transform duration-300 ${
                      isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
                    }`}
                  />
                </div>
              </div>

              {/* Description and Features */}
              <div className={`space-y-6 transition-all duration-300 ${
                isAnimating ? 'opacity-50 translate-x-4' : 'opacity-100 translate-x-0'
              }`}>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {slide.description}
                </p>
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Principais recursos:</h3>
                  <ul className="space-y-2">
                    {slide.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${slide.color}`}></div>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="bg-gray-50 px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Previous Button */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                currentSlide === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Anterior</span>
            </button>

            {/* Dots Indicator */}
            <div className="flex space-x-2">
              {tourSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentSlide
                      ? `bg-gradient-to-r ${slide.color}`
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            {/* Next Button */}
            {currentSlide === tourSlides.length - 1 ? (
              <button
                onClick={onClose}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg bg-gradient-to-r ${slide.color} text-white hover:opacity-90 transition-opacity`}
              >
                <span>Começar!</span>
              </button>
            ) : (
              <button
                onClick={nextSlide}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-200 transition-all"
              >
                <span>Próximo</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}