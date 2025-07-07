'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ChevronRight, Trophy, RefreshCw, MessageCircle, GraduationCap, BookOpenCheck, CalendarDays, HelpCircle, BarChart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import ChallengesWidget from '@/components/gamification/ChallengesWidget';

export default function ComunidadePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Carregar dados necessários
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados da comunidade:', error);
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Minha Facul</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Card para Feed Acadêmico */}
        <Link href="/comunidade/feed" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
          <div className="h-36 bg-gradient-to-r from-blue-500 to-blue-600 p-6 flex flex-col justify-between">
            <h2 className="text-2xl font-bold text-white">Feed Acadêmico</h2>
            <p className="text-blue-100">Acompanhe novidades e compartilhe com sua turma</p>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Compartilhe seus resultados, conquistas e materiais de estudo. Interaja com outros estudantes da sua faculdade.
            </p>
            <div className="flex justify-between items-center">
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">Acadêmico</span>
              <span className="text-blue-600 flex items-center">
                <span className="mr-1 font-medium">Acessar</span>
                <ChevronRight size={18} />
              </span>
            </div>
          </div>
        </Link>
        
        {/* Card para Fórum de Dúvidas */}
        <Link href="/comunidade/duvidas" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
          <div className="h-36 bg-gradient-to-r from-purple-500 to-purple-600 p-6 flex flex-col justify-between">
            <h2 className="text-2xl font-bold text-white">Fórum de Dúvidas</h2>
            <p className="text-purple-100">Tire suas dúvidas com professores e colegas</p>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Poste suas dúvidas sobre matérias, exercícios ou trabalhos e receba ajuda da comunidade acadêmica.
            </p>
            <div className="flex justify-between items-center">
              <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-sm font-medium">Colaborativo</span>
              <span className="text-purple-600 flex items-center">
                <span className="mr-1 font-medium">Acessar</span>
                <ChevronRight size={18} />
              </span>
            </div>
          </div>
        </Link>
        
        {/* Card para Calendário Acadêmico */}
        <Link href="/comunidade/calendario" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
          <div className="h-36 bg-gradient-to-r from-amber-500 to-amber-600 p-6 flex flex-col justify-between">
            <h2 className="text-2xl font-bold text-white">Calendário Acadêmico</h2>
            <p className="text-amber-100">Acompanhe datas importantes e eventos</p>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Fique por dentro de provas, entregas de trabalhos, eventos acadêmicos e outras datas importantes do semestre.
            </p>
            <div className="flex justify-between items-center">
              <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-medium">Organização</span>
              <span className="text-amber-600 flex items-center">
                <span className="mr-1 font-medium">Visualizar</span>
                <ChevronRight size={18} />
              </span>
            </div>
          </div>
        </Link>

        {/* Card para Notas e Faltas */}
        <Link href="/comunidade/notas-faltas" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
          <div className="h-36 bg-gradient-to-r from-green-500 to-green-600 p-6 flex flex-col justify-between">
            <h2 className="text-2xl font-bold text-white">Notas e Faltas</h2>
            <p className="text-green-100">Acompanhe seu desempenho acadêmico</p>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Visualize suas notas, frequência e média em cada disciplina. Mantenha o controle do seu desempenho acadêmico.
            </p>
            <div className="flex justify-between items-center">
              <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm font-medium">Desempenho</span>
              <span className="text-green-600 flex items-center">
                <span className="mr-1 font-medium">Visualizar</span>
                <ChevronRight size={18} />
              </span>
            </div>
          </div>
        </Link>
      </div>
      
      {/* Widget de Próximos Eventos */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <CalendarDays className="h-5 w-5 mr-2 text-blue-600" />
            Próximos Eventos
          </h2>
          <div className="space-y-3">
            <div className="p-3 border border-gray-100 rounded-lg flex items-center">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex flex-col items-center justify-center mr-4">
                <span className="text-xs font-medium">MAI</span>
                <span className="text-lg font-bold">15</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">Entrega do Trabalho de Anatomia</h3>
                <p className="text-sm text-gray-500">Prazo final: 23:59</p>
              </div>
            </div>
            <div className="p-3 border border-gray-100 rounded-lg flex items-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex flex-col items-center justify-center mr-4">
                <span className="text-xs font-medium">MAI</span>
                <span className="text-lg font-bold">18</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">Prova de Fisiologia</h3>
                <p className="text-sm text-gray-500">Horário: 14:00 - 16:00</p>
              </div>
            </div>
            <div className="p-3 border border-gray-100 rounded-lg flex items-center">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex flex-col items-center justify-center mr-4">
                <span className="text-xs font-medium">MAI</span>
                <span className="text-lg font-bold">22</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">Palestra: Avanços em Medicina</h3>
                <p className="text-sm text-gray-500">Auditório Principal - 19:00</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link href="#" className="text-blue-600 text-sm font-medium hover:underline">
              Ver calendário completo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
