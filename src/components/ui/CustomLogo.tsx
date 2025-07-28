"use client";

import React from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';

interface CustomLogoProps {
  /** Caminho para o ícone personalizado (PNG/SVG) */
  iconPath?: string;
  /** Tamanho do ícone em pixels */
  size?: number;
  /** Classes CSS adicionais */
  className?: string;
  /** Cor do ícone padrão (quando não há ícone personalizado) */
  iconColor?: string;
  /** Se deve usar o ícone padrão mesmo com iconPath definido */
  useDefault?: boolean;
}

const CustomLogo: React.FC<CustomLogoProps> = ({
  iconPath,
  size = 20,
  className = '',
  iconColor = 'text-blue-600',
  useDefault = false
}) => {
  // Se não há ícone personalizado ou está forçando o padrão, usa o BookOpen
  if (!iconPath || useDefault) {
    return (
      <BookOpen 
        className={`${className} ${iconColor}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Renderiza o ícone personalizado
  return (
    <Image
      src={iconPath}
      alt="Logo"
      width={size}
      height={size}
      className={`${className} object-contain`}
      priority
    />
  );
};

export default CustomLogo;