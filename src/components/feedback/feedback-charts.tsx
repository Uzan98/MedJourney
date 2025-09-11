'use client';

import React from 'react';
import { BarChart3, PieChart, TrendingUp, TrendingDown } from 'lucide-react';

interface DisciplineChart {
  name: string;
  correct: number;
  questions: number;
  score: number;
}

interface SubjectChart {
  name: string;
  discipline?: string;
  correct: number;
  questions: number;
  score: number;
}

interface FeedbackChartsProps {
  disciplinas: DisciplineChart[];
  assuntos: SubjectChart[];
  className?: string;
}

const FeedbackCharts: React.FC<FeedbackChartsProps> = ({
  disciplinas,
  assuntos,
  className = ''
}) => {
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBg = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100';
    if (percentage >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Ordenar disciplinas por performance
  const sortedDisciplinas = [...(disciplinas || [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  
  // Top 5 melhores e piores assuntos
  const sortedAssuntos = [...(assuntos || [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const topAssuntos = sortedAssuntos.slice(0, 5);
  const bottomAssuntos = sortedAssuntos.slice(-5).reverse();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Gráfico de Barras - Disciplinas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Performance por Disciplina</h3>
        </div>
        
        <div className="space-y-4">
          {sortedDisciplinas.map((disciplina) => (
            <div key={disciplina.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {disciplina.name}
                </span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-bold ${getPerformanceColor(disciplina.score)}`}>
                    {disciplina.score.toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500">
                    ({disciplina.correct}/{disciplina.questions})
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getBarColor(disciplina.score)}`}
                  style={{ width: `${disciplina.score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 Melhores Assuntos */}
      {topAssuntos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Melhores Assuntos</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topAssuntos.map((assunto, index) => (
              <div key={`${assunto.discipline ?? 'assunto'}-${assunto.name}`} 
                   className={`p-4 rounded-lg border-2 ${getPerformanceBg(assunto.score)} border-green-200`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-green-800 bg-green-200 px-2 py-1 rounded">
                    #{index + 1}
                  </span>
                  <span className={`text-lg font-bold ${getPerformanceColor(assunto.score)}`}>
                    {assunto.score.toFixed(1)}%
                  </span>
                </div>
                
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {assunto.name}
                </h4>
                
                {assunto.discipline && (
                  <p className="text-xs text-gray-600 mb-2">
                    {assunto.discipline}
                  </p>
                )}
                
                <div className="text-xs text-gray-500">
                  {assunto.correct} de {assunto.questions} questões
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 Assuntos para Melhorar */}
      {bottomAssuntos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Assuntos para Melhorar</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bottomAssuntos.map((assunto, index) => (
              <div key={`${assunto.discipline ?? 'assunto'}-${assunto.name}`} 
                   className={`p-4 rounded-lg border-2 ${getPerformanceBg(assunto.score)} border-red-200`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-red-800 bg-red-200 px-2 py-1 rounded">
                    Prioridade {index + 1}
                  </span>
                  <span className={`text-lg font-bold ${getPerformanceColor(assunto.score)}`}>
                    {assunto.score.toFixed(1)}%
                  </span>
                </div>
                
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {assunto.name}
                </h4>
                
                {assunto.discipline && (
                  <p className="text-xs text-gray-600 mb-2">
                    {assunto.discipline}
                  </p>
                )}
                
                <div className="text-xs text-gray-500">
                  {assunto.correct} de {assunto.questions} questões
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo Visual */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-4">
          <PieChart className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Resumo de Performance</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Excelente */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-600">
                {disciplinas.filter(d => d.score >= 80).length}
              </span>
            </div>
            <h4 className="font-semibold text-green-600 mb-1">Excelente</h4>
            <p className="text-sm text-gray-600">Disciplinas ≥ 80%</p>
          </div>
          
          {/* Bom */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-yellow-600">
                {disciplinas.filter(d => d.score >= 60 && d.score < 80).length}
              </span>
            </div>
            <h4 className="font-semibold text-yellow-600 mb-1">Bom</h4>
            <p className="text-sm text-gray-600">Disciplinas 60-79%</p>
          </div>
          
          {/* Precisa Melhorar */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-red-600">
                {disciplinas.filter(d => d.score < 60).length}
              </span>
            </div>
            <h4 className="font-semibold text-red-600 mb-1">Melhorar</h4>
            <p className="text-sm text-gray-600">Disciplinas {'<'} 60%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackCharts;