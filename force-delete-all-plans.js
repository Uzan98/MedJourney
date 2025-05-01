// Script para deletar TODOS os planos de estudo sem confirmação
// ATENÇÃO: Use com extremo cuidado!
import { executeQuery } from './src/lib/db.js';

async function forceDeleteAllPlans() {
  try {
    console.log('INICIANDO EXCLUSÃO FORÇADA DE TODOS OS PLANOS...');
    
    // Atualizar todas as sessões primeiro
    const updateResult = await executeQuery(`
      UPDATE StudySessions
      SET StudyPlanId = NULL
      WHERE StudyPlanId IS NOT NULL;
      
      SELECT @@ROWCOUNT AS UpdatedSessions;
    `, {});
    
    console.log(`${updateResult[0].UpdatedSessions} sessões de estudo desvinculadas.`);
    
    // Deletar todos os planos sem filtro
    const deleteResult = await executeQuery(`
      DELETE FROM StudyPlans;
      
      SELECT @@ROWCOUNT AS DeletedPlans;
    `, {});
    
    console.log(`${deleteResult[0].DeletedPlans} planos de estudo foram excluídos com sucesso!`);
    console.log('OPERAÇÃO CONCLUÍDA.');
    
  } catch (error) {
    console.error('ERRO DURANTE A EXCLUSÃO:', error);
  }
}

// Executar
forceDeleteAllPlans(); 