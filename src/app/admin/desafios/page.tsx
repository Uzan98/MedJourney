'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  Target, 
  Users, 
  Trophy,
  RefreshCw,
  CheckCircle,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';

// Definição do tipo de desafio
interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  challenge_type: string;
  goal_value: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export default function AdminDesafiosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<CommunityChallenge | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fixingPermissions, setFixingPermissions] = useState(false);
  
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        router.push('/dashboard');
        return;
      }
      
      try {
        // Verificar se o usuário é um administrador
        const { data, error } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .single();
        
        if (error || !data) {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para acessar esta página",
            variant: "destructive"
          });
          router.push('/dashboard');
          return;
        }
        
        setIsAdmin(true);
        loadChallenges();
      } catch (error) {
        console.error('Erro ao verificar status de administrador:', error);
        router.push('/dashboard');
      }
    }
    
    checkAdminStatus();
  }, [user, router, supabase]);
  
  const loadChallenges = async () => {
    setLoading(true);
    try {
      // Carregar todos os desafios, incluindo inativos e futuros
      const { data, error } = await supabase
        .from('community_challenges')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Erro ao carregar desafios:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os desafios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };
  
  const handleDelete = async (challengeId: string) => {
    if (!confirm('Tem certeza que deseja excluir este desafio?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('community_challenges')
        .delete()
        .eq('id', challengeId);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Desafio excluído com sucesso",
        variant: "default"
      });
      loadChallenges();
    } catch (error) {
      console.error('Erro ao excluir desafio:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o desafio",
        variant: "destructive"
      });
    }
  };
  
  const handleToggleActive = async (challenge: CommunityChallenge) => {
    try {
      const { error } = await supabase
        .from('community_challenges')
        .update({ is_active: !challenge.is_active })
        .eq('id', challenge.id);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: `Desafio ${challenge.is_active ? 'desativado' : 'ativado'} com sucesso`,
        variant: "default"
      });
      loadChallenges();
    } catch (error) {
      console.error('Erro ao atualizar status do desafio:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do desafio",
        variant: "destructive"
      });
    }
  };
  
  const fixPermissions = async () => {
    setFixingPermissions(true);
    try {
      // 1. Inserir diretamente o usuário como administrador
      const { error: adminError } = await supabase
        .from('admin_users')
        .upsert({ 
          user_id: '9e959500-f290-4457-a5d7-2a81c496d123' 
        }, { onConflict: 'user_id' });
      
      if (adminError) {
        // Se a tabela não existir, vamos tentar criá-la
        const { error: createTableError } = await supabase.rpc('execute_admin_sql', {
          sql_query: `
          CREATE TABLE IF NOT EXISTS admin_users (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          INSERT INTO admin_users (user_id)
          VALUES ('9e959500-f290-4457-a5d7-2a81c496d123');
          `
        });
        
        if (createTableError) {
          throw createTableError;
        }
      }
      
      // 2. Configurar políticas RLS para a tabela community_challenges
      const { error: policyError } = await supabase.rpc('execute_admin_sql', {
        sql_query: `
        -- Habilitar RLS na tabela community_challenges
        ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;
        
        -- Remover políticas existentes para evitar conflitos
        DROP POLICY IF EXISTS "Permitir leitura pública de desafios" ON community_challenges;
        DROP POLICY IF EXISTS "Permitir administradores gerenciar desafios" ON community_challenges;
        
        -- Criar política para permitir que qualquer usuário autenticado possa visualizar desafios
        CREATE POLICY "Permitir leitura pública de desafios"
        ON community_challenges
        FOR SELECT
        USING (true);
        
        -- Criar política para permitir que administradores possam gerenciar desafios
        CREATE POLICY "Permitir administradores gerenciar desafios"
        ON community_challenges
        FOR ALL
        USING (
          auth.uid() IN (
            SELECT user_id FROM admin_users
          )
        );
        `
      });
      
      if (policyError) {
        throw policyError;
      }
      
      toast({
        title: "Sucesso",
        description: "Permissões corrigidas com sucesso",
        variant: "default"
      });
      
      // Recarregar a página para aplicar as novas permissões
      window.location.reload();
    } catch (error) {
      console.error('Erro ao corrigir permissões:', error);
      toast({
        title: "Erro",
        description: `Não foi possível corrigir as permissões: ${(error as any)?.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setFixingPermissions(false);
    }
  };
  
  if (!isAdmin || loading) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-6">
          <Link href="/admin" className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Administração de Desafios</h1>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/admin" className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Administração de Desafios</h1>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={fixPermissions}
            variant="outline"
            size="sm"
            disabled={fixingPermissions}
            className="text-yellow-600"
          >
            <ShieldAlert className={`h-4 w-4 mr-2 ${fixingPermissions ? 'animate-pulse' : ''}`} />
            {fixingPermissions ? 'Corrigindo...' : 'Corrigir Permissões'}
          </Button>
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button
            onClick={() => {
              setEditingChallenge(null);
              setShowCreateModal(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Desafio
          </Button>
        </div>
      </div>
      
      {challenges.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-3" />
          <h2 className="text-xl font-bold mb-2">Nenhum desafio encontrado</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Você ainda não criou nenhum desafio. Clique no botão "Novo Desafio" para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {challenges.map((challenge) => {
            const isActive = challenge.is_active;
            const today = new Date();
            const startDate = new Date(challenge.start_date);
            const endDate = new Date(challenge.end_date);
            const status = today < startDate 
              ? 'upcoming' 
              : today > endDate 
                ? 'ended' 
                : 'active';
            
            return (
              <div 
                key={challenge.id} 
                className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${
                  !isActive 
                    ? 'border-gray-300 dark:border-gray-600' 
                    : status === 'active' 
                      ? 'border-green-500' 
                      : status === 'upcoming' 
                        ? 'border-blue-500' 
                        : 'border-red-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-lg font-semibold">{challenge.title}</h3>
                      {!isActive && (
                        <span className="ml-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                          Inativo
                        </span>
                      )}
                      {isActive && status === 'active' && (
                        <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs rounded-full">
                          Em Andamento
                        </span>
                      )}
                      {isActive && status === 'upcoming' && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                          Agendado
                        </span>
                      )}
                      {isActive && status === 'ended' && (
                        <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 text-xs rounded-full">
                          Encerrado
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mt-1 mb-2">
                      {challenge.description || 'Sem descrição'}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleToggleActive(challenge)}
                      variant="outline"
                      size="sm"
                      className={isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setEditingChallenge(challenge);
                        setShowCreateModal(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      onClick={() => handleDelete(challenge.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                    <span>
                      {new Date(challenge.start_date).toLocaleDateString('pt-BR')} - {new Date(challenge.end_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Target className="h-4 w-4 mr-2 text-green-500" />
                    <span>
                      Meta: {challenge.goal_value} {getChallengeTypeLabel(challenge.challenge_type)}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <Link 
                      href={`/comunidade/desafios/${challenge.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {showCreateModal && (
        <ChallengeFormModal 
          challenge={editingChallenge} 
          onClose={() => setShowCreateModal(false)} 
          onSave={() => {
            setShowCreateModal(false);
            loadChallenges();
          }}
        />
      )}
    </div>
  );
}

// Componente de modal para criar/editar desafios
function ChallengeFormModal({ 
  challenge = null, 
  onClose, 
  onSave 
}: { 
  challenge: CommunityChallenge | null, 
  onClose: () => void, 
  onSave: () => void 
}) {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const [title, setTitle] = useState(challenge?.title || '');
  const [description, setDescription] = useState(challenge?.description || '');
  const [startDate, setStartDate] = useState(challenge?.start_date || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(challenge?.end_date || '');
  const [challengeType, setChallengeType] = useState(challenge?.challenge_type || 'study_time');
  const [goalValue, setGoalValue] = useState(challenge?.goal_value?.toString() || '60');
  const [isActive, setIsActive] = useState(challenge?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  
  // Definir data de término padrão como 7 dias após a data de início
  useEffect(() => {
    if (!challenge && !endDate && startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      setEndDate(end.toISOString().split('T')[0]);
    }
  }, [startDate, endDate, challenge]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !startDate || !endDate || !goalValue) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    
    if (new Date(endDate) <= new Date(startDate)) {
      toast({
        title: "Erro",
        description: "A data de término deve ser posterior à data de início",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    
    try {
      const challengeData = {
        title,
        description,
        start_date: startDate,
        end_date: endDate,
        challenge_type: challengeType,
        goal_value: parseInt(goalValue),
        is_active: isActive,
        created_by: user?.id
      };
      
      if (challenge) {
        // Atualizar desafio existente
        const { error } = await supabase
          .from('community_challenges')
          .update(challengeData)
          .eq('id', challenge.id);
        
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Desafio atualizado com sucesso",
          variant: "default"
        });
      } else {
        // Criar novo desafio
        const { error } = await supabase
          .from('community_challenges')
          .insert([challengeData]);
        
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Desafio criado com sucesso",
          variant: "default"
        });
      }
      
      onSave();
    } catch (error) {
      console.error('Erro ao salvar desafio:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o desafio",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {challenge ? 'Editar Desafio' : 'Novo Desafio'}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Título *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Descrição
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                    Data de Início *
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium mb-1">
                    Data de Término *
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="challengeType" className="block text-sm font-medium mb-1">
                  Tipo de Desafio *
                </label>
                <select
                  id="challengeType"
                  value={challengeType}
                  onChange={(e) => setChallengeType(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  required
                >
                  <option value="study_time">Tempo de Estudo</option>
                  <option value="exams_completed">Simulados Concluídos</option>
                  <option value="correct_answers">Respostas Corretas</option>
                  <option value="study_streak">Sequência de Estudos</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="goalValue" className="block text-sm font-medium mb-1">
                  Valor da Meta *
                </label>
                <input
                  id="goalValue"
                  type="number"
                  value={goalValue}
                  onChange={(e) => setGoalValue(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {challengeType === 'study_time' && 'Minutos de estudo'}
                  {challengeType === 'exams_completed' && 'Número de simulados'}
                  {challengeType === 'correct_answers' && 'Número de respostas corretas'}
                  {challengeType === 'study_streak' && 'Dias consecutivos'}
                </p>
              </div>
              
              <div className="flex items-center">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm">
                  Desafio ativo
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                disabled={saving}
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? 'Salvando...' : challenge ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Função auxiliar para formatar o tipo de desafio
function getChallengeTypeLabel(type: string): string {
  switch (type) {
    case 'study_time':
      return 'minutos estudados';
    case 'exams_completed':
      return 'simulados concluídos';
    case 'correct_answers':
      return 'respostas corretas';
    case 'study_streak':
      return 'dias consecutivos';
    default:
      return '';
  }
} 