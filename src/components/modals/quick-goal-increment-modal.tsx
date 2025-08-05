'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface QuickGoalIncrementModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: {
    id: string;
    title: string;
    progress: number;
    target: number;
    unit: string;
  };
  onIncrementProgress: (goalId: string, increment: number) => Promise<void>;
}

export default function QuickGoalIncrementModal({
  isOpen,
  onClose,
  goal,
  onIncrementProgress
}: QuickGoalIncrementModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const progressPercentage = Math.round((goal.progress / goal.target) * 100);
  const remainingToTarget = goal.target - goal.progress;

  // Definir incrementos baseados na unidade
  const getIncrements = () => {
    switch (goal.unit) {
      case 'horas':
        return [0.5, 1, 2, 4];
      case 'questões':
        return [5, 10, 25, 50];
      case 'cards':
        return [10, 20, 50, 100];
      case 'páginas':
        return [5, 10, 20, 50];
      case 'exercícios':
        return [1, 5, 10, 20];
      case 'simulados':
        return [1, 2, 3, 5];
      default:
        return [1, 5, 10, 25];
    }
  };

  const increments = getIncrements();

  const handleIncrement = async (increment: number) => {
    if (goal.progress + increment > goal.target) {
      toast.error(`Incremento muito alto! Restam apenas ${remainingToTarget} ${goal.unit} para completar a meta.`);
      return;
    }

    setIsLoading(true);
    try {
      await onIncrementProgress(goal.id, increment);
      onClose();
    } catch (error) {
      console.error('Erro ao incrementar progresso:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIncrementColor = (increment: number) => {
    if (goal.progress + increment > goal.target) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    }
    return 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-green-600" />
            Incremento Rápido
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Meta Info */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-2">{goal.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <Target className="h-4 w-4" />
              <span>Meta: {goal.target} {goal.unit}</span>
            </div>
            
            {/* Current Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium text-gray-700">
                <span>Progresso: {goal.progress} {goal.unit}</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-gray-500">
                Restam {remainingToTarget} {goal.unit} para completar
              </p>
            </div>
          </div>

          {/* Quick Increment Buttons */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Incrementar rapidamente:
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              {increments.map((increment) => {
                const isDisabled = goal.progress + increment > goal.target;
                const newProgress = Math.min(goal.progress + increment, goal.target);
                const newPercentage = Math.round((newProgress / goal.target) * 100);
                
                return (
                  <Button
                    key={increment}
                    onClick={() => handleIncrement(increment)}
                    disabled={isLoading || isDisabled}
                    className={`h-16 flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${
                      isDisabled 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100' 
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white hover:scale-105'
                    }`}
                  >
                    <span className="text-lg font-bold">
                      +{increment}
                    </span>
                    <span className="text-xs opacity-90">
                      {goal.unit}
                    </span>
                    {!isDisabled && (
                      <span className="text-xs opacity-75">
                        → {newPercentage}%
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleIncrement(remainingToTarget)}
              disabled={isLoading || remainingToTarget <= 0}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isLoading ? 'Completando...' : `Completar Meta (+${remainingToTarget})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}