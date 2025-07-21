// Script para deletar planos de estudo com filtros
import { executeQuery } from './src/lib/db.js';
import readline from 'readline';

// Configuração dos filtros - ajuste conforme necessário
const FILTERS = {
  // Se true, usará a data limite abaixo para deletar apenas planos antigos
  deleteOldPlans: true,
  // Data limite - planos criados antes desta data serão excluídos
  olderThanDate: '2023-01-01', // formato: YYYY-MM-DD
  
  // Se true, deletará apenas planos com status específico
  filterByStatus: false,
  status: 'inativo', // ou qualquer outro status que você use
  
  // Se true, manterá apenas os X planos mais recentes e excluirá o resto
  keepOnlyRecentPlans: false,
  keepCount: 100, // número de planos recentes a manter
  
  // Se true, excluirá todos os planos sem confirmar (CUIDADO!)
  forceDeleteAll: false
};

async function deleteFilteredStudyPlans() {
  try {
    // Contar total de planos no banco de dados
    const countResult = await executeQuery(
      'SELECT COUNT(*) AS TotalPlanos FROM StudyPlans',
      {}
    );
    const totalPlanos = countResult[0].TotalPlanos;
    console.log(`Total de planos no banco de dados: ${totalPlanos}`);
    
    // Construir query de seleção baseada nos filtros
    let whereClause = '';
    const params = {};
    
    if (FILTERS.deleteOldPlans) {
      whereClause += ' CreatedAt < @olderThanDate';
      params.olderThanDate = FILTERS.olderThanDate;
    }
    
    if (FILTERS.filterByStatus) {
      if (whereClause) whereClause += ' AND';
      whereClause += ' Status = @status';
      params.status = FILTERS.status;
    }
    
    // Query especial para manter apenas os planos mais recentes
    if (FILTERS.keepOnlyRecentPlans) {
      const recentPlansQuery = `
        WITH RecentPlans AS (
          SELECT Id, ROW_NUMBER() OVER (ORDER BY CreatedAt DESC) AS RowNum
          FROM StudyPlans
        )
        SELECT Id 
        FROM RecentPlans
        WHERE RowNum > @keepCount
      `;
      
      const plansToDelete = await executeQuery(recentPlansQuery, { keepCount: FILTERS.keepCount });
      
      if (plansToDelete.length === 0) {
        console.log(`Não há planos para excluir, pois há menos de ${FILTERS.keepCount} planos no banco.`);
        return;
      }
      
      const plansToDeleteIds = plansToDelete.map(p => p.Id);
      console.log(`Serão excluídos ${plansToDeleteIds.length} planos, mantendo os ${FILTERS.keepCount} mais recentes.`);
      
      // Continuar com a exclusão apenas desses IDs
      await processDeleteForIds(plansToDeleteIds);
      return;
    }
    
    // Para todos os outros filtros ou exclusão total
    let plansToDeleteQuery = 'SELECT Id FROM StudyPlans';
    if (whereClause && !FILTERS.forceDeleteAll) {
      plansToDeleteQuery += ` WHERE ${whereClause}`;
    }
    
    const plansToDelete = await executeQuery(plansToDeleteQuery, params);
    
    if (plansToDelete.length === 0) {
      console.log('Não há planos que correspondam aos critérios de exclusão.');
      return;
    }
    
    console.log(`Serão excluídos ${plansToDelete.length} planos com os filtros aplicados.`);
    
    if (!FILTERS.forceDeleteAll) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(`Você realmente deseja excluir ${plansToDelete.length} planos? (digite "SIM" para confirmar): `, async (answer) => {
        if (answer.trim() !== 'SIM') {
          console.log('Operação cancelada pelo usuário.');
          rl.close();
          return;
        }
        
        const plansToDeleteIds = plansToDelete.map(p => p.Id);
        await processDeleteForIds(plansToDeleteIds);
        rl.close();
      });
    } else {
      // Exclusão forçada sem confirmação
      const plansToDeleteIds = plansToDelete.map(p => p.Id);
      await processDeleteForIds(plansToDeleteIds);
    }
  } catch (error) {
    console.error('Erro ao executar a operação:', error);
  }
}

async function processDeleteForIds(planIds) {
  if (!planIds.length) {
    console.log('Nenhum ID de plano foi fornecido para exclusão.');
    return;
  }
  
  try {
    console.log('Iniciando processo de exclusão...');
    
    // Criar string de parâmetros para a query IN
    const placeholders = planIds.map((_, index) => `@id${index}`).join(',');
    const params = {};
    planIds.forEach((id, index) => {
      params[`id${index}`] = id;
    });
    
    // Atualizar sessões de estudo relacionadas
    const updateQuery = `
      UPDATE StudySessions
      SET StudyPlanId = NULL
      WHERE StudyPlanId IN (${placeholders});
      
      SELECT @@ROWCOUNT AS UpdatedSessions;
    `;
    
    const updateResult = await executeQuery(updateQuery, params);
    console.log(`${updateResult[0].UpdatedSessions} sessões de estudo desvinculadas.`);
    
    // Excluir os planos
    const deleteQuery = `
      DELETE FROM StudyPlans
      WHERE Id IN (${placeholders});
      
      SELECT @@ROWCOUNT AS DeletedPlans;
    `;
    
    const deleteResult = await executeQuery(deleteQuery, params);
    console.log(`${deleteResult[0].DeletedPlans} planos de estudo foram excluídos com sucesso!`);
    
    // Verificar planos restantes
    const verifyResult = await executeQuery(
      'SELECT COUNT(*) AS PlanosRestantes FROM StudyPlans',
      {}
    );
    console.log(`Planos restantes no banco de dados: ${verifyResult[0].PlanosRestantes}`);
  } catch (error) {
    console.error('Erro durante o processo de exclusão:', error);
  }
}

// Executar o script
deleteFilteredStudyPlans(); 