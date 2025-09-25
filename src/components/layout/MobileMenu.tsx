"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Home,
  FileQuestion, 
  BookText,
  Users,
  Plus,
  Calendar,
  ClipboardList,
  Settings,
  MoreHorizontal,
  School
} from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionTier } from '@/types/subscription';
import { NavigationItem, mainNavigation } from './navigation';

interface MobileMenuProps {
  className?: string;
  forceShow?: boolean;
  lockMobileSidebar?: (locked: boolean) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ 
  className = '', 
  forceShow = false,
  lockMobileSidebar
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [shouldRender, setShouldRender] = useState(false);
  const { checkFeatureAccess, isProOrHigher, isProPlusOrHigher, showUpgradeModal } = useSubscription();

  // Ativa o bloqueio do sidebar quando este componente carregar
  useEffect(() => {
    if (lockMobileSidebar) {
      lockMobileSidebar(true);
    }
    
    // Libera o bloqueio ao desmontar o componente
    return () => {
      if (lockMobileSidebar) {
        lockMobileSidebar(false);
      }
    };
  }, [lockMobileSidebar]);

  // Check if we should render the menu
  // Only render on protected routes (authenticated pages) unless forceShow is true
  useEffect(() => {
    const protectedPaths = ['/dashboard', '/estudos', '/banco-questoes', '/simulados', '/provas', '/comunidade', '/planejamento', '/planner', '/configuracoes', '/disciplinas', '/minha-faculdade', '/perfil', '/mais', '/hub-estudos', '/flashcards', '/cronometro', '/estatisticas', '/desempenho', '/tarefas', '/faltas', '/genomed-bank'];
    
    // Check if current path is a protected path or a subpath of one
    const isProtectedRoute = protectedPaths.some(path => 
      pathname === path || (pathname.startsWith(path + '/') && path !== '/')
    );

    // Only render if it's a protected route or if forceShow is true
    setShouldRender(isProtectedRoute || forceShow);
  }, [pathname, forceShow]);

  // Use the first 4 items from mainNavigation and add "Mais" button
  const primaryMenuItems = mainNavigation.slice(0, 4).map(item => ({
    path: item.href,
    label: item.name,
    icon: React.createElement(item.icon, { className: "h-5 w-5" }),
    requiredSubscription: item.requiredSubscription,
    featureKey: item.featureKey,
    badge: item.badge
  }));

  // Add "Mais" button as the 5th item
  const moreMenuItem = {
    path: '/mais',
    label: 'Mais',
    icon: React.createElement(MoreHorizontal, { className: "h-5 w-5" }),
    requiredSubscription: undefined,
    featureKey: undefined,
    badge: undefined
  };

  const allMenuItems = [...primaryMenuItems, moreMenuItem];

  // Check if the current path matches the menu item
  const isActive = (path: string) => {
    if (pathname === path) return true;
    
    // Check if it's a subpath
    if (pathname.startsWith(`${path}/`) && path !== '/') {
      return true;
    }
    
    return false;
  };

  // Função para navegar manualmente
  const handleNavigation = (path: string, item: any) => {
    // Check subscription restrictions
    if (item.requiredSubscription === SubscriptionTier.PRO && !isProOrHigher()) {
      showUpgradeModal(SubscriptionTier.PRO);
      return;
    }
    
    if (item.requiredSubscription === SubscriptionTier.PRO_PLUS && !isProPlusOrHigher()) {
      showUpgradeModal(SubscriptionTier.PRO_PLUS);
      return;
    }
    
    if (item.featureKey && !checkFeatureAccess(item.featureKey)) {
      showUpgradeModal();
      return;
    }
    
    // Only navigate if we're not already on the path
    if (pathname !== path) {
      router.push(path);
    }
  };

  // Function to handle restricted navigation items
  const handleNavItemClick = (item: NavigationItem, e: React.MouseEvent) => {
    if (item.requiredSubscription === SubscriptionTier.PRO && !isProOrHigher()) {
      e.preventDefault();
      showUpgradeModal(SubscriptionTier.PRO);
      return;
    }
    
    if (item.requiredSubscription === SubscriptionTier.PRO_PLUS && !isProPlusOrHigher()) {
      e.preventDefault();
      showUpgradeModal(SubscriptionTier.PRO_PLUS);
      return;
    }
    
    if (item.featureKey && !checkFeatureAccess(item.featureKey)) {
      e.preventDefault();
      showUpgradeModal();
      return;
    }
  };

  if (!shouldRender) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${className}`}>
      {/* Menu Bar */}
      <div className="bg-white border-t border-gray-200 shadow-lg rounded-t-xl">
        <div className="flex justify-around items-center px-1 py-2">
          {allMenuItems.map((item, index) => {
            const active = isActive(item.path);
            
            return (
              <Link
                key={index}
                href={item.path}
                onClick={(e) => {
                  // For "Mais" button, no subscription check needed
                  if (item.path === '/mais') {
                    return;
                  }
                  
                  const navItem = mainNavigation.find(nav => nav.href === item.path);
                  if (navItem) {
                    handleNavItemClick(navItem, e);
                  }
                }}
                className={`
                 flex flex-col items-center justify-center py-1.5 px-1.5 rounded-lg transition-all duration-200 relative min-w-0 flex-1
                 ${active 
                   ? 'text-blue-600 bg-blue-50' 
                   : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                 }
               `}
              >
                {item.badge && (
                   <span className={`
                     absolute -top-0.5 -right-0.5 text-[7px] px-0.5 py-0.5 rounded-full font-bold z-10 leading-none
                     ${item.badgeColor || 'bg-blue-500 text-white'}
                   `}>
                     {item.badge}
                   </span>
                 )}
                 <div className={`
                   p-1.5 rounded-lg transition-all duration-200 mb-0.5
                   ${active ? 'bg-blue-100' : ''}
                 `}>
                   {item.icon}
                 </div>
                 <span className="text-[9px] font-medium text-center leading-tight truncate w-full">
                   {item.label}
                 </span>
              </Link>
            );
          })}
        </div>
        
        {/* Safe area padding for iOS */}
        <div className="h-safe-bottom bg-white"></div>
      </div>
    </div>
  );
};

export default MobileMenu;
