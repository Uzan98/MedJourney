"use client";

import React, { useState } from 'react';
import { DISCIPLINE_THEMES, getThemeById, ThemeDefinition } from '../../constants/themes';
import { Palette } from 'lucide-react';

/**
 * Componente para exibir um seletor de temas em forma de grade.
 */
interface ThemePickerProps {
  value: string;
  onChange: (themeId: string) => void;
  label?: string;
}

export const ThemePicker: React.FC<ThemePickerProps> = ({ 
  value, 
  onChange, 
  label = "Tema" 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="grid grid-cols-3 gap-2">
        {DISCIPLINE_THEMES.map((theme) => (
          <div 
            key={theme.id}
            onClick={() => onChange(theme.id)}
            className={`
              cursor-pointer p-2 rounded-md border transition-all hover:shadow
              ${value === theme.id ? 'border-blue-500 shadow-md' : 'border-gray-200'}
            `}
          >
            <div 
              className={`w-full h-8 rounded-md mb-1 bg-gradient-to-r ${theme.gradient}`}
            ></div>
            <div className="text-xs text-center">{theme.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Componente para exibir um indicador visual com as cores do tema.
 */
interface ThemeBadgeProps {
  themeId: string;
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ThemeBadge: React.FC<ThemeBadgeProps> = ({ 
  themeId, 
  text, 
  size = 'md',
  className = ''
}) => {
  const theme = getThemeById(themeId);
  
  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };
  
  return (
    <div
      className={`
        inline-flex items-center rounded-full bg-gradient-to-r ${theme.gradient} 
        ${theme.textColor} font-medium ${sizes[size]} ${className}
      `}
    >
      {text || theme.name}
    </div>
  );
};

/**
 * Componente para mostrar uma disciplina com visual baseado no tema
 */
interface ThemedCardProps {
  themeId: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  themeId,
  title,
  subtitle,
  children,
  onClick,
  className = ''
}) => {
  const theme = getThemeById(themeId);
  
  return (
    <div 
      onClick={onClick}
      className={`
        rounded-lg overflow-hidden shadow-md border border-gray-200 
        hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}
      `}
    >
      <div className={`p-4 bg-gradient-to-r ${theme.gradient} ${theme.textColor}`}>
        <h3 className="font-bold">{title}</h3>
        {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
      </div>
      {children && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Componente que exibe um ícone de círculo colorido para indicar o tema
 */
interface ThemeCircleProps {
  themeId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ThemeCircle: React.FC<ThemeCircleProps> = ({
  themeId,
  size = 'md',
  className = ''
}) => {
  const theme = getThemeById(themeId);
  
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div 
      className={`rounded-full ${sizes[size]} ${className}`}
      style={{ background: theme.color }}
      title={theme.name}
    />
  );
}; 