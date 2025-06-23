"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

export interface DisciplinePerformance {
  name: string;
  score: number;
  questions: number;
  correct: number;
}

interface DisciplinePerformanceChartProps {
  data: DisciplinePerformance[];
  height?: number;
}

const getBarColor = (score: number) => {
  if (score >= 80) return '#4ade80'; // verde
  if (score >= 60) return '#60a5fa'; // azul
  if (score >= 40) return '#fbbf24'; // amarelo
  return '#f87171'; // vermelho
};

export default function DisciplinePerformanceChart({ 
  data, 
  height = 300 
}: DisciplinePerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-gray-500 text-center">
          Não há dados de desempenho por disciplina disponíveis
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 70
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{fontSize: 12}}
          />
          <YAxis 
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
            tick={{fontSize: 12}}
          />
          <Tooltip 
            formatter={(value: number, name: string, props: any) => {
              if (name === 'score') {
                return [`${value}%`, 'Desempenho'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `Disciplina: ${label}`}
          />
          <Legend 
            formatter={(value) => {
              if (value === 'score') return 'Desempenho (%)';
              return value;
            }}
          />
          <Bar 
            dataKey="score" 
            name="score"
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        {data.map((discipline, index) => (
          <div key={index} className="bg-white p-2 rounded-lg border border-gray-200 text-xs">
            <div className="font-medium text-gray-800 mb-1">{discipline.name}</div>
            <div className="flex justify-between">
              <span className="text-gray-500">Acertos:</span>
              <span className="font-medium">{discipline.correct}/{discipline.questions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Desempenho:</span>
              <span className="font-medium" style={{color: getBarColor(discipline.score)}}>
                {discipline.score}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
