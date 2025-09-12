"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FacultyService } from '@/services/faculty.service';

export default function EntrarFaculdadePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para entrar em um ambiente');
      return;
    }
    
    if (!code.trim()) {
      setError('O código é obrigatório');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Buscar o ambiente pelo código
      const faculty = await FacultyService.getFacultyByCode(code.trim().toUpperCase());
      
      if (!faculty) {
        setError('Ambiente não encontrado. Verifique o código e tente novamente.');
        return;
      }
      
      // Verificar se o usuário está banido
      const isBanned = await FacultyService.isUserBanned(faculty.id, user.id);
      
      if (isBanned) {
        setError('Você foi banido deste ambiente e não pode entrar.');
        return;
      }
      
      // Verificar se o usuário já é membro
      const isMember = await FacultyService.checkMembership(faculty.id, user.id);
      
      if (isMember) {
        toast.success('Você já é membro deste ambiente!');
        router.push(`/minha-faculdade/${faculty.id}`);
        return;
      }
      
      // Criar solicitação de entrada (o método já verifica duplicatas)
      const requestId = await FacultyService.createJoinRequest(faculty.id, `Solicitação de entrada no ambiente ${faculty.name}`);
      
      if (!requestId) {
        throw new Error('Não foi possível criar a solicitação de entrada');
      }
      
      toast.success(`Solicitação enviada para "${faculty.name}"! Aguarde a aprovação do administrador.`);
      router.push('/minha-faculdade');
    } catch (error: any) {
      console.error('Erro ao entrar no ambiente:', error);
      
      // Tratamento específico para mensagens de erro do createJoinRequest
      if (error.message === 'Você já tem uma solicitação pendente para esta faculdade') {
        toast.info('Você já tem uma solicitação pendente para este ambiente. Aguarde a aprovação do administrador.');
      } else if (error.message === 'Você já é membro desta faculdade') {
        toast.info('Você já é membro desta faculdade.');
        router.push('/minha-faculdade');
      } else if (error.message && error.message.includes('infinite recursion')) {
        toast.error('Erro de permissão no banco de dados. Por favor, contate o suporte.');
        console.error('Erro de recursão infinita na política RLS. Execute o script fix_faculty_policies.sql.');
      } else if (error.code === '42P01') {
        toast.error('As tabelas necessárias não foram criadas. Por favor, contate o suporte.');
      } else {
        toast.error('Não foi possível entrar no ambiente. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <Link href="/minha-faculdade" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Link>
        
        <div className="flex items-center gap-3">
          <LogIn className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">Entrar em um Ambiente</h1>
        </div>
        <p className="mt-2 text-gray-600">
          Entre em um ambiente existente usando o código fornecido pelo criador
        </p>
      </header>

      <div className="bg-white rounded-xl shadow-md p-6 md:p-8 max-w-lg mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Código do Ambiente
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Digite o código (ex: ABC12345)"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-center uppercase tracking-wider font-medium text-lg ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg text-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>Entrar no Ambiente</span>
                )}
              </button>
            </div>
          </div>
        </form>
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Como obter um código?</h3>
          <p className="text-sm text-gray-600">
            O código de acesso é fornecido pelo criador do ambiente. Peça ao administrador ou professor responsável pelo ambiente para compartilhar o código com você.
          </p>
        </div>
      </div>
    </div>
  );
}