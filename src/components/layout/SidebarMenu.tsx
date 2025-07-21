"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  ClipboardList, 
  Settings, 
  BookText,
  FileQuestion,
  Users,
  Home,
  ChevronDown,
  ChevronRight,
  Brain,
  Trophy,
  Shield,
  MessageCircle,
  Layers,
  School,
  CreditCard
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarMenuProps {
  collapsed?: boolean;
  onToggleSubmenu?: (path: string) => void;
  expandedMenus?: string[];
  className?: string;
}

interface Submenu {
  path: string;
  label: string;
  icon: React.ReactNode;
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  submenu?: Submenu[];
  adminOnly?: boolean;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({ 
  collapsed = false, 
  onToggleSubmenu, 
  expandedMenus = [],
  className = '' 
}) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClientComponentClient();

  // Verificar se o usuário é administrador
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .single();
        
        setIsAdmin(!!data);
      } catch (error) {
        console.error('Erro ao verificar status de administrador:', error);
      }
    }
    
    checkAdminStatus();
  }, [user, supabase]);

  // Menu items definition
  const menuItems: MenuItem[] = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/dashboard/disciplinas",
      label: "Disciplinas",
      icon: <BookOpen className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/planejamento",
      label: "Planejamento",
      icon: <Calendar className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/planejamento/inteligente",
      label: "Planejamento AI",
      icon: <Brain className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/banco-questoes",
      label: "Banco de Questões",
      icon: <FileQuestion className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/simulados",
      label: "Simulados",
      icon: <ClipboardList className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/flashcards",
      label: "Flashcards",
      icon: <Layers className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/estudos",
      label: "Painel de Estudos",
      icon: <BookText className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/comunidade",
      label: "Comunidade",
      icon: <Users className="h-5 w-5 flex-shrink-0" />,
      submenu: [
        {
          path: "/comunidade/feed",
          label: "Feed da Comunidade",
          icon: <MessageCircle className="h-5 w-5 flex-shrink-0" />
        },
        {
          path: "/comunidade/grupos-estudos",
          label: "Grupos de Estudos",
          icon: <Users className="h-5 w-5 flex-shrink-0" />
        },
        {
          path: "/comunidade/desafios",
          label: "Desafios",
          icon: <Trophy className="h-5 w-5 flex-shrink-0" />
        }
      ]
    },
    {
      path: "/minha-faculdade",
      label: "Minha Faculdade",
      icon: <School className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/admin",
      label: "Admin",
      icon: <Shield className="h-5 w-5 flex-shrink-0" />,
      adminOnly: true
    }
  ];

  // Check if the current path matches the menu item
  const isActive = (path: string) => {
    if (pathname === path) return true;
    
    // Casos especiais para evitar ativação incorreta
    // Dashboard não deve estar ativo quando estamos em /dashboard/disciplinas
    if (path === "/dashboard" && pathname === "/dashboard/disciplinas") {
      return false;
    }
    
    // Dashboard não deve estar ativo quando estamos em qualquer subpágina do dashboard
    if (path === "/dashboard" && pathname.startsWith("/dashboard/") && pathname !== "/dashboard") {
      return false;
    }
    
    // Planejamento não deve estar ativo quando estamos em Planejamento IA
    if (path === "/planejamento" && pathname.startsWith("/planejamento/inteligente")) {
      return false;
    }
    
    // Check if it's a subpath
    if (pathname.startsWith(`${path}/`) && path !== '/') {
      // Exceção para o dashboard, que não deve mostrar como ativo para subpáginas
      if (path === "/dashboard") {
        return false;
      }
      return true;
    }
    
    return false;
  };

  // Check if any submenu item is active
  const isActiveSubmenu = (parentPath: string, submenu?: Submenu[]) => {
    if (!submenu) return false;
    
    return submenu.some(item => {
      if (pathname === item.path) return true;
      
      if (pathname.startsWith(item.path + '/')) {
        return true;
      }
      
      return false;
    });
  };

  // Check if submenu is expanded
  const isSubmenuExpanded = (path: string) => {
    return expandedMenus.includes(path);
  };

  // Get CSS classes for nav links
  const getNavLinkClasses = (path: string, isSubmenuItem = false, isParentWithActiveChild = false) => {
    const baseClasses = collapsed
      ? "flex items-center justify-center"
      : "flex items-center space-x-3 px-3";
    
    let stateClasses = "";
    
    if (isActive(path)) {
      stateClasses = isSubmenuItem 
        ? "text-white bg-blue-800" 
        : "text-white bg-blue-700 font-medium";
    } else if (isParentWithActiveChild) {
      stateClasses = "text-white bg-blue-600";
    } else {
      stateClasses = isSubmenuItem 
        ? "text-blue-200 hover:bg-blue-800 hover:text-white" 
        : "text-blue-100 hover:bg-blue-700 hover:text-white";
    }
    
    const paddingClasses = isSubmenuItem ? 'py-1.5' : 'py-2';
    
    return `${baseClasses} ${stateClasses} ${paddingClasses} rounded-md transition-colors duration-200`;
  };

  // Render menu item
  const renderMenuItem = (item: MenuItem) => {
    // Não renderizar itens de admin se o usuário não for admin
    if (item.adminOnly && !isAdmin) {
      return null;
    }

    const isParentActive = isActiveSubmenu(item.path, item.submenu);
    const linkClasses = getNavLinkClasses(item.path, false, isParentActive);

    if (item.submenu) {
      return (
        <div className="py-1" key={item.path}>
          <div className="flex items-center justify-between pr-1">
            <Link
              href={item.path}
              className={`${linkClasses} whitespace-nowrap flex-grow`}
              onClick={(e) => {
                if (isSubmenuExpanded(item.path) && onToggleSubmenu) {
                  e.preventDefault();
                  onToggleSubmenu(item.path);
                }
              }}
            >
              <div className={`min-w-8 ${collapsed ? '' : 'pl-2'}`}>
                {item.icon}
              </div>
              {!collapsed && <span className="whitespace-nowrap pr-2">{item.label}</span>}
            </Link>
            {!collapsed && onToggleSubmenu && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onToggleSubmenu(item.path);
                }}
                className="p-2 rounded-lg hover:bg-blue-700"
                aria-label={isSubmenuExpanded(item.path) ? "Collapse submenu" : "Expand submenu"}
              >
                <ChevronDown 
                  className={`h-4 w-4 transition-transform ${isSubmenuExpanded(item.path) ? 'rotate-180' : ''}`} 
                />
              </button>
            )}
          </div>
          
          {!collapsed && isSubmenuExpanded(item.path) && (
            <div className="mt-1 pl-4 ml-4 border-l border-blue-500 space-y-1">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.path}
                  href={subItem.path}
                  className={getNavLinkClasses(subItem.path, true)}
                >
                  <div className="min-w-8">
                    {subItem.icon}
                  </div>
                  <span className="truncate">{subItem.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <Link
        key={item.path}
        href={item.path}
        className={linkClasses}
      >
        <div className={`min-w-8 ${collapsed ? '' : 'pl-2'}`}>
          {item.icon}
        </div>
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className={`space-y-1 flex-1 px-4 pb-4 overflow-y-auto custom-scrollbar ${className}`}>
      {!collapsed && (
        <p className="text-blue-300 text-xs font-medium uppercase tracking-wider mb-2 px-3 sticky top-0 bg-blue-600 py-2">
          Menu Principal
        </p>
      )}

      {menuItems.map(item => renderMenuItem(item))}
      
      <div className="pt-4 border-t border-blue-500 mt-4">
        <Link href="/perfil/assinatura" className={getNavLinkClasses("/perfil/assinatura")}>
          <div className={`min-w-8 ${collapsed ? '' : 'pl-2'}`}>
            <CreditCard className="h-5 w-5 flex-shrink-0" />
          </div>
          {!collapsed && <span>Minha Assinatura</span>}
        </Link>
        
        <Link href="/configuracoes" className={getNavLinkClasses("/configuracoes")}>
          <div className={`min-w-8 ${collapsed ? '' : 'pl-2'}`}>
            <Settings className="h-5 w-5 flex-shrink-0" />
          </div>
          {!collapsed && <span>Configurações</span>}
        </Link>
      </div>
    </div>
  );
};

export default SidebarMenu; 
