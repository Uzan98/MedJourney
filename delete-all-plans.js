// Script para deletar todos os planos de estudo do banco de dados
import { executeQuery } from './src/lib/db.js';
import readline from 'readline';

async function deleteAllStudyPlans() {
  try {
    // 1. Contar planos existentes
    const countResult = await executeQuery(
      'SELECT COUNT(*) AS TotalPlanos FROM StudyPlans',
      {}
    );
    const totalPlanos = countResult[0].TotalPlanos;
    console.log(`Encontrados ${totalPlanos} planos de estudo no banco de dados.`);

    // 2. Amostra dos planos (opcional)
    const samplePlans = await executeQuery(
      'SELECT TOP 5 Id, Name, CreatedAt FROM StudyPlans ORDER BY CreatedAt DESC',
      {}
    );
    console.log('Exemplos de planos que serão excluídos:');
    console.table(samplePlans);

    // 3. Perguntar confirmação
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`Você tem certeza que deseja excluir TODOS os ${totalPlanos} planos de estudo? (digite "SIM" para confirmar): `, async (answer) => {
      if (answer.trim() !== 'SIM') {
        console.log('Operação cancelada pelo usuário.');
        rl.close();
        return;
      }

      console.log('Iniciando processo de exclusão...');

      // 4. Atualizar sessões de estudo para remover referências
      const updateSessionsResult = await executeQuery(
        `UPDATE StudySessions
         SET StudyPlanId = NULL
         WHERE StudyPlanId IS NOT NULL;
         
         SELECT @@ROWCOUNT AS UpdatedSessions;`,
        {}
      );
      const updatedSessions = updateSessionsResult[0].UpdatedSessions;
      console.log(`${updatedSessions} sessões de estudo desvinculadas.`);

      // 5. Excluir todos os planos
      const deleteResult = await executeQuery(
        `DELETE FROM StudyPlans;
         
         SELECT @@ROWCOUNT AS DeletedPlans;`,
        {}
      );
      const deletedPlans = deleteResult[0].DeletedPlans;
      console.log(`${deletedPlans} planos de estudo foram excluídos com sucesso!`);

      // 6. Verificar se a exclusão foi completa
      const verifyResult = await executeQuery(
        'SELECT COUNT(*) AS PlanosRestantes FROM StudyPlans',
        {}
      );
      console.log(`Planos restantes: ${verifyResult[0].PlanosRestantes}`);

      rl.close();
    });
  } catch (error) {
    console.error('Erro ao executar a operação:', error);
  }
}

// Executar o script
deleteAllStudyPlans(); 