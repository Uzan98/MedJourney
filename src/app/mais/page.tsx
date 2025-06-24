'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  User, 
  Settings, 
  HelpCircle, 
  LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { maisMenu } from '@/components/layout/navigation';

export default function MaisPage() {
  const router = useRouter();
  const { signOut } = useAuth();

  // Menus adicionais que não estão no maisMenu
  const additionalMenus = [
    {
      path: "/estatisticas",
      label: "Estatísticas",
      icon: <BarChart3 className="h-6 w-6" />,
      description: "Acompanhe seu desempenho"
    },
    {
      path: "/perfil",
      label: "Perfil",
      icon: <User className="h-6 w-6" />,
      description: "Gerencie suas informações"
    }
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-24">
      <div className="max-w-lg mx-auto pt-6 px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Mais opções</h1>
        <p className="text-gray-600 mb-6">Acesse outras funcionalidades do MedJourney</p>
        
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          {maisMenu.map((item, index) => (
            <React.Fragment key={item.href}>
              <Link 
                href={item.href}
                className="flex items-center p-4 hover:bg-blue-50 transition-colors"
              >
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  {React.createElement(item.icon, { className: "h-6 w-6 text-blue-600" })}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </Link>
              {index < maisMenu.length - 1 && (
                <div className="h-px bg-gray-100 mx-4" />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Menus adicionais */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          {additionalMenus.map((item, index) => (
            <React.Fragment key={item.path}>
              <Link 
                href={item.path}
                className="flex items-center p-4 hover:bg-blue-50 transition-colors"
              >
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  {React.cloneElement(item.icon, { className: "text-blue-600" })}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.label}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </Link>
              {index < additionalMenus.length - 1 && (
                <div className="h-px bg-gray-100 mx-4" />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Configurações e Ajuda */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <Link 
            href="/configuracoes"
            className="flex items-center p-4 hover:bg-blue-50 transition-colors"
          >
            <div className="bg-gray-100 p-3 rounded-lg mr-4">
              <Settings className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-800">Configurações</h3>
              <p className="text-sm text-gray-500">Personalize sua experiência</p>
            </div>
          </Link>
          
          <div className="h-px bg-gray-100 mx-4" />
          
          <Link 
            href="/ajuda"
            className="flex items-center p-4 hover:bg-blue-50 transition-colors"
          >
            <div className="bg-gray-100 p-3 rounded-lg mr-4">
              <HelpCircle className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-800">Ajuda</h3>
              <p className="text-sm text-gray-500">Suporte e informações</p>
            </div>
          </Link>
        </div>
        
        {/* Botão de Logout */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center p-4 bg-white rounded-xl shadow-sm hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-500 font-medium">Sair da conta</span>
        </button>
      </div>
    </div>
  );
} 