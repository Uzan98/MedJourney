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
  );
}