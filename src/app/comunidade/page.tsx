'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Clock, ChevronRight } from 'lucide-react';

export default function ComunidadePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Comunidade</h1>
        <p className="text-gray-600 mb-8">
          Conecte-se com outros estudantes, participe de salas de estudo e acompanhe seu progresso em grupo.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card da Sala de Estudos */}
          <Link 
            href="/comunidade/sala-estudos"
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Sala de Estudos
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Estude em grupo com outros estudantes em tempo real. Registre seu tempo de estudo e veja quem está estudando no momento.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-600 font-medium">Entrar agora</span>
                <ChevronRight className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Link>

          {/* Espaço para futuros recursos da comunidade */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-dashed border-gray-300">
            <div className="bg-gray-100 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-500 flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Em breve
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-500 mb-4">
                Novos recursos de comunidade serão adicionados em breve. Fique atento às atualizações!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 