'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlanningService, StudyPlanSession } from '@/services/planning.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  Clock, 
  ArrowLeft, 
  Loader2, 
  BookOpen, 
  FileText, 
  Timer, 
  Calendar as CalendarFull,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// Interface para disciplina
interface Discipline {
  id: number;
  name: string;
}

export default function NovaSessaoPage() {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [disciplineId, setDisciplineId] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [duration, setDuration] = useState<string>('30');
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const router = useRouter();

  // Buscar disciplinas do usuário
  useEffect(() => {
    async function fetchDisciplines() {
      setIsLoading(true);
      try {
        // Importar dinamicamente para evitar problemas de SSR
        const { DisciplinesRestService } = await import('@/lib/supabase-rest');
        const disciplinesData = await DisciplinesRestService.getDisciplines();
        setDisciplines(disciplinesData || []);
      } catch (error) {
        console.error('Erro ao buscar disciplinas:', error);
        toast.error('Não foi possível carregar suas disciplinas.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDisciplines();
  }, []);

  // Função para criar uma nova sessão de estudo
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!disciplineId || !date || !time || !duration) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSaving(true);

    try {
      // Combinar data e hora
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledDate = new Date(date);
      scheduledDate.setHours(hours, minutes, 0, 0);

      // Criamos uma string de data ISO no formato local, sem conversão para UTC
      // Formato: 'YYYY-MM-DDT00:00:00.000-03:00'
      const isoDateString = scheduledDate.getFullYear() + '-' + 
                            String(scheduledDate.getMonth() + 1).padStart(2, '0') + '-' +
                            String(scheduledDate.getDate()).padStart(2, '0') + 'T' +
                            String(scheduledDate.getHours()).padStart(2, '0') + ':' +
                            String(scheduledDate.getMinutes()).padStart(2, '0') + ':00';

      // Criar objeto da sessão
      const sessionData: Omit<StudyPlanSession, 'id' | 'created_at' | 'updated_at'> = {
        title: title || 'Sessão de estudo',
        notes: description,
        discipline_id: parseInt(disciplineId),
        scheduled_date: scheduledDate.toISOString(), // Mantemos toISOString() por compatibilidade com API
        duration_minutes: parseInt(duration),
        status: 'agendada',
        user_id: '' // Será preenchido pelo serviço
      };

      console.log('Data original:', scheduledDate);
      console.log('Data em ISO:', sessionData.scheduled_date);
      console.log('Hora local Brasil:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

      // Salvar no banco de dados
      const result = await PlanningService.createPlannedSession(sessionData);

      if (result) {
        toast.success('Sua sessão de estudo foi planejada com sucesso!');
        router.push('/planejamento');
      } else {
        throw new Error('Falha ao criar sessão');
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      toast.error('Não foi possível criar a sessão de estudo.');
    } finally {
      setIsSaving(false);
    }
  }

  // Função para obter a cor baseada no ID da disciplina (para visualização)
  const getDisciplineColor = (id: string) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-emerald-500 to-emerald-600',
      'from-amber-500 to-amber-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-green-500 to-green-600',
      'from-red-500 to-red-600',
    ];
    
    if (!id) return colors[0];
    return colors[parseInt(id) % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/planejamento" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-8 group"
        >
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 group-hover:bg-blue-200 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="font-medium">Voltar para o planejamento</span>
        </Link>
        
        <div className="relative">
          {/* Elemento decorativo */}
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
          
          <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-sm">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <CardHeader className="pb-4 pt-8 px-8">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white">
                  <CalendarFull className="h-5 w-5" />
                </div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Nova Sessão de Estudo
                </CardTitle>
              </div>
              <CardDescription className="text-gray-500 text-base">
                Planeje uma nova sessão de estudo para otimizar seu aprendizado
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-8 pt-6 px-8">
                {/* Título e disciplina na mesma linha em telas maiores */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-sm font-medium flex items-center">
                      <FileText className="h-4 w-4 mr-1.5 text-blue-500" />
                      Título da sessão
                    </Label>
                    <div className="h-11">
                    <Input
                      id="title"
                      placeholder="Ex: Revisão de anatomia"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-11"
                    />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="discipline" className="text-sm font-medium flex items-center">
                      <BookOpen className="h-4 w-4 mr-1.5 text-blue-500" />
                      Disciplina
                    </Label>
                    {isLoading ? (
                      <div className="flex items-center space-x-2 h-11 border rounded-md px-3 border-gray-200 bg-gray-50">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-sm text-gray-500">Carregando disciplinas...</span>
                      </div>
                    ) : (
                      <Select value={disciplineId} onValueChange={setDisciplineId}>
                        <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-11">
                          <SelectValue placeholder="Selecione uma disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                          {disciplines.length > 0 ? (
                            disciplines.map((discipline) => (
                              <SelectItem 
                                key={discipline.id} 
                                value={discipline.id.toString()}
                                className="focus:bg-blue-50"
                              >
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getDisciplineColor(discipline.id.toString())} mr-2`}></div>
                                  {discipline.name}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              Nenhuma disciplina encontrada
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                
                {/* Data, hora e duração */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1.5 text-blue-500" />
                      Data
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal border-gray-200 hover:bg-blue-50 hover:text-blue-600 h-11",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                          {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-0 shadow-lg" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(newDate) => newDate && setDate(newDate)}
                          initialFocus
                          locale={ptBR}
                          className="rounded-md border-0"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="time" className="text-sm font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-1.5 text-blue-500" />
                      Horário
                    </Label>
                    <div className="relative flex items-center">
                      <Input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-11"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="duration" className="text-sm font-medium flex items-center">
                      <Timer className="h-4 w-4 mr-1.5 text-blue-500" />
                      Duração
                    </Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-11">
                        <SelectValue placeholder="Selecione a duração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="45">45 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1 hora e 30 minutos</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Descrição */}
                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-medium flex items-center">
                    <GraduationCap className="h-4 w-4 mr-1.5 text-blue-500" />
                    Descrição (opcional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Detalhes sobre o que você vai estudar nesta sessão"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                  />
                </div>
                
                {/* Dica para estudo eficiente */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                  <div className="flex items-start">
                    <div className="p-1.5 bg-blue-100 rounded-full text-blue-600 mr-3 mt-0.5">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 mb-1.5">Dica para estudo eficiente</h4>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Estudos mostram que sessões de 25-45 minutos com pequenos intervalos maximizam a retenção de informações.
                        Considere usar a técnica Pomodoro para melhorar seu foco e produtividade.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-4 pb-8 px-8 border-t border-gray-100 mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push('/planejamento')}
                  className="border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors h-11 px-5"
                >
                  Cancelar
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={isSaving || !disciplineId}
                  className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all h-11 px-5 ${!disciplineId ? 'opacity-70' : ''}`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CalendarFull className="mr-2 h-4 w-4" />
                      Criar Sessão
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
} 