import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

/**
 * GET: Obter detalhes de um plano específico pelo ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Simular obtenção do usuário da requisição
    // Na implementação real, isso viria de um middleware de autenticação
    const user = { id: 1 }; // Usuario de teste
    
    const planId = params.id;
    
    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'ID do plano é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se o plano existe e pertence ao usuário
    const planQuery = `
      SELECT 
        p.Id, 
        p.Name, 
        p.Description, 
        p.StartDate, 
        p.EndDate, 
        p.Status, 
        p.MetaData,
        p.CreatedAt, 
        p.UpdatedAt
      FROM 
        StudyPlans p
      WHERE 
        p.Id = @planId AND p.UserId = @userId
    `;
    
    const plans = await executeQuery(planQuery, {
      planId: planId,
      userId: user.id
    });
    
    if (!plans || plans.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado ou não pertence ao usuário' },
        { status: 404 }
      );
    }
    
    const plan = plans[0];
    
    // Obter disciplinas associadas ao plano
    const disciplinesQuery = `
      SELECT 
        d.Id, 
        d.Name,
        d.Description,
        pd.Priority
      FROM 
        StudyPlanDisciplines pd
      JOIN 
        Disciplines d ON pd.DisciplineId = d.Id
      WHERE 
        pd.StudyPlanId = @planId
      ORDER BY
        d.Name ASC
    `;
    
    const disciplines = await executeQuery(disciplinesQuery, { planId: planId });
    
    // Para cada disciplina, obter assuntos
    for (const discipline of disciplines) {
      const subjectsQuery = `
        SELECT 
          s.Id, 
          s.Name,
          s.Description,
          s.Difficulty,
          s.Importance,
          ps.EstimatedHours AS Hours,
          ps.Priority,
          ps.Progress,
          ps.Completed
        FROM 
          StudyPlanSubjects ps
        JOIN 
          Subjects s ON ps.SubjectId = s.Id
        WHERE 
          ps.StudyPlanId = @planId AND 
          s.DisciplineId = @disciplineId
        ORDER BY
          s.Name ASC
      `;
      
      const subjects = await executeQuery(subjectsQuery, { 
        planId: planId,
        disciplineId: discipline.Id
      });
      
      discipline.subjects = subjects;
    }
    
    plan.disciplines = disciplines;
    
    // Obter sessões de estudo associadas ao plano
    const sessionsQuery = `
      SELECT 
        Id,
        DisciplineId,
        SubjectId,
        ScheduledDate AS date,
        Duration as duration,
        Completed as completed,
        ActualDuration as actualDuration,
        Notes as notes,
        CreatedAt as createdAt,
        UpdatedAt as updatedAt
      FROM 
        StudySessions
      WHERE 
        StudyPlanId = @planId
      ORDER BY 
        ScheduledDate ASC
    `;
    
    const sessions = await executeQuery(sessionsQuery, { planId: planId });
    
    if (sessions && sessions.length > 0) {
      plan.schedule = { sessions };
    }
    
    // Calcular estatísticas do plano
    const statistics = {
      totalSubjects: 0,
      completedSubjects: 0,
      totalHours: 0,
      completedHours: 0,
      progress: 0,
      sessionsCount: sessions ? sessions.length : 0,
      completedSessions: sessions ? sessions.filter((s: any) => s.completed).length : 0
    };
    
    // Acumular estatísticas com base nas disciplinas e assuntos
    for (const discipline of disciplines) {
      if (discipline.subjects) {
        for (const subject of discipline.subjects) {
          statistics.totalSubjects++;
          statistics.totalHours += subject.Hours || 0;
          
          if (subject.Completed) {
            statistics.completedSubjects++;
            statistics.completedHours += subject.Hours || 0;
          }
        }
      }
    }
    
    // Calcular progresso geral
    if (statistics.totalSubjects > 0) {
      statistics.progress = Math.round((statistics.completedSubjects / statistics.totalSubjects) * 100);
    }
    
    plan.statistics = statistics;
    
    // Processar MetaData se existir
    if (plan.MetaData) {
      try {
        const metaData = JSON.parse(plan.MetaData);
        // Mesclar metadados com o objeto do plano
        Object.assign(plan, metaData);
      } catch (error) {
        console.error(`Erro ao processar MetaData do plano ${plan.Id}:`, error);
      }
    }
    
    // Remover o campo MetaData após processá-lo
    delete plan.MetaData;
    
    return NextResponse.json({ 
      success: true, 
      plan: plan 
    });
  } catch (error) {
    console.error('Erro ao obter detalhes do plano:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao obter detalhes do plano' },
      { status: 500 }
    );
  }
} 