"use client";

import React from 'react';
import Link from 'next/link';
import { School, Users, Plus, LogIn } from 'lucide-react';

interface Faculty {
  id: string;
  name: string;
  description: string;
  created_at: string;
  member_count: number;
}

interface MobileFacultyViewProps {
  userFaculties: Faculty[];
  loading: boolean;
}

export default function MobileFacultyView({ userFaculties, loading }: MobileFacultyViewProps) {
  return (
    <div className="px-4 py-4 pb-24">
      {/* Header Mobile */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-100 p-2 rounded-full">
            <School className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Meu Curso</h1>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          Crie ou participe de um ambiente compartilhado com sua turma
        </p>
      </div>

      {/* Action Cards Mobile */}
      <div className="space-y-3 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-emerald-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-100 p-2 rounded-full">
              <Plus className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800 text-sm">Criar Ambiente</h2>
              <p className="text-xs text-gray-600 mt-1">
                Crie um novo ambiente para sua turma
              </p>
            </div>
          </div>
          <Link 
            href="/minha-faculdade/criar"
            className="block w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-center text-sm transition-colors"
          >
            Criar Ambiente
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <LogIn className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-800 text-sm">Entrar em Ambiente</h2>
              <p className="text-xs text-gray-600 mt-1">
                Use o código fornecido pelo criador
              </p>
            </div>
          </div>
          <Link 
            href="/minha-faculdade/entrar"
            className="block w-full py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-center text-sm transition-colors"
          >
            Entrar com Código
          </Link>
        </div>
      </div>

      {/* Environments List Mobile */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Seus Ambientes</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
          </div>
        ) : userFaculties.length > 0 ? (
          <div className="space-y-3">
            {userFaculties.map((faculty) => (
              <Link 
                key={faculty.id} 
                href={`/minha-faculdade/${faculty.id}`}
                className="block bg-white rounded-lg shadow-sm hover:shadow-md p-4 border border-gray-200 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-800 text-sm flex-1 pr-2">
                    {faculty.name}
                  </h3>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                    <Users className="h-3 w-3 inline mr-1" />
                    {faculty.member_count || 0}
                  </span>
                </div>
                
                <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mb-3">
                  {faculty.description}
                </p>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <School className="h-3 w-3" />
                  <span>Criado em {new Date(faculty.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="bg-gray-100 p-3 rounded-full w-fit mx-auto mb-3">
              <School className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-gray-700 font-medium text-sm mb-2">Nenhum ambiente encontrado</h3>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">
              Você ainda não participa de nenhum ambiente. Crie um novo ou entre em um existente.
            </p>
            <div className="space-y-2">
              <Link 
                href="/minha-faculdade/criar"
                className="block w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-center text-sm transition-colors"
              >
                Criar Ambiente
              </Link>
              <Link 
                href="/minha-faculdade/entrar"
                className="block w-full py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-center text-sm transition-colors"
              >
                Entrar com Código
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}