"use client";

import React from 'react';
import { cn } from '../../lib/utils';
import { MoreVertical } from 'lucide-react';

// Componente Card Principal
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-50 overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Componente CardHeader
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('px-6 py-4 flex flex-col space-y-1.5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Componente CardTitle
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: React.ReactNode;
}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn('font-semibold text-lg text-gray-800', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

// Componente CardDescription
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children: React.ReactNode;
}

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-gray-500', className)}
      {...props}
    >
      {children}
    </p>
  );
}

// Componente CardContent
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div
      className={cn('p-6 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Componente CardFooter
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn('px-6 py-4 flex items-center', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Componente CardStat (original)
interface CardStatProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  className?: string;
}

export function CardStat({ label, value, icon, trend, trendLabel, className }: CardStatProps) {
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {icon && <div className="text-blue-500 bg-blue-50 p-2.5 rounded-lg">{icon}</div>}
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-semibold text-gray-800">
          {value}
          {trend && (
            <span
              className={cn('ml-2 text-sm', {
                'text-green-500': trend === 'up',
                'text-red-500': trend === 'down',
                'text-gray-500': trend === 'neutral',
              })}
            >
              {trendLabel || (trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→')}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// Componente CardGrid (original)
interface CardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function CardGrid({ children, className, columns = 2 }: CardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn(`grid gap-8 ${gridCols[columns]}`, className)}>
      {children}
    </div>
  );
} 