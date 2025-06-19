'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Search, ArrowLeft, Clock, Users, AlertTriangle, 
  ChevronRight, RefreshCw, Lock, Unlock, Share2, 
  BookOpen, MessageSquare, Trophy, Zap, Sparkles, User
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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header com design moderno e efeitos visuais */}
      <div className="relative mb-10">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl animate-pulse"></div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center">
            <Link 
              href="/comunidade" 
              className="mr-4 p-2.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-white transition-all"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-1">Grupos de Estudos</h1>
              <p className="text-gray-600">Estude de forma colaborativa com colegas em grupos personalizados</p>
            </div>
          </div>
          
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="p-2.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-white transition-all"
            aria-label="Atualizar dados"
          >
            <RefreshCw className={`h-5 w-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Estatísticas do usuário com design moderno */}
      {!loading && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden mb-10 transform transition-all hover:shadow-xl border border-gray-100">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Trophy className="h-5 w-5 mr-2.5" />
              Seu Progresso em Grupos
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1 duration-300">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-blue-200/70 rounded-full mr-3 group-hover:bg-blue-300/80 transition-colors">
                    <Clock className="h-5 w-5 text-blue-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-blue-800">Tempo Total de Estudo</h3>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-2">
                  <StudyTimeDisplay seconds={stats.total_time} />
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1 duration-300">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-indigo-200/70 rounded-full mr-3 group-hover:bg-indigo-300/80 transition-colors">
                    <Users className="h-5 w-5 text-indigo-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-indigo-800">Grupos Participando</h3>
                </div>
                <p className="text-2xl font-bold text-indigo-900 mt-2">{stats.groups}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group hover:-translate-y-1 duration-300">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-purple-200/70 rounded-full mr-3 group-hover:bg-purple-300/80 transition-colors">
                    <Sparkles className="h-5 w-5 text-purple-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-purple-800">Colaboração</h3>
                </div>
                <div className="flex items-center mt-2">
                  <div className="w-full bg-purple-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-purple-700 h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, stats.groups * 20)}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium text-purple-700">{Math.min(100, stats.groups * 20)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Ações rápidas com design aprimorado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-3 h-16 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-700 hover:via-blue-600 hover:to-indigo-700 text-white rounded-2xl shadow-md hover:shadow-lg transition-all group"
        >
          <div className="bg-white/20 p-2.5 rounded-full group-hover:bg-white/30 transition-colors">
            <Plus className="h-5 w-5" />
          </div>
          <span className="font-medium text-base">Criar Novo Grupo</span>
        </Button>
        
        <Button 
          onClick={() => setShowJoinModal(true)}
          className="flex items-center justify-center gap-3 h-16 bg-gradient-to-r from-green-600 via-green-500 to-teal-600 hover:from-green-700 hover:via-green-600 hover:to-teal-700 text-white rounded-2xl shadow-md hover:shadow-lg transition-all group"
        >
          <div className="bg-white/20 p-2.5 rounded-full group-hover:bg-white/30 transition-colors">
            <Share2 className="h-5 w-5" />
          </div>
          <span className="font-medium text-base">Entrar com Código</span>
        </Button>
      </div>
      
      {/* Barra de pesquisa redesenhada */}
      <div className="mb-8">
        <div className="relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar grupos públicos..."
            className="pl-12 pr-4 py-3 h-14 rounded-2xl border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Button
            onClick={handleSearch}
            disabled={searchLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-4"
          >
            {searchLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Buscar'
            )}
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-20 h-20">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium mt-4">Carregando grupos de estudos...</p>
        </div>
      ) : (
        <>
          {/* Meus grupos com design aprimorado */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              Meus Grupos
            </h2>
            
            {myGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myGroups.map(group => (
                  <Link
                    key={group.id}
                    href={`/comunidade/grupos-estudos/${group.id}`}
                    className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300 border border-gray-100"
                  >
                    <div className={`bg-gradient-to-r ${
                      group.is_private 
                        ? 'from-blue-600 via-blue-500 to-indigo-600' 
                        : 'from-green-600 via-green-500 to-teal-600'
                    } px-6 py-5 flex justify-between items-center`}>
                      <h3 className="font-bold text-white text-lg truncate flex items-center">
                        {group.is_private ? (
                          <Lock className="h-4 w-4 mr-2 flex-shrink-0" />
                        ) : (
                          <Unlock className="h-4 w-4 mr-2 flex-shrink-0" />
                        )}
                        {group.name}
                      </h3>
                      <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-medium text-white">
                        {group.online_count} online
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="mb-4">
                        <p className="text-gray-600 line-clamp-2 h-12">
                          {group.description || "Sem descrição."}
                      </p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {[...Array(Math.min(3, group.members_count || 0))].map((_, i) => (
                              <div 
                                key={i} 
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                              >
                                <User className="h-4 w-4" />
                              </div>
                            ))}
                            {(group.members_count || 0) > 3 && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-white flex items-center justify-center text-xs font-medium text-blue-700">
                                +{(group.members_count || 0) - 3}
                              </div>
                            )}
                          </div>
                          <span className="ml-2 text-sm text-gray-500">{group.members_count || 0} membros</span>
                        </div>
                        
                        <div className="flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700">
                          <span>Entrar</span>
                          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-blue-50 rounded-2xl p-6 text-center">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                  </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Você ainda não participa de nenhum grupo</h3>
                <p className="text-gray-600 mb-4">Crie seu próprio grupo ou entre em um grupo existente</p>
                <div className="flex gap-3 justify-center">
                    <Button 
                      onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Criar Grupo
                    </Button>
                    <Button 
                      onClick={() => setShowJoinModal(true)}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl"
                    >
                    <Share2 className="h-4 w-4 mr-1.5" />
                    Entrar com Código
                    </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Grupos públicos com design aprimorado */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-2">
                <BookOpen className="h-5 w-5 text-green-600" />
              </div>
              Grupos Públicos
            </h2>
            
            {publicGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicGroups.map(group => (
                  <div
                    key={group.id}
                    className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1 duration-300 border border-gray-100 group"
                  >
                    <div className="bg-gradient-to-r from-green-600 via-green-500 to-teal-600 px-5 py-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white text-lg truncate flex items-center">
                          <Unlock className="h-4 w-4 mr-2 flex-shrink-0" />
                        {group.name}
                      </h3>
                        <div className="bg-white/20 rounded-full px-3 py-1 text-xs font-medium text-white">
                          {group.online_count} online
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <div className="mb-4">
                        <p className="text-gray-600 line-clamp-2 h-12">
                          {group.description || "Sem descrição."}
                      </p>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-500 mr-1.5" />
                          <span className="text-sm text-gray-500">{group.members_count || 0} membros</span>
                        </div>
                        
                        <Button 
                          onClick={() => {
                            StudyGroupService.joinGroupByCode(group.access_code || '')
                              .then((result) => {
                                if (result.success && result.groupId) {
                                  toast.success('Você entrou no grupo com sucesso!');
                                  loadUserGroups();
                                  router.push(`/comunidade/grupos-estudos/${result.groupId}`);
                                } else {
                                  toast.error(result.message || 'Erro ao entrar no grupo');
                                }
                              })
                              .catch((error: unknown) => {
                                console.error('Erro ao entrar no grupo:', error);
                                toast.error('Erro ao entrar no grupo');
                              });
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm rounded-xl px-4 py-2 transition-colors"
                        >
                          Participar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-50 rounded-2xl p-6 text-center">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum grupo público encontrado</h3>
                <p className="text-gray-600">Tente uma nova busca ou crie seu próprio grupo</p>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Modais */}
      {showCreateModal && (
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleGroupCreated}
        />
      )}
      
      {showJoinModal && (
      <JoinGroupModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleGroupJoined}
      />
      )}
    </div>
  );
}
