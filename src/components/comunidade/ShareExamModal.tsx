'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Exam } from '@/services/exams.service';
import { FacultyService } from '@/services/faculty.service';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
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

  // Verificar se o simulado é público
  const isExamPublic = exam?.is_public === true;

  const onSubmit = async (data: any) => {
    if (!exam || !facultyId) return;
    
    // Verificar se o simulado é público
    if (!isExamPublic) {
      toast({
        title: "Simulado privado",
        description: "Apenas simulados públicos podem ser compartilhados com a faculdade. Por favor, altere a visibilidade do simulado para público antes de compartilhar.",
        variant: "destructive"
      });
      return;
    }
    
    // Determinar qual disciplina usar baseado no tipo selecionado
    const finalDisciplina = disciplinaType === 'custom' ? disciplina : 
                           disciplinaType === 'existing' ? disciplina : null;
    
    setIsSubmitting(true);
    try {
      const shareData: any = {
        title: data.title,
        description: data.description,
        disciplina: finalDisciplina,
        periodo: periodo ? parseInt(periodo) : undefined
      };
      
      // Só incluir categoria se o usuário for admin específico
      if (user?.id === '9e959500-f290-4457-a5d7-2a81c496d123' || user?.id === 'e6c41b94-f25c-4ef4-b723-c4a2d480cf43') {
        shareData.category = data.category;
      }
      
      const examId = await FacultyService.shareFacultyExam(
        facultyId,
        exam.id!,
        shareData
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
        
        {/* Aviso para simulados privados */}
        {!isExamPublic && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Simulado privado</h3>
                <div className="mt-1 text-sm text-amber-700">
                  <p>Este simulado está definido como privado e não pode ser compartilhado. Para compartilhar, você precisa primeiro alterar a visibilidade do simulado para público nas configurações do simulado.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              {...register('title', { required: 'O título é obrigatório' })}
              placeholder="Título do simulado"
              disabled={!isExamPublic}
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
              disabled={!isExamPublic}
            />
          </div>
          
          {/* Campo Categoria - Apenas para Admins Específicos */}
          {(user?.id === '9e959500-f290-4457-a5d7-2a81c496d123' || user?.id === 'e6c41b94-f25c-4ef4-b723-c4a2d480cf43') && (
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                {...register('category')}
                placeholder="Ex: Prova, Revisão, Residência"
                disabled={!isExamPublic}
              />
            </div>
          )}
          
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
                disabled={!isExamPublic}
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
                      disabled={!isExamPublic}
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
                  disabled={isSubmitting || !isExamPublic}
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="periodo">Período</Label>
              <Select 
                value={periodo} 
                onValueChange={setPeriodo}
                disabled={!isExamPublic}
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
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !isExamPublic}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Compartilhando...
                </>
              ) : (
                'Compartilhar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}