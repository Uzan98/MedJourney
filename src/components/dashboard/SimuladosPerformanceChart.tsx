"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement,
  LineElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { LineChart, BookOpen, ArrowUpRight, ListFilter } from 'lucide-react';
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

  // Configurar dados para o gráfico
  const chartData = {
    labels: viewMode === 'disciplines' 
      ? examsByDiscipline.length > 0 ? examsByDiscipline[0].dates : []
      : filteredSubjects.length > 0 ? filteredSubjects[0].dates : [],
    datasets: (viewMode === 'disciplines' ? examsByDiscipline : filteredSubjects).map(group => ({
      label: group.name,
      data: group.data,
      borderColor: group.color,
      backgroundColor: `${group.color}20`, // Cor com transparência
      tension: 0.3,
      fill: false,
      pointBackgroundColor: '#fff',
      pointBorderColor: group.color,
      pointBorderWidth: 2,
      pointRadius: 4,
    }))
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 15,
          font: {
            size: 11,
          }
        }
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#334155',
        bodyColor: '#334155',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true,
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
          color: '#94a3b8',
          font: {
            size: 11,
          },
          // Definir marcações específicas para evitar mostrar valores acima de 100%
          callback: function(value: string | number) {
            if (Number(value) <= 100) {
              return value + '%';
            }
            return '';
          },
          // Incluir valores específicos para mostrar no eixo Y
          stepSize: 20,
        },
      },
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
          },
        },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-indigo-100 text-indigo-600">
              <LineChart className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Desempenho em Simulados
            </h2>
          </div>
          
          <Link 
            href="/simulados/meus-resultados" 
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <BookOpen className="h-4 w-4" />
            Ver todos resultados
            <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Seletor de visualização com botões simples */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('disciplines')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'disciplines' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Por Disciplinas
            </button>
            <button
              onClick={() => setViewMode('subjects')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-gray-500" />
              <select
                className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedDiscipline || ''}
                onChange={(e) => setSelectedDiscipline(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Todas as disciplinas</option>
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
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Carregando dados de desempenho...</p>
          </div>
        ) : (viewMode === 'disciplines' && examsByDiscipline.length === 0) || 
           (viewMode === 'subjects' && (selectedDiscipline ? filteredSubjects.length === 0 : examsBySubject.length === 0)) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <LineChart className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-700 font-medium">Sem dados de simulados</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              {viewMode === 'subjects' && selectedDiscipline ? (
                `Não há dados de desempenho para assuntos da disciplina selecionada. Tente selecionar outra disciplina.`
              ) : (
                `Complete alguns simulados para visualizar seu desempenho por ${viewMode === 'disciplines' ? 'disciplinas' : 'assuntos'}.`
              )}
            </p>
            <Link 
              href="/simulados/novo" 
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm flex items-center gap-2 font-medium hover:bg-indigo-700 transition-colors"
            >
              Criar novo simulado
            </Link>
          </div>
        ) : (
          <div style={{ height: '450px' }} className="mt-4 px-2">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SimuladosPerformanceChart;