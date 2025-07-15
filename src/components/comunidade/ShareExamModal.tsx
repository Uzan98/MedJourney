'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Exam } from '@/services/exams.service';
import { FacultyService } from '@/services/faculty.service';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/Spinner';

interface ShareExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: Exam | null;
  facultyId: number;
  onSuccess?: () => void;
}

export function ShareExamModal({ open, onOpenChange, exam, facultyId, onSuccess }: ShareExamModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(false);
  const [disciplinaType, setDisciplinaType] = useState<string>('existing');
  const [disciplina, setDisciplina] = useState<string>('');
  const [periodo, setPeriodo] = useState<string>('');

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: ''
    }
  });

  // Carregar disciplinas existentes
  useEffect(() => {
    if (open && facultyId) {
      setIsLoadingDisciplines(true);
      FacultyService.getFacultyDisciplines(facultyId)
        .then(disciplinesList => {
          setDisciplines(disciplinesList || []);
          if (disciplinesList && disciplinesList.length > 0) {
            setDisciplina(disciplinesList[0]);
          }
        })
        .catch(error => {
          console.error('Erro ao carregar disciplinas:', error);
        })
        .finally(() => {
          setIsLoadingDisciplines(false);
        });
    }
  }, [open, facultyId]);

  // Preencher o formulário quando o simulado é selecionado
  useEffect(() => {
    if (exam) {
      setValue('title', exam.title);
      setValue('description', exam.description || '');
      setValue('category', exam.category || '');
    }
  }, [exam, setValue]);

  const onSubmit = async (data: any) => {
    if (!exam || !facultyId) return;
    
    // Determinar qual disciplina usar baseado no tipo selecionado
    const finalDisciplina = disciplinaType === 'custom' ? disciplina : 
                           disciplinaType === 'existing' ? disciplina : null;
    
    setIsSubmitting(true);
    try {
      const examId = await FacultyService.shareFacultyExam(
        facultyId,
        exam.id!,
        {
          title: data.title,
          description: data.description,
          category: data.category,
          disciplina: finalDisciplina,
          periodo: periodo ? parseInt(periodo) : undefined
        }
      );
      
      if (examId) {
        toast({
          title: "Simulado compartilhado",
          description: "O simulado foi compartilhado com sucesso na faculdade.",
        });
        onOpenChange(false);
        reset();
        setDisciplina('');
        setDisciplinaType('existing');
        setPeriodo('');
        if (onSuccess) onSuccess();
      } else {
        throw new Error('Erro ao compartilhar simulado');
      }
    } catch (error) {
      console.error('Erro ao compartilhar simulado:', error);
      toast({
        title: "Erro ao compartilhar",
        description: "Não foi possível compartilhar o simulado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Compartilhar Simulado</DialogTitle>
          <DialogDescription>
            Compartilhe este simulado com os membros da faculdade.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              {...register('title', { required: 'O título é obrigatório' })}
              placeholder="Título do simulado"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descreva brevemente o conteúdo deste simulado"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              {...register('category')}
              placeholder="Ex: Prova, Revisão, Residência"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="disciplina-type">Disciplina</Label>
              
              {/* Seleção do tipo de disciplina */}
              <Select 
                value={disciplinaType} 
                onValueChange={(value) => {
                  setDisciplinaType(value);
                  if (value === 'existing' && disciplines.length > 0) {
                    setDisciplina(disciplines[0]);
                  } else if (value === 'custom') {
                    setDisciplina('');
                  } else {
                    setDisciplina('');
                  }
                }}
              >
                <SelectTrigger id="disciplina-type">
                  <SelectValue placeholder="Tipo de disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Disciplina existente</SelectItem>
                  <SelectItem value="custom">Nova disciplina</SelectItem>
                  <SelectItem value="none">Sem disciplina</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Disciplina existente */}
              {disciplinaType === 'existing' && (
                <div className="mt-2">
                  {isLoadingDisciplines ? (
                    <div className="flex justify-center p-2">
                      <Spinner size="sm" />
                    </div>
                  ) : disciplines.length > 0 ? (
                    <Select 
                      value={disciplina} 
                      onValueChange={setDisciplina}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma disciplina" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplines.map((disc) => (
                          <SelectItem key={disc} value={disc}>
                            {disc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-gray-500 italic p-2 border rounded-md">
                      Nenhuma disciplina encontrada
                    </div>
                  )}
                </div>
              )}
              
              {/* Nova disciplina */}
              {disciplinaType === 'custom' && (
                <Input
                  className="mt-2"
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  placeholder="Digite o nome da disciplina"
                  disabled={isSubmitting}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="periodo">Período</Label>
              <Select 
                value={periodo} 
                onValueChange={setPeriodo}
              >
                <SelectTrigger id="periodo" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((p) => (
                    <SelectItem key={p} value={p.toString()}>
                      {p}º período
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" /> : 'Compartilhar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 