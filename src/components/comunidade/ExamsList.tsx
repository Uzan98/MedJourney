'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FacultyExam } from '@/types/faculty';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Calendar, Clock, User, Tag, BookOpen, Award } from 'lucide-react';

interface ExamsListProps {
  exams: FacultyExam[];
  isLoading: boolean;
  onOpenExam?: (exam: FacultyExam) => void;
}

export function ExamsList({ exams, isLoading, onOpenExam }: ExamsListProps) {
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

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mb-4">
          <FileText className="w-10 h-10 text-purple-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum simulado compartilhado</h3>
        <p className="text-gray-600 max-w-md mb-6">
          Os simulados compartilhados pelos membros da faculdade aparecerão aqui.
        </p>
        <Link href="/simulados/novo">
          <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
            <FileText className="h-4 w-4 mr-2" />
            Compartilhar um simulado
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:grid-cols-3">
      {exams.map((exam) => {
        // Generate a color based on exam category or use default purple
        const categoryColors: Record<string, { bg: string, border: string, text: string }> = {
          'Prova': { bg: 'from-blue-500 to-blue-600', border: 'border-blue-500', text: 'text-blue-600' },
          'Exercício': { bg: 'from-green-500 to-green-600', border: 'border-green-500', text: 'text-green-600' },
          'Revisão': { bg: 'from-amber-500 to-amber-600', border: 'border-amber-500', text: 'text-amber-600' },
          'Concurso': { bg: 'from-red-500 to-red-600', border: 'border-red-500', text: 'text-red-600' },
          'OAB': { bg: 'from-indigo-500 to-indigo-600', border: 'border-indigo-500', text: 'text-indigo-600' },
        };
        
        const colorKey = exam.category || 'default';
        const colors = categoryColors[colorKey] || { 
          bg: 'from-purple-500 to-purple-600', 
          border: 'border-purple-500',
          text: 'text-purple-600'
        };
        
        return (
          <Card 
            key={exam.id} 
            className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-t-4 ${colors.border} group flex flex-col`}
          >
            <div className={`bg-gradient-to-r ${colors.bg} px-4 py-3 text-white`}>
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold line-clamp-2 text-white">{exam.title}</h3>
              </div>
              <div className="flex items-center text-xs text-white/80 mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(exam.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </div>
            </div>
            
            <CardContent className="p-4 flex-grow flex flex-col">
              {exam.category && (
                <Badge 
                  variant="outline" 
                  className={`mb-3 ${colors.text} border-current bg-white`}
                >
                  {exam.category}
                </Badge>
              )}
              
              <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">
                {exam.description || 'Sem descrição disponível'}
              </p>
              
              <div className="flex flex-wrap gap-2 mt-auto">
                {exam.disciplina && (
                  <div className="flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100 shadow-sm">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {exam.disciplina}
                  </div>
                )}
                
                {exam.periodo && (
                  <div className="flex items-center text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-100 shadow-sm">
                    <Award className="h-3 w-3 mr-1" />
                    {exam.periodo}º período
                  </div>
                )}
                
                {exam.duration_minutes && (
                  <div className="flex items-center text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-100 shadow-sm">
                    <Clock className="h-3 w-3 mr-1" />
                    {exam.duration_minutes} min
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="px-4 py-3 bg-gray-50 flex flex-col gap-3 border-t mt-auto">
              <div className="flex items-center">
                <Avatar className="h-7 w-7 mr-2 ring-2 ring-white shadow-sm">
                  <AvatarImage src="" />
                  <AvatarFallback className={`text-xs bg-gradient-to-br ${colors.bg} text-white`}>
                    {exam.user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-gray-600 font-medium truncate max-w-[120px]">
                  {exam.user?.name || 'Usuário'}
                </span>
              </div>
              
              {exam.external_exam_id && (
                <>
                  <div className="border-t border-gray-200 -mx-4"></div>
                  <Button 
                    variant="default" 
                    size="default" 
                    onClick={() => onOpenExam && onOpenExam(exam)}
                    className={`w-full bg-gradient-to-r ${colors.bg} border-none hover:opacity-90 text-white font-medium`}
                  >
                    Ver Simulado
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
} 