'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MinhaFaculService } from '@/services/community-feed.service';
import { GradeAttendanceData } from '@/types/community';
import { 
  BarChart, 
  Calendar, 
  PlusCircle, 
  Search, 
  Filter, 
  ArrowLeft, 
  Edit, 
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export default function NotasFaltasPage() {
  const { user } = useAuth();
  const [disciplinesData, setDisciplinesData] = useState<GradeAttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('todas');
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [showAddAttendanceModal, setShowAddAttendanceModal] = useState(false);
  
  const minhaFaculService = new MinhaFaculService();

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const data = await minhaFaculService.getGradesAndAttendance(user.id);
          setDisciplinesData(data);
        } catch (error) {
          console.error('Erro ao buscar dados de notas e faltas:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [user]);

  const filteredDisciplines = disciplinesData.filter(discipline => {
    const matchesSearch = discipline.disciplineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          discipline.professorName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'todas') return matchesSearch;
    if (activeTab === 'aprovadas') return matchesSearch && discipline.status === 'approved';
    if (activeTab === 'risco') return matchesSearch && discipline.status === 'at_risk';
    if (activeTab === 'reprovadas') return matchesSearch && discipline.status === 'failed';
    
    return matchesSearch;
  });

  const getStatusBadge = (status?: string) => {
    if (status === 'approved') {
      return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
    } else if (status === 'at_risk') {
      return <Badge className="bg-yellow-100 text-yellow-800">Em risco</Badge>;
    } else if (status === 'failed') {
      return <Badge className="bg-red-100 text-red-800">Reprovado</Badge>;
    }
    return null;
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'approved') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (status === 'at_risk') {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    } else if (status === 'failed') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center mb-6">
        <Link href="/comunidade" className="mr-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Notas e Faltas</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar esquerdo */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="font-semibold text-lg mb-4">Filtros</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Pesquisar</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Buscar disciplina..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 block mb-1">Status</label>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-4 mb-2">
                    <TabsTrigger value="todas" className="text-xs">Todas</TabsTrigger>
                    <TabsTrigger value="aprovadas" className="text-xs">Aprovadas</TabsTrigger>
                    <TabsTrigger value="risco" className="text-xs">Em risco</TabsTrigger>
                    <TabsTrigger value="reprovadas" className="text-xs">Reprovadas</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-lg mb-4">Resumo</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Média geral</span>
                  <span className="text-sm font-semibold">
                    {disciplinesData.length > 0 
                      ? (disciplinesData.reduce((sum, d) => sum + (d.averageGrade || 0), 0) / disciplinesData.length).toFixed(1)
                      : '-'}
                  </span>
                </div>
                <Progress 
                  value={disciplinesData.length > 0 
                    ? (disciplinesData.reduce((sum, d) => sum + (d.averageGrade || 0), 0) / disciplinesData.length) * 10 
                    : 0
                  } 
                  className="h-2"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Aprovadas</p>
                  <p className="font-bold text-green-600">
                    {disciplinesData.filter(d => d.status === 'approved').length}
                  </p>
                </div>
                <div className="bg-yellow-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Em risco</p>
                  <p className="font-bold text-yellow-600">
                    {disciplinesData.filter(d => d.status === 'at_risk').length}
                  </p>
                </div>
                <div className="bg-red-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Reprovadas</p>
                  <p className="font-bold text-red-600">
                    {disciplinesData.filter(d => d.status === 'failed').length}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setShowAddGradeModal(true)}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Adicionar nota</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredDisciplines.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <BarChart className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma disciplina encontrada</h3>
              <p className="text-gray-500 mb-4">
                Não encontramos disciplinas que correspondam aos seus filtros.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setActiveTab('todas');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredDisciplines.map((discipline) => (
                <Card key={discipline.disciplineId} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {discipline.disciplineName}
                          {getStatusIcon(discipline.status)}
                        </CardTitle>
                        <CardDescription>
                          {discipline.professorName || 'Professor não informado'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(discipline.status)}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Tabs defaultValue="notas">
                      <TabsList className="mb-4">
                        <TabsTrigger value="notas">Notas</TabsTrigger>
                        <TabsTrigger value="frequencia">Frequência</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="notas">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Avaliações</h4>
                            <div className="text-sm font-medium">
                              Média: <span className="text-blue-600">{discipline.averageGrade?.toFixed(1) || '-'}</span>
                            </div>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 font-medium">Avaliação</th>
                                  <th className="text-center py-2 font-medium">Data</th>
                                  <th className="text-center py-2 font-medium">Peso</th>
                                  <th className="text-right py-2 font-medium">Nota</th>
                                </tr>
                              </thead>
                              <tbody>
                                {discipline.grades.map((grade, index) => (
                                  <tr key={index} className="border-b border-gray-100">
                                    <td className="py-2">{grade.evaluationName}</td>
                                    <td className="py-2 text-center text-gray-600">
                                      {new Date(grade.date).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="py-2 text-center">
                                      {grade.weight ? `${(grade.weight * 100).toFixed(0)}%` : '-'}
                                    </td>
                                    <td className="py-2 text-right font-medium">
                                      {grade.grade.toFixed(1)}/{grade.maxGrade.toFixed(1)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full flex items-center justify-center gap-2"
                            onClick={() => setShowAddGradeModal(true)}
                          >
                            <PlusCircle className="h-3 w-3" />
                            <span>Adicionar nota</span>
                          </Button>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="frequencia">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Registro de frequência</h4>
                            <div className="text-sm font-medium">
                              Presença: <span className="text-blue-600">{discipline.attendance.attendancePercentage.toFixed(1)}%</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Total de aulas</p>
                              <p className="font-bold text-lg">{discipline.attendance.totalClasses}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Presenças</p>
                              <p className="font-bold text-lg text-green-600">{discipline.attendance.attendedClasses}</p>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Faltas</p>
                              <p className="font-bold text-lg text-red-600">{discipline.attendance.absences}</p>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Faltas permitidas</p>
                              <p className="font-bold text-lg text-yellow-600">{discipline.attendance.absencesAllowed}</p>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Progresso de frequência</span>
                              <span className="text-sm font-medium">{discipline.attendance.attendancePercentage.toFixed(1)}%</span>
                            </div>
                            <Progress 
                              value={discipline.attendance.attendancePercentage} 
                              className="h-2"
                            />
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full flex items-center justify-center gap-2"
                            onClick={() => setShowAddAttendanceModal(true)}
                          >
                            <Calendar className="h-3 w-3" />
                            <span>Registrar presença/falta</span>
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                  <CardFooter className="bg-gray-50 flex justify-between">
                    <Button variant="ghost" size="sm">
                      Ver histórico completo
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Função para compartilhar no feed
                      }}
                    >
                      Compartilhar no feed
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 