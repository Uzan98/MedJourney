"use client";

import React from 'react';
import { cn } from '../../lib/utils';
import { MoreVertical } from 'lucide-react';

interface CardProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  showOptions?: boolean;
  action?: React.ReactNode;
}

export const Card = ({ title, className, children, icon, showOptions = false, action }: CardProps) => {
  return (
    <div className={cn('bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden', className)}>
      {title && (
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-2">
            {icon && <div className="text-blue-500">{icon}</div>}
            <h3 className="font-medium text-gray-700 text-sm">{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            {action}
            {showOptions && (
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

interface CardStatProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  className?: string;
}

export const CardStat = ({ label, value, icon, trend, trendLabel, className }: CardStatProps) => {
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
};

interface CardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export const CardGrid = ({ children, className, columns = 2 }: CardGridProps) => {
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
}; 