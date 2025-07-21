"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  ClipboardList, 
  BarChart2, 
  Settings, 
  Bell, 
  Search,
  FileText,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Book,
  Brain,
  ChevronDown,
  ChevronUp,
  ListTodo,
  GraduationCap,
  FileQuestion,
  Users,
  Clock,
  User,
  LogOut,
  MoreHorizontal,
  School,
  CreditCard
} from 'lucide-react';
import MobileMenu from './MobileMenu';
import SidebarMenu from './SidebarMenu';
import { useAuth } from '@/contexts/AuthContext';
import NotificationPermission from '../NotificationPermission';

interface AppLayoutProps {
  children: React.ReactNode;
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
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pathname = usePathname();
  // Flag para controlar se o sidebar pode ser aberto em dispositivos móveis
  const [isMobileSidebarLocked, setIsMobileSidebarLocked] = useState(false);
  // Estado para controlar o dropdown de perfil
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Obtém dados do usuário do contexto de autenticação
  const { user, signOut } = useAuth();

  // Definição dos menus e submenus
  const menuItems: MenuItem[] = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/dashboard/disciplinas",
      label: "Disciplinas",
      icon: <Book className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/estudos",
      label: "Painel de Estudos",
      icon: <BookOpen className="h-5 w-5 flex-shrink-0" />
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
      path: "/comunidade",
      label: "Comunidade",
      icon: <Users className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/minha-faculdade",
      label: "Minha Faculdade",
      icon: <School className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/mais",
      label: "Mais Opções",
      icon: <MoreHorizontal className="h-5 w-5 flex-shrink-0" />
    }
  ];

  // Efeito para expandir automaticamente o menu pai quando um item de submenu está ativo
  useEffect(() => {
    const activeMenus: string[] = [];
    
    // Verifica quais menus devem ficar abertos com base no caminho atual
    menuItems.forEach(item => {
      if (item.submenu) {
        // Verifica se algum submenu está ativo
        const hasActiveSubmenu = item.submenu.some(subItem => 
          pathname === subItem.path || pathname.startsWith(`${subItem.path}/`)
        );
        
        // Se tiver um submenu ativo, adiciona o menu pai à lista de menus expandidos
        if (hasActiveSubmenu) {
          activeMenus.push(item.path);
        }
      }
    });
    
    // Atualiza os menus expandidos
    setExpandedMenus(activeMenus);
  }, [pathname]);

  // Efeito para salvar e restaurar o estado do sidebar no localStorage
  useEffect(() => {
    // Tenta recuperar o estado salvo do sidebar apenas na montagem inicial
    try {
      if (typeof window !== 'undefined') {
        const savedState = localStorage.getItem('sidebarState');
        if (savedState !== null) {
          setIsSidebarOpen(savedState === 'open');
        }
      }
    } catch (error) {
      console.error('Erro ao acessar localStorage:', error);
    }
  }, []); // Dependência vazia para executar apenas na montagem

  // Efeito separado para salvar o estado quando ele mudar
  useEffect(() => {
    // Salva o estado atual do sidebar quando ele mudar
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarState', isSidebarOpen ? 'open' : 'closed');
      }
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }, [isSidebarOpen]);

  const toggleSidebar = (fromMobileMenu = false) => {
    // Se a chamada veio do menu mobile e o sidebar está bloqueado, não faz nada
    if (fromMobileMenu && isMobileSidebarLocked) {
      return;
    }
    
    setIsSidebarOpen(prevState => !prevState);
  };
  
  // Versão do toggleSidebar para eventos de clique
  const handleToggleSidebar = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    toggleSidebar(false);
  };
  
  // Método para bloquear/desbloquear o sidebar em dispositivos móveis
  const lockMobileSidebar = (locked = true) => {
    setIsMobileSidebarLocked(locked);
  };

  const toggleSubmenu = (path: string) => {
    if (expandedMenus.includes(path)) {
      setExpandedMenus(expandedMenus.filter(item => item !== path));
    } else {
      setExpandedMenus([...expandedMenus, path]);
    }
  };

  // Verifica se o caminho atual corresponde ao link fornecido
  const isActive = (path: string) => {
    // Verificação simples para caminho exato
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
    
    // Verificação especial para submenus
    // Planejamento e Planejamento Inteligente são considerados itens independentes
    if (path === "/planejamento" && pathname.startsWith("/planejamento/inteligente")) {
      return false;
    }
    
    // Para o caminho de Planejamento Inteligente, garantir que é considerado ativo quando estamos em suas subpáginas
    if (path === "/planejamento/inteligente" && pathname.startsWith("/planejamento/inteligente/")) {
      return true;
    }
    
    // Verificação para URLs que começam com o mesmo path
    // mas apenas se for uma página filha direta (ex: /planejamento/[id])
    const pathParts = path.split('/').filter(Boolean);
    const pathnameParts = pathname.split('/').filter(Boolean);
    
    // Se o path é exatamente igual, retorna true
    if (pathParts.length === pathnameParts.length && path === pathname) {
      return true;
    }
    
    // Se o caminho atual começa com o path do item e tem mais um nível apenas
    // Por exemplo, /planejamento/123 é filho de /planejamento, mas /planejamento/inteligente/abc não é
    if (pathname.startsWith(path + '/') && pathnameParts.length === pathParts.length + 1) {
      // Exceção para o dashboard, que não deve mostrar como ativo para subpáginas
      if (path === "/dashboard") {
        return false;
      }
      return true;
    }
    
    return false;
  };

  // Verifica se o caminho atual está em um submenu específico
  const isActiveSubmenu = (parentPath: string, submenu?: Submenu[]) => {
    if (!submenu) return false;
    
    // Verifica se algum item do submenu está ativo
    return submenu.some(item => {
      // Verifica se o caminho atual corresponde exatamente ao item do submenu
      if (pathname === item.path) return true;
      
      // Verifica se o caminho atual é filho direto do item do submenu
      const itemParts = item.path.split('/').filter(Boolean);
      const pathnameParts = pathname.split('/').filter(Boolean);
      
      if (pathname.startsWith(item.path + '/') && pathnameParts.length === itemParts.length + 1) {
        return true;
      }
      
      return false;
    });
  };

  // Verifica se o submenu está expandido
  const isSubmenuExpanded = (path: string) => {
    return expandedMenus.includes(path);
  };

  // Aplica a classe de estilo correto com base no estado ativo do link
  const getNavLinkClasses = (path: string, isSubmenuItem = false, isMobile = false, isParentWithActiveChild = false) => {
    const baseClasses = isMobile
      ? "flex items-center space-x-3"
      : `flex items-center ${isSidebarOpen ? 'space-x-3 justify-start px-3' : 'justify-center'}`;
    
    // Classes específicas baseadas no estado do item
    let stateClasses = "";
    
    if (isActive(path)) {
      // Item está ativo
      stateClasses = isSubmenuItem 
        ? "text-white bg-blue-800" 
        : "text-white bg-blue-700 font-medium";
    } else if (isParentWithActiveChild) {
      // Para item pai com filho ativo
      stateClasses = "text-white bg-blue-600";
    } else {
      // Estado padrão inativo
      stateClasses = isSubmenuItem 
        ? "text-blue-200 hover:bg-blue-800 hover:text-white" 
        : "text-blue-100 hover:bg-blue-700 hover:text-white";
    }
    
    const paddingClasses = isSubmenuItem ? 'py-1.5' : 'py-2';
    
    return `${baseClasses} ${stateClasses} ${isMobile ? 'px-3' : ''} ${paddingClasses} rounded-md transition-colors duration-200`;
  };

  const renderMenuItem = (item: MenuItem, isMobile = false, level = 0) => {
    const isParentActive = isActiveSubmenu(item.path, item.submenu);
    const linkClasses = getNavLinkClasses(item.path, false, isMobile, isParentActive);

    if (item.submenu) {
      return (
        <div className="py-1" key={item.path}>
          <div className="flex items-center justify-between pr-1">
            <Link
              href={item.path}
              className={`${linkClasses} whitespace-nowrap flex-grow`}
              onClick={(e) => {
                if (isSubmenuExpanded(item.path)) {
                  e.preventDefault();
                  toggleSubmenu(item.path);
                }
              }}
            >
              <div className={`min-w-8 ${isMobile ? '' : 'pl-2'}`}>
                {item.icon}
              </div>
              <span className="whitespace-nowrap pr-2">{item.label}</span>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleSubmenu(item.path);
              }}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label={isSubmenuExpanded(item.path) ? "Collapse submenu" : "Expand submenu"}
            >
              <ChevronDown 
                className={`h-4 w-4 transition-transform ${isSubmenuExpanded(item.path) ? 'rotate-180' : ''}`} 
              />
            </button>
          </div>
          
          {isSubmenuExpanded(item.path) && (
            <div className="mt-1 pl-4 ml-4 border-l border-gray-200 dark:border-gray-700 space-y-1">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.path}
                  href={subItem.path}
                  className={getNavLinkClasses(subItem.path, true, isMobile)}
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
        onClick={(e) => {
          console.log(`Navegando para: ${item.path}`);
        }}
      >
        <div className={`min-w-8 ${isMobile ? '' : 'pl-2'}`}>
          {item.icon}
        </div>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  // Função para alternar o dropdown de perfil
  const handleProfileToggle = () => {
    setIsProfileOpen(!isProfileOpen);
  };
  
  // Função para lidar com o logout
  const handleSignOut = async () => {
    await signOut();
  };
  
  // Fecha o dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const profileButton = document.getElementById('profile-button');
      const profileDropdown = document.getElementById('profile-dropdown');
      
      if (
        isProfileOpen && 
        profileButton && 
        profileDropdown && 
        !profileButton.contains(event.target as Node) && 
        !profileDropdown.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  return (
    <div className="flex h-screen">
      {/* Sidebar - Desktop */}
      <div 
        className={`bg-blue-600 text-white flex flex-col transition-all duration-300 ease-in-out relative ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } hidden md:flex`}
      >
        {/* Logo area */}
        <div className={`flex items-center ${isSidebarOpen ? 'space-x-3' : 'justify-center'} pt-4 px-4 pb-2 flex-shrink-0`}>
          <div className="bg-blue-400 p-2 rounded-md flex-shrink-0">
            <div className="h-8 w-8 bg-blue-200 rounded-md flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          {isSidebarOpen && <span className="text-xl font-bold">MedJourney</span>}
        </div>
        
        {/* Toggle button */}
        <div className="absolute top-20 -right-3 z-10">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSidebarOpen(prev => !prev);
            }}
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full text-white shadow-md border border-blue-400"
            aria-label={isSidebarOpen ? "Retrair menu" : "Expandir menu"}
          >
            {isSidebarOpen 
              ? <ChevronLeft className="h-4 w-4" /> 
              : <ChevronRight className="h-4 w-4" />
            }
          </button>
        </div>
        
        {/* Menu container com scroll próprio */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Nav links com scroll - Usando o novo componente SidebarMenu */}
          <SidebarMenu 
            collapsed={!isSidebarOpen} 
            onToggleSubmenu={toggleSubmenu} 
            expandedMenus={expandedMenus}
          />
          
          {/* Bottom links - fora da área de scroll */}
          {isSidebarOpen && (
            <div className="pt-4 border-t border-blue-500 px-4 pb-4 flex-shrink-0">
              <div className="bg-blue-500 text-white rounded-lg p-3 mt-2 text-sm">
                <p className="font-medium">Precisa de ajuda?</p>
                <p className="text-blue-100 text-xs mt-1">Entre em contato com o suporte para qualquer dúvida.</p>
                <button className="w-full bg-blue-400 hover:bg-blue-300 text-blue-800 py-1.5 px-3 rounded-md text-sm font-medium mt-3">
                  Contato
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Somente renderiza a parte mobile do sidebar se não estiver bloqueado */}
      {!isMobileSidebarLocked && (
        <>
          {/* Sidebar - Mobile Overlay */}
          <div 
            className={`fixed inset-0 bg-gray-800 bg-opacity-50 z-40 md:hidden transition-opacity duration-300 ${
              isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`} 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSidebarOpen(false);
            }}
          ></div>
          
          {/* Sidebar - Mobile */}
          <div 
            className={`fixed inset-y-0 left-0 z-50 bg-blue-600 text-white flex flex-col transition-transform duration-300 ease-in-out w-64 md:hidden ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Logo area - Mobile */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-400 p-2 rounded-md">
                  <div className="h-8 w-8 bg-blue-200 rounded-md flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <span className="text-xl font-bold">MedJourney</span>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSidebarOpen(false);
                }} 
                className="text-blue-100 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Menu container com scroll próprio - Mobile */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Mobile Nav com scroll - Usando o novo componente SidebarMenu */}
              <SidebarMenu 
                onToggleSubmenu={toggleSubmenu} 
                expandedMenus={expandedMenus}
              />
              
              {/* Bottom links - Mobile, fora da área de scroll */}
              <div className="pt-4 border-t border-blue-500 px-4 pb-4 flex-shrink-0">
                <div className="bg-blue-500 text-white rounded-lg p-3 mt-2 text-sm">
                  <p className="font-medium">Precisa de ajuda?</p>
                  <p className="text-blue-100 text-xs mt-1">Entre em contato com o suporte para qualquer dúvida.</p>
                  <button className="w-full bg-blue-400 hover:bg-blue-300 text-blue-800 py-1.5 px-3 rounded-md text-sm font-medium mt-3">
                    Contato
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSidebarOpen(prev => !prev);
              }}
              className="mr-4 text-gray-500 hover:text-gray-700 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <div className="bg-blue-500 p-1.5 rounded-md mr-2 hidden sm:flex">
                <div className="h-6 w-6 bg-blue-100 rounded-md flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-blue-800">MedJourney</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden sm:block">
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-9 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            
            {/* Notifications */}
            <button className="relative p-1 rounded-full bg-gray-100 hover:bg-gray-200">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
            
            {/* User Profile Dropdown */}
            <div className="relative">
              <button 
                id="profile-button"
                onClick={handleProfileToggle}
                className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100"
              >
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Avatar" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-white" />
                  )}
                </div>
                <span className="font-medium text-sm hidden sm:inline-block">
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'}
                </span>
              </button>
              
              {isProfileOpen && (
                <div 
                  id="profile-dropdown"
                  className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg py-2 z-50 animate-fade-in"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.user_metadata?.name || 'Usuário'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user?.email || ''}
                    </p>
                  </div>
                  
                  <div className="py-1">
                    <Link 
                      href="/perfil" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="h-4 w-4 mr-3 text-gray-500" />
                      Meu Perfil
                    </Link>
                    <Link 
                      href="/perfil/assinatura" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <CreditCard className="h-4 w-4 mr-3 text-gray-500" />
                      Minha Assinatura
                    </Link>
                    <Link 
                      href="/configuracoes" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4 mr-3 text-gray-500" />
                      Configurações
                    </Link>
                  </div>
                  
                  <div className="py-1 border-t border-gray-100">
                    <button 
                      onClick={handleSignOut}
                      className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-red-500" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto p-0 sm:p-6 bg-gray-50 max-w-full w-full pb-16 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Menu - Passa a função de bloqueio para o MobileMenu */}
      <MobileMenu forceShow lockMobileSidebar={lockMobileSidebar} />

      {/* Componente de permissão de notificação */}
      <NotificationPermission />
    </div>
  );
};

export default AppLayout;
