'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange' | 'indigo';
  className?: string;
}

const colorVariants = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  red: 'from-red-500 to-red-600',
  yellow: 'from-yellow-500 to-yellow-600',
  purple: 'from-purple-500 to-purple-600',
  orange: 'from-orange-500 to-orange-600',
  indigo: 'from-indigo-500 to-indigo-600',
};

const backgroundVariants = {
  blue: 'from-blue-50 to-blue-100',
  green: 'from-green-50 to-green-100',
  red: 'from-red-50 to-red-100',
  yellow: 'from-yellow-50 to-yellow-100',
  purple: 'from-purple-50 to-purple-100',
  orange: 'from-orange-50 to-orange-100',
  indigo: 'from-indigo-50 to-indigo-100',
};

export default function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  color = 'blue',
  className
}: StatCardProps) {
  return (
    <div className={cn(
      'bg-gradient-to-br rounded-xl shadow-md overflow-hidden transform transition-all hover:shadow-lg hover:scale-[1.02]',
      backgroundVariants[color],
      className
    )}>
      <div className="relative p-6">
        {/* Background Icon */}
        <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
          <div className="w-full h-full flex items-center justify-center">
            {icon}
          </div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <p className={cn(
            'text-sm font-medium mb-1',
            `text-${color}-600`
          )}>
            {title}
          </p>
          
          <div className="flex items-center">
            <p className={cn(
              'text-3xl font-bold',
              `text-${color}-700`
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            
            <div className={cn(
              'ml-3 p-2 rounded-lg',
              `bg-${color}-100`
            )}>
              <div className={cn(
                'h-5 w-5',
                `text-${color}-600`
              )}>
                {icon}
              </div>
            </div>
          </div>
          
          {description && (
            <p className="text-xs text-gray-600 mt-2">
              {description}
            </p>
          )}
          
          {trend && (
            <div className="flex items-center mt-2">
              <span className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-1">
                {trend.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}