'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, Search, ArrowLeft, Users, AlertTriangle, 
  ChevronRight, RefreshCw, Lock, Unlock, Share2, 
  BookOpen, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StudyGroup, StudyGroupService } from '@/services/study-group.service';

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
        loadPublicGroups()
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
        loadPublicGroups()
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
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-6xl">
        {/* Header com design desktop */}
        <div className="relative mb-10">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
          
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center flex-1 min-w-0">
              <Link 
                href="/comunidade" 
                className="mr-4 p-3 rounded-full bg-white shadow-sm hover:shadow-md hover:bg-gray-50 transition-all flex-shrink-0"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-2 leading-tight">Grupos de Estudos</h1>
                <p className="text-base text-gray-600">Estude de forma colaborativa com colegas em grupos personalizados</p>
              </div>
            </div>
            
            <button 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="p-3 rounded-full bg-white shadow-sm hover:shadow-md hover:bg-gray-50 transition-all flex-shrink-0"
              aria-label="Atualizar dados"
            >
              <RefreshCw className={`h-5 w-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      
        {/* Ações rápidas com design mobile-first */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 sm:gap-3 h-12 sm:h-14 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <div className="bg-blue-400/30 p-1.5 sm:p-2 rounded-full">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="font-medium text-sm sm:text-base">Criar Novo Grupo</span>
          </Button>
          
          <Button 
              className="flex items-center justify-center gap-2 sm:gap-3 h-12 sm:h-14 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all"
           >
             <div className="bg-green-400/30 p-1.5 sm:p-2 rounded-full">
               <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
             </div>
             <span className="font-medium text-sm sm:text-base">Entrar com Código</span>
           </Button>
         </div>
         
         {loading ? (
           <div className="flex flex-col items-center justify-center py-16 sm:py-20">
             <div className="animate-spin rounded-full h-12 w-12 sm:h-14 sm:w-14 border-t-2 border-b-2 border-blue-600 mb-4"></div>
             <p className="text-gray-600 font-medium text-sm sm:text-base">Carregando grupos de estudos...</p>
           </div>
      ) : (
        <>
            {/* Meus grupos com design mobile-first */}
            <div className="mb-8 sm:mb-10">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-5 flex items-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2 sm:mr-2.5" />
                Meus Grupos
              </h2>
              
              {myGroups.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {myGroups.map(group => (
                    <Link
                      key={group.id}
                      href={`/comunidade/grupos-estudos/${group.id}`}
                      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-1 hover:scale-[1.01] duration-300"
                    >
                      <div className={`bg-gradient-to-r ${group.is_private ? 'from-blue-600 to-blue-700' : 'from-green-600 to-green-700'} px-4 sm:px-5 py-3 sm:py-4 flex justify-between items-center`}>
                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center truncate mr-2">
                          {group.name}
                        </h3>
                        {group.is_private ? (
                          <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-white/80 flex-shrink-0" />
                        ) : (
                          <Unlock className="h-4 w-4 sm:h-5 sm:w-5 text-white/80 flex-shrink-0" />
                        )}
                      </div>
                      <div className="p-4 sm:p-5">
                        <p className="text-gray-600 mb-3 sm:mb-4 line-clamp-2 text-sm sm:text-base">
                          {group.description || 'Grupo de estudos personalizado.'}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                          <div className="flex items-center text-xs sm:text-sm bg-blue-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
                            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 mr-1 sm:mr-1.5" />
                            <span className="text-blue-700 font-medium">{group.online_count || 0}/{group.members_count || 0} online</span>
                          </div>
                          <span className="flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base">
                            <span className="mr-1 sm:mr-1.5">Acessar</span>
                            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-dashed border-blue-300 p-6 sm:p-8 mb-6 sm:mb-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-blue-50 rounded-full mb-4 sm:mb-5 shadow-inner">
                      <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2 sm:mb-3">Você não participa de nenhum grupo</h3>
                    <p className="text-gray-600 mb-5 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
                      Crie seu próprio grupo de estudos ou entre em grupos existentes usando o código de acesso para começar a estudar em colaboração.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                      <Button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2.5 px-4 sm:px-5 rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all text-sm sm:text-base"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar meu grupo
                      </Button>
                      <Button 
                        onClick={() => setShowJoinModal(true)}
                        className="bg-green-100 hover:bg-green-200 text-green-700 font-medium py-2.5 px-4 sm:px-5 rounded-lg flex items-center justify-center shadow-sm hover:shadow transition-all text-sm sm:text-base"
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
    </div>
  );
}
