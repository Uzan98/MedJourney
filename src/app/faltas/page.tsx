'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarDays, Plus, Search, Filter, TrendingUp, AlertTriangle, CheckCircle, X, Edit2, Trash2, Clock, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AbsencesService, Absence } from '@/lib/services/absences.service';
import AbsenceModal from '@/components/modals/absence-modal';
import StatCard from '@/components/ui/stat-card';

interface AbsenceStats {
  total: number;
  justified: number;
  unjustified: number;
  bySubject: Record<string, number>;
}

export default function FaltasPage() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [filteredAbsences, setFilteredAbsences] = useState<Absence[]>([]);
  const [stats, setStats] = useState<AbsenceStats>({ total: 0, justified: 0, unjustified: 0, bySubject: {} });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'justified' | 'unjustified'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    loadAbsences();
  }, []);

  useEffect(() => {
    filterAbsences();
  }, [absences, searchTerm, filterType, selectedMonth]);

  const loadAbsences = async () => {
    try {
      setLoading(true);
      const [absencesData, statsData] = await Promise.all([
        AbsencesService.getAbsences(),
        AbsencesService.getAbsencesStats()
      ]);
      setAbsences(absencesData);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar faltas:', error);
      toast.error('Erro ao carregar faltas');
    } finally {
      setLoading(false);
    }
  };

  const filterAbsences = () => {
    let filtered = [...absences];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(absence => 
        absence.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (absence.reason && absence.reason.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(absence => 
        filterType === 'justified' ? absence.is_justified : !absence.is_justified
      );
    }

    // Filtro por mês
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));
      
      filtered = filtered.filter(absence => {
        const absenceDate = parseISO(absence.absence_date);
        return isWithinInterval(absenceDate, { start: monthStart, end: monthEnd });
      });
    }

    setFilteredAbsences(filtered);
  };

  const handleAbsenceCreated = () => {
    loadAbsences();
    setShowModal(false);
  };

  const handleDeleteAbsence = async (absenceId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta falta?')) {
      return;
    }

    try {
      await AbsencesService.deleteAbsence(absenceId);
      toast.success('Falta removida com sucesso!');
      loadAbsences();
    } catch (error) {
      console.error('Erro ao excluir falta:', error);
      toast.error('Erro ao remover falta');
    }
  };

  const getStatusColor = (isJustified: boolean) => {
    return isJustified 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusIcon = (isJustified: boolean) => {
    return isJustified 
      ? <CheckCircle className="h-4 w-4" />
      : <AlertTriangle className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Carregando faltas...</p>
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Controle de Faltas
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie e monitore suas faltas acadêmicas
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Falta
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total de Faltas"
          value={stats.total}
          icon={<Calendar className="h-6 w-6" />}
          color="blue"
          description="Faltas registradas no período"
        />
        
        <StatCard
          title="Justificadas"
          value={stats.justified}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
          description={`${stats.total > 0 ? Math.round((stats.justified / stats.total) * 100) : 0}% do total`}
        />
        
        <StatCard
          title="Não Justificadas"
          value={stats.unjustified}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="red"
          description={`${stats.total > 0 ? Math.round((stats.unjustified / stats.total) * 100) : 0}% do total`}
        />
        
        <StatCard
          title="Taxa de Justificação"
          value={`${stats.total > 0 ? Math.round((stats.justified / stats.total) * 100) : 0}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
          description="Percentual de faltas justificadas"
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por disciplina ou motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterType} onValueChange={(value: 'all' | 'justified' | 'unjustified') => setFilterType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as faltas</SelectItem>
                <SelectItem value="justified">Apenas justificadas</SelectItem>
                <SelectItem value="unjustified">Apenas não justificadas</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className=""
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Faltas */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            Histórico de Faltas
            {filteredAbsences.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredAbsences.length} {filteredAbsences.length === 1 ? 'falta' : 'faltas'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAbsences.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma falta encontrada</h3>
              {searchTerm || filterType !== 'all' || selectedMonth ? (
                <div>
                  <p className="text-gray-500 mb-4">Tente ajustar os filtros para encontrar suas faltas</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                      setSelectedMonth('');
                    }}
                    className="text-sm"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 mb-4">Você ainda não registrou nenhuma falta</p>
                  <Button
                    onClick={() => setShowModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Primeira Falta
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAbsences.map((absence, index) => (
                <div
                  key={absence.id}
                  className="p-6 hover:bg-gray-50 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl shadow-sm ${
                        absence.is_justified 
                          ? 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200' 
                          : 'bg-gradient-to-br from-red-50 to-red-100 border border-red-200'
                      }`}>
                        {absence.is_justified ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{absence.subject_name}</h3>
                          <Badge 
                            variant={absence.is_justified ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {absence.is_justified ? 'Justificada' : 'Não Justificada'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                              {format(new Date(absence.absence_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(absence.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        
                        {absence.reason && (
                          <div className="flex items-start gap-1 mt-3">
                            <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-600 leading-relaxed">{absence.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => {
                          // Implementar edição futuramente
                          toast.info('Funcionalidade de edição em desenvolvimento');
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteAbsence(absence.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Faltas por Disciplina */}
      {Object.keys(stats.bySubject).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Faltas por Disciplina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.bySubject)
                .sort(([,a], [,b]) => b - a)
                .map(([subject, count]) => (
                  <div
                    key={subject}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 truncate">{subject}</h4>
                      <Badge variant="secondary" className="ml-2">
                        {count} {count === 1 ? 'falta' : 'faltas'}
                      </Badge>
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal para adicionar falta */}
      <AbsenceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAbsenceCreated={handleAbsenceCreated}
      />
    </div>
  );
}