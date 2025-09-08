'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Play, 
  Eye, 
  Calendar, 
  Clock, 
  FileText, 
  Building, 
  Star,
  Users,
  TrendingUp,
  Award,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompleteExamsService, CompleteExam } from '@/services/complete-exams.service';
import { toast } from 'sonner';

interface PageProps {
  params: {
    tipo: string;
  };
}

const tipoConfig = {
  residencia: {
    title: 'Residência Médica',
    description: 'Provas completas de residência médica de diversas instituições renomadas',
    color: 'blue',
    icon: '🏥'
  },
  concurso: {
    title: 'Concursos Públicos',
    description: 'Provas de concursos públicos na área da saúde',
    color: 'green',
    icon: '🏛️'
  },
  enem: {
    title: 'ENEM',
    description: 'Provas do Exame Nacional do Ensino Médio - Ciências da Natureza',
    color: 'purple',
    icon: '📚'
  },
  vestibular: {
    title: 'Vestibulares',
    description: 'Provas de vestibulares de universidades renomadas',
    color: 'orange',
    icon: '🎓'
  }
};

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
}



export default function CategoriaProvaPage({ params }: PageProps) {
  const [exams, setExams] = useState<CompleteExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  
  const config = tipoConfig[params.tipo as keyof typeof tipoConfig];
  
  if (!config) {
    notFound();
  }

  // Mapear tipo de prova para exam_type_id
  const getExamTypeId = (tipo: string): number => {
    switch (tipo) {
      case 'residencia': return 1;
      case 'concurso': return 2;
      case 'enem': return 3;
      case 'vestibular': return 4;
      default: return 1;
    }
  };

  // Carregar provas do banco de dados
  const loadExams = async () => {
    setLoading(true);
    try {
      const examTypeId = getExamTypeId(params.tipo);
      const data = await CompleteExamsService.getPublicCompleteExams(examTypeId);
      setExams(data);
    } catch (error) {
      console.error('Erro ao carregar provas:', error);
      toast.error('Erro ao carregar provas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [params.tipo]);

  // Filtrar e ordenar provas
  const filteredAndSortedExams = exams
    .filter(exam => 
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.institution && exam.institution.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'questions':
          return b.total_questions - a.total_questions;
        default:
          return 0;
      }
    });

  const totalAttempts = 0; // TODO: Implementar contagem de tentativas
  const averageRating = 4.5; // TODO: Implementar sistema de avaliação
  const totalExams = exams.length;
  const totalQuestions = exams.reduce((acc, exam) => acc + exam.total_questions, 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Cabeçalho */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/simulados/provas-integra">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-4xl">{config.icon}</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {config.title}
              </h1>
              <p className="text-gray-600 mt-1">
                {config.description}
              </p>
            </div>
          </div>
        </div>

        {/* Estatísticas da Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Provas</p>
                  <p className="text-2xl font-bold">{loading ? '-' : totalExams}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Questões</p>
                  <p className="text-2xl font-bold">
                    {loading ? '-' : totalQuestions}
                  </p>
                </div>
                <Award className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tentativas</p>
                  <p className="text-2xl font-bold">{loading ? '-' : totalAttempts.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avaliação Média</p>
                  <p className="text-2xl font-bold">{loading ? '-' : averageRating.toFixed(1)}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Buscar por instituição, ano ou especialidade..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="title">Título</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
                <SelectItem value="questions">Nº de questões</SelectItem>
              </SelectContent>
            </Select>
            
            <Select>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="intermediario">Intermediário</SelectItem>
                <SelectItem value="avancado">Avançado</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Mais Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Provas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Carregando provas...</span>
        </div>
      ) : filteredAndSortedExams.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <div className="text-6xl mb-4">{config.icon}</div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'Nenhuma prova encontrada' : 'Nenhuma prova disponível'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Tente ajustar os filtros de busca.' 
                : `Ainda não temos provas de ${config.title.toLowerCase()} disponíveis.`}
            </p>
            {!searchTerm && (
              <Link href="/simulados/provas-integra/upload">
                <Button>
                  Contribuir com uma Prova
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAndSortedExams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{exam.title}</CardTitle>
                      {exam.created_at && new Date(exam.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Novo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{exam.institution || 'Instituição não informada'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-yellow-600">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{averageRating.toFixed(1)}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Informações Principais */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {exam.year && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{exam.year}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>{exam.total_questions} questões</span>
                  </div>
                  {exam.time_limit && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{exam.time_limit} min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>0 tentativas</span>
                  </div>
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={exam.is_approved ? 'default' : 'destructive'}>
                    {exam.is_approved ? 'Aprovado' : 'Pendente'}
                  </Badge>
                  <Badge variant="outline">
                    {exam.is_public ? 'Público' : 'Privado'}
                  </Badge>
                </div>
                
                {/* Descrição */}
                {exam.description && (
                  <p className="text-sm text-gray-600">{exam.description}</p>
                )}
                
                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" asChild>
                    <Link href={`/simulados/provas-integra/resolver/${exam.id}`}>
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Prova
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/simulados/provas-integra/resolver/${exam.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Paginação */}
      {exams.length > 0 && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-600 text-white">
              1
            </Button>
            <Button variant="outline" size="sm">
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}