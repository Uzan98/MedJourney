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
  GraduationCap
} from 'lucide-react';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pathname = usePathname();

  // Definição dos menus e submenus
  const menuItems: MenuItem[] = [
    {
      path: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/estudos",
      label: "Painel de Estudos",
      icon: <BookOpen className="h-5 w-5 flex-shrink-0" />,
      submenu: [
        {
          path: "/disciplinas",
          label: "Disciplinas",
          icon: <Book className="h-5 w-5 flex-shrink-0" />
        },
        {
          path: "/planejamento",
          label: "Planejamento",
          icon: <Calendar className="h-5 w-5 flex-shrink-0" />
        },
        {
          path: "/planejamento/inteligente",
          label: "Plano Inteligente",
          icon: <Brain className="h-5 w-5 flex-shrink-0" />
        },
        {
          path: "/planejamento/calendario",
          label: "Calendário",
          icon: <Calendar className="h-5 w-5 flex-shrink-0" />
        }
      ]
    },
    {
      path: "/simulados",
      label: "Simulados",
      icon: <ClipboardList className="h-5 w-5 flex-shrink-0" />
    },
    {
      path: "/estatisticas",
      label: "Estatísticas",
      icon: <BarChart2 className="h-5 w-5 flex-shrink-0" />
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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
    
    // Verificação especial para submenus
    // Evita que "/planejamento" seja considerado ativo quando estamos em "/planejamento/inteligente"
    if (path === "/planejamento" && 
        (pathname.startsWith("/planejamento/inteligente") || 
         pathname.startsWith("/planejamento/calendario"))) {
      return false;
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
      >
        <div className={`min-w-8 ${isMobile ? '' : 'pl-2'}`}>
          {item.icon}
        </div>
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - Desktop */}
      <div 
        className={`bg-blue-600 text-white flex flex-col transition-all duration-300 ease-in-out relative ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } hidden md:flex`}
      >
        {/* Logo area */}
        <div className={`flex items-center ${isSidebarOpen ? 'space-x-3' : 'justify-center'} mb-10 pt-4 px-4`}>
          <div className="bg-blue-400 p-2 rounded-md flex-shrink-0">
            <div className="h-8 w-8 bg-blue-200 rounded-md flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          {isSidebarOpen && <span className="text-xl font-bold">MedJourney</span>}
        </div>
        
        {/* Toggle button */}
        <div className="absolute top-20 -right-3">
          <button 
            onClick={toggleSidebar}
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full text-white shadow-md border border-blue-400"
            aria-label={isSidebarOpen ? "Retrair menu" : "Expandir menu"}
          >
            {isSidebarOpen 
              ? <ChevronLeft className="h-4 w-4" /> 
              : <ChevronRight className="h-4 w-4" />
            }
          </button>
        </div>
        
        {/* Nav links */}
        <div className="space-y-1 flex-1 px-4">
          {isSidebarOpen && (
            <p className="text-blue-300 text-xs font-medium uppercase tracking-wider mb-2 px-3">
              Menu Principal
            </p>
          )}

          {menuItems.map(item => renderMenuItem(item))}
        </div>
        
        {/* Bottom links */}
        <div className={`pt-4 border-t border-blue-500 mt-6 px-4 ${!isSidebarOpen && 'flex flex-col items-center'}`}>
          <Link href="/configuracoes" className={getNavLinkClasses("/configuracoes")}>
            <Settings className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Configurações</span>}
          </Link>
          
          {isSidebarOpen && (
            <div className="bg-blue-500 text-white rounded-lg p-3 mt-4 text-sm">
              <p className="font-medium">Precisa de ajuda?</p>
              <p className="text-blue-100 text-xs mt-1">Entre em contato com o suporte para qualquer dúvida.</p>
              <button className="w-full bg-blue-400 hover:bg-blue-300 text-blue-800 py-1.5 px-3 rounded-md text-sm font-medium mt-3">
                Contato
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Sidebar - Mobile */}
      <div className={`fixed inset-0 bg-gray-800 bg-opacity-50 z-40 md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={toggleSidebar}></div>
      
      <div 
        className={`fixed inset-y-0 left-0 z-50 bg-blue-600 text-white flex flex-col transition-transform duration-300 ease-in-out w-64 md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo area - Mobile */}
        <div className="flex items-center justify-between px-4 mb-10 pt-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-400 p-2 rounded-md">
              <div className="h-8 w-8 bg-blue-200 rounded-md flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <span className="text-xl font-bold">MedJourney</span>
          </div>
          <button onClick={toggleSidebar} className="text-blue-100 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Mobile Nav */}
        <div className="space-y-1 flex-1 px-4">
          <p className="text-blue-300 text-xs font-medium uppercase tracking-wider mb-2 px-3">
            Menu Principal
          </p>

          {menuItems.map(item => renderMenuItem(item, true))}
        </div>
        
        {/* Bottom links */}
        <div className="pt-4 border-t border-blue-500 mt-6 px-4">
          <Link href="/configuracoes" className={getNavLinkClasses("/configuracoes", false, true)}>
            <Settings className="h-5 w-5" />
            <span>Configurações</span>
          </Link>
          
          <div className="bg-blue-500 text-white rounded-lg p-3 mt-4 text-sm">
            <p className="font-medium">Precisa de ajuda?</p>
            <p className="text-blue-100 text-xs mt-1">Entre em contato com o suporte para qualquer dúvida.</p>
            <button className="w-full bg-blue-400 hover:bg-blue-300 text-blue-800 py-1.5 px-3 rounded-md text-sm font-medium mt-3">
              Contato
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar} 
              className="mr-4 text-gray-500 hover:text-gray-700 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">MedJourney</h1>
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
            
            {/* User */}
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                U
              </div>
              <span className="font-medium text-sm hidden sm:inline-block">Usuário</span>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 