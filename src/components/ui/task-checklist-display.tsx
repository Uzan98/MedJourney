'use client';

import React from 'react';
import { ChecklistItem } from '@/lib/types/dashboard';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskChecklistDisplayProps {
  items: ChecklistItem[];
  className?: string;
  maxItems?: number;
}

export const TaskChecklistDisplay: React.FC<TaskChecklistDisplayProps> = ({ 
  items, 
  className, 
  maxItems = 3 
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const displayItems = items.slice(0, maxItems);
  const hasMoreItems = items.length > maxItems;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Checklist</span>
        <span>{completedCount}/{totalCount} concluídos</span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
          style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
        />
      </div>
      
      {/* Checklist items */}
      <div className="space-y-1">
        {displayItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs">
            {item.completed ? (
              <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
            ) : (
              <Circle className="h-3 w-3 text-gray-400 flex-shrink-0" />
            )}
            <span 
              className={cn(
                'truncate',
                item.completed && 'line-through text-muted-foreground'
              )}
            >
              {item.text}
            </span>
          </div>
        ))}
        
        {hasMoreItems && (
          <div className="text-xs text-muted-foreground pl-5">
            +{items.length - maxItems} mais itens
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskChecklistDisplay;