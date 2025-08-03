"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { School, Users, FileText, MessageSquare, Bell, Calendar, Plus, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileFacultyView from '@/components/minha-faculdade/MobileFacultyView';

export default function MinhaFaculdadePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [userFaculties, setUserFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function loadUserFaculties() {
      if (!user) return;

      try {
        setLoading(true);
        
        // Buscar ambientes que o usuário criou ou participa
        const { data: memberFaculties, error: memberError } = await supabase
          .from('faculty_members')
          .select(`
            faculty:faculty_id (
              id,
              name,
              description,
              created_at,
              code,
              owner_id,
              member_count
            )
          `)
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        // Formatar os dados para exibição
        const formattedFaculties = memberFaculties
          .map(item => item.faculty)
          .filter(Boolean);

        setUserFaculties(formattedFaculties);
      } catch (error) {
        console.error('Erro ao carregar ambientes:', error);
        toast.error('Não foi possível carregar seus ambientes');
      } finally {
        setLoading(false);
      }
    }

    loadUserFaculties();
  }, [user]);

  // Render mobile view for mobile devices
  if (isMobile) {
    return (
      <MobileFacultyView 
        userFaculties={userFaculties} 
        loading={loading} 
      />
    );
  }

  // Render desktop view for larger screens
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <School className="h-8 w-8 text-emerald-500" />
            <h1 className="text-2xl font-bold text-gray-800">Minha Faculdade</h1>
          </div>
        </div>
        <p className="mt-2 text-gray-600">
          Crie ou participe de um ambiente compartilhado com sua turma
        </p>
      </header>

      {/* Seção de Ações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white rounded-xl shadow-md p-6 border border-emerald-100 hover:border-emerald-300 transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Plus className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Criar Ambiente</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Crie um novo ambiente para sua turma e compartilhe materiais, dúvidas e informações.
          </p>
          <Link 
            href="/minha-faculdade/criar"
            className="block w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-center transition-colors"
          >
            Criar Ambiente
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-blue-100 hover:border-blue-300 transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <LogIn className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Entrar em Ambiente</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Entre em um ambiente existente usando o código fornecido pelo criador.
          </p>
          <Link 
            href="/minha-faculdade/entrar"
            className="block w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-center transition-colors"
          >
            Entrar com Código
          </Link>
        </div>
      </div>

      {/* Lista de Ambientes */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Seus Ambientes</h2>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : userFaculties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userFaculties.map((faculty) => (
            <Link 
              key={faculty.id} 
              href={`/minha-faculdade/${faculty.id}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-md p-5 border border-gray-200 transition-all"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg text-gray-800">{faculty.name}</h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {faculty.member_count || 0} membros
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-2 line-clamp-2">{faculty.description}</p>
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
                <School className="h-3.5 w-3.5" />
                <span>Criado em {new Date(faculty.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <School className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-gray-700 font-medium text-lg mb-2">Nenhum ambiente encontrado</h3>
          <p className="text-gray-500 mb-6">
            Você ainda não participa de nenhum ambiente. Crie um novo ou entre em um existente.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/minha-faculdade/criar"
              className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-center transition-colors"
            >
              Criar Ambiente
            </Link>
            <Link 
              href="/minha-faculdade/entrar"
              className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-center transition-colors"
            >
              Entrar com Código
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}