'use client';

import { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  MapPin,
  BookOpen,
  FileText,
  Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityFeedService } from '@/services/community-feed.service';
import { AcademicEvent } from '@/types/community';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Dados simulados para eventos
const mockEvents: AcademicEvent[] = [
  {
    id: 'evt1',
    title: 'Entrega do Trabalho de Anatomia',
    date: '2023-05-15',
    time: '23:59',
    description: 'Prazo final para entrega do trabalho sobre Sistema Nervoso',
    type: 'assignment',
    course_id: 'med101',
    course_name: 'Anatomia Humana I',
    importance: 'high'
  },
  {
    id: 'evt2',
    title: 'Prova de Fisiologia',
    date: '2023-05-18',
    time: '14:00',
    location: 'Sala 305',
    description: 'Prova sobre Sistema Cardiovascular e Respiratório',
    type: 'exam',
    course_id: 'med102',
    course_name: 'Fisiologia Médica I',
    importance: 'high'
  },
  {
    id: 'evt3',
    title: 'Palestra: Avanços em Medicina',
    date: '2023-05-22',
    time: '19:00',
    location: 'Auditório Principal',
    description: 'Palestra com Dr. Paulo Mendes do Hospital Universitário',
    type: 'lecture',
    importance: 'medium'
  },
  {
    id: 'evt4',
    title: 'Workshop de Habilidades Clínicas',
    date: '2023-05-25',
    time: '08:00',
    location: 'Laboratório de Simulação',
    description: 'Treinamento prático de anamnese e exame físico',
    type: 'workshop',
    course_id: 'med103',
    course_name: 'Habilidades Médicas I',
    importance: 'medium'
  },
  {
    id: 'evt5',
    title: 'Reunião do Colegiado',
    date: '2023-05-30',
    time: '15:00',
    location: 'Sala de Reuniões',
    description: 'Discussão sobre alterações curriculares',
    type: 'other',
    importance: 'low'
  },
  {
    id: 'evt6',
    title: 'Prova de Bioquímica',
    date: '2023-06-05',
    time: '10:00',
    location: 'Sala 201',
    description: 'Avaliação sobre metabolismo celular',
    type: 'exam',
    course_id: 'med104',
    course_name: 'Bioquímica Médica',
    importance: 'high'
  },
  {
    id: 'evt7',
    title: 'Aula Prática de Histologia',
    date: '2023-06-08',
    time: '14:00',
    location: 'Laboratório de Microscopia',
    description: 'Análise de lâminas de tecido conjuntivo',
    type: 'other',
    course_id: 'med105',
    course_name: 'Histologia',
    importance: 'medium'
  }
];

export default function CalendarioPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'all' | 'exams' | 'assignments'>('upcoming');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  useEffect(() => {
    loadEvents();
  }, [activeTab]);
  
  const loadEvents = () => {
    setLoading(true);
    
    // Simular carregamento
    setTimeout(() => {
      let filteredEvents = [...mockEvents];
      
      if (activeTab === 'upcoming') {
        const today = new Date();
        filteredEvents = mockEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today;
        });
      } else if (activeTab === 'exams') {
        filteredEvents = mockEvents.filter(event => event.type === 'exam');
      } else if (activeTab === 'assignments') {
        filteredEvents = mockEvents.filter(event => event.type === 'assignment');
      }
      
      // Ordenar por data
      filteredEvents.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
        const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
        return dateA.getTime() - dateB.getTime();
      });
      
      setEvents(filteredEvents);
      setLoading(false);
    }, 500);
  };
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'exam':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'assignment':
        return <BookOpen className="h-5 w-5 text-amber-500" />;
      case 'lecture':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'workshop':
        return <Users className="h-5 w-5 text-green-500" />;
      default:
        return <CalendarDays className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getEventColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-red-50 border-red-100';
      case 'medium':
        return 'bg-blue-50 border-blue-100';
      case 'low':
        return 'bg-gray-50 border-gray-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };
  
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };
  
  const prevMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };
  
  const nextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };
  
  const formatEventDate = (date: string) => {
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <CalendarDays className="h-6 w-6 mr-2 text-amber-600" />
          Calendário Acadêmico
        </h1>
        <Button className="bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Evento
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendário mensal */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <button 
                className="p-1 rounded-full hover:bg-gray-100"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-medium text-gray-800 capitalize">
                {formatMonth(currentMonth)}
              </h2>
              <button 
                className="p-1 rounded-full hover:bg-gray-100"
                onClick={nextMonth}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            
            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Grade do calendário (simplificada) */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => {
                const day = i + 1;
                const hasEvent = mockEvents.some(event => {
                  const eventDate = new Date(event.date);
                  return eventDate.getDate() === day && 
                         eventDate.getMonth() === currentMonth.getMonth() &&
                         eventDate.getFullYear() === currentMonth.getFullYear();
                });
                
                return (
                  <div 
                    key={i} 
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm
                      ${hasEvent ? 'bg-amber-50 text-amber-800 font-medium' : 'hover:bg-gray-50'}`}
                  >
                    {day}
                    {hasEvent && <div className="w-1 h-1 bg-amber-500 rounded-full mt-1"></div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Lista de eventos */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <Tabs 
              defaultValue="upcoming" 
              className="w-full"
              onValueChange={(value) => setActiveTab(value as 'upcoming' | 'all' | 'exams' | 'assignments')}
            >
              <TabsList className="w-full grid grid-cols-4 mb-6">
                <TabsTrigger value="upcoming">Próximos</TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="exams">Provas</TabsTrigger>
                <TabsTrigger value="assignments">Trabalhos</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4"></div>
                <p className="text-gray-600">Carregando eventos...</p>
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <div 
                    key={event.id} 
                    className={`border rounded-lg p-4 ${getEventColor(event.importance)}`