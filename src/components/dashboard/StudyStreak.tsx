import { useState } from 'react';
import Link from 'next/link';
import { Flame, Info, Calendar, Trophy, ChevronRight, CalendarDays, ChevronLeft, X, Eye, Award, Crown, Star, Zap } from 'lucide-react';
import { StudyStreak as StudyStreakType } from '@/services/study-activities.service';
import StudyActivityInfo from './StudyActivityInfo';

interface StudyStreakProps {
  streak: StudyStreakType | null;
  isLoading: boolean;
}

const StudyStreak: React.FC<StudyStreakProps> = ({ streak, isLoading }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Função para formatar a data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  // Função para gerar dados simulados de estudo para o calendário
  const generateFakeStudyData = (currentStreak: number) => {
    const studyData = new Map();
    const today = new Date();
    
    // Dias de estudo consecutivos (streak atual)
    for (let i = 0; i < currentStreak; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      studyData.set(dateString, { minutes: 30 + Math.floor(Math.random() * 120), activities: Math.floor(Math.random() * 3) + 1 });
    }
    
    // Alguns dias aleatórios com estudo nos últimos 3 meses
    for (let i = currentStreak + 1; i < 90; i++) {
      if (Math.random() > 0.7) { // 30% de chance de ter estudado
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        studyData.set(dateString, { minutes: 15 + Math.floor(Math.random() * 150), activities: Math.floor(Math.random() * 2) + 1 });
      }
    }
    
    return studyData;
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
    const startingDayOfWeek = firstDay.getDay();
    
    // Ajustar para que a semana comece na segunda-feira
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
      const studyInfo = studyData.get(dateString);
      
      week[dayOfWeek] = {
        day,
        date,
        hasStudied: !!studyInfo,
        activities: studyInfo?.activities || 0,
        minutes: studyInfo?.minutes || 0,
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

  // Função para obter a intensidade da cor baseada no número de atividades
  const getIntensityColor = (activities: number) => {
    if (activities === 0) return 'bg-gray-100';
    if (activities === 1) return 'bg-orange-200';
    if (activities === 2) return 'bg-orange-400';
    return 'bg-orange-500';
  };

  // Gerar dados de estudo simulados
  const studyData = generateFakeStudyData(streak?.currentStreak || 0);
  const monthCalendar = generateMonthCalendar(selectedYear, selectedMonth);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4 w-1/2"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-white via-orange-50/30 to-amber-50/50 rounded-2xl shadow-xl border border-orange-100/50 overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border-b border-orange-200/30">
        <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center">
          <div className="relative mr-3">
            <Flame className="h-6 w-6 text-orange-500 drop-shadow-sm" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
          </div>
          Sequência de Estudos
        </h3>
        <button
          onClick={() => setShowInfo(true)}
          className="text-orange-400 hover:text-orange-600 hover:bg-orange-100/50 p-2 rounded-full transition-all duration-200"
          aria-label="Informações sobre sequência de estudos"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Card Sequência Atual */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
            <div className="relative bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Flame className="h-6 w-6 text-white" />
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-xs font-bold text-white/90">ATUAL</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black mb-1 drop-shadow-sm">{streak?.currentStreak || 0}</div>
                <div className="text-white/80 text-sm font-medium">dias consecutivos</div>
              </div>
              {(streak?.currentStreak || 0) >= 7 && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1.5 shadow-lg">
                  <Star className="h-4 w-4 fill-current" />
                </div>
              )}
            </div>
          </div>

          {/* Card Maior Sequência */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
            <div className="relative bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-xs font-bold text-white/90">RECORDE</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black mb-1 drop-shadow-sm">{streak?.longestStreak || 0}</div>
                <div className="text-white/80 text-sm font-medium">maior sequência</div>
              </div>
              {(streak?.longestStreak || 0) >= 30 && (
                <div className="absolute -top-2 -right-2 bg-purple-400 text-purple-900 rounded-full p-1.5 shadow-lg">
                  <Crown className="h-4 w-4 fill-current" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seção Últimos 7 dias */}
        <div className="bg-orange-50 rounded-lg p-5 border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-orange-500 rounded-full p-2 mr-3">
                <Flame className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-orange-800">Últimos 7 dias</span>
            </div>
            <button 
              onClick={() => setShowFullCalendar(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Ver calendário</span>
            </button>
          </div>

          <div className="flex justify-between gap-2">
            {streak?.lastWeekActivities.map((day, index) => (
              <div key={index} className="flex flex-col items-center group">
                <div className="relative">
                  <div
                    className={`h-12 w-12 rounded-lg flex items-center justify-center mb-2 transition-all duration-200 group-hover:scale-105
                      ${day.hasActivity 
                        ? 'bg-orange-500 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-400 border border-gray-200'}`}
                  >
                    {day.hasActivity ? (
                      <Flame className="h-5 w-5 text-white" />
                    ) : (
                      <span className="font-medium text-sm">{index + 1}</span>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium ${
                  day.hasActivity ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {formatDate(day.date).split(',')[0]}
                </span>
              </div>
            )) || Array(7).fill(0).map((_, index) => (
              <div key={index} className="flex flex-col items-center group">
                <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center mb-2 text-gray-400 border border-gray-200 transition-all duration-200 group-hover:scale-105">
                  <span className="font-medium text-sm">{index + 1}</span>
                </div>
                <span className="text-xs text-gray-500 font-medium">-</span>
              </div>
            ))}
          </div>
        </div>

        {/* Link para histórico */}
        <Link
          href="/estudos"
          className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <span>Ver histórico de estudos</span>
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      <StudyActivityInfo isOpen={showInfo} onClose={() => setShowInfo(false)} />

      {/* Modal de calendário completo */}
      {showFullCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Flame className="h-6 w-6 text-orange-500" />
                  Calendário de Estudos
                </h3>
                <button 
                  onClick={() => setShowFullCalendar(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navegação de meses */}
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => navigateMonth(-1)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                  <h4 className="text-lg font-medium text-gray-800">
                    {monthNames[selectedMonth]} {selectedYear}
                  </h4>
                </div>
                <button 
                  onClick={() => navigateMonth(1)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Calendário */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Cabeçalho dos dias da semana */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {dayNames.map((day, index) => (
                    <div key={index} className="py-3 text-center text-sm font-semibold text-gray-700">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Grade do calendário */}
                <div className="bg-white">
                  {monthCalendar.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
                      {week.map((day, dayIndex) => (
                        <div 
                          key={dayIndex}
                          className={`
                            p-2 h-20 border-r border-gray-100 last:border-r-0 relative hover:bg-gray-50
                            ${day?.isToday ? 'bg-orange-50' : ''}
                          `}
                        >
                          {day && (
                            <>
                              <div className="flex justify-between items-start">
                                <span className={`text-sm font-medium ${
                                  day.isToday 
                                    ? 'text-orange-600 font-semibold' 
                                    : day.hasStudied 
                                      ? 'text-orange-700' 
                                      : 'text-gray-600'
                                }`}>
                                  {day.day}
                                </span>
                                {day.hasStudied && (
                                  <div className="relative group">
                                    <Flame className="h-4 w-4 text-orange-500" />
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full right-0 bg-gray-800 text-white text-xs rounded py-1 px-2 hidden group-hover:block whitespace-nowrap z-10">
                                      <div>{day.activities} atividade{day.activities > 1 ? 's' : ''}</div>
                                      <div>{formatMinutesToHours(day.minutes)}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {day.hasStudied && (
                                <div className="mt-1">
                                  <div className={`h-2 w-full rounded ${
                                    day.activities === 1 ? 'bg-orange-200' :
                                    day.activities === 2 ? 'bg-orange-400' :
                                    'bg-orange-500'
                                  }`}></div>
                                </div>
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
              <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-700 mb-3 text-center">Legenda de Intensidade</h5>
                <div className="flex flex-wrap gap-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span className="text-sm text-gray-600">Sem atividade</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-200 rounded"></div>
                    <span className="text-sm text-gray-600">1 atividade</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-400 rounded"></div>
                    <span className="text-sm text-gray-600">2 atividades</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                    <span className="text-sm text-gray-600">3+ atividades</span>
                  </div>
                </div>
              </div>

              {/* Resumo */}
              <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h5 className="text-lg font-semibold text-center mb-6 text-gray-800">Estatísticas do Mês</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <Flame className="h-5 w-5 mr-2 text-orange-500" />
                      <span className="text-sm font-medium text-gray-600">SEQUÊNCIA ATUAL</span>
                    </div>
                    <div className="text-2xl font-bold mb-1 text-orange-600">{streak?.currentStreak || 0}</div>
                    <div className="text-gray-500 text-sm">dias consecutivos</div>
                  </div>
                  <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <Trophy className="h-5 w-5 mr-2 text-amber-500" />
                      <span className="text-sm font-medium text-gray-600">RECORDE</span>
                    </div>
                    <div className="text-2xl font-bold mb-1 text-amber-600">{streak?.longestStreak || 0}</div>
                    <div className="text-gray-500 text-sm">maior sequência</div>
                  </div>
                  <div className="text-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <Calendar className="h-5 w-5 mr-2 text-green-500" />
                      <span className="text-sm font-medium text-gray-600">ESTE MÊS</span>
                    </div>
                    <div className="text-2xl font-bold mb-1 text-green-600">{monthCalendar.flat().filter(day => day?.hasStudied).length}</div>
                    <div className="text-gray-500 text-sm">dias ativos</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-center">
                <button 
                  onClick={() => setShowFullCalendar(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  <span>Fechar calendário</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyStreak;
