import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
// Corrigir importação do auth - o usuário será obtido diretamente da requisição por enquanto
// import { getUserFromRequest } from '@/lib/auth';

/**
 * GET: Obter todos os planos de estudo do usuário
 * Query params:
 * - status: Filtrar por status (ativo, pausado, concluido)
 * - limit: Limitar número de resultados
 */
export async function GET(request: NextRequest) {
  try {
    // Simular obtenção do usuário da requisição
    // Na implementação real, isso viria de um middleware de autenticação
    const user = { id: 1 }; // Usuario de teste
    
    // Obter parâmetros da query
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    // Construir a query base
    let query = `
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
        p.UserId = @userId
    `;
    
    const queryParams: any = {
      userId: user.id
    };
    
    // Adicionar filtro de status se fornecido
    if (status) {
      query += ` AND p.Status = @status`;
      queryParams.status = status;
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    query += ` ORDER BY p.CreatedAt DESC`;
    
    // Adicionar limite se fornecido
    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
      queryParams.limit = limit;
    }
    
    // Executar a query
    const plans = await executeQuery(query, queryParams);
    
    // Para cada plano, obter disciplinas e assuntos relacionados
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      
      // Obter disciplinas associadas ao plano
      const disciplinesQuery = `
        SELECT 
          d.Id, 
          d.Name,
          pd.Priority
        FROM 
          StudyPlanDisciplines pd
        JOIN 
          Disciplines d ON pd.DisciplineId = d.Id
        WHERE 
          pd.StudyPlanId = @planId
      `;
      
      const disciplines = await executeQuery(disciplinesQuery, { planId: plan.Id });
      
      // Para cada disciplina, obter assuntos
      for (const discipline of disciplines) {
        const subjectsQuery = `
          SELECT 
            s.Id, 
            s.Name,
            ps.EstimatedHours AS Hours,
            ps.Priority,
            ps.Progress,
            ps.Completed
          FROM 
            StudyPlanSubjects ps
          JOIN 
            Subjects s ON ps.SubjectId = s.Id
          JOIN 
            StudyPlans p ON ps.StudyPlanId = p.Id
          WHERE 
            p.Id = @planId AND 
            s.DisciplineId = @disciplineId
        `;
        
        const subjects = await executeQuery(subjectsQuery, { 
          planId: plan.Id,
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
          Notes as notes
        FROM 
          StudySessions
        WHERE 
          StudyPlanId = @planId
        ORDER BY 
          ScheduledDate ASC
      `;
      
      const sessions = await executeQuery(sessionsQuery, { planId: plan.Id });
      
      if (sessions && sessions.length > 0) {
        plan.schedule = { sessions };
      }
      
      // Processar MetaData se existir
      if (plan.MetaData) {
        try {
          const metaData = JSON.parse(plan.MetaData);
          // Mesclar metadados com o objeto do plano sem modificar o original
          plans[i] = { ...plan, ...metaData };
        } catch (error) {
          console.error(`Erro ao processar MetaData do plano ${plan.Id}:`, error);
        }
      }
      
      // Remover o campo MetaData após processá-lo
      delete plans[i].MetaData;
    }
    
    return NextResponse.json({
      success: true,
      plans: plans 
    });
  } catch (error) {
    console.error('Erro ao obter planos de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao obter planos de estudo' },
      { status: 500 }
    );
  }
}

/**
 * POST: Criar um novo plano de estudos
 */
export async function POST(request: NextRequest) {
  try {
    // Simular obtenção do usuário da requisição
    // Na implementação real, isso viria de um middleware de autenticação
    const user = { id: 1 }; // Usuario de teste
    
    // Obter dados da requisição
    const data = await request.json();
    
    // Validar dados obrigatórios
    if (!data.name) {
      return NextResponse.json(
        { success: false, error: 'Nome do plano é obrigatório' },
        { status: 400 }
      );
    }

    if (!data.disciplines || !Array.isArray(data.disciplines) || data.disciplines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'É necessário incluir pelo menos uma disciplina no plano' },
        { status: 400 }
      );
    }
    
    // Iniciar transação
    try {
      // 1. Inserir o plano base
      const metaData = {}; // Informações adicionais a serem armazenadas em JSON
      
      const insertPlanQuery = `
        INSERT INTO StudyPlans (
          UserId, 
          Name, 
          Description, 
          StartDate, 
          EndDate, 
          Status, 
          MetaData
        ) 
        VALUES (
          @userId, 
          @name, 
          @description, 
          @startDate, 
          @endDate, 
          @status, 
          @metaData
        );
        
        SELECT SCOPE_IDENTITY() AS Id;
      `;
      
      const planParams = {
        userId: user.id,
        name: data.name,
        description: data.description || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        status: data.status || 'ativo',
        metaData: JSON.stringify(metaData)
      };
      
      const planResult = await executeQuery(insertPlanQuery, planParams);
      const planId = planResult[0].Id;
      
      // 2. Inserir disciplinas associadas ao plano
      for (const discipline of data.disciplines) {
        // Validar ID da disciplina
        if (!discipline.id) {
          throw new Error('ID da disciplina é obrigatório');
        }
        
        const insertDisciplineQuery = `
          INSERT INTO StudyPlanDisciplines (
            StudyPlanId, 
            DisciplineId, 
            Priority
          ) 
          VALUES (
            @studyPlanId, 
            @disciplineId, 
            @priority
          );
        `;
        
        await executeQuery(insertDisciplineQuery, {
          studyPlanId: planId,
          disciplineId: discipline.id,
          priority: discipline.priority || 'média'
        });
        
        // 3. Inserir assuntos associados, se houver
        if (discipline.subjects && Array.isArray(discipline.subjects)) {
          for (const subject of discipline.subjects) {
            if (!subject.id) continue; // Pular se não tiver ID
            
            const insertSubjectQuery = `
              INSERT INTO StudyPlanSubjects (
                StudyPlanId, 
                SubjectId, 
                EstimatedHours, 
                Priority, 
                Progress, 
                Completed
              ) 
              VALUES (
                @studyPlanId, 
                @subjectId, 
                @estimatedHours, 
                @priority, 
                @progress, 
                @completed
              );
            `;
            
            await executeQuery(insertSubjectQuery, {
              studyPlanId: planId,
              subjectId: subject.id,
              estimatedHours: subject.hours || 1.0,
              priority: subject.priority || 'média',
              progress: 0,
              completed: false
            });
          }
        }
      }
      
      // Retornar o plano criado
      return NextResponse.json({ 
        success: true, 
        message: 'Plano de estudos criado com sucesso',
        planId: planId
      });
    } catch (error: any) {
      console.error('Erro na transação ao criar plano:', error);
      return NextResponse.json(
        { success: false, error: `Erro ao criar plano: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao criar plano de estudos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar plano de estudos' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Atualizar um plano de estudos existente
 */
export async function PUT(request: NextRequest) {
  try {
    // Simular obtenção do usuário da requisição
    // Na implementação real, isso viria de um middleware de autenticação
    const user = { id: 1 }; // Usuario de teste
    
    // Obter dados da requisição
    const data = await request.json();
    
    // Validar ID do plano
    if (!data.id) {
      return NextResponse.json(
        { success: false, error: 'ID do plano é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se o plano existe e pertence ao usuário
    const checkPlanQuery = `
      SELECT Id FROM StudyPlans 
      WHERE Id = @planId AND UserId = @userId
    `;
    
    const existingPlan = await executeQuery(checkPlanQuery, {
      planId: data.id,
      userId: user.id
    });
    
    if (!existingPlan || existingPlan.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado ou não pertence ao usuário' },
        { status: 404 }
      );
    }
    
    // Iniciar a atualização
    try {
      // 1. Atualizar informações básicas do plano
      const updateFields = [];
      const updateParams: any = {
        planId: data.id,
        userId: user.id
      };
    
    if (data.name !== undefined) {
        updateFields.push('Name = @name');
        updateParams.name = data.name;
    }
    
    if (data.description !== undefined) {
        updateFields.push('Description = @description');
        updateParams.description = data.description;
    }
    
    if (data.startDate !== undefined) {
        updateFields.push('StartDate = @startDate');
        updateParams.startDate = data.startDate;
    }
    
    if (data.endDate !== undefined) {
        updateFields.push('EndDate = @endDate');
        updateParams.endDate = data.endDate;
    }
    
    if (data.status !== undefined) {
        updateFields.push('Status = @status');
        updateParams.status = data.status;
      }
      
      // Adicionar campo de atualização
      updateFields.push('UpdatedAt = GETDATE()');
      
      // Se há campos para atualizar
      if (updateFields.length > 0) {
        const updatePlanQuery = `
          UPDATE StudyPlans 
          SET ${updateFields.join(', ')}
          WHERE Id = @planId AND UserId = @userId
        `;
        
        await executeQuery(updatePlanQuery, updateParams);
      }
      
      // 2. Atualizar disciplinas e assuntos, se fornecidos
      if (data.disciplines && Array.isArray(data.disciplines)) {
        // Para cada disciplina atualizada
        for (const discipline of data.disciplines) {
          // Verificar se a disciplina já está associada ao plano
          const checkDisciplineQuery = `
            SELECT Id FROM StudyPlanDisciplines 
            WHERE StudyPlanId = @planId AND DisciplineId = @disciplineId
          `;
          
          const existingDiscipline = await executeQuery(checkDisciplineQuery, {
            planId: data.id,
            disciplineId: discipline.id
          });
          
          if (existingDiscipline && existingDiscipline.length > 0) {
            // Atualizar a prioridade da disciplina existente
            if (discipline.priority) {
              const updateDisciplineQuery = `
                UPDATE StudyPlanDisciplines 
                SET Priority = @priority
                WHERE StudyPlanId = @planId AND DisciplineId = @disciplineId
              `;
              
              await executeQuery(updateDisciplineQuery, {
                planId: data.id,
                disciplineId: discipline.id,
                priority: discipline.priority
              });
            }
          } else {
            // Adicionar nova disciplina ao plano
            const insertDisciplineQuery = `
              INSERT INTO StudyPlanDisciplines (
                StudyPlanId, 
                DisciplineId, 
                Priority
              ) 
              VALUES (
                @planId, 
                @disciplineId, 
                @priority
              )
            `;
            
            await executeQuery(insertDisciplineQuery, {
              planId: data.id,
              disciplineId: discipline.id,
              priority: discipline.priority || 'média'
            });
          }
          
          // Atualizar assuntos, se fornecidos
          if (discipline.subjects && Array.isArray(discipline.subjects)) {
            for (const subject of discipline.subjects) {
              // Verificar se o assunto já está associado ao plano
              const checkSubjectQuery = `
                SELECT Id FROM StudyPlanSubjects 
                WHERE StudyPlanId = @planId AND SubjectId = @subjectId
              `;
              
              const existingSubject = await executeQuery(checkSubjectQuery, {
                planId: data.id,
                subjectId: subject.id
              });
              
              if (existingSubject && existingSubject.length > 0) {
                // Construir conjunto de campos a atualizar
                const subjectUpdateFields = [];
                const subjectUpdateParams: any = {
                  planId: data.id,
                  subjectId: subject.id
                };
                
                if (subject.hours !== undefined) {
                  subjectUpdateFields.push('EstimatedHours = @hours');
                  subjectUpdateParams.hours = subject.hours;
                }
                
                if (subject.priority !== undefined) {
                  subjectUpdateFields.push('Priority = @priority');
                  subjectUpdateParams.priority = subject.priority;
                }
                
                if (subject.progress !== undefined) {
                  subjectUpdateFields.push('Progress = @progress');
                  subjectUpdateParams.progress = subject.progress;
                }
                
                if (subject.completed !== undefined) {
                  subjectUpdateFields.push('Completed = @completed');
                  subjectUpdateParams.completed = subject.completed;
                }
                
                // Adicionar campo de atualização
                subjectUpdateFields.push('UpdatedAt = GETDATE()');
                
                // Se há campos para atualizar
                if (subjectUpdateFields.length > 0) {
                  const updateSubjectQuery = `
                    UPDATE StudyPlanSubjects 
                    SET ${subjectUpdateFields.join(', ')}
                    WHERE StudyPlanId = @planId AND SubjectId = @subjectId
                  `;
                  
                  await executeQuery(updateSubjectQuery, subjectUpdateParams);
                }
              } else {
                // Adicionar novo assunto ao plano
                const insertSubjectQuery = `
                  INSERT INTO StudyPlanSubjects (
                    StudyPlanId, 
                    SubjectId, 
                    EstimatedHours, 
                    Priority, 
                    Progress, 
                    Completed
                  ) 
                  VALUES (
                    @planId, 
                    @subjectId, 
                    @hours, 
                    @priority, 
                    @progress, 
                    @completed
                  )
                `;
                
                await executeQuery(insertSubjectQuery, {
                  planId: data.id,
                  subjectId: subject.id,
                  hours: subject.hours || 1.0,
                  priority: subject.priority || 'média',
                  progress: subject.progress || 0,
                  completed: subject.completed || false
                });
              }
            }
          }
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Plano de estudos atualizado com sucesso' 
      });
    } catch (error: any) {
      console.error('Erro na transação ao atualizar plano:', error);
      return NextResponse.json(
        { success: false, error: `Erro ao atualizar plano: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao atualizar plano de estudos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar plano de estudos' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Excluir um plano de estudos
 * Parâmetro de consulta: id (ID do plano a ser excluído)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Simular obtenção do usuário da requisição
    // Na implementação real, isso viria de um middleware de autenticação
    const user = { id: 1 }; // Usuario de teste
    
    // Obter ID do plano a ser excluído
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');
    
    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'ID do plano é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se o plano existe e pertence ao usuário
    const checkPlanQuery = `
      SELECT Id FROM StudyPlans 
      WHERE Id = @planId AND UserId = @userId
    `;
    
    const existingPlan = await executeQuery(checkPlanQuery, {
      planId: planId,
      userId: user.id
    });
    
    if (!existingPlan || existingPlan.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado ou não pertence ao usuário' },
        { status: 404 }
      );
    }
    
    // Iniciar exclusão
    try {
      // Atualizar sessões para remover referência ao plano (não excluir sessões)
      const updateSessionsQuery = `
        UPDATE StudySessions
        SET StudyPlanId = NULL, UpdatedAt = GETDATE()
        WHERE StudyPlanId = @planId
      `;
      
      await executeQuery(updateSessionsQuery, { planId });
      
      // Excluir o plano (as tabelas relacionadas serão excluídas em cascata)
      const deletePlanQuery = `
        DELETE FROM StudyPlans
        WHERE Id = @planId AND UserId = @userId
      `;
      
      await executeQuery(deletePlanQuery, {
        planId,
        userId: user.id
      });
    
    return NextResponse.json({
      success: true,
        message: 'Plano de estudos excluído com sucesso' 
      });
    } catch (error: any) {
      console.error('Erro na transação ao excluir plano:', error);
      return NextResponse.json(
        { success: false, error: `Erro ao excluir plano: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao excluir plano de estudos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir plano de estudos' },
      { status: 500 }
    );
  }
} 