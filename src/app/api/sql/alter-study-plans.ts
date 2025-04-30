import { executeQuery } from '../../../lib/db';

/**
 * Script para adicionar a coluna MetaData à tabela StudyPlans
 * Este script deve ser executado uma vez para atualizar o esquema do banco de dados
 */
export async function alterStudyPlansTable() {
  try {
    // Verificar se a coluna já existe
    const checkColumnResult = await executeQuery(`
      SELECT 
        COLUMN_NAME 
      FROM 
        INFORMATION_SCHEMA.COLUMNS 
      WHERE 
        TABLE_NAME = 'StudyPlans' 
        AND COLUMN_NAME = 'MetaData'
    `);

    // Se a coluna já existir, não fazer nada
    if (checkColumnResult && checkColumnResult.length > 0) {
      console.log('A coluna MetaData já existe na tabela StudyPlans');
      return {
        success: true,
        message: 'A coluna MetaData já existe na tabela StudyPlans'
      };
    }

    // Adicionar a coluna MetaData à tabela StudyPlans
    await executeQuery(`
      ALTER TABLE StudyPlans
      ADD MetaData NVARCHAR(MAX) NULL
    `);

    console.log('Coluna MetaData adicionada com sucesso à tabela StudyPlans');
    
    return {
      success: true,
      message: 'Coluna MetaData adicionada com sucesso à tabela StudyPlans'
    };
  } catch (error) {
    console.error('Erro ao alterar a tabela StudyPlans:', error);
    return {
      success: false,
      error: 'Erro ao alterar a tabela StudyPlans'
    };
  }
} 