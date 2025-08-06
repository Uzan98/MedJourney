'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target } from 'lucide-react';
import { toast } from 'sonner';

interface UpdateGoalProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: {
    id: string;
    title: string;
    progress: number;
    target: number;
    unit: string;
  };
  onUpdateProgress: (goalId: string, newValue: number) => Promise<void>;
}

export default function UpdateGoalProgressModal({
  isOpen,
  onClose,
  goal,
  onUpdateProgress
}: UpdateGoalProgressModalProps) {
  const [newValue, setNewValue] = useState(goal.progress.toString());
  const [isLoading, setIsLoading] = useState(false);

  const progressPercentage = Math.round((goal.progress / goal.target) * 100);
  const newProgressPercentage = Math.round((parseInt(newValue) || 0) / goal.target * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const value = parseInt(newValue);
    
    if (isNaN(value) || value < 0) {
      toast.error('Por favor, insira um valor válido');
      return;
    }
    
    if (value > goal.target) {
      toast.error(`O valor não pode ser maior que a meta (${goal.target} ${goal.unit})`);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdateProgress(goal.id, value);
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewValue(goal.progress.toString());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Atualizar Progresso
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Meta Info */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-2">{goal.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Target className="h-4 w-4" />
              <span>Meta: {goal.target} {goal.unit}</span>
            </div>
          </div>

          {/* Current Progress */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Progresso Atual: {goal.progress} {goal.unit} ({progressPercentage}%)
            </Label>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* New Value Input */}
          <div className="space-y-2">
            <Label htmlFor="newValue" className="text-sm font-medium text-gray-700">
              Novo Valor ({goal.unit})
            </Label>
            <Input
              id="newValue"
              type="number"
              min="0"
              max={goal.target}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={`Digite o novo valor (máx: ${goal.target})`}
              className="text-center text-lg font-semibold"
            />
          </div>

          {/* Preview Progress */}
          {newValue && !isNaN(parseInt(newValue)) && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Novo Progresso: {parseInt(newValue)} {goal.unit} ({newProgressPercentage}%)
              </Label>
              <Progress value={newProgressPercentage} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              disabled={isLoading || newValue === goal.progress.toString()}
            >
              {isLoading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}