'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Plus, Edit2, Trash2, Calendar, Clock, Target, AlertTriangle, CheckCircle, Settings, Users, BarChart3 } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { AcademicSubjectsService, AcademicSubject } from '@/lib/services/academic-subjects.service';
import { StatisticsService } from '@/lib/services/statistics.service';

interface SubjectFormData {
  name: string;
  start_date: string;
  end_date: string;
  weekly_frequency: number;
  days_of_week: string[];
  approval_percentage: number;
  class_duration: number;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' }
];

export default function MateriasPage() {
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AcademicSubject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    start_date: '',
    end_date: '',
    weekly_frequency: 1,
    days_of_week: [],
    approval_percentage: 75,
    class_duration: 50
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await AcademicSubjectsService.getAcademicSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Erro ao carregar matérias:', error);
      toast.error('Erro ao carregar matérias');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error('A data de término deve ser posterior à data de início');
      return;
    }

    if (formData.days_of_week.length === 0) {
      toast.error('Selecione pelo menos um dia da semana');
      return;
    }

    try {
      if (editingSubject) {
        await AcademicSubjectsService.updateAcademicSubject(editingSubject.id, formData);
        toast.success('Matéria atualizada com sucesso!');
      } else {
        await AcademicSubjectsService.createAcademicSubject(formData);
        toast.success('Matéria criada com sucesso!');
      }
      
      setShowModal(false);
      setEditingSubject(null);
      resetForm();
      loadSubjects();
    } catch (error) {
      console.error('Erro ao salvar matéria:', error);
      toast.error('Erro ao salvar matéria');
    }
  };

  const handleEdit = (subject: AcademicSubject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      start_date: subject.start_date,
      end_date: subject.end_date,
      weekly_frequency: subject.weekly_frequency,
      days_of_week: subject.days_of_week,
      approval_percentage: subject.approval_percentage,
      class_duration: subject.class_duration
    });
    setShowModal(true);
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta matéria? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await AcademicSubjectsService.deleteAcademicSubject(subjectId);
      toast.success('Matéria excluída com sucesso!');
      loadSubjects();
    } catch (error) {
      console.error('Erro ao excluir matéria:', error);
      toast.error('Erro ao excluir matéria');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      weekly_frequency: 1,
      days_of_week: [],
      approval_percentage: 75,
      class_duration: 50
    });
  };

  const getSubjectProgress = (subject: AcademicSubject) => {
    const today = new Date();
    const start = new Date(subject.start_date);
    const end = new Date(subject.end_date);
    const total = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  };

  const getSubjectStatus = (subject: AcademicSubject) => {
    const today = new Date();
    const start = new Date(subject.start_date);
    const end = new Date(subject.end_date);
    
    if (today < start) {
      return { status: 'upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Próxima' };
    } else if (today > end) {
      return { status: 'finished', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Finalizada' };
    } else {
      return { status: 'active', color: 'text-green-600', bgColor: 'bg-green-100', label: 'Ativa' };
    }
  };

  const toggleDayOfWeek = (day: string) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Matérias Acadêmicas</h1>
          <p className="text-gray-600 mt-1">Configure e gerencie suas matérias do semestre</p>
        </div>
        <Button 
          onClick={() => {
            setEditingSubject(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Matéria
        </Button>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total de Matérias</p>
                <p className="text-2xl font-bold">{subjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Ativas</p>
                <p className="text-2xl font-bold">
                  {subjects.filter(s => getSubjectStatus(s).status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Próximas</p>
                <p className="text-2xl font-bold">
                  {subjects.filter(s => getSubjectStatus(s).status === 'upcoming').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Finalizadas</p>
                <p className="text-2xl font-bold">
                  {subjects.filter(s => getSubjectStatus(s).status === 'finished').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Matérias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma matéria cadastrada</h3>
            <p className="text-gray-500 mb-4">Comece criando sua primeira matéria acadêmica</p>
            <Button 
              onClick={() => {
                setEditingSubject(null);
                resetForm();
                setShowModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Matéria
            </Button>
          </div>
        ) : (
          subjects.map((subject) => {
            const status = getSubjectStatus(subject);
            const progress = getSubjectProgress(subject);
            
            return (
              <Card key={subject.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{subject.name}</CardTitle>
                      <Badge className={`${status.color} ${status.bgColor} border-0`}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(subject)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(subject.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Início</p>
                      <p className="font-medium">
                        {format(new Date(subject.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Término</p>
                      <p className="font-medium">
                        {format(new Date(subject.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Frequência</p>
                      <p className="font-medium">{subject.weekly_frequency}x por semana</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Aprovação</p>
                      <p className="font-medium">{subject.approval_percentage}%</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-600 text-sm mb-1">Aulas Totais</p>
                    <p className="font-medium">{subject.total_classes} aulas</p>
                  </div>

                  <div>
                    <p className="text-gray-600 text-sm mb-1">Faltas Permitidas</p>
                    <p className="font-medium text-red-600">{subject.allowed_absences} faltas</p>
                  </div>

                  {status.status === 'active' && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Progresso do Semestre</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  <div>
                    <p className="text-gray-600 text-sm mb-2">Dias da Semana</p>
                    <div className="flex flex-wrap gap-1">
                      {subject.days_of_week.map((day) => {
                        const dayLabel = DAYS_OF_WEEK.find(d => d.value === day)?.label.slice(0, 3);
                        return (
                          <Badge key={day} variant="outline" className="text-xs">
                            {dayLabel}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal para Criar/Editar Matéria */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSubject ? 'Editar Matéria' : 'Nova Matéria'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name">Nome da Matéria *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Anatomia Humana"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Data de Início *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">Data de Término *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weekly_frequency">Aulas por Semana</Label>
                <Input
                  id="weekly_frequency"
                  type="number"
                  min="1"
                  max="7"
                  value={formData.weekly_frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, weekly_frequency: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="class_duration">Duração da Aula (min)</Label>
                <Input
                  id="class_duration"
                  type="number"
                  min="30"
                  max="240"
                  value={formData.class_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, class_duration: parseInt(e.target.value) || 50 }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="approval_percentage">Percentual de Aprovação (%)</Label>
              <Input
                id="approval_percentage"
                type="number"
                min="50"
                max="100"
                value={formData.approval_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, approval_percentage: parseInt(e.target.value) || 75 }))}
              />
            </div>

            <div>
              <Label>Dias da Semana *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DAYS_OF_WEEK.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={formData.days_of_week.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDayOfWeek(day.value)}
                    className="justify-start"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingSubject ? 'Atualizar' : 'Criar'} Matéria
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}