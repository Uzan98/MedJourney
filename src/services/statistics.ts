import { DadosEstatisticas } from '@/types/estatisticas';

/**
 * Obtém todos os dados de estatísticas do armazenamento local
 * @returns Dados de estatísticas
 */
export function obterDadosEstatisticas(): DadosEstatisticas {
  try {
    // Obter dados do localStorage
    const stringDados = localStorage.getItem('medjourney_statistics_data');
    
    if (stringDados) {
      const dados = JSON.parse(stringDados);
      return dados;
    }
    
    // Se não houver dados, retornar objeto vazio estruturado
    return {
      planejamento: {
        totalPlanos: 0,
        planosAtivos: 0
      },
      estudo: {
        horasEstudo: 0,
        sessoesEstudo: []
      },
      desempenho: {
        mediaGeral: 0
      },
      disciplinas: [],
      simulados: []
    };
  } catch (error) {
    console.error('Erro ao obter dados de estatísticas:', error);
    
    // Em caso de erro, retornar objeto vazio estruturado
    return {
      planejamento: {
        totalPlanos: 0,
        planosAtivos: 0
      },
      estudo: {
        horasEstudo: 0,
        sessoesEstudo: []
      },
      desempenho: {
        mediaGeral: 0
      },
      disciplinas: [],
      simulados: []
    };
  }
} 