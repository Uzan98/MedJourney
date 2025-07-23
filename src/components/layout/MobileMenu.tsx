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
  GraduationCap,
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
  // Don't render on protected routes unless forceShow is true
  useEffect(() => {
    const protectedPaths = ['/dashboard', '/estudos', '/banco-questoes', '/simulados', '/comunidade', '/planejamento', '/configuracoes', '/disciplinas', '/minha-faculdade'];
    
    // Check if current path is a protected path or a subpath of one
    const isProtectedRoute = protectedPaths.some(path => 
      pathname === path || (pathname.startsWith(path + '/') && path !== '/')
    );

    // Only render if it's not a protected route or if forceShow is true
    setShouldRender(!isProtectedRoute || forceShow);
  }, [pathname, forceShow]);

  // Use the first 4 items from mainNavigation
  const primaryMenuItems = mainNavigation.slice(0, 4).map(item => ({
    path: item.href,
    label: item.name,
    icon: React.createElement(item.icon, { className: "h-5 w-5" }),
    requiredSubscription: item.requiredSubscription,
    featureKey: item.featureKey,
    badge: item.badge
  }));

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
        <div className="flex justify-around items-center px-0.5 py-2">
          {primaryMenuItems.map((item, index) => {
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path, item)}
                className={`flex flex-col items-center py-0.5 px-1 relative ${
                  active 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                } transition-colors duration-200`}
              >
                <div className={`p-1 rounded-full ${active ? 'bg-blue-100' : ''} transition-colors duration-200 relative`}>
                  {item.icon}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 px-1 text-[0.6rem] rounded-full bg-blue-100 text-blue-800">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[8px] mt-0.5 font-medium truncate max-w-10 text-center">{item.label}</span>
                
                {/* Active indicator */}
                {active && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </button>
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
