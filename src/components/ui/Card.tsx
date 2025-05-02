"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MoreVertical } from 'lucide-react';

// Componente Card Principal
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  showOptions?: boolean;
}

export function Card({ className, children, title, icon, showOptions, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md",
        className
      )}
      {...props}
    >
      {(title || icon || showOptions) && (
        <div className="flex items-center justify-between p-6 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 bg-gray-50 rounded-md text-gray-700">
                {icon}
              </div>
            )}
            {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
          </div>
          {showOptions && (
            <button className="p-1.5 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      <div className={cn("p-6", { "pt-4": title || icon })}>
        {children}
      </div>
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
      className={cn("flex flex-col space-y-1.5 p-6", className)}
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
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
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
      className={cn("text-sm text-gray-500", className)}
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
    <div className={cn("p-6 pt-0", className)} {...props}>
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
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Componente CardStat melhorado
interface CardStatProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  className?: string;
  color?: string;
}

export function CardStat({ label, value, icon, trend, trendLabel, className, color }: CardStatProps) {
  // Definição das cores para os ícones
  const getIconBg = () => {
    if (color === 'blue') return 'bg-blue-100 text-blue-600';
    if (color === 'green') return 'bg-green-100 text-green-600';
    if (color === 'purple') return 'bg-purple-100 text-purple-600';
    if (color === 'yellow') return 'bg-yellow-100 text-yellow-600';
    if (color === 'red') return 'bg-red-100 text-red-600';
    if (color === 'indigo') return 'bg-indigo-100 text-indigo-600';
    if (color === 'pink') return 'bg-pink-100 text-pink-600';
    if (color === 'teal') return 'bg-teal-100 text-teal-600';
    return 'bg-blue-100 text-blue-600'; // Default azul
  };

  return (
    <div className={cn('p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow transition-all duration-200 hover:border-gray-200', className)}>
      <div className="flex items-center gap-4 mb-2">
        {icon && (
          <div className={cn('p-3 rounded-lg flex items-center justify-center', getIconBg())}>
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-800">
            {value}
            {trend && (
              <span
                className={cn('ml-2 text-sm font-medium inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5', {
                  'bg-green-50 text-green-600': trend === 'up',
                  'bg-red-50 text-red-600': trend === 'down',
                  'bg-gray-50 text-gray-600': trend === 'neutral',
                })}
              >
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente CardGrid melhorado
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
    <div className={cn(`grid gap-4`, gridCols[columns], className)}>
      {children}
    </div>
  );
}