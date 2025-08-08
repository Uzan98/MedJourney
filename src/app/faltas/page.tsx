'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, CalendarDays, Plus, Search, Filter, TrendingUp, AlertTriangle, 
  CheckCircle, X, Edit2, Trash2, Clock, FileText, BookOpen, BarChart3, 
  Settings, Download, Users, Target, ExternalLink, ArrowRight 
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AcademicAbsencesService } from '@/lib/academic-absences-service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import type { Discipline, DisciplineAttendanceStats } from '@/lib/supabase';
import Link from 'next/link';

interface DisciplineWithStats {
  discipline: Discipline;
  stats: DisciplineAttendanceStats;
}

export default function FaltasPage() {
  const [disciplinesWithStats, setDisciplinesWithStats] = useState<DisciplineWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'safe' | 'warning' | 'critical'>('all');

  useEffect(() => {
    loadDisciplinesData();
  }, []);

  const loadDisciplinesData = async () => {
    try {
      setLoading(true);
      const allStats = await AcademicAbsencesService.getAllDisciplinesStats();
      setDisciplinesWithStats(allStats);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de frequência');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (riskStatus: string) => {
    switch (riskStatus) {
      case 'safe': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (riskStatus: string) => {
    switch (riskStatus) {
      case 'safe': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <X className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusText = (riskStatus: string) => {
    switch (riskStatus) {
      case 'safe': return 'Seguro';
      case 'warning': return 'Atenção';
      case 'critical': return 'Crítico';
      default: return 'Indefinido';
    }
  };

  const filteredDisciplines = disciplinesWithStats.filter(item => {
    const matchesSearch = item.discipline.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.stats.risk_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const overallStats = disciplinesWithStats.reduce(
    (acc, item) => {
      acc.totalDisciplines++;
      acc.totalAbsences += item.stats.total_absences;
      acc.totalAllowedAbsences += item.stats.allowed_absences;
      
      if (item.stats.risk_status === 'safe') acc.safeDisciplines++;
      else if (item.stats.risk_status === 'warning') acc.warningDisciplines++;
      else if (item.stats.risk_status === 'critical') acc.criticalDisciplines++;
      
      return acc;
    },
    {
      totalDisciplines: 0,
      totalAbsences: 0,
      totalAllowedAbsences: 0,
      safeDisciplines: 0,
      warningDisciplines: 0,
      criticalDisciplines: 0
    }
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando dados de frequência...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 space-y-8">
        {/* Header Desktop */}
        <div className="hidden md:block">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/20 p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="space-y-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Controle de Faltas
                </h1>
                <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
                  Acompanhe a frequência de todas as suas disciplinas acadêmicas com precisão e facilidade
                </p>
              </div>
              <Link href="/dashboard/disciplinas">
                <Button variant="outline" className="flex items-center gap-2 px-6 py-3 text-base hover:bg-blue-50 hover:border-blue-300 transition-all duration-200">
                  <BookOpen className="h-5 w-5" />
                  Gerenciar Disciplinas
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Header Mobile */}
        <div className="block md:hidden">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-white/20 p-6">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Controle de Faltas
              </h1>
              <Link href="/dashboard/disciplinas">
                <Button variant="outline" size="sm" className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200">
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden xs:inline">Disciplinas</span>
                </Button>
              </Link>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Acompanhe a frequência das suas disciplinas
            </p>
          </div>
        </div>

      {/* Estatísticas Gerais Desktop */}
         <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-100">Total de Disciplinas</p>
                <p className="text-3xl font-bold text-white">{overallStats.totalDisciplines}</p>
              </div>
              <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-green-300 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-100">Disciplinas Seguras</p>
                <p className="text-3xl font-bold text-white">{overallStats.safeDisciplines}</p>
              </div>
              <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-yellow-500 border-orange-300 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-100">Em Atenção</p>
                <p className="text-3xl font-bold text-white">{overallStats.warningDisciplines}</p>
              </div>
              <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500 to-red-600 border-red-300 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-100">Situação Crítica</p>
                <p className="text-3xl font-bold text-white">{overallStats.criticalDisciplines}</p>
              </div>
              <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <X className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Gerais Mobile */}
      <div className="md:hidden grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="text-center space-y-1">
              <BookOpen className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-xs font-medium text-blue-100">Total</p>
              <p className="text-xl font-bold text-white">{overallStats.totalDisciplines}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-green-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="text-center space-y-1">
              <CheckCircle className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-xs font-medium text-green-100">Seguras</p>
              <p className="text-xl font-bold text-white">{overallStats.safeDisciplines}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500 to-yellow-500 border-orange-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="text-center space-y-1">
              <AlertTriangle className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-xs font-medium text-orange-100">Atenção</p>
              <p className="text-xl font-bold text-white">{overallStats.warningDisciplines}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500 to-red-600 border-red-300 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="text-center space-y-1">
              <X className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-xs font-medium text-red-100">Críticas</p>
              <p className="text-xl font-bold text-white">{overallStats.criticalDisciplines}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Desktop */}
      <div className="hidden md:block">
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar disciplina..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/50 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-48 bg-white/50 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="safe">Seguro</SelectItem>
                  <SelectItem value="warning">Atenção</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Mobile */}
      <div className="md:hidden">
        <Card className="bg-white/90 backdrop-blur-sm border-white/20 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar disciplina..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/50 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-full bg-white/50 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="safe">Seguro</SelectItem>
                <SelectItem value="warning">Atenção</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Disciplinas */}
      {filteredDisciplines.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {disciplinesWithStats.length === 0 ? 'Nenhuma disciplina acadêmica encontrada' : 'Nenhuma disciplina encontrada'}
            </h3>
            <p className="text-gray-600 mb-6">
              {disciplinesWithStats.length === 0 
                ? 'Configure suas disciplinas para controle acadêmico de faltas'
                : 'Tente ajustar os filtros de busca'
              }
            </p>
            {disciplinesWithStats.length === 0 && (
              <Link href="/dashboard/disciplinas">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Configurar Disciplinas
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
        {/* Desktop Layout */}
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredDisciplines.map(({ discipline, stats }) => (
            <Card key={discipline.id} className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-lg hover:bg-white/90 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                      {discipline.name}
                    </CardTitle>
                    {discipline.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {discipline.description}
                      </p>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(stats.risk_status)}`}>
                    {getStatusIcon(stats.risk_status)}
                    <span className="text-sm font-medium">
                      {getStatusText(stats.risk_status)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Estatísticas de Faltas */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-red-600">{stats.total_absences}</p>
                    <p className="text-xs text-gray-600">Faltas Usadas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{stats.allowed_absences}</p>
                    <p className="text-xs text-gray-600">Faltas Permitidas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.remaining_absences}</p>
                    <p className="text-xs text-gray-600">Faltas Restantes</p>
                  </div>
                </div>
                
                {/* Barra de Progresso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Frequência</span>
                    <span className="font-medium">{stats.attendance_percentage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={stats.attendance_percentage} 
                    className={`h-2 ${
                      stats.risk_status === 'safe' ? '[&>div]:bg-green-500' :
                      stats.risk_status === 'warning' ? '[&>div]:bg-yellow-500' :
                      '[&>div]:bg-red-500'
                    }`}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                {/* Informações Acadêmicas */}
                {discipline.is_academic && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Frequência Semanal:</span>
                      <span className="font-medium">{discipline.weekly_frequency}x por semana</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Mínimo para Aprovação:</span>
                      <span className="font-medium">{discipline.minimum_attendance_percentage}%</span>
                    </div>
                    {discipline.semester_start_date && discipline.semester_end_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Período:</span>
                        <span className="font-medium">
                          {format(new Date(discipline.semester_start_date), 'dd/MM/yyyy')} - {format(new Date(discipline.semester_end_date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/dashboard/disciplinas/${discipline.id}`} className="flex-1">
                    <Button variant="outline" className="w-full flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-4">
          {filteredDisciplines.map(({ discipline, stats }) => (
            <Card key={discipline.id} className="bg-white/90 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md hover:bg-white/95 transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold text-gray-900 mb-1 truncate">
                      {discipline.name}
                    </CardTitle>
                    {discipline.description && (
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {discipline.description}
                      </p>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full border ${getStatusColor(stats.risk_status)} ml-2`}>
                    {getStatusIcon(stats.risk_status)}
                    <span className="text-xs font-medium">
                      {getStatusText(stats.risk_status)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Estatísticas de Faltas Mobile */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-red-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-red-600">{stats.total_absences}</p>
                    <p className="text-[10px] text-gray-600">Usadas</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-600">{stats.allowed_absences}</p>
                    <p className="text-[10px] text-gray-600">Permitidas</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-600">{stats.remaining_absences}</p>
                    <p className="text-[10px] text-gray-600">Restantes</p>
                  </div>
                </div>
                
                {/* Barra de Progresso Mobile */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Frequência</span>
                    <span className="font-medium">{stats.attendance_percentage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={stats.attendance_percentage} 
                    className={`h-2 ${
                      stats.risk_status === 'safe' ? '[&>div]:bg-green-500' :
                      stats.risk_status === 'warning' ? '[&>div]:bg-yellow-500' :
                      '[&>div]:bg-red-500'
                    }`}
                  />
                </div>
                
                {/* Informações Acadêmicas Mobile */}
                {discipline.is_academic && (
                  <div className="bg-gray-50 rounded-lg p-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Semanal:</span>
                      <span className="font-medium">{discipline.weekly_frequency}x</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Mínimo:</span>
                      <span className="font-medium">{discipline.minimum_attendance_percentage}%</span>
                    </div>
                  </div>
                )}
                
                {/* Ações Mobile */}
                <div className="pt-1">
                  <Link href={`/dashboard/disciplinas/${discipline.id}`} className="block">
                    <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2">
                      <ExternalLink className="h-3 w-3" />
                      <span className="text-xs">Ver Detalhes</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}
      </div>
    </div>
  );
}