import React from 'react';
import { AlertTriangle, InfoIcon } from 'lucide-react';

interface PlanLoadWarningProps {
  selectedSubjects: number[];
  availableDays: number;
  totalDays: number;
  averageDailyMinutes: number;
}

const PlanLoadWarning: React.FC<PlanLoadWarningProps> = ({
  selectedSubjects,
  availableDays,
  totalDays,
  averageDailyMinutes
}) => {
  // Não mostrar nada se não houver assuntos selecionados
  if (selectedSubjects.length === 0) return null;
  
  // Calcular a carga do plano
  const totalSubjects = selectedSubjects.length;
  const availableDaysInPeriod = Math.floor(totalDays * (availableDays / 7));
  
  // Estimar o tempo necessário por assunto (considerando sessão principal + revisões)
  const estimatedMinutesPerSubject = 120; // 2 horas em média por assunto (sessão principal + revisões)
  const totalEstimatedMinutes = totalSubjects * estimatedMinutesPerSubject;
  const totalAvailableMinutes = availableDaysInPeriod * averageDailyMinutes;
  
  // Calcular a porcentagem de carga (limitada a 100%)
  const loadPercentage = Math.min(100, Math.round((totalEstimatedMinutes / totalAvailableMinutes) * 100));
  
  // Determinar a cor da barra de progresso
  const getProgressBarColor = () => {
    if (loadPercentage < 70) return 'bg-green-500';
    if (loadPercentage < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">Carga estimada do plano</label>
        <span className={`text-sm font-medium ${
          loadPercentage > 90 ? 'text-red-600' : 
          loadPercentage > 70 ? 'text-yellow-600' : 
          'text-green-600'
        }`}>
          {loadPercentage}%
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${getProgressBarColor()}`} 
          style={{ width: `${loadPercentage}%` }}
        ></div>
      </div>
      
      {loadPercentage > 90 && (
        <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-md flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-red-700">
            <p className="font-medium mb-1">Plano sobrecarregado!</p>
            <p>Você selecionou {totalSubjects} assuntos para estudar em {availableDaysInPeriod} dias disponíveis.</p>
            <p>O tempo estimado necessário ({Math.round(totalEstimatedMinutes/60)} horas) é maior que o tempo disponível ({Math.round(totalAvailableMinutes/60)} horas).</p>
            <p className="mt-1">Recomendações:</p>
            <ul className="list-disc list-inside ml-1">
              <li>Reduza o número de assuntos</li>
              <li>Aumente o período do plano</li>
              <li>Adicione mais dias disponíveis para estudo</li>
              <li>Aumente o tempo médio diário de estudo</li>
            </ul>
          </div>
        </div>
      )}
      
      {loadPercentage > 70 && loadPercentage <= 90 && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded-md flex items-start gap-2">
          <InfoIcon className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-yellow-700">
            <p className="font-medium mb-1">Carga moderada</p>
            <p>Seu plano está com uma carga moderada. Algumas sessões podem precisar ser ajustadas para caber no tempo disponível.</p>
            <p>Considere aumentar o tempo disponível ou reduzir o número de assuntos se preferir um plano mais confortável.</p>
          </div>
        </div>
      )}
      
      {loadPercentage <= 70 && loadPercentage > 0 && (
        <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md flex items-start gap-2">
          <InfoIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-green-700">
            <p className="font-medium mb-1">Carga adequada</p>
            <p>Seu plano tem uma boa distribuição de tempo. As sessões devem se encaixar bem no tempo disponível.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanLoadWarning; 