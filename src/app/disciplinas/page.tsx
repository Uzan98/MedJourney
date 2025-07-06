"use client";

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import DisciplinesList from '@/components/estudos/DisciplinesList';
import { BookOpen, Lightbulb, Brain } from 'lucide-react';

export default function DisciplinasPage() {
  return (
    <div className="px-4 py-6 pb-24 md:pb-6">
      {/* Cabeçalho da página com design mais moderno */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 md:p-8 mb-6 text-white shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-3">Disciplinas</h1>
        <p className="text-blue-100 max-w-2xl mb-4 md:mb-6 text-sm md:text-base">
          Organize suas matérias de estudo, adicione assuntos importantes e acompanhe seu progresso acadêmico.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-8">
          <div className="bg-white/10 backdrop-blur-sm p-3 md:p-4 rounded-lg flex items-start">
            <BookOpen className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3 text-blue-200 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white text-sm md:text-base">Organize</h3>
              <p className="text-blue-100 text-xs md:text-sm">Crie disciplinas e categorize seus assuntos</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-3 md:p-4 rounded-lg flex items-start">
            <Lightbulb className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3 text-blue-200 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white text-sm md:text-base">Priorize</h3>
              <p className="text-blue-100 text-xs md:text-sm">Defina importância e dificuldade para cada assunto</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-3 md:p-4 rounded-lg flex items-start">
            <Brain className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3 text-blue-200 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white text-sm md:text-base">Aprenda</h3>
              <p className="text-blue-100 text-xs md:text-sm">Estude de forma estruturada e eficiente</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de disciplinas */}
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <DisciplinesList />
      </div>
    </div>
  );
} 
