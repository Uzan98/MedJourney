"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement,
  LineElement,
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { StudyData, SimulatedTest } from '../../lib/types/dashboard';
import { BarChart2, LineChart } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceChartsProps {
  studyData: StudyData[];
  testData: SimulatedTest[];
}

const PerformanceCharts = ({ studyData, testData }: PerformanceChartsProps) => {
  // Study time data
  const studyChartData = {
    labels: studyData.map(item => item.date),
    datasets: [
      {
        label: 'Minutos estudados',
        data: studyData.map(item => item.minutes),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const studyChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
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
      }
    },
    scales: {
      y: {
        beginAtZero: true,
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

  // Test performance data
  const testChartData = {
    labels: testData.map(test => test.title),
    datasets: [
      {
        label: 'Taxa de Acertos',
        data: testData.map(test => (test.correctAnswers / test.totalQuestions) * 100),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#fff',
        pointBorderColor: 'rgb(16, 185, 129)',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const testChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
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
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
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
          callback: function(this: any, value: string | number) {
            return value + '%';
          }
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

  const totalMinutes = studyData.reduce((total, item) => total + item.minutes, 0);
  const avgMinutes = totalMinutes / studyData.length;
  const avgPerformance = testData.length > 0 ? (testData.reduce((total, test) => total + (test.correctAnswers / test.totalQuestions) * 100, 0) / testData.length).toFixed(2) : '0.00';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card 
        title="Tempo de Estudo" 
        className="col-span-1 overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50"
        icon={<BarChart2 className="h-5 w-5 text-blue-600" />}
        showOptions
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-sm font-medium text-blue-600">Últimos 7 dias</h4>
            <p className="text-3xl font-bold text-gray-800">
              {totalMinutes} <span className="text-lg font-medium text-gray-600">min</span>
            </p>
          </div>
          
          <div className="bg-blue-100 text-blue-600 py-1.5 px-4 rounded-full text-sm font-medium shadow-sm border border-blue-200">
            <span className="font-bold">{avgMinutes}</span> min / dia
          </div>
        </div>
        
        <div style={{ height: '250px' }} className="mt-4 p-2 bg-white rounded-lg shadow-sm">
          <Bar data={studyChartData} options={studyChartOptions} />
        </div>
      </Card>
      
      <Card 
        title="Desempenho em Simulados" 
        className="col-span-1 overflow-hidden border-0 shadow-md bg-gradient-to-br from-green-50 to-teal-50"
        icon={<LineChart className="h-5 w-5 text-green-600" />}
        showOptions
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-sm font-medium text-green-600">Média de acertos</h4>
            <p className="text-3xl font-bold text-gray-800">
              {avgPerformance}<span className="text-lg font-medium text-gray-600">%</span>
            </p>
          </div>
          
          <div className="bg-green-100 text-green-600 py-1.5 px-4 rounded-full text-sm font-medium shadow-sm border border-green-200">
            <span className="font-bold">{testData.length}</span> simulados
          </div>
        </div>
        
        {testData.length > 0 ? (
          <div style={{ height: '250px' }} className="mt-4 p-2 bg-white rounded-lg shadow-sm">
            <Line data={testChartData} options={testChartOptions} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center h-[250px] bg-white rounded-lg shadow-sm border border-gray-100">
            <LineChart className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">Sem dados de simulados</p>
            <p className="text-sm text-gray-400 mt-1">Faça seu primeiro simulado para visualizar estatísticas</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PerformanceCharts; 
