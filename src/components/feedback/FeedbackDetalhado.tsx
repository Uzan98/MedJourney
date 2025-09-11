'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BookOpen, 
  Award, 
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import FeedbackCharts from './feedback-charts';

export interface DisciplinePerformance {
  name: string;
  questions: number;
  correct: number;
  score: number;
}

export interface SubjectPerformance {
  name: string;
  questions: number;
  correct: number;
  score: number;
}

export interface FeedbackDetalhado {
  totalQuestions: number;
  totalCorrect: number;
  overallScore: number;
  timeSpent: number;
  disciplinePerformance: DisciplinePerformance[];
  subjectPerformance: SubjectPerformance[];
  examTitle: string;
  examType: string;
}

interface FeedbackDetalhadoProps {
  feedback: FeedbackDetalhado;
  className?: string;
}

function getPerformanceColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getPerformanceBg(score: number): string {
  if (score >= 80) return 'bg-green-100';
  if (score >= 60) return 'bg-yellow-100';
  return 'bg-red-100';
}

function getPerformanceIcon(score: number) {
  if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
  if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  return <XCircle className="h-5 w-5 text-red-600" />;
}

function getRecommendation(score: number): string {
  if (score >= 90) return 'Excelente! Continue assim!';
  if (score >= 80) return 'Muito bom! Pequenos ajustes podem levar à excelência.';
  if (score >= 70) return 'Bom desempenho. Foque em revisar os conceitos.';
  if (score >= 60) return 'Desempenho regular. Recomenda-se mais estudo nesta área.';
  if (score >= 50) return 'Precisa melhorar. Dedique mais tempo a esta disciplina.';
  return 'Requer atenção urgente. Estude intensivamente esta área.';
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
}

export default function FeedbackDetalhado({ feedback, className = '' }: FeedbackDetalhadoProps) {
  const {
    totalQuestions,
    totalCorrect,
    overallScore,
    timeSpent,
    disciplinePerformance,
    subjectPerformance,
    examTitle,
    examType
  } = feedback;

  // Calcular estatísticas adicionais
  const averageTimePerQuestion = totalQuestions > 0 ? Math.round(timeSpent / totalQuestions) : 0;
  const strongestDiscipline = disciplinePerformance.length > 0 
    ? disciplinePerformance.reduce((prev, current) => prev.score > current.score ? prev : current)
    : null;
  const weakestDiscipline = disciplinePerformance.length > 0
    ? disciplinePerformance.reduce((prev, current) => prev.score < current.score ? prev : current)
    : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cabeçalho do Feedback */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Feedback Detalhado
              </CardTitle>
              <p className="text-gray-600 mt-1">
                {examTitle} • {examType}
              </p>
            </div>
            <div className={`p-3 rounded-full ${getPerformanceBg(overallScore)}`}>
              {getPerformanceIcon(overallScore)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getPerformanceColor(overallScore)}`}>
                {overallScore}%
              </div>
              <div className="text-sm text-gray-600">Pontuação Geral</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalCorrect}/{totalQuestions}
              </div>
              <div className="text-sm text-gray-600">Acertos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(timeSpent)}
              </div>
              <div className="text-sm text-gray-600">Tempo Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {averageTimePerQuestion}s
              </div>
              <div className="text-sm text-gray-600">Tempo/Questão</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análise por Disciplina */}
      {disciplinePerformance.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <CardTitle>Desempenho por Disciplina</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {disciplinePerformance.map((discipline, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{discipline.name}</h3>
                      <Badge variant={discipline.score >= 70 ? 'default' : 'destructive'}>
                        {discipline.score}%
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {discipline.correct}/{discipline.questions} questões
                    </div>
                  </div>
                  
                  <Progress value={discipline.score} className="mb-2" />
                  
                  <div className="text-sm text-gray-600">
                    {getRecommendation(discipline.score)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Análise por Assunto */}
      {subjectPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-green-600" />
              <CardTitle>Desempenho por Assunto</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjectPerformance.map((subject, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{subject.name}</h4>
                    <Badge 
                      variant={subject.score >= 70 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {subject.score}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>{subject.correct}/{subject.questions} acertos</span>
                    <span>{getPerformanceIcon(subject.score)}</span>
                  </div>
                  
                  <Progress value={subject.score} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos Visuais */}
      <FeedbackCharts 
        disciplinas={disciplinePerformance}
        assuntos={subjectPerformance}
        className="mb-6"
      />

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            <CardTitle>Insights e Recomendações</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pontos Fortes */}
            {strongestDiscipline && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-green-700">Pontos Fortes</h4>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>{strongestDiscipline.name}</strong> foi sua melhor disciplina 
                    com {strongestDiscipline.score}% de acertos. Continue praticando para 
                    manter este excelente desempenho!
                  </p>
                </div>
              </div>
            )}

            {/* Áreas para Melhoria */}
            {weakestDiscipline && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <h4 className="font-semibold text-red-700">Áreas para Melhoria</h4>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <strong>{weakestDiscipline.name}</strong> precisa de mais atenção 
                    ({weakestDiscipline.score}% de acertos). Dedique mais tempo de estudo 
                    a esta disciplina.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recomendações Gerais */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-blue-700">Próximos Passos</h4>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <Award className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>
                    {overallScore >= 80 
                      ? 'Excelente resultado! Continue praticando para manter o nível.'
                      : overallScore >= 60
                      ? 'Bom resultado! Foque nas disciplinas com menor desempenho.'
                      : 'Resultado abaixo do esperado. Recomenda-se revisar todo o conteúdo.'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>
                    Tempo médio por questão: {averageTimePerQuestion}s. 
                    {averageTimePerQuestion > 120 
                      ? ' Tente ser mais ágil na resolução.'
                      : averageTimePerQuestion < 30
                      ? ' Cuidado para não ser muito rápido e errar por descuido.'
                      : ' Tempo adequado para análise das questões.'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}