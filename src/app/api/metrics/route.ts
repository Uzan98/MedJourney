import { NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '../../../lib/db';
import { StudyMetrics } from '../../../lib/types/dashboard';

// Interfaces para tipagem dos resultados de consultas
interface TaskCount {
  CompletedTasks: number;
  PendingTasks: number;
}

interface MinutesCount {
  TotalMinutes: number;
}

interface TaskChange {
  CurrentWeekTasks: number;
  PreviousWeekTasks: number;
}

interface StreakData {
  StreakDays: number;
  PreviousStreakDays: number;
}

interface FocusData {
  AvgEfficiency: number;
  AvgFocus: number;
}

// GET - Obter métricas de estudo
export async function GET() {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter totais de tarefas concluídas e pendentes
    const taskCounts = await executeQuerySingle(`
      SELECT 
        SUM(CASE WHEN Status = 'completed' THEN 1 ELSE 0 END) as CompletedTasks,
        SUM(CASE WHEN Status = 'pending' OR Status = 'in-progress' THEN 1 ELSE 0 END) as PendingTasks
      FROM Tasks 
      WHERE UserId = @userId
    `, { userId }) as TaskCount;
    
    // Obter horas de estudo esta semana
    const hoursThisWeek = await executeQuerySingle(`
      SELECT ISNULL(SUM(ActualDuration), 0) as TotalMinutes
      FROM StudySessions
      WHERE 
        UserId = @userId 
        AND Completed = 1
        AND ScheduledDate >= DATEADD(DAY, -6, GETDATE())
    `, { userId }) as MinutesCount;
    
    // Obter horas de estudo hoje
    const hoursToday = await executeQuerySingle(`
      SELECT ISNULL(SUM(ActualDuration), 0) as TotalMinutes
      FROM StudySessions
      WHERE 
        UserId = @userId 
        AND Completed = 1
        AND CAST(ScheduledDate as DATE) = CAST(GETDATE() as DATE)
    `, { userId }) as MinutesCount;
    
    // Calcular variação de horas em relação à semana anterior
    const hoursLastWeek = await executeQuerySingle(`
      SELECT ISNULL(SUM(ActualDuration), 0) as TotalMinutes
      FROM StudySessions
      WHERE 
        UserId = @userId 
        AND Completed = 1
        AND ScheduledDate >= DATEADD(DAY, -13, GETDATE())
        AND ScheduledDate < DATEADD(DAY, -6, GETDATE())
    `, { userId }) as MinutesCount;
    
    let hoursChange = 0;
    if (hoursLastWeek && hoursLastWeek.TotalMinutes > 0) {
      hoursChange = Math.round(
        ((hoursThisWeek.TotalMinutes - hoursLastWeek.TotalMinutes) / hoursLastWeek.TotalMinutes) * 100
      );
    }
    
    // Calcular a variação de tarefas concluídas
    const taskChange = await executeQuerySingle(`
      SELECT
        (SELECT COUNT(*) FROM Tasks 
         WHERE UserId = @userId 
         AND Status = 'completed' 
         AND UpdatedAt >= DATEADD(DAY, -6, GETDATE())) as CurrentWeekTasks,
        
        (SELECT COUNT(*) FROM Tasks 
         WHERE UserId = @userId 
         AND Status = 'completed' 
         AND UpdatedAt >= DATEADD(DAY, -13, GETDATE())
         AND UpdatedAt < DATEADD(DAY, -6, GETDATE())) as PreviousWeekTasks
    `, { userId }) as TaskChange;
    
    let tasksChange = 0;
    if (taskChange && taskChange.PreviousWeekTasks > 0) {
      tasksChange = Math.round(
        ((taskChange.CurrentWeekTasks - taskChange.PreviousWeekTasks) / taskChange.PreviousWeekTasks) * 100
      );
    }
    
    // Calcular sequência de dias de estudo (streak)
    // Isso calculará a sequência atual de dias consecutivos com pelo menos uma sessão de estudo concluída
    const streakData = await executeQuerySingle(`
      -- Isso é uma simplificação, em um ambiente real você usaria um procedimento armazenado mais complexo
      WITH DaysWithStudy AS (
        SELECT DISTINCT CAST(ScheduledDate as DATE) as StudyDate
        FROM StudySessions
        WHERE UserId = @userId AND Completed = 1
        AND ScheduledDate >= DATEADD(DAY, -30, GETDATE())
      ),
      CurrentStreak AS (
        SELECT 
          MAX(DATEDIFF(DAY, DATEADD(DAY, -RunningVal, StudyDate), StudyDate)) + 1 as StreakDays
        FROM (
          SELECT 
            StudyDate,
            ROW_NUMBER() OVER (ORDER BY StudyDate DESC) as RunningVal
          FROM DaysWithStudy
          WHERE StudyDate <= GETDATE()
        ) as RunningDays
        WHERE DATEDIFF(DAY, DATEADD(DAY, -RunningVal, StudyDate), StudyDate) = RunningVal
      ),
      PreviousStreak AS (
        SELECT 
          MAX(DATEDIFF(DAY, DATEADD(DAY, -RunningVal, StudyDate), StudyDate)) + 1 as PreviousStreakDays
        FROM (
          SELECT 
            StudyDate,
            ROW_NUMBER() OVER (ORDER BY StudyDate DESC) as RunningVal
          FROM DaysWithStudy
          WHERE StudyDate <= DATEADD(DAY, -14, GETDATE())
        ) as RunningDays
        WHERE DATEDIFF(DAY, DATEADD(DAY, -RunningVal, StudyDate), StudyDate) = RunningVal
      )
      SELECT 
        ISNULL((SELECT StreakDays FROM CurrentStreak), 0) as StreakDays,
        ISNULL((SELECT PreviousStreakDays FROM PreviousStreak), 0) as PreviousStreakDays
    `, { userId }) as StreakData;
    
    // Isso é uma aproximação simples - em um ambiente real, você usaria um algoritmo mais sofisticado
    const streak = streakData?.StreakDays || 0;
    const streakChange = streak - (streakData?.PreviousStreakDays || 0);
    
    // Obter pontuações de foco e eficiência das métricas armazenadas
    const focusData = await executeQuerySingle(`
      -- Em um ambiente real, você teria uma tabela específica para métricas de foco por sessão
      -- Esta é uma simplificação que assume que você armazena essas métricas em StudyMetrics
      SELECT 
        AVG(EfficiencyRate) as AvgEfficiency,
        AVG(FocusScore) as AvgFocus
      FROM StudyMetrics
      WHERE UserId = @userId
      AND Date >= DATEADD(DAY, -30, GETDATE())
    `, { userId }) as FocusData;
    
    // Criar objeto de métricas com dados reais
    const metrics: StudyMetrics = {
      hoursToday: hoursToday?.TotalMinutes || 0,
      hoursThisWeek: hoursThisWeek?.TotalMinutes || 0,
      hoursChange,
      completedTasks: taskCounts?.CompletedTasks || 0,
      totalTasksCompleted: taskCounts?.CompletedTasks || 0,
      totalTasksPending: taskCounts?.PendingTasks || 0,
      tasksChange,
      streak,
      streakChange,
      focusScore: Math.round(focusData?.AvgFocus || 85), // 85 como padrão se não houver dados
      efficiencyRate: Math.round(focusData?.AvgEfficiency || 78) // 78 como padrão se não houver dados
    };
    
    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 