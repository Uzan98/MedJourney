"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/card';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement,
  LineElement,
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { BarChart3, BookOpen, ArrowUpRight, ListFilter, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ExamsService } from '@/services/exams.service';
import { Discipline } from '@/lib/supabase';
import { DisciplinesRestService } from '@/lib/supabase-rest';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Tipos
interface ExamPerformance {
  id: number;
  title: string;
  score: number;
  date: string;
  discipline_id?: number;
  discipline_name?: string;
  subject_id?: number;
  subject_name?: string;
}

interface GroupedPerformance {
  name: string;
  id: number;
  disciplineId?: number;
  data: number[];
  dates: string[];
  color: string;
}

const SimuladosPerformanceChart = () => {
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'disciplines' | 'subjects'>('disciplines');
  const [examsByDiscipline, setExamsByDiscipline] = useState<GroupedPerformance[]>([]);
  const [examsBySubject, setExamsBySubject] = useState<GroupedPerformance[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  // Definir itens por página com base no tamanho da tela
  const getItemsPerPage = useCallback(() => {
    return isMobile ? 3 : 7; // 3 dias no mobile, 7 no desktop
  }, [isMobile]);

  // Detectar se é dispositivo móvel
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px é o breakpoint padrão para md no Tailwind
    };
    
    // Verificar inicialmente
    checkIfMobile();
    
    // Adicionar event listener para redimensionamento
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Função para gerar cores
  const generateColor = (index: number) => {
    const colors = [
      'rgb(59, 130, 246)', // blue
      'rgb(16, 185, 129)', // green
      'rgb(249, 115, 22)', // orange
      'rgb(139, 92, 246)', // purple
      'rgb(236, 72, 153)', // pink
      'rgb(234, 179, 8)',  // yellow
      'rgb(14, 165, 233)', // sky
      'rgb(168, 85, 247)', // violet
      'rgb(239, 68, 68)',  // red
      'rgb(20, 184, 166)', // teal
    ];
    return colors[index % colors.length];
  };

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log("SimuladosPerformanceChart: Iniciando carregamento de dados");
        
        // Carregar disciplinas
        const disciplinesData = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(disciplinesData || []);
        console.log("SimuladosPerformanceChart: Disciplinas carregadas:", disciplinesData?.length);
        
        // Carregar dados de desempenho por disciplina
        const disciplinePerformance = await ExamsService.getPerformanceByDisciplineForChart();
        console.log("SimuladosPerformanceChart: Dados de desempenho por disciplina:", disciplinePerformance.length);
        
        // Converter para o formato do gráfico
        const formattedDisciplineData = disciplinePerformance.map((discipline, index) => ({
          id: index,
          disciplineId: disciplinesData?.find(d => d.name === discipline.name)?.id || index,
          name: discipline.name,
          data: discipline.data,
          dates: discipline.dates,
          color: generateColor(index)
        }));
        
        setExamsByDiscipline(formattedDisciplineData);
        
        // Carregar dados de desempenho por assunto
        const subjectPerformance = await ExamsService.getPerformanceBySubjectForChart();
        console.log("SimuladosPerformanceChart: Dados de desempenho por assunto:", subjectPerformance.length);
        
        // Carregar dados adicionais para mapear assuntos para disciplinas
        let subjectToDisciplineMap = new Map();
        
        // Para cada disciplina, carregar seus assuntos
        if (disciplinesData && disciplinesData.length > 0) {
          for (const discipline of disciplinesData) {
            try {
              const subjects = await DisciplinesRestService.getSubjects(discipline.id);
              if (subjects && subjects.length > 0) {
                subjects.forEach(subject => {
                  subjectToDisciplineMap.set(subject.name, discipline.id);
                });
              }
            } catch (err) {
              console.error(`Erro ao carregar assuntos da disciplina ${discipline.id}:`, err);
            }
          }
        }
        
        // Converter para o formato do gráfico e associar com disciplinas
        const formattedSubjectData = subjectPerformance.map((subject, index) => {
          // Tentar encontrar a disciplina associada a este assunto
          const disciplineId = subjectToDisciplineMap.get(subject.name) || 
                              // Fallback: tentar encontrar por nome
                              disciplinesData?.find(d => 
                                subject.name.toLowerCase().includes(d.name.toLowerCase()) ||
                                d.name.toLowerCase().includes(subject.name.toLowerCase())
                              )?.id || null;
          
          return {
            id: index,
            name: subject.name,
            disciplineId: disciplineId,
            data: subject.data,
            dates: subject.dates,
            color: generateColor(index + formattedDisciplineData.length) // Cores diferentes das disciplinas
          };
        });
        
        setExamsBySubject(formattedSubjectData);
        
      } catch (error) {
        console.error('Erro ao carregar dados de desempenho:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filtrar assuntos por disciplina selecionada
  const filteredSubjects = selectedDiscipline 
    ? examsBySubject.filter(subject => {
        // Agora usamos a propriedade disciplineId que mapeamos
        return subject.disciplineId === selectedDiscipline;
      })
    : examsBySubject;

  // Obter os dados com base na página atual
  const getPagedData = () => {
    const allData = viewMode === 'disciplines' ? examsByDiscipline : filteredSubjects;
    const itemsPerPage = getItemsPerPage();
    
    // Se não houver dados suficientes, retornar todos
    if (allData.length === 0 || allData[0]?.dates.length <= itemsPerPage) {
      // Inverter a ordem para mostrar os mais recentes primeiro
      return {
        datasets: allData.map(group => ({
          ...group,
          data: [...group.data].reverse(),
          dates: [...group.dates].reverse()
        })),
        labels: allData.length > 0 && allData[0]?.dates ? [...allData[0].dates].reverse() : [],
        totalPages: 1
      };
    }
    
    // Inverter os dados para mostrar os mais recentes primeiro
    const reversedData = allData.map(group => ({
      ...group,
      data: [...group.data].reverse(),
      dates: [...group.dates].reverse()
    }));
    
    // Calcular o número total de páginas
    const totalPages = Math.ceil(reversedData[0].dates.length / itemsPerPage);
    
    // Garantir que a página atual é válida
    const validPage = Math.min(Math.max(0, currentPage), totalPages - 1);
    if (validPage !== currentPage) {
      setCurrentPage(validPage);
    }
    
    // Calcular os índices de início e fim para a página atual
    const startIndex = validPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, reversedData[0].dates.length);
    
    // Obter os rótulos (datas) para a página atual
    const pagedLabels = reversedData[0].dates.slice(startIndex, endIndex);
    
    // Obter os dados para a página atual
    const pagedDatasets = reversedData.map(group => ({
      ...group,
      data: group.data.slice(startIndex, endIndex)
    }));
    
    return {
      datasets: pagedDatasets,
      labels: pagedLabels,
      totalPages
    };
  };
  
  // Obter dados paginados
  const pagedData = getPagedData();
  
  // Funções para navegar entre as páginas
  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const goToNextPage = () => {
    if (currentPage < pagedData.totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Resetar a página atual quando o tamanho da tela muda
  useEffect(() => {
    setCurrentPage(0);
  }, [isMobile]);

  // Configurar dados para o gráfico
  const chartData = {
    labels: pagedData.labels,
    datasets: pagedData.datasets.map(group => ({
      label: group.name,
      data: group.data,
      backgroundColor: group.color,
      borderColor: group.color,
      borderWidth: 1,
      borderRadius: 4,
      barThickness: isMobile ? 12 : 16, // Barras mais finas no mobile
      maxBarThickness: isMobile ? 20 : 30,
      minBarLength: 2,
    }))
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 12,
          boxHeight: 12,
          padding: 15,
          font: {
            size: 11,
          }
        },
        // No mobile, mostrar menos legendas
        maxItems: isMobile ? 3 : undefined,
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#334155',
        bodyColor: '#334155',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: false,
        boxWidth: 8,
        boxHeight: 8,
        cornerRadius: 4,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 105, // Aumentado para 105% para dar espaço para valores de 100%
        grid: {
          display: true,
          color: '#f1f5f9',
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: isMobile ? 9 : 11,
            weight: 'bold' as const,
          },
          // Definir marcações específicas para evitar mostrar valores acima de 100%
          callback: function(value: string | number) {
            if (Number(value) <= 100) {
              return value + '%';
            }
            return '';
          },
          // Incluir valores específicos para mostrar no eixo Y
          stepSize: isMobile ? 25 : 20,
        },
        title: {
          display: !isMobile, // Ocultar título no mobile para economizar espaço
          text: 'Pontuação (%)',
          color: '#64748b',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          padding: {top: 0, bottom: 10}
        }
      },
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: isMobile ? 9 : 11,
            weight: 'bold' as const,
          },
          maxRotation: isMobile ? 60 : 45, // Maior rotação no mobile para economizar espaço
          minRotation: isMobile ? 60 : 45,
        },
        title: {
          display: !isMobile, // Ocultar título no mobile para economizar espaço
          text: 'Data',
          color: '#64748b',
          font: {
            size: 12,
            weight: 'bold' as const,
          },
          padding: {top: 10, bottom: 0}
        }
      },
    },
    maintainAspectRatio: false,
    barPercentage: isMobile ? 0.7 : 0.8, // Barras um pouco mais finas no mobile
    categoryPercentage: isMobile ? 0.7 : 0.8,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 rounded-md bg-indigo-100 text-indigo-600">
              <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-800">
              Desempenho em Simulados
            </h2>
          </div>
          
          <Link 
            href="/simulados/meus-resultados" 
            className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Ver todos resultados</span>
            <span className="sm:hidden">Ver todos</span>
            <ArrowUpRight className="h-3 w-3 md:h-3.5 md:w-3.5 ml-0.5" />
          </Link>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4 mb-4 md:mb-6">
          {/* Seletor de visualização com botões simples */}
          <div className="flex gap-1 md:gap-2">
            <button
              onClick={() => setViewMode('disciplines')}
              className={`px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                viewMode === 'disciplines' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Por Disciplinas
            </button>
            <button
              onClick={() => setViewMode('subjects')}
              className={`px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                viewMode === 'subjects' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Por Assuntos
            </button>
          </div>
          
          {/* Filtro de disciplina (apenas para visualização por assuntos) */}
          {viewMode === 'subjects' && (
            <div className="flex items-center gap-1 md:gap-2">
              <ListFilter className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
              <select
                className="text-xs md:text-sm border border-gray-300 rounded-md px-2 md:px-3 py-1.5 md:py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedDiscipline || ''}
                onChange={(e) => setSelectedDiscipline(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Todas</option>
                {disciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 md:py-16">
            <div className="animate-spin rounded-full h-8 w-8 md:h-10 md:w-10 border-b-2 border-indigo-600 mb-3 md:mb-4"></div>
            <p className="text-sm md:text-base text-gray-600">Carregando dados de desempenho...</p>
          </div>
        ) : (viewMode === 'disciplines' && examsByDiscipline.length === 0) || 
           (viewMode === 'subjects' && (selectedDiscipline ? filteredSubjects.length === 0 : examsBySubject.length === 0)) ? (
          <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center">
            <BarChart3 className="h-10 w-10 md:h-12 md:w-12 text-gray-300 mb-3" />
            <p className="text-gray-700 font-medium">Sem dados de simulados</p>
            <p className="text-xs md:text-sm text-gray-500 mt-1 max-w-md">
              {viewMode === 'subjects' && selectedDiscipline ? (
                `Não há dados de desempenho para assuntos da disciplina selecionada.`
              ) : (
                `Complete alguns simulados para visualizar seu desempenho.`
              )}
            </p>
            <Link 
              href="/simulados/novo" 
              className="mt-4 px-3 md:px-4 py-1.5 md:py-2 bg-indigo-600 text-white rounded-lg shadow-sm flex items-center gap-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Criar novo simulado
            </Link>
          </div>
        ) : (
          <>
            <div style={{ height: isMobile ? '300px' : '500px' }} className="mt-2 md:mt-4 px-2 md:px-4">
              <Bar data={chartData} options={chartOptions} />
            </div>
            
            {/* Controles de navegação */}
            {pagedData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 md:gap-4 mt-4 md:mt-6">
                <button 
                  onClick={goToPreviousPage}
                  disabled={currentPage === 0}
                  className={`p-1.5 md:p-2 rounded-full ${
                    currentPage === 0 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                
                <span className="text-xs md:text-sm text-gray-600">
                  Página {currentPage + 1} de {pagedData.totalPages}
                </span>
                
                <button 
                  onClick={goToNextPage}
                  disabled={currentPage >= pagedData.totalPages - 1}
                  className={`p-1.5 md:p-2 rounded-full ${
                    currentPage >= pagedData.totalPages - 1
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SimuladosPerformanceChart;