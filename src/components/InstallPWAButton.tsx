"use client";

import React from 'react';
import { usePWA } from './PWAProvider';
import { Download } from 'lucide-react';

interface InstallPWAButtonProps {
  className?: string;
  variant?: 'default' | 'subtle' | 'prominent';
  children?: React.ReactNode;
}

const InstallPWAButton: React.FC<InstallPWAButtonProps> = ({
  className = '',
  variant = 'default',
  children
}) => {
  const { isInstallable, isInstalled, promptInstall } = usePWA();

  // Não mostrar nada se não for instalável ou já estiver instalado
  if (!isInstallable || isInstalled) {
    return null;
  }

  // Variantes de estilo
  const buttonStyles = {
    default: 'flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors',
    subtle: 'flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 text-sm rounded-full hover:bg-blue-100 transition-colors',
    prominent: 'flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all'
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    promptInstall();
  };

  return (
    <button
      onClick={handleClick}
      className={`${buttonStyles[variant]} ${className}`}
    >
      <Download className="h-5 w-5 mr-2" />
      {children || 'Instalar Aplicativo'}
    </button>
  );
};

export default InstallPWAButton; 