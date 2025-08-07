'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { AcademicAbsencesService, type AcademicAbsence } from '@/lib/academic-absences-service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { supabase } from '@/lib/supabase';
import type { Discipline, DisciplineAttendanceStats, AcademicDisciplineData } from '@/lib/supabase';
import { toast } from 'sonner';

interface AttendanceControlTabProps {
  discipline: Discipline;
  onDisciplineUpdate?: (discipline: Discipline) => void;
}

interface AbsenceFormData {
  absence_date: string;
  is_justified: boolean;
  reason: string;
}

export default function AttendanceControlTab({ discipline, onDisciplineUpdate }: AttendanceControlTabProps) {
  const [absences, setAbsences] = useState<AcademicAbsence[]>([]);
  const [stats, setStats] = useState<DisciplineAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [showAcademicForm, setShowAcademicForm] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<AcademicAbsence | null>(null);
  const [academicSubjectId, setAcademicSubjectId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AbsenceFormData>({
    absence_date: '',
    is_justified: false,
    reason: ''
  });
  const [academicData, setAcademicData] = useState<AcademicDisciplineData>({
    semester_start_date: '',
    semester_end_date: '',
    weekly_frequency: 2,
    minimum_attendance_percentage: 75,
    class_schedule: []
  });

  useEffect(() => {
    loadData();
  }, [discipline.id]);

  const loadAcademicData = async (disciplineToCheck = discipline) => {
    // Buscar o academic_subject_id correspondente ao discipline.id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔍 Buscando academic_subject para:', {
      discipline_id: disciplineToCheck.id,
      user_id: user.id,
      discipline_name: disciplineToCheck.name
    });

    // Usar .limit(1) ao invés de .single() para evitar erro PGRST116 com duplicatas
    const { data: academicSubjects, error: subjectError } = await supabase
      .from('academic_subjects')
      .select('id, name, discipline_id, created_at')
      .eq('discipline_id', disciplineToCheck.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    console.log('📊 Resultado da busca academic_subject:', {
      data: academicSubjects,
      error: subjectError,
      count: academicSubjects?.length || 0
    });

    if (subjectError) {
      console.error('❌ Erro ao buscar matéria acadêmica:', subjectError);
      toast.error(`Erro ao buscar matéria acadêmica: ${subjectError.message}`);
      return;
    }

    const academicSubject = academicSubjects?.[0];
    
    if (!academicSubject) {
      console.log('⚠️ Academic subject não encontrado. Pode ser necessário reconfigurar a disciplina.');
      toast.error('Matéria acadêmica não encontrada. Reconfigure o controle acadêmico.');
      return;
    }

    console.log('✅ Academic subject encontrado:', academicSubject);
    setAcademicSubjectId(academicSubject.id);

    const [absencesData, statsData] = await Promise.all([
      AcademicAbsencesService.getDisciplineAbsences(academicSubject.id),
      AcademicAbsencesService.getDisciplineStats(academicSubject.id)
    ]);
    setAbsences(absencesData);
    setStats(statsData);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (discipline.is_academic) {
        await loadAcademicData();
      } else {
        console.log('ℹ️ Disciplina não é acadêmica:', discipline.name);
      }
    } catch (error) {
      console.error('💥 Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de frequência');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAcademic = async () => {
    try {
      const updatedDiscipline = await DisciplinesRestService.setDisciplineAsAcademic(
        discipline.id,
        academicData
      );
      
      if (updatedDiscipline) {
        toast.success('Disciplina configurada para controle acadêmico!');
        
        // Atualizar a disciplina local para refletir is_academic = true
        const updatedLocalDiscipline = { ...discipline, ...updatedDiscipline };
        
        // Notificar o componente pai sobre a atualização
        onDisciplineUpdate?.(updatedLocalDiscipline);
        
        setShowAcademicForm(false);
        
        // Forçar o carregamento dos dados acadêmicos mesmo que discipline.is_academic ainda seja false
        await loadAcademicData(updatedLocalDiscipline);
      } else {
        toast.error('Erro ao configurar disciplina');
      }
    } catch (error) {
      console.error('Erro ao configurar disciplina:', error);
      toast.error('Erro ao configurar disciplina');
    }
  };

  const handleCreateAbsence = async () => {
    try {
      console.log('🎯 Tentando criar falta com academic_subject_id:', academicSubjectId);
      
      if (!academicSubjectId) {
        console.error('❌ Academic subject ID não encontrado no estado');
        toast.error('ID da matéria acadêmica não encontrado. Recarregue a página.');
        return;
      }

      console.log('📝 Dados da falta a ser criada:', {
        academic_subject_id: academicSubjectId,
        ...formData
      });

      const newAbsence = await AcademicAbsencesService.createAbsence({
        academic_subject_id: academicSubjectId,
        ...formData
      });
      
      if (newAbsence) {
        console.log('✅ Falta criada com sucesso:', newAbsence);
        toast.success('Falta registrada com sucesso!');
        setShowAbsenceForm(false);
        setFormData({ absence_date: '', is_justified: false, reason: '' });
        loadData();
      } else {
        console.error('❌ Falha ao criar falta - retorno null/undefined');
        toast.error('Erro ao registrar falta');
      }
    } catch (error) {
      console.error('💥 Erro ao criar falta:', error);
      toast.error(`Erro ao registrar falta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleUpdateAbsence = async () => {
    if (!editingAbsence) return;
    
    try {
      const updatedAbsence = await AcademicAbsencesService.updateAbsence(
        editingAbsence.id,
        formData
      );
      
      if (updatedAbsence) {
        toast.success('Falta atualizada com sucesso!');
        setEditingAbsence(null);
        setFormData({ absence_date: '', is_justified: false, reason: '' });
        loadData();
      } else {
        toast.error('Erro ao atualizar falta');
      }
    } catch (error) {
      console.error('Erro ao atualizar falta:', error);
      toast.error('Erro ao atualizar falta');
    }
  };

  const handleDeleteAbsence = async (absenceId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta falta?')) return;
    
    try {
      const success = await AcademicAbsencesService.deleteAbsence(absenceId);
      
      if (success) {
        toast.success('Falta excluída com sucesso!');
        loadData();
      } else {
        toast.error('Erro ao excluir falta');
      }
    } catch (error) {
      console.error('Erro ao excluir falta:', error);
      toast.error('Erro ao excluir falta');
    }
  };

  const getStatusColor = (riskStatus: string) => {
    switch (riskStatus) {
      case 'safe': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (riskStatus: string) => {
    switch (riskStatus) {
      case 'safe': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!discipline.is_academic) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Controle Acadêmico não configurado
          </h3>
          <p className="text-gray-600 mb-6">
            Configure esta disciplina para controle acadêmico de faltas
          </p>
          <button
            onClick={() => setShowAcademicForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Configurar Controle Acadêmico
          </button>
        </div>

        {showAcademicForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Configurar Controle Acadêmico</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Início do Semestre
                  </label>
                  <input
                    type="date"
                    value={academicData.semester_start_date}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, semester_start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Término do Semestre
                  </label>
                  <input
                    type="date"
                    value={academicData.semester_end_date}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, semester_end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequência Semanal (aulas por semana)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={academicData.weekly_frequency}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, weekly_frequency: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Porcentagem Mínima de Aprovação (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={academicData.minimum_attendance_percentage}
                    onChange={(e) => setAcademicData(prev => ({ ...prev, minimum_attendance_percentage: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAcademicForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSetupAcademic}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Configurar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas de Frequência */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Faltas Usadas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_absences}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Faltas Permitidas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.allowed_absences}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Faltas Restantes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.remaining_absences}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border ${getStatusColor(stats.risk_status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-lg font-bold capitalize">
                  {stats.risk_status === 'safe' ? 'Seguro' : 
                   stats.risk_status === 'warning' ? 'Atenção' : 'Crítico'}
                </p>
              </div>
              {getStatusIcon(stats.risk_status)}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Faltas */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Registro de Faltas</h3>
          <button
            onClick={() => setShowAbsenceForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar Falta
          </button>
        </div>
        
        <div className="p-4">
          {absences.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhuma falta registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {absences.map((absence) => (
                <div key={absence.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      absence.is_justified ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">
                        {absence.absence_date.split('-').reverse().join('/')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {absence.is_justified ? 'Justificada' : 'Não justificada'}
                        {absence.reason && ` - ${absence.reason}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingAbsence(absence);
                        setFormData({
                          absence_date: absence.absence_date,
                          is_justified: absence.is_justified,
                          reason: absence.reason || ''
                        });
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAbsence(absence.id)}
                      className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Falta */}
      {(showAbsenceForm || editingAbsence) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingAbsence ? 'Editar Falta' : 'Registrar Falta'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data da Falta
                </label>
                <input
                  type="date"
                  value={formData.absence_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, absence_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_justified}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_justified: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Falta justificada</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo (opcional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva o motivo da falta..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAbsenceForm(false);
                  setEditingAbsence(null);
                  setFormData({ absence_date: '', is_justified: false, reason: '' });
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingAbsence ? handleUpdateAbsence : handleCreateAbsence}
                disabled={!formData.absence_date}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingAbsence ? 'Atualizar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}