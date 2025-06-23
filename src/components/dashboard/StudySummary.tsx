"use client";

import React, { useState } from 'react';
import { Clock, CheckCircle, Calendar, BarChart2, Zap, Activity, TrendingUp, Award, Flame, ChevronLeft, ChevronRight, X, CalendarDays, Eye } from 'lucide-react';
import { Card, CardStat, CardGrid } from '@/components/ui/card';
import { StudyMetrics } from '../../lib/types/dashboard';

interface StudySummaryProps {
  metrics: StudyMetrics;
}

// Função para gerar dados simulados de estudo para o calendário completo
const generateFakeStudyData = (streak: number) => {
  const studyData = new Map();
  const today = new Date();
  
  // Dias de estudo consecutivos (streak atual)
  for (let i = 0; i < streak; i++) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    studyData.set(dateString, { minutes: 30 + Math.floor(Math.random() * 120) });
  }
  
  // Alguns dias aleatórios com estudo nos últimos 3 meses
  for (let i = streak + 1; i < 90; i++) {
    if (Math.random() > 0.7) { // 30% de chance de ter estudado
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      studyData.set(dateString, { minutes: 15 + Math.floor(Math.random() * 150) });
    }
  }
  
  return studyData;
};

const StudySummary = ({ metrics }: StudySummaryProps) => {
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Gerar dados de estudo simulados
  const studyData = generateFakeStudyData(metrics.streak);
  
  // Convert numeric trends to string trends for the CardStat component
  const getStringTrend = (value: number): 'up' | 'down' | 'neutral' => {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  };

  // Função para converter minutos em formato de horas
  const formatMinutesToHours = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}min`;
  };

  // Função para gerar os últimos 7 dias para a sequência
  const generateLastSevenDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(today.getDate() - i);
      days.push({
        date: day,
        dayName: day.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3),
        dayNumber: day.getDate(),
        isActive: i < metrics.streak, // Considerando que o streak são dias consecutivos até hoje
        isToday: i === 0
      });
    }
    
    return days;
  };

  // Função para navegar entre meses no calendário
  const navigateMonth = (direction: number) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  // Função para gerar calendário do mês
  const generateMonthCalendar = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = domingo, 1 = segunda, etc.
    
    // Ajustar para que a semana comece na segunda-feira (0 = segunda, 6 = domingo)
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    const calendar = [];
    let week = Array(7).fill(null);
    
    // Preencher os dias vazios no início do mês
    for (let i = 0; i < adjustedStartingDay; i++) {
      week[i] = null;
    }
    
    // Preencher os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (adjustedStartingDay + day - 1) % 7;
      
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const studyMinutes = studyData.get(dateString)?.minutes || 0;
      
      week[dayOfWeek] = {
        day,
        date,
        hasStudied: studyMinutes > 0,
        minutes: studyMinutes,
        isToday: date.toDateString() === new Date().toDateString()
      };
      
      // Iniciar uma nova semana quando chegarmos ao domingo
      if (dayOfWeek === 6 || day === daysInMonth) {
        calendar.push([...week]);
        week = Array(7).fill(null);
      }
    }
    
    return calendar;
  };

  const monthCalendar = generateMonthCalendar(selectedYear, selectedMonth);
  const lastSevenDays = generateLastSevenDays();
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // Função para obter a intensidade da cor baseada nos minutos estudados
  const getIntensityColor = (minutes: number) => {
    if (minutes === 0) return 'bg-gray-100';
    if (minutes < 30) return 'bg-orange-100';
    if (minutes < 60) return 'bg-orange-200';
    if (minutes < 90) return 'bg-orange-300';
    if (minutes < 120) return 'bg-orange-400';
    return 'bg-orange-500';
  };

  return (
    <>
    <Card 
        title="Seu progresso" 
        className="h-full bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-0 shadow-md overflow-visible"
        icon={<Award className="h-5 w-5 text-indigo-600" />}
      showOptions
    >
        <div className="relative">
          <div className="absolute -top-12 right-0 text-indigo-900/5 pointer-events-none">
            <TrendingUp className="h-32 w-32 rotate-12" />
          </div>

          {/* Sequência de logins com foguinho */}
          <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-indigo-100">
            <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
              <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                Sequência de estudos
              </h4>
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  {metrics.streak} DIAS
                </span>
                <button 
                  onClick={() => setShowFullCalendar(true)}
                  className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-colors duration-200"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Ver calendário</span>
                </button>
              </div>
            </div>
            
            <div className="flex justify-between gap-1 md:gap-2">
              {lastSevenDays.map((day, index) => (
                <div key={index} className="flex flex-col items-center group">
                  <div className="text-xs font-medium text-gray-500 mb-1 uppercase hidden sm:block">{day.dayName}</div>
                  <div 
                    className={`
                      relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${day.isActive 
                        ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md hover:shadow-lg hover:scale-110 cursor-pointer' 
                        : day.isToday 
                          ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300 hover:bg-indigo-200 hover:scale-105 cursor-pointer' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:scale-105'
                      }
                    `}
                    title={day.date.toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  >
                    <span className="text-xs sm:text-sm font-bold">{day.dayNumber}</span>
                    {day.isActive && (
                      <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 animate-pulse">
                        <Flame className={`h-4 w-4 sm:h-5 sm:w-5 text-orange-500 fill-orange-500 transition-all duration-300 group-hover:scale-125`} />
                      </div>
                    )}
                    {/* Tooltip personalizado */}
                    <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1.5 px-2.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-20">
                      {day.isActive 
                        ? '✅ Dia estudado' 
                        : day.isToday 
                          ? '📌 Hoje' 
                          : '❌ Sem estudos'}
                      <br />
                      {day.date.toLocaleDateString('pt-BR', { 
                        weekday: 'long', 
                        day: 'numeric',
                        month: 'long'
                      })}
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                    </div>
                  </div>
                  {day.isToday && (
                    <div className="text-[10px] font-bold text-indigo-600 mt-1 bg-indigo-50 px-1.5 py-0.5 rounded-full hidden sm:block">Hoje</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-3 rounded-lg shadow-md">
                <BarChart2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-indigo-900">Resumo da semana</h3>
                <p className="text-indigo-600 text-sm">
                  Acompanhe seu desempenho e mantenha o foco
                </p>
              </div>
            </div>
          </div>
        
      <CardGrid columns={3}>
        <CardStat 
              icon={<Clock className="h-6 w-6" />}
              label="Tempo de estudo"
          value={formatMinutesToHours(metrics.hoursThisWeek)}
          trend={getStringTrend(metrics.hoursChange)}
          trendLabel={metrics.hoursChange > 0 ? `+${metrics.hoursChange}%` : `${metrics.hoursChange}%`}
              color="blue"
              className="transform transition-all duration-300 hover:scale-105 hover:shadow-md"
        />
        <CardStat 
              icon={<CheckCircle className="h-6 w-6" />}
          label="Tarefas concluídas"
          value={metrics.completedTasks}
          trend={getStringTrend(metrics.tasksChange)}
          trendLabel={metrics.tasksChange > 0 ? `+${metrics.tasksChange}%` : `${metrics.tasksChange}%`}
              color="green"
              className="transform transition-all duration-300 hover:scale-105 hover:shadow-md"
        />
        <CardStat 
              icon={<Calendar className="h-6 w-6" />}
          label="Sequência atual"
          value={`${metrics.streak} dias`}
          trend={getStringTrend(metrics.streakChange)}
          trendLabel={metrics.streakChange > 0 ? `+${metrics.streakChange}` : `${metrics.streakChange}`}
              color="purple"
              className="transform transition-all duration-300 hover:scale-105 hover:shadow-md"
        />
        <CardStat 
              icon={<Zap className="h-6 w-6" />}
          label="Pontuação de Foco"
          value={`${metrics.focusScore}/100`}
          trend="neutral"
              color="yellow"
              className="transform transition-all duration-300 hover:scale-105 hover:shadow-md bg-gradient-to-r from-yellow-50 to-amber-50"
        />
        <CardStat 
              icon={<Activity className="h-6 w-6" />}
          label="Taxa de Eficiência"
          value={`${metrics.efficiencyRate}%`}
          trend="neutral"
              color="red"
              className="transform transition-all duration-300 hover:scale-105 hover:shadow-md bg-gradient-to-r from-red-50 to-rose-50"
            />

            {/* Estatística de resumo principal */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 text-white shadow-md transform transition-all duration-300 hover:shadow-lg hover:scale-105 relative overflow-hidden">
              {/* Efeito de fundo */}
              <div className="absolute -right-6 -bottom-6 opacity-20">
                <Flame className="h-24 w-24" />
              </div>
              
              <div className="flex flex-col h-full justify-between relative z-10">
                <div className="text-indigo-100 text-sm font-medium mb-2 flex items-center gap-2">
                  <span>Seu desempenho</span>
                  {metrics.streak >= 7 && (
                    <span className="bg-white/30 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                      🔥 Em chamas!
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold flex items-center gap-2">
                      {metrics.streak >= 7 ? 'Incrível!' : metrics.streak > 0 ? 'Ótimo!' : 'Comece!'}
                      {metrics.streak >= 3 && metrics.streak < 7 && <Flame className="h-5 w-5 text-orange-400 fill-orange-400" />}
                      {metrics.streak >= 7 && (
                        <>
                          <Flame className="h-5 w-5 text-orange-400 fill-orange-400" />
                          <Flame className="h-5 w-5 text-orange-400 fill-orange-400" />
                        </>
                      )}
                    </div>
                    <div className="text-indigo-100 text-sm mt-2">
                      {metrics.streak >= 7 
                        ? `Sequência de ${metrics.streak} dias! Continue assim!` 
                        : metrics.streak > 0 
                          ? `Mantenha a sequência de ${metrics.streak} ${metrics.streak === 1 ? 'dia' : 'dias'}!`
                          : `Inicie sua jornada hoje`}
                    </div>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                    {metrics.streak >= 7 
                      ? <Flame className="h-7 w-7 text-orange-400 fill-orange-400" />
                      : <Award className="h-7 w-7" />
                    }
                  </div>
                </div>
              </div>
            </div>
      </CardGrid>
        </div>
    </Card>

      {/* Modal de calendário completo */}
      {showFullCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-600" />
                  Calendário de Estudos
                </h3>
                <button 
                  onClick={() => setShowFullCalendar(false)}
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navegação de meses */}
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => navigateMonth(-1)}
                  className="p-2 text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h4 className="text-lg font-bold text-gray-800">
                  {monthNames[selectedMonth]} {selectedYear}
                </h4>
                <button 
                  onClick={() => navigateMonth(1)}
                  className="p-2 text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Calendário */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Cabeçalho dos dias da semana */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {dayNames.map((day, index) => (
                    <div key={index} className="py-2 text-center text-xs font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Grade do calendário */}
                <div className="bg-white">
                  {monthCalendar.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 last:border-b-0">
                      {week.map((day, dayIndex) => (
                        <div 
                          key={dayIndex}
                          className={`
                            p-1 h-20 border-r border-gray-200 last:border-r-0 relative
                            ${day?.isToday ? 'bg-indigo-50' : 'hover:bg-gray-50'}
                          `}
                        >
                          {day && (
                            <>
                              <div className="flex justify-between items-start p-1">
                                <span className={`text-sm ${day.isToday ? 'font-bold text-indigo-700' : 'text-gray-700'}`}>
                                  {day.day}
                                </span>
                                {day.hasStudied && (
                                  <div className="relative group">
                                    <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full right-0 bg-gray-800 text-white text-xs rounded py-1 px-2 hidden group-hover:block whitespace-nowrap z-10">
                                      {formatMinutesToHours(day.minutes)} de estudo
                                      <div className="absolute top-full right-1 w-2 h-2 bg-gray-800 rotate-45"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {day.hasStudied && (
                                <div className={`mt-2 ${getIntensityColor(day.minutes)} h-2 w-full rounded-sm`}></div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legenda */}
              <div className="mt-6 flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span className="text-xs text-gray-600">Sem estudo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-100 rounded"></div>
                  <span className="text-xs text-gray-600">Até 30min</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-200 rounded"></div>
                  <span className="text-xs text-gray-600">30min - 1h</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-300 rounded"></div>
                  <span className="text-xs text-gray-600">1h - 1h30</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-400 rounded"></div>
                  <span className="text-xs text-gray-600">1h30 - 2h</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-xs text-gray-600">2h+</span>
                </div>
              </div>

              {/* Resumo */}
              <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                <div className="flex flex-wrap gap-4 justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-indigo-600 font-medium">Sequência atual</span>
                    <span className="text-xl font-bold text-indigo-900 flex items-center gap-1">
                      {metrics.streak} dias
                      {metrics.streak >= 3 && <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-indigo-600 font-medium">Total de horas este mês</span>
                    <span className="text-xl font-bold text-indigo-900">
                      {formatMinutesToHours(Math.floor(Math.random() * 2000) + 500)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-indigo-600 font-medium">Média diária</span>
                    <span className="text-xl font-bold text-indigo-900">
                      {formatMinutesToHours(Math.floor(Math.random() * 100) + 30)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowFullCalendar(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm font-medium"
                >
                  Fechar calendário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudySummary; 
