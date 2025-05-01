"use client";

import React, { useState } from 'react';
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
  Brain
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Verifica se o caminho atual corresponde ao link fornecido
  const isActive = (path: string) => {
    return pathname === path;
  };

  // Aplica a classe de estilo correto com base no estado ativo do link
  const getNavLinkClasses = (path: string, isMobile = false) => {
    const baseClasses = isMobile
      ? "flex items-center space-x-3"
      : `flex items-center ${isSidebarOpen ? 'space-x-3 justify-start px-3' : 'justify-center'}`;
    
    const activeClasses = "text-white bg-blue-700";
    const inactiveClasses = "text-blue-100 hover:bg-blue-700";
    
    const stateClasses = isActive(path) ? activeClasses : inactiveClasses;
    
    return `${baseClasses} ${stateClasses} ${isMobile ? 'px-3' : ''} py-2 rounded-md`;
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

          <Link href="/" className={getNavLinkClasses("/")}>
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Dashboard</span>}
          </Link>
          
          <Link href="/estudos" className={getNavLinkClasses("/estudos")}>
            <BookOpen className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Painel de Estudos</span>}
          </Link>
          
          <Link href="/planejamento" className={getNavLinkClasses("/planejamento")}>
            <Calendar className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Planejamento</span>}
          </Link>
          
          <Link href="/planejamento/inteligente" className={getNavLinkClasses("/planejamento/inteligente")}>
            <Brain className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Plano Inteligente</span>}
          </Link>
          
          <Link href="/planejamento/calendario" className={getNavLinkClasses("/planejamento/calendario")}>
            <Calendar className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Calendário</span>}
          </Link>
          
          <Link href="/disciplinas" className={getNavLinkClasses("/disciplinas")}>
            <Book className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Disciplinas</span>}
          </Link>
          
          <Link href="/simulados" className={getNavLinkClasses("/simulados")}>
            <BookOpen className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Simulados</span>}
          </Link>
          
          <Link href="/estatisticas" className={getNavLinkClasses("/estatisticas")}>
            <BarChart2 className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Estatísticas</span>}
          </Link>
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

          <Link href="/" className={getNavLinkClasses("/", true)}>
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>
          
          <Link href="/estudos" className={getNavLinkClasses("/estudos", true)}>
            <BookOpen className="h-5 w-5" />
            <span>Painel de Estudos</span>
          </Link>
          
          <Link href="/planejamento" className={getNavLinkClasses("/planejamento", true)}>
            <Calendar className="h-5 w-5" />
            <span>Planejamento</span>
          </Link>
          
          <Link href="/planejamento/inteligente" className={getNavLinkClasses("/planejamento/inteligente", true)}>
            <Brain className="h-5 w-5" />
            <span>Plano Inteligente</span>
          </Link>
          
          <Link href="/planejamento/calendario" className={getNavLinkClasses("/planejamento/calendario", true)}>
            <Calendar className="h-5 w-5" />
            <span>Calendário</span>
          </Link>
          
          <Link href="/disciplinas" className={getNavLinkClasses("/disciplinas", true)}>
            <Book className="h-5 w-5" />
            <span>Disciplinas</span>
          </Link>
          
          <Link href="/simulados" className={getNavLinkClasses("/simulados", true)}>
            <BookOpen className="h-5 w-5" />
            <span>Simulados</span>
          </Link>
          
          <Link href="/estatisticas" className={getNavLinkClasses("/estatisticas", true)}>
            <BarChart2 className="h-5 w-5" />
            <span>Estatísticas</span>
          </Link>
        </div>
        
        {/* Bottom links */}
        <div className="pt-4 border-t border-blue-500 mt-6 px-4">
          <Link href="/configuracoes" className={getNavLinkClasses("/configuracoes", true)}>
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