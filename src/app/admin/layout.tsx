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
  LogOut
} from 'lucide-react';

// Exportar configurações para todas as páginas admin
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const adminMenuItems = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Banco de Dados', href: '/admin/database', icon: Database },
  { name: 'Desafios', href: '/admin/desafios', icon: Trophy },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Menu lateral */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-md">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Administração</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Painel de controle</p>
        </div>
        
        <nav className="mt-4">
          <ul className="space-y-1 px-2">
            {adminMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              
              return (
                <li key={item.href}>
                  <Link 
                    href={item.href}
                    className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          
          <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 px-2">
            <Link 
              href="/dashboard"
              className="flex items-center px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/30 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span>Voltar ao App</span>
            </Link>
          </div>
        </nav>
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
} 
