"use client";

import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text' | 'button';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'shimmer'
}) => {
  const baseClass = "bg-gray-200 dark:bg-gray-700 rounded relative overflow-hidden";
  
  const variantClass = {
    rectangular: "rounded-md",
    circular: "rounded-full",
    text: "rounded h-4",
    button: "rounded-md h-10"
  }[variant];

  // Estilos inline para dimensões passadas como props
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;
  
  // Retornar apenas o skeleton sem animação
  if (animation === 'none') {
    return (
      <div 
        className={cn(baseClass, variantClass, className)} 
        style={style}
      />
    );
  }
  
  // Classe de animação específica
  const animationClass = {
    pulse: "animate-pulse",
    shimmer: "skeleton-shimmer"
  }[animation];

  return (
    <div 
      className={cn(
        baseClass, 
        variantClass, 
        animationClass, 
        className
      )} 
      style={style}
    >
      {animation === 'shimmer' && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}
    </div>
  );
};

// Componentes para casos específicos que usamos com frequência
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Skeleton 
    className={cn("w-full h-[180px]", className)} 
    variant="rectangular"
  />
);

export const TextSkeleton: React.FC<{ lines?: number, className?: string }> = ({ 
  lines = 1, 
  className 
}) => (
  <div className="space-y-2">
    {Array(lines).fill(0).map((_, i) => (
      <Skeleton 
        key={i} 
        className={cn("w-full h-4", i === lines - 1 && lines > 1 ? "w-4/5" : "", className)} 
        variant="text" 
      />
    ))}
  </div>
);

export const CircleSkeleton: React.FC<{ size?: number, className?: string }> = ({ 
  size = 40, 
  className 
}) => (
  <Skeleton 
    className={cn("", className)} 
    width={size} 
    height={size} 
    variant="circular" 
  />
);

export const ButtonSkeleton: React.FC<{ className?: string, width?: string | number }> = ({ 
  className, 
  width = '100%'
}) => (
  <Skeleton 
    className={cn("h-10", className)} 
    width={width} 
    variant="button" 
  />
);

// Esqueleto para um card de dashboard
export const DashboardCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden p-6", className)}>
    <div className="flex items-center gap-3 mb-4">
      <CircleSkeleton size={40} />
      <TextSkeleton lines={2} className="flex-1" />
    </div>
    <div className="space-y-4">
      <TextSkeleton lines={3} />
      <ButtonSkeleton width="40%" />
    </div>
  </div>
);

// Esqueleto para uma linha de tabela
export const TableRowSkeleton: React.FC<{ columns?: number, className?: string }> = ({ 
  columns = 4, 
  className 
}) => (
  <div className={cn("flex gap-4 py-3", className)}>
    {Array(columns).fill(0).map((_, i) => (
      <Skeleton 
        key={i} 
        className={cn(
          "h-6", 
          i === 0 ? "w-1/4" : "flex-1"
        )} 
        variant="text" 
      />
    ))}
  </div>
); 