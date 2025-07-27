'use client';

import React, { useState } from 'react';
import { ChecklistItem } from '@/lib/types/dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  className?: string;
}

export const Checklist: React.FC<ChecklistProps> = ({ items, onChange, className }) => {
  const [newItemText, setNewItemText] = useState('');

  const addItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: Date.now().toString(),
        text: newItemText.trim(),
        completed: false
      };
      onChange([...items, newItem]);
      setNewItemText('');
    }
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const toggleItem = (id: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const updateItemText = (id: string, text: string) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, text } : item
    ));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <div className="flex items-center opacity-50 group-hover:opacity-100 transition-opacity">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => toggleItem(item.id)}
              className="flex-shrink-0"
            />
            <Input
              value={item.text}
              onChange={(e) => updateItemText(item.id, e.target.value)}
              className={cn(
                'flex-1 border-none shadow-none p-0 h-auto focus-visible:ring-0',
                item.completed && 'line-through text-gray-500'
              )}
              placeholder="Item da checklist"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Adicionar item à checklist"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={!newItemText.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {items.length > 0 && (
        <div className="text-sm text-gray-500">
          {items.filter(item => item.completed).length} de {items.length} concluídos
        </div>
      )}
    </div>
  );
};

export default Checklist;