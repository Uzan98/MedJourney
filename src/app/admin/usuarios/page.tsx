"use client";

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserCog, 
  Search, 
  UserPlus, 
  Shield, 
  Edit, 
  Trash2, 
  Mail,
  Check,
  X,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: {
    name?: string;
    avatar_url?: string;
  };
  is_admin?: boolean;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { user, isAdmin, checkAdminStatus } = useAuth();

  useEffect(() => {
    async function verifyAccessAndLoadUsers() {
      try {
        // Verificar se o usuário atual é admin
        if (!user) {
          console.log("Admin/Usuários: Nenhum usuário autenticado, redirecionando para dashboard");
          router.push('/dashboard');
          return;
        }
        
        // Verificar status de administrador
        const adminStatus = await checkAdminStatus();
        console.log("Admin/Usuários: Status de administrador:", adminStatus);
        
        if (!adminStatus) {
          console.log("Admin/Usuários: Usuário não é administrador, redirecionando para dashboard");
          router.push('/dashboard');
          return;
        }
        
        // Carregar lista de usuários
        await loadUsers();
      } catch (error) {
        console.error('Erro ao verificar permissões ou carregar usuários:', error);
        router.push('/dashboard');
      }
    }
    
    verifyAccessAndLoadUsers();
  }, [router, supabase, user, checkAdminStatus]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Buscar usuários do Supabase Auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        throw authError;
      }
      
      // Buscar administradores
      const { data: adminUsers } = await supabase
        .from('admin_users')
        .select('user_id');
      
      const adminIds = (adminUsers || []).map(admin => admin.user_id);
      
      // Combinar dados
      const usersList = authUsers?.users.map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata,
        is_admin: adminIds.includes(user.id)
      })) || [];
      
      setUsers(usersList);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      alert('Erro ao carregar lista de usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.user_metadata?.name && user.user_metadata.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const toggleAdminStatus = async (userId: string, isCurrentlyAdmin: boolean) => {
    try {
      if (isCurrentlyAdmin) {
        // Remover privilégios de admin
        const { error } = await supabase
          .from('admin_users')
          .delete()
          .eq('user_id', userId);
          
        if (error) throw error;
      } else {
        // Adicionar privilégios de admin
        const { error } = await supabase
          .from('admin_users')
          .insert({ user_id: userId });
          
        if (error) throw error;
      }
      
      // Atualizar lista
      await loadUsers();
    } catch (error) {
      console.error('Erro ao alterar status de administrador:', error);
      alert('Erro ao alterar permissões do usuário');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <UserCog className="mr-2 h-6 w-6" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie os usuários do sistema e suas permissões
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={loadUsers}
            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
            title="Atualizar lista"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            onClick={() => alert('Funcionalidade em desenvolvimento')}
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Adicionar Usuário
          </button>
        </div>
      </div>
      
      {/* Barra de busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar usuários por nome ou email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>
      
      {/* Tabela de usuários */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Último acesso
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                    <span className="mt-2 block">Carregando usuários...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {user.user_metadata?.avatar_url ? (
                            <img 
                              src={user.user_metadata.avatar_url} 
                              alt={user.user_metadata?.name || user.email} 
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-medium">
                                {(user.user_metadata?.name || user.email || '?')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.user_metadata?.name || 'Sem nome'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_sign_in_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleAdminStatus(user.id, !!user.is_admin)}
                        className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${
                          user.is_admin
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {user.is_admin ? (
                          <>
                            <Shield className="h-3.5 w-3.5 mr-1" />
                            Admin
                          </>
                        ) : (
                          'Usuário'
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-900"
                          title="Enviar email"
                          onClick={() => alert('Funcionalidade em desenvolvimento')}
                        >
                          <Mail className="h-5 w-5" />
                        </button>
                        <button 
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Editar usuário"
                          onClick={() => alert('Funcionalidade em desenvolvimento')}
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          title="Excluir usuário"
                          onClick={() => alert('Funcionalidade em desenvolvimento')}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}