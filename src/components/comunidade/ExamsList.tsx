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
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Carregando simulados...</p>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum simulado compartilhado</h3>
        <p className="text-gray-500 max-w-md">
          Os simulados compartilhados pelos membros da faculdade aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exams.map((exam) => (
        <Card key={exam.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg font-semibold line-clamp-2">{exam.title}</CardTitle>
              {exam.category && (
                <Badge variant="outline" className="ml-2 whitespace-nowrap">
                  {exam.category}
                </Badge>
              )}
            </div>
            <CardDescription className="flex items-center text-xs text-gray-500 mt-1">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDistanceToNow(new Date(exam.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-2">
            <p className="text-sm text-gray-600 line-clamp-3 mb-3">
              {exam.description || 'Sem descrição disponível'}
            </p>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {exam.disciplina && (
                <div className="flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {exam.disciplina}
                </div>
              )}
              
              {exam.periodo && (
                <div className="flex items-center text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                  <Award className="h-3 w-3 mr-1" />
                  {exam.periodo}º período
                </div>
              )}
              
              {exam.duration_minutes && (
                <div className="flex items-center text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                  <Clock className="h-3 w-3 mr-1" />
                  {exam.duration_minutes} min
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="pt-2 flex justify-between items-center">
            <div className="flex items-center">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src="" />
                <AvatarFallback className="text-xs">
                  {exam.user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500 truncate max-w-[120px]">
                {exam.user?.name || 'Usuário'}
              </span>
            </div>
            
            {exam.external_exam_id && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onOpenExam && onOpenExam(exam)}
              >
                Ver Simulado
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
} 