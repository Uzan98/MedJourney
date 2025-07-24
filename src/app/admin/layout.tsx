"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Database, 
  Trophy, 
  Users, 
  Settings, 
  Home,
  BookOpen,
  BarChart3,
  LogOut,
  UserCog,
  FileQuestion,
  Gauge,
  ShieldAlert,
  Bell,
  Wrench,
  HelpCircle,
  LayoutDashboard,
  Shield
} from 'lucide-react';

// Exportar configurações para todas as páginas admin
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Interface para os itens do menu
interface AdminMenuItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description?: string;
  submenu?: AdminMenuItem[];
}

const adminMenuItems: AdminMenuItem[] = [
  { 
    name: 'Dashboard', 
    href: '/admin', 
    icon: LayoutDashboard,
    description: 'Visão geral do sistema' 
  },
  { 
    name: 'Usuários', 
    href: '/admin/usuarios', 
    icon: UserCog,
    description: 'Gerenciar usuários do sistema',
    submenu: [
      { name: 'Lista de Usuários', href: '/admin/usuarios', icon: Users },
      { name: 'Permissões', href: '/admin/usuarios/permissoes', icon: ShieldAlert }
    ]
  },
  { 
    name: 'Banco de Questões', 
    href: '/admin/banco-questoes', 
    icon: FileQuestion,
    description: 'Gerenciar questões do banco'
  },
  { 
    name: 'Desafios', 
    href: '/admin/desafios', 
    icon: Trophy,
    description: 'Gerenciar desafios da comunidade'
  },
  { 
    name: 'Estatísticas', 
    href: '/admin/estatisticas', 
    icon: BarChart3,
    description: 'Métricas e análises de uso'
  },
  { 
    name: 'Banco de Dados', 
    href: '/admin/database', 
    icon: Database,
    description: 'Gerenciar banco de dados',
    submenu: [
      { name: 'Estrutura', href: '/admin/database', icon: Database },
      { name: 'Funções', href: '/admin/database/setup-functions', icon: Wrench },
      { name: 'Relações', href: '/admin/database/fix-relations', icon: Database },
      { name: 'Smart Planning', href: '/admin/database/setup-smart-planning', icon: Gauge },
      { name: 'Políticas de Segurança', href: '/admin/database/security-policies', icon: Shield },
      { name: 'Corrigir Contador', href: '/admin/database/fix-questions-counter', icon: Database }
    ]
  },
  { 
    name: 'Configurações', 
    href: '/admin/configuracoes', 
    icon: Settings,
    description: 'Configurações do sistema'
  },
  { 
    name: 'Notificações', 
    href: '/admin/notificacoes', 
    icon: Bell,
    description: 'Gerenciar notificações do sistema'
  },
  { 
    name: 'Suporte', 
    href: '/admin/suporte', 
    icon: HelpCircle,
    description: 'Central de suporte'
  }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Verificar se um item ou submenu está ativo
  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Verificar se algum submenu está ativo
  const hasActiveSubmenu = (item: AdminMenuItem) => {
    if (!item.submenu) return false;
    return item.submenu.some(subItem => isActive(subItem.href));
  };

  // Renderizar um item do menu
  const renderMenuItem = (item: AdminMenuItem) => {
    const isItemActive = isActive(item.href);
    const hasActiveChild = hasActiveSubmenu(item);
    const Icon = item.icon;
    
    return (
      <li key={item.href} className="mb-1">
        <Link 
          href={item.href}
          className={`flex items-center px-4 py-2 rounded-md transition-colors ${
            isItemActive || hasActiveChild
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/30'
          }`}
          title={item.description}
        >
          <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
          <span className="truncate">{item.name}</span>
        </Link>
        
        {/* Submenu */}
        {item.submenu && (isItemActive || hasActiveChild) && (
          <ul className="pl-10 mt-1 space-y-1">
            {item.submenu.map(subItem => {
              const SubIcon = subItem.icon;
              const isSubActive = isActive(subItem.href);
              
              return (
                <li key={subItem.href}>
                  <Link 
                    href={subItem.href}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isSubActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/30'
                    }`}
                    title={subItem.description}
                  >
                    <SubIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{subItem.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Menu lateral */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-md flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Administração</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Painel de controle</p>
        </div>
        
        <nav className="mt-4 flex-1 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {adminMenuItems.map(renderMenuItem)}
          </ul>
        </nav>
          
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <Link 
              href="/dashboard"
            className="flex items-center px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/30 transition-colors w-full"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span>Voltar ao App</span>
            </Link>
          </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
} 
