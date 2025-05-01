/**
 * Serviços exportados para o aplicativo
 */

// Exportações dos serviços

// Serviço de planejamento
export {
  inicializarPlanejamento,
  obterPlanosLocais,
  criarNovoPlano as criarPlanoEstudo,
  atualizarPlano,
  excluirPlano,
  validarPlano,
  sincronizarPlanos,
  adicionarSessaoEstudo,
  atualizarSessaoEstudo,
  excluirSessaoEstudo,
  obterSessaoEstudo,
  atualizarStatusAssunto
} from './planning';

// Serviço de disciplinas
export {
  getDisciplines,
  getDisciplineById,
  getSubjectsByDisciplineId,
  convertToPlanDisciplines
} from './disciplines';

// Simulados
export {
  // Exportações do simulados vão aqui quando necessário
} from './simulados'; 