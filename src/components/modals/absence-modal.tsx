'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, BookOpen, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AbsencesService, CreateAbsenceData } from '@/lib/services/absences.service';

interface AbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAbsenceCreated: () => void;
}

export default function AbsenceModal({
  isOpen,
  onClose,
  onAbsenceCreated
}: AbsenceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateAbsenceData>({
    subject_name: '',
    absence_date: new Date().toISOString().split('T')[0],
    reason: '',
    is_justified: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject_name.trim()) {
      toast.error('Por favor, informe a matéria');
      return;
    }

    if (!formData.absence_date) {
      toast.error('Por favor, informe a data da falta');
      return;
    }

    setIsLoading(true);
    try {
      await AbsencesService.createAbsence(formData);
      toast.success('Falta registrada com sucesso!');
      onAbsenceCreated();
      onClose();
      
      // Reset form
      setFormData({
        subject_name: '',
        absence_date: new Date().toISOString().split('T')[0],
        reason: '',
        is_justified: false
      });
    } catch (error) {
      console.error('Erro ao registrar falta:', error);
      toast.error('Erro ao registrar falta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      // Reset form when closing
      setFormData({
        subject_name: '',
        absence_date: new Date().toISOString().split('T')[0],
        reason: '',
        is_justified: false
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-red-600" />
            Registrar Falta
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Matéria *
            </Label>
            <Input
              id="subject"
              type="text"
              placeholder="Ex: Anatomia, Fisiologia, Farmacologia..."
              value={formData.subject_name}
              onChange={(e) => setFormData(prev => ({ ...prev, subject_name: e.target.value }))}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Data da Falta *
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.absence_date}
              onChange={(e) => setFormData(prev => ({ ...prev, absence_date: e.target.value }))}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Motivo (opcional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo da falta (opcional)..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              disabled={isLoading}
              className="w-full min-h-[80px] resize-none"
            />
          </div>

          {/* Justified */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="justified"
              checked={formData.is_justified}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_justified: checked as boolean }))
              }
              disabled={isLoading}
            />
            <Label 
              htmlFor="justified" 
              className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              <CheckCircle className="h-4 w-4 text-green-600" />
              Falta justificada
            </Label>
          </div>

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
              disabled={isLoading || !formData.subject_name.trim() || !formData.absence_date}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            >
              {isLoading ? 'Registrando...' : 'Registrar Falta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}