'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Search, ArrowLeft, Clock, Users, AlertTriangle, 
  ChevronRight, RefreshCw, Lock, Unlock, Share2, 
  BookOpen, MessageSquare, Trophy, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StudyGroup, StudyGroupService } from '@/services/study-group.service';
import StudyTimeDisplay from '@/components/StudyTimeDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import JoinGroupModal from '@/components/comunidade/JoinGroupModal';
import CreateGroupModal from '@/components/comunidade/CreateGroupModal';

export default function GruposEstudosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<StudyGroup[]>([]);
  const [stats, setStats] = useState<{ total_time: number; groups: number }>({ total_time: 0, groups: 0 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  useEffect(() => {
    loadInitialData();
  }, []);
  
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUserGroups(),
        loadPublicGroups(),
        loadUserStats()
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUserGroups = async () => {
    try {
      const groups = await StudyGroupService.getUserGroups();
      setMyGroups(groups);
    } catch (error) {
      console.error('Erro ao carregar grupos do usuário:', error);
    }
  };
  
  const loadPublicGroups = async () => {
    try {
      const groups = await StudyGroupService.searchGroups();
      setPublicGroups(groups);
    } catch (error) {
      console.error('Erro ao carregar grupos públicos:', error);
    }
  };
  
  const loadUserStats = async () => {
    try {
      const userStats = await StudyGroupService.getUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };
  
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await loadPublicGroups();
      return;
    }
    
    setSearchLoading(true);
    try {
      const results = await StudyGroupService.searchGroups(searchTerm.trim());
      setPublicGroups(results);
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error('Erro ao buscar grupos');
    } finally {
      setSearchLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadUserGroups(),
        loadPublicGroups(),
        loadUserStats()
      ]);
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleGroupCreated = (groupId: string) => {
    toast.success('Grupo criado com sucesso!');
    loadUserGroups();
    router.push(`/comunidade/grupos-estudos/${groupId}`);
  };
  
  const handleGroupJoined = (groupId: string) => {
    toast.success('Você entrou no grupo com sucesso!');
    loadUserGroups();
    router.push(`/comunidade/grupos-estudos/${groupId}`);
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header com design moderno e animação sutil */}
      <div className="relative mb-8">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center">
            <Link 
              href="/comunidade" 
              className="mr-4 p-2.5 rounded-full bg-white shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">Grupos de Estudos</h1>
              <p className="text-gray-600">Estude de forma colaborativa com colegas em grupos personalizados</p>
            </div>
          </div>
          
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="p-2.5 rounded-full bg-white shadow-sm hover:shadow-md hover:bg-gray-50 transition-all"
            aria-label="Atualizar dados"
          >
            <RefreshCw className={`h-5 w-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Estatísticas do usuário com design moderno */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 transform transition-all hover:shadow-md">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Trophy className="h-5 w-5 mr-2.5" />
              Seu Progresso em Grupos
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-sm font-semibold text-blue-800">Tempo Total de Estudo</h3>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  <StudyTimeDisplay seconds={stats.total_time} />
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center mb-2">
                  <Users className="h-5 w-5 text-indigo-600 mr-2" />
                  <h3 className="text-sm font-semibold text-indigo-800">Grupos Participando</h3>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{stats.groups}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-center mb-2">
                  <MessageSquare className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="text-sm font-semibold text-purple-800">Colaboração</h3>
                </div>
                <div className="flex items-center">
                  <div className="w-full bg-purple-200 rounded-full h-2.5">
                    <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, stats.groups * 20)}%` }}></div>
                  </div>
                  <span className="ml-2 text-sm font-medium text-purple-700">{Math.min(100, stats.groups * 20)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Ações rápidas com design aprimorado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 h-14 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <div className="bg-blue-400/30 p-2 rounded-full">
            <Plus className="h-5 w-5" />
          </div>
          <span className="font-medium text-base">Criar Novo Grupo</span>
        </Button>
        
        <Button 
          onClick={() => setShowJoinModal(true)}
          className="flex items-center justify-center gap-2 h-14 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <div className="bg-green-400/30 p-2 rounded-full">
            <Share2 className="h-5 w-5" />
          </div>
          <span className="font-medium text-base">Entrar com Código</span>
        </Button>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando grupos de estudos...</p>
        </div>
      ) : (
        <>
          {/* Meus grupos com design aprimorado */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
              <Users className="h-6 w-6 text-blue-600 mr-2.5" />
              Meus Grupos
            </h2>
            
            {myGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {myGroups.map(group => (
                  <Link
                    key={group.id}
                    href={`/comunidade/grupos-estudos/${group.id}`}
                    className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-1 hover:scale-[1.01] duration-300"
                  >
                    <div className={`bg-gradient-to-r ${group.is_private ? 'from-blue-600 to-blue-700' : 'from-green-600 to-green-700'} px-5 py-4 flex justify-between items-center`}>
                      <h3 className="text-lg font-bold text-white flex items-center">
                        {group.name}
                      </h3>
                      {group.is_private ? (
                        <Lock className="h-5 w-5 text-white/80" />
                      ) : (
                        <Unlock className="h-5 w-5 text-white/80" />
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-gray-600 mb-4 line-clamp-2 min-h-[3rem]">
                        {group.description || 'Grupo de estudos personalizado.'}
                      </p>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm bg-blue-50 px-3 py-1.5 rounded-full">
                          <Users className="h-4 w-4 text-blue-600 mr-1.5" />
                          <span className="text-blue-700 font-medium">{group.online_count || 0}/{group.members_count || 0} online</span>
                        </div>
                        <span className="flex items-center text-blue-600 hover:text-blue-700 font-medium">
                          <span className="mr-1.5">Acessar</span>
                          <ChevronRight className="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-dashed border-blue-300 p-8 mb-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 flex items-center justify-center bg-blue-50 rounded-full mb-5 shadow-inner">
                    <Users className="h-10 w-10 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Você não participa de nenhum grupo</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Crie seu próprio grupo de estudos ou entre em grupos existentes usando o código de acesso para começar a estudar em colaboração.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={() => setShowCreateModal(true)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2.5 px-5 rounded-lg flex items-center shadow-sm hover:shadow transition-all"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar meu grupo
                    </Button>
                    <Button 
                      onClick={() => setShowJoinModal(true)}
                      className="bg-green-100 hover:bg-green-200 text-green-700 font-medium py-2.5 px-5 rounded-lg flex items-center shadow-sm hover:shadow transition-all"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Entrar com código
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Busca de grupos com design aprimorado */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4 p-5 bg-white rounded-xl shadow-sm">
              <div className="relative flex-grow">
                <Input
                  type="text"
                  placeholder="Buscar por nome ou código de grupo"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 rounded-lg border-gray-300 bg-gray-50 focus:bg-white transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={searchLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-6 rounded-lg shadow-sm hover:shadow transition-all"
              >
                {searchLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Search className="h-5 w-5 mr-2" />
                )}
                Buscar
              </Button>
            </div>
          </div>
          
          {/* Grupos públicos com design aprimorado */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
              <Unlock className="h-6 w-6 text-green-600 mr-2.5" />
              Grupos Públicos
            </h2>
            
            {publicGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {publicGroups.map(group => (
                  <div
                    key={group.id}
                    className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-1 hover:scale-[1.01] duration-300"
                  >
                    <div className="bg-gradient-to-r from-green-600 to-green-700 px-5 py-4 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center">
                        {group.name}
                      </h3>
                      <Unlock className="h-5 w-5 text-white/80" />
                    </div>
                    <div className="p-5">
                      <p className="text-gray-600 mb-4 line-clamp-2 min-h-[3rem]">
                        {group.description || 'Grupo de estudos aberto para novos membros.'}
                      </p>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm bg-green-50 px-3 py-1.5 rounded-full">
                          <Users className="h-4 w-4 text-green-600 mr-1.5" />
                          <span className="text-green-700 font-medium">{group.members_count || 0} membros</span>
                        </div>
                        
                        <Button 
                          onClick={() => {
                            setSearchTerm(group.access_code || '');
                            setShowJoinModal(true);
                          }}
                          className="flex items-center text-green-600 hover:text-green-700 font-medium text-sm bg-green-50 hover:bg-green-100 px-3.5 py-1.5 rounded-full transition-colors"
                        >
                          <Share2 className="h-4 w-4 mr-1.5" />
                          <span>Entrar</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-dashed border-gray-300 p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 flex items-center justify-center bg-gray-50 rounded-full mb-5 shadow-inner">
                    <AlertTriangle className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Nenhum grupo público encontrado</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Tente buscar por um nome específico ou pelo código de acesso. Você também pode criar seu próprio grupo de estudos personalizado.
                  </p>
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2.5 px-5 rounded-lg flex items-center shadow-sm hover:shadow transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar novo grupo
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Dica para grupos com design aprimorado */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mt-6 border-l-4 border-blue-500 shadow-sm">
            <h3 className="text-base font-semibold text-blue-800 mb-2 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-blue-600" />
              Dicas para Grupos de Estudos
            </h3>
            <ul className="text-sm text-blue-700 leading-relaxed space-y-2">
              <li className="flex items-start">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                Compartilhe o código de acesso do seu grupo com amigos e colegas para estudarem juntos.
              </li>
              <li className="flex items-start">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                O tempo de estudo é contabilizado automaticamente enquanto você estiver ativo no grupo.
              </li>
              <li className="flex items-start">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2"></span>
                Grupos privados são visíveis apenas para membros convidados através do código de acesso.
              </li>
            </ul>
          </div>
        </>
      )}
      
      {/* Modal para entrar em um grupo */}
      <JoinGroupModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleGroupJoined}
      />
      
      {/* Modal para criar um grupo */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
