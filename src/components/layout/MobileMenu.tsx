"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Home,
  FileQuestion, 
  BookText,
  Users,
  Plus
} from 'lucide-react';

interface MobileMenuProps {
  className?: string;
  forceShow?: boolean;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ className = '', forceShow = false }) => {
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);

  // Check if we should render the menu
  // Don't render on protected routes unless forceShow is true
  useEffect(() => {
    const protectedPaths = ['/dashboard', '/estudos', '/banco-questoes', '/simulados', '/comunidade', '/planejamento'];
    
    // Check if current path is a protected path or a subpath of one
    const isProtectedRoute = protectedPaths.some(path => 
      pathname === path || (pathname.startsWith(path + '/') && path !== '/')
    );

    // Only render if it's not a protected route or if forceShow is true
    setShouldRender(!isProtectedRoute || forceShow);
  }, [pathname, forceShow]);

  // Menu items for the mobile navigation
  const menuItems = [
    {
      path: "/dashboard",
      label: "Home",
      icon: <Home className="h-5 w-5" />
    },
    {
      path: "/banco-questoes",
      label: "Questões",
      icon: <FileQuestion className="h-5 w-5" />
    },
    {
      path: "/planejamento",
      label: "Estudos",
      icon: <BookText className="h-5 w-5" />
    },
    {
      path: "/comunidade",
      label: "Comunidade",
      icon: <Users className="h-5 w-5" />
    }
  ];

  // Check if the current path matches the menu item
  const isActive = (path: string) => {
    if (pathname === path) return true;
    
    // Check if it's a subpath
    if (pathname.startsWith(`${path}/`) && path !== '/') {
      return true;
    }
    
    return false;
  };

  if (!shouldRender) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${className}`}>
      {/* FAB - Floating Action Button */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6">
        <Link href="/planejamento/nova-sessao">
          <button className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">
            <Plus className="h-6 w-6" />
          </button>
        </Link>
      </div>
      
      {/* Menu Bar */}
      <div className="bg-white border-t border-gray-200 shadow-lg rounded-t-xl">
        <div className="flex justify-around items-center px-2">
          {menuItems.map((item, index) => {
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex flex-col items-center py-3 px-3 relative ${
                  active 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                } transition-colors duration-200`}
              >
                <div className={`p-1.5 rounded-full ${active ? 'bg-blue-100' : ''} transition-colors duration-200`}>
                  {item.icon}
                </div>
                <span className="text-xs mt-1 font-medium">{item.label}</span>
                
                {/* Active indicator */}
                {active && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-600 rounded-full"></div>
                )}
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