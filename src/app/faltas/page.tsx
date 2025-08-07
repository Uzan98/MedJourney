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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Controle de Faltas
          </h1>
          <p className="text-gray-600 mt-1">
            Acompanhe a frequência de todas as suas disciplinas acadêmicas
          </p>
        </div>
        <Link href="/dashboard/disciplinas">
          <Button variant="outline" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Gerenciar Disciplinas
          </Button>
        </Link>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Disciplinas</p>
                <p className="text-2xl font-bold text-gray-900">{overallStats.totalDisciplines}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Disciplinas Seguras</p>
                <p className="text-2xl font-bold text-green-600">{overallStats.safeDisciplines}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Em Atenção</p>
                <p className="text-2xl font-bold text-yellow-600">{overallStats.warningDisciplines}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Situação Crítica</p>
                <p className="text-2xl font-bold text-red-600">{overallStats.criticalDisciplines}</p>
              </div>
              <X className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar disciplina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-full sm:w-48">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredDisciplines.map(({ discipline, stats }) => (
            <Card key={discipline.id} className="hover:shadow-lg transition-shadow">
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
      )}
    </div>
  );
}