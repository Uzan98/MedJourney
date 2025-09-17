'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FacultyExam } from '@/types/faculty';
import { FacultyService } from '@/services/faculty.service';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Calendar, Clock, User, Tag, BookOpen, Award, MoreVertical, Trash2, Filter, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExamsListProps {
  exams: FacultyExam[];
  isLoading: boolean;
  onOpenExam: (exam: FacultyExam) => void;
  isAdmin?: boolean;
  onExamDeleted?: () => void;
}

export function ExamsList({ exams, isLoading, onOpenExam, isAdmin = false, onExamDeleted }: ExamsListProps) {
  const [selectedExam, setSelectedExam] = useState<FacultyExam | null>(null);
  const [examToDelete, setExamToDelete] = useState<FacultyExam | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState<string>('all');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('all');
  const { user } = useAuth();

  // Extrair disciplinas e períodos únicos dos simulados
  const { disciplinas, periodos } = useMemo(() => {
    const disciplinasSet = new Set<string>();
    const periodosSet = new Set<number>();
    
    exams.forEach(exam => {
      if (exam.disciplina) disciplinasSet.add(exam.disciplina);
      if (exam.periodo) periodosSet.add(exam.periodo);
    });
    
    return {
      disciplinas: Array.from(disciplinasSet).sort(),
      periodos: Array.from(periodosSet).sort((a, b) => a - b)
    };
  }, [exams]);

  // Filtrar simulados baseado nos filtros aplicados
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch = !searchTerm || 
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDisciplina = selectedDisciplina === 'all' || exam.disciplina === selectedDisciplina;
      const matchesPeriodo = selectedPeriodo === 'all' || exam.periodo?.toString() === selectedPeriodo;
      
      return matchesSearch && matchesDisciplina && matchesPeriodo;
    });
  }, [exams, searchTerm, selectedDisciplina, selectedPeriodo]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDisciplina('all');
    setSelectedPeriodo('all');
  };

  const hasActiveFilters = searchTerm || (selectedDisciplina !== 'all') || (selectedPeriodo !== 'all');

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    
    setIsDeleting(true);
    try {
      const success = await FacultyService.deleteFacultyExam(examToDelete.id);
      
      if (success) {
        toast({
          title: "Simulado excluído",
          description: "O simulado foi excluído com sucesso.",
        });
        
        if (onExamDeleted) {
          onExamDeleted();
        }
      } else {
        toast({
          title: "Erro ao excluir",
          description: "Não foi possível excluir o simulado. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao excluir simulado:', error);
      toast({
        title: "Erro ao excluir",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setExamToDelete(null);
    }
  };

  const canDeleteExam = (exam: FacultyExam) => {
    return isAdmin || (user && exam.created_by === user.id);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin animation-delay-150"></div>
        </div>
        <p className="text-gray-700 font-medium">Carregando simulados...</p>
        <p className="text-gray-500 text-sm mt-1">Aguarde um momento</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar simulados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filtro por Disciplina */}
          <Select value={selectedDisciplina} onValueChange={setSelectedDisciplina}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as disciplinas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as disciplinas</SelectItem>
              {disciplinas.map((disciplina) => (
                <SelectItem key={disciplina} value={disciplina}>
                  {disciplina}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Filtro por Período */}
          <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os períodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              {periodos.map((periodo) => (
                <SelectItem key={periodo} value={periodo.toString()}>
                  {periodo}º Período
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Contador de resultados */}
        <div className="text-sm text-gray-500">
          {filteredExams.length} de {exams.length} simulados
        </div>
      </div>

      {/* Lista de simulados */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {hasActiveFilters ? 'Nenhum simulado encontrado' : 'Nenhum simulado compartilhado'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasActiveFilters 
              ? 'Tente ajustar os filtros para encontrar simulados.'
              : 'Quando simulados forem compartilhados, eles aparecerão aqui.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => {
            // Generate a color based on exam category or use default purple
            const categoryColors: Record<string, { bg: string, border: string, text: string, accent: string }> = {
            'Prova': { bg: 'from-blue-500 to-blue-600', border: 'border-blue-500', text: 'text-blue-600', accent: 'bg-blue-50 border-blue-200' },
            'Exercício': { bg: 'from-green-500 to-green-600', border: 'border-green-500', text: 'text-green-600', accent: 'bg-green-50 border-green-200' },
            'Revisão': { bg: 'from-amber-500 to-amber-600', border: 'border-amber-500', text: 'text-amber-600', accent: 'bg-amber-50 border-amber-200' },
            'Concurso': { bg: 'from-red-500 to-red-600', border: 'border-red-500', text: 'text-red-600', accent: 'bg-red-50 border-red-200' },
            'OAB': { bg: 'from-indigo-500 to-indigo-600', border: 'border-indigo-500', text: 'text-indigo-600', accent: 'bg-indigo-50 border-indigo-200' },
            };
            
            const colorKey = exam.category || 'default';
            const colors = categoryColors[colorKey] || { 
              bg: 'from-purple-500 to-purple-600', 
              border: 'border-purple-500',
              text: 'text-purple-600',
              accent: 'bg-purple-50 border-purple-200'
            };
            
            return (
            <Card 
              key={exam.id} 
              className="overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100"
            >
              {/* Header com gradiente melhorado */}
              <div className={`bg-gradient-to-r ${colors.bg} px-6 py-4 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold line-clamp-2 text-white pr-4">{exam.title}</h3>
                    {exam.category && (
                      <Badge 
                        variant="outline" 
                        className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs font-medium"
                      >
                        {exam.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-white/90">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(exam.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6 flex-grow flex flex-col">
                <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow leading-relaxed">
                  {exam.description || 'Sem descrição disponível'}
                </p>
                
                {/* Tags de informações */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {exam.disciplina && (
                    <div className="flex items-center text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                      <BookOpen className="h-3 w-3 mr-1.5" />
                      {exam.disciplina}
                    </div>
                  )}
                  
                  {exam.periodo && (
                    <div className="flex items-center text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-200 font-medium">
                      <Award className="h-3 w-3 mr-1.5" />
                      {exam.periodo}º período
                    </div>
                  )}
                  
                  {exam.duration_minutes && (
                    <div className="flex items-center text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200 font-medium">
                      <Clock className="h-3 w-3 mr-1.5" />
                      {exam.duration_minutes} min
                    </div>
                  )}
                </div>
                
                {/* Informações do autor */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3 ring-2 ring-white shadow-md">
                      <AvatarImage src="" />
                      <AvatarFallback className={`text-xs bg-gradient-to-br ${colors.bg} text-white font-semibold`}>
                        {exam.user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm text-gray-700 font-medium block">
                        {exam.user?.name || 'Usuário'}
                      </span>
                      <span className="text-xs text-gray-500">Autor</span>
                    </div>
                  </div>
                  
                  {canDeleteExam(exam) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setExamToDelete(exam)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir simulado
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
              
              {/* Footer com botão de ação */}
              {exam.external_exam_id && (
                <CardFooter className="px-6 py-4 bg-gray-50/50 border-t">
                  <Button 
                    variant="default" 
                    size="default" 
                    onClick={() => onOpenExam && onOpenExam(exam)}
                    className={`w-full bg-gradient-to-r ${colors.bg} border-none hover:opacity-90 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200`}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Simulado
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
        </div>
      )}
      
      <AlertDialog open={!!examToDelete} onOpenChange={() => setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir simulado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o simulado "{examToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}