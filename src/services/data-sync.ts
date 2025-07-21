/**
 * Serviço Central de Sincronização de Dados
 * 
 * Este serviço gerencia a sincronização de dados entre diferentes módulos do sistema,
 * garantindo consistência nas informações apresentadas nas estatísticas e em todo o aplicativo.
 */

import { getDisciplines, getStudyPlans, getStudySessions, recalcularMetricas } from '@/lib/api';
import { StudyPlan, PlanDiscipline } from '@/lib/types/planning';
import { Disciplina } from '../types/academic';

// Chaves para armazenamento local
const SYNC_TIMESTAMP_KEY = 'medjourney_data_sync_timestamp';
const GLOBAL_DISCIPLINES_KEY = 'medjourney_global_disciplines';
const PLANS_SUMMARY_KEY = 'medjourney_plans_summary';
const SESSIONS_SUMMARY_KEY = 'medjourney_sessions_summary';
const PERFORMANCE_SUMMARY_KEY = 'medjourney_performance_summary';

// Tipos para integração de dados
export interface DisciplinaSincronizada {
  id: number;
  nome: string;
  origem: 'backend' | 'usuario';
  planejamento?: {
    planos: number;
    assuntos: number;
    sessoes: number;
    horasPlanejadas: number;
    horasEstudadas: number;
    progresso: number;
  };
  desempenho?: {
    semestre: string;
    avaliacoes: number;
    media: number;
    status: string;
    frequencia?: {
      totalAulas: number;
      presencas: number;
      faltas: number;
      porcentagem: number;
    };
  };
}

export interface SincronizacaoStatus {
  ultimaSincronizacao: Date | null;
  sucessoTotal: boolean;
  modulos: {
    planejamento: boolean;
    desempenho: boolean;
    estatisticas: boolean;
  };
  tempoExecucao?: number;
  erros: string[];
}

// Estado atual da sincronização
let statusSincronizacao: SincronizacaoStatus = {
  ultimaSincronizacao: null,
  sucessoTotal: false,
  modulos: {
    planejamento: false,
    desempenho: false,
    estatisticas: false
  },
  erros: []
};

// Cache de disciplinas sincronizadas
let disciplinasSincronizadas: DisciplinaSincronizada[] = [];

/**
 * Obtém as disciplinas sincronizadas
 */
export function obterDisciplinasSincronizadas(): DisciplinaSincronizada[] {
  // Tenta ler do localStorage primeiro
  try {
    const cached = localStorage.getItem(GLOBAL_DISCIPLINES_KEY);
    if (cached) {
      disciplinasSincronizadas = JSON.parse(cached);
    }
  } catch (error) {
    console.error("Erro ao ler disciplinas do cache:", error);
  }
  
  return disciplinasSincronizadas;
}

/**
 * Sincroniza os dados entre os módulos de planejamento e desempenho acadêmico
 */
export async function sincronizarDados(forceSyncFromBackend = false): Promise<SincronizacaoStatus> {
  console.log("Iniciando sincronização de dados entre módulos...");
  const tempoInicio = performance.now();
  
  try {
    // Resetar status
    statusSincronizacao = {
      ultimaSincronizacao: null,
      sucessoTotal: false,
      modulos: {
        planejamento: false,
        desempenho: false,
        estatisticas: false
      },
      erros: []
    };
    
    // Verificar se devemos forçar sincronização com o backend ou usar dados em cache
    const ultimaSincronizacao = localStorage.getItem(SYNC_TIMESTAMP_KEY);
    const agora = new Date();
    const tempoPassadoMs = ultimaSincronizacao 
      ? agora.getTime() - new Date(ultimaSincronizacao).getTime() 
      : Infinity;
    
    // Se a última sincronização foi há menos de 5 minutos e não estamos forçando, usar cache
    if (tempoPassadoMs < 5 * 60 * 1000 && !forceSyncFromBackend) {
      console.log("Usando dados em cache da última sincronização");
      disciplinasSincronizadas = obterDisciplinasSincronizadas();
      
      // Atualizar status
      statusSincronizacao.ultimaSincronizacao = ultimaSincronizacao ? new Date(ultimaSincronizacao) : null;
      statusSincronizacao.sucessoTotal = true;
      statusSincronizacao.modulos.planejamento = true;
      statusSincronizacao.modulos.desempenho = true;
      statusSincronizacao.modulos.estatisticas = true;
      
      const tempoFim = performance.now();
      statusSincronizacao.tempoExecucao = tempoFim - tempoInicio;
      
      return statusSincronizacao;
    }
    
    // 1. Buscar disciplinas do backend
    const responseDisciplinas = await getDisciplines();
    if (!responseDisciplinas.success) {
      throw new Error("Falha ao buscar disciplinas do backend");
    }
    
    // 2. Buscar planos de estudo
    const responsePlanos = await getStudyPlans();
    if (!responsePlanos.success) {
      statusSincronizacao.erros.push("Falha ao buscar planos de estudo");
    } else {
      statusSincronizacao.modulos.planejamento = true;
    }
    
    // 3. Buscar sessões de estudo
    const responseSessoes = await getStudySessions();
    if (!responseSessoes.success) {
      statusSincronizacao.erros.push("Falha ao buscar sessões de estudo");
    }
    
    // 4. Recalcular métricas (opcional, pode ser custoso)
    if (forceSyncFromBackend) {
      const responseMetricas = await recalcularMetricas();
      if (!responseMetricas.success) {
        statusSincronizacao.erros.push("Falha ao recalcular métricas");
      }
    }
    
    // Iniciar array de disciplinas sincronizadas
    disciplinasSincronizadas = [];
    
    // Processar disciplinas obtidas do backend
    const disciplinasBackend = responseDisciplinas.disciplines || [];
    
    disciplinasBackend.forEach((disc: any) => {
      // Determinar se é uma disciplina do usuário ou do sistema
      const name = disc.name || disc.Name || "";
      const isUserDiscipline = typeof name === 'string' && name.startsWith('User:');
      const disciplineId = disc.id || disc.Id;
      
      // Extrair nome sem prefixo para disciplinas do usuário
      const nomeDisciplina = isUserDiscipline ? name.replace('User:', '') : name;
      
      // Criar objeto base da disciplina
      const disciplinaSincronizada: DisciplinaSincronizada = {
        id: disciplineId,
        nome: nomeDisciplina,
        origem: isUserDiscipline ? 'usuario' : 'backend'
      };
      
      // Adicionar à lista
      disciplinasSincronizadas.push(disciplinaSincronizada);
    });
    
    // Se temos planos de estudo, processar dados de planejamento
    if (responsePlanos.success && responsePlanos.plans) {
      processarDadosPlanejamento(disciplinasSincronizadas, responsePlanos.plans);
    }
    
    // Se temos sessões, processar dados de sessões
    if (responseSessoes.success && responseSessoes.sessions) {
      processarDadosSessoes(disciplinasSincronizadas, responseSessoes.sessions);
    }
    
    // Buscar e processar dados de desempenho acadêmico do localStorage
    processarDadosDesempenho(disciplinasSincronizadas);
    statusSincronizacao.modulos.desempenho = true;
    
    // Salvar no localStorage para uso futuro
    salvarDadosSincronizados(disciplinasSincronizadas);
    
    // Processar quaisquer mudanças novas do módulo de desempenho acadêmico para estatísticas
    const disciplinasDesempenhoJSON = localStorage.getItem('disciplinasState');
    if (disciplinasDesempenhoJSON) {
      try {
        const disciplinasDesempenho = JSON.parse(disciplinasDesempenhoJSON);
        const resumoDesempenho = {
          disciplinas: disciplinasDesempenho.length,
          mediaGeral: 0,
          aprovadas: 0,
          reprovadas: 0,
          emAndamento: 0,
          avaliacoes: 0
        };
        
        let somaMedias = 0;
        disciplinasDesempenho.forEach((disc: Disciplina) => {
          somaMedias += disc.media;
          resumoDesempenho.avaliacoes += disc.avaliacoes.length;
          
          if (disc.status === 'aprovado') {
            resumoDesempenho.aprovadas++;
          } else if (disc.status === 'reprovado') {
            resumoDesempenho.reprovadas++;
          } else {
            resumoDesempenho.emAndamento++;
          }
        });
        
        if (disciplinasDesempenho.length > 0) {
          resumoDesempenho.mediaGeral = somaMedias / disciplinasDesempenho.length;
        }
        
        // Salvar resumo para estatísticas
        localStorage.setItem(PERFORMANCE_SUMMARY_KEY, JSON.stringify(resumoDesempenho));
      } catch (error) {
        console.error("Erro ao processar resumo de desempenho:", error);
      }
    }
    
    // Marcar sincronização como bem-sucedida
    statusSincronizacao.sucessoTotal = 
      statusSincronizacao.modulos.planejamento && 
      statusSincronizacao.modulos.desempenho;
    
    statusSincronizacao.modulos.estatisticas = true;
    statusSincronizacao.ultimaSincronizacao = agora;
    
    // Atualizar timestamp de sincronização
    localStorage.setItem(SYNC_TIMESTAMP_KEY, agora.toISOString());
    
    const tempoFim = performance.now();
    statusSincronizacao.tempoExecucao = tempoFim - tempoInicio;
    
    return statusSincronizacao;
  } catch (error) {
    console.error("Erro na sincronização de dados:", error);
    statusSincronizacao.erros.push(`Erro geral: ${error}`);
    
    const tempoFim = performance.now();
    statusSincronizacao.tempoExecucao = tempoFim - tempoInicio;
    
    return statusSincronizacao;
  }
}

/**
 * Processa dados dos planos de estudo para integração
 */
function processarDadosPlanejamento(
  disciplinas: DisciplinaSincronizada[], 
  planos: StudyPlan[]
): void {
  // Para cada plano, processar disciplinas
  planos.forEach(plano => {
    // Processar cada disciplina do plano
    plano.disciplines.forEach(disciplinaPlano => {
      // Encontrar a disciplina correspondente no array global
      const disciplinaGlobal = disciplinas.find(d => d.id === disciplinaPlano.id);
      
      if (disciplinaGlobal) {
        // Inicializar objeto de planejamento se não existir
        if (!disciplinaGlobal.planejamento) {
          disciplinaGlobal.planejamento = {
            planos: 0,
            assuntos: 0,
            sessoes: 0,
            horasPlanejadas: 0,
            horasEstudadas: 0,
            progresso: 0
          };
        }
        
        // Incrementar contador de planos
        disciplinaGlobal.planejamento.planos++;
        
        // Contar assuntos
        disciplinaGlobal.planejamento.assuntos += disciplinaPlano.subjects.length;
        
        // Calcular horas planejadas
        const horasDisciplina = disciplinaPlano.subjects.reduce(
          (total, subject) => total + (subject.hours || 0), 0
        );
        disciplinaGlobal.planejamento.horasPlanejadas += horasDisciplina;
        
        // Calcular progresso médio
        const temProgresso = disciplinaPlano.subjects.some(s => s.progress !== undefined);
        if (temProgresso) {
          const progressoTotal = disciplinaPlano.subjects.reduce(
            (total, subject) => total + (subject.progress || 0), 0
          );
          const mediaProgresso = disciplinaPlano.subjects.length > 0
            ? progressoTotal / disciplinaPlano.subjects.length
            : 0;
          
          // Atualizar progresso (média ponderada entre planos)
          const progressoAtual = disciplinaGlobal.planejamento.progresso;
          const numPlanos = disciplinaGlobal.planejamento.planos;
          
          // Fórmula: ((progressoAtual * (numPlanos-1)) + novoProgresso) / numPlanos
          disciplinaGlobal.planejamento.progresso = numPlanos > 1
            ? ((progressoAtual * (numPlanos - 1)) + mediaProgresso) / numPlanos
            : mediaProgresso;
        }
      }
    });
    
    // Processar sessões do plano se existirem
    if (plano.schedule && plano.schedule.sessions) {
      plano.schedule.sessions.forEach(sessao => {
        const disciplinaId = sessao.disciplineId;
        const disciplinaGlobal = disciplinas.find(d => d.id === disciplinaId);
        
        if (disciplinaGlobal && disciplinaGlobal.planejamento) {
          // Incrementar contador de sessões
          disciplinaGlobal.planejamento.sessoes++;
          
          // Adicionar horas estudadas se a sessão estiver completa
          if (sessao.completed && sessao.actualDuration) {
            disciplinaGlobal.planejamento.horasEstudadas += sessao.actualDuration / 60; // converter minutos para horas
          }
        }
      });
    }
  });
  
  // Salvar resumo dos planos no localStorage para uso em estatísticas
  const resumoPlanos = {
    total: planos.length,
    ativos: planos.filter(p => p.status === 'ativo').length,
    pausados: planos.filter(p => p.status === 'pausado').length,
    concluidos: planos.filter(p => p.status === 'concluido').length,
    disciplinas: new Set(planos.flatMap(p => p.disciplines.map(d => d.id))).size,
    assuntos: planos.reduce((sum, p) => sum + p.disciplines.reduce((s, d) => s + d.subjects.length, 0), 0)
  };
  
  localStorage.setItem(PLANS_SUMMARY_KEY, JSON.stringify(resumoPlanos));
}

/**
 * Processa dados das sessões de estudo para integração
 */
function processarDadosSessoes(
  disciplinas: DisciplinaSincronizada[],
  sessoes: any[]
): void {
  // Estatísticas gerais de sessões
  const resumoSessoes = {
    total: sessoes.length,
    concluidas: sessoes.filter((s: any) => s.completed).length,
    pendentes: sessoes.filter((s: any) => !s.completed).length,
    horasEstudadas: sessoes.reduce((sum: number, s: any) => {
      return sum + (s.completed && s.actualDuration ? s.actualDuration / 60 : 0);
    }, 0),
    porDisciplina: {} as Record<number, { sessoes: number, horasEstudadas: number }>
  };
  
  // Processar sessões por disciplina
  sessoes.forEach((sessao: any) => {
    // Tentar obter ID da disciplina
    let disciplinaId: number | null = null;
    
    // Verificar se temos ID direto ou nome da disciplina
    if (sessao.disciplineId) {
      disciplinaId = Number(sessao.disciplineId);
    } else if (sessao.disciplineName) {
      // Buscar disciplina pelo nome
      const disciplina = disciplinas.find(d => 
        d.nome.toLowerCase() === sessao.disciplineName.toLowerCase()
      );
      if (disciplina) {
        disciplinaId = disciplina.id;
      }
    }
    
    // Se encontramos a disciplina
    if (disciplinaId !== null) {
      // Atualizar contagem no resumo de sessões
      if (!resumoSessoes.porDisciplina[disciplinaId]) {
        resumoSessoes.porDisciplina[disciplinaId] = {
          sessoes: 0,
          horasEstudadas: 0
        };
      }
      
      resumoSessoes.porDisciplina[disciplinaId].sessoes++;
      
      if (sessao.completed && sessao.actualDuration) {
        resumoSessoes.porDisciplina[disciplinaId].horasEstudadas += 
          sessao.actualDuration / 60; // minutos para horas
      }
      
      // Atualizar dados na disciplina global
      const disciplinaGlobal = disciplinas.find(d => d.id === disciplinaId);
      if (disciplinaGlobal) {
        if (!disciplinaGlobal.planejamento) {
          disciplinaGlobal.planejamento = {
            planos: 0,
            assuntos: 0,
            sessoes: 0,
            horasPlanejadas: 0,
            horasEstudadas: 0,
            progresso: 0
          };
        }
        
        disciplinaGlobal.planejamento.sessoes++;
        
        if (sessao.completed && sessao.actualDuration) {
          disciplinaGlobal.planejamento.horasEstudadas += sessao.actualDuration / 60;
        }
      }
    }
  });
  
  localStorage.setItem(SESSIONS_SUMMARY_KEY, JSON.stringify(resumoSessoes));
}

/**
 * Processa dados de desempenho acadêmico para integração
 */
function processarDadosDesempenho(disciplinas: DisciplinaSincronizada[]): void {
  // Tentar obter dados de desempenho do localStorage
  try {
    // Buscar disciplinas do desempenho acadêmico
    const disciplinasDesempenhoJSON = localStorage.getItem('disciplinasState');
    if (!disciplinasDesempenhoJSON) return;
    
    const disciplinasDesempenho = JSON.parse(disciplinasDesempenhoJSON);
    
    // Buscar dados de frequência
    const frequenciasJSON = localStorage.getItem('frequenciasState');
    const frequencias = frequenciasJSON ? JSON.parse(frequenciasJSON) : [];
    
    // Criar mapa de frequências por nome de disciplina
    const mapaFrequencias = new Map();
    frequencias.forEach((freq: any) => {
      mapaFrequencias.set(freq.disciplina, freq);
    });
    
    // Estatísticas gerais de desempenho
    const resumoDesempenho = {
      disciplinas: disciplinasDesempenho.length,
      mediaGeral: 0,
      aprovadas: 0,
      reprovadas: 0,
      emAndamento: 0,
      avaliacoes: 0
    };
    
    // Processar cada disciplina do desempenho
    disciplinasDesempenho.forEach((discDesempenho: Disciplina) => {
      // Buscar correspondência com disciplina global pelo nome
      // Primeiro fazer busca exata
      let disciplinaGlobal = disciplinas.find(d => 
        d.nome.toLowerCase() === discDesempenho.nome.toLowerCase()
      );
      
      // Se não encontrou, tentar busca aproximada
      if (!disciplinaGlobal) {
        disciplinaGlobal = disciplinas.find(d => 
          discDesempenho.nome.toLowerCase().includes(d.nome.toLowerCase()) ||
          d.nome.toLowerCase().includes(discDesempenho.nome.toLowerCase())
        );
      }
      
      // Se não encontrou correspondência, criar uma nova entrada
      if (!disciplinaGlobal) {
        const novaDisciplina: DisciplinaSincronizada = {
          id: discDesempenho.id,
          nome: discDesempenho.nome,
          origem: 'usuario'
        };
        disciplinas.push(novaDisciplina);
        disciplinaGlobal = novaDisciplina;
      }
      
      // Adicionar dados de desempenho
      disciplinaGlobal.desempenho = {
        semestre: discDesempenho.semestre,
        avaliacoes: discDesempenho.avaliacoes.length,
        media: discDesempenho.media,
        status: discDesempenho.status
      };
      
      // Adicionar dados de frequência se disponíveis
      const frequencia = mapaFrequencias.get(discDesempenho.nome);
      if (frequencia) {
        disciplinaGlobal.desempenho.frequencia = {
          totalAulas: frequencia.totalAulas,
          presencas: frequencia.totalAulas - frequencia.faltas,
          faltas: frequencia.faltas,
          porcentagem: frequencia.porcentagem
        };
      }
      
      // Atualizar estatísticas gerais
      resumoDesempenho.avaliacoes += discDesempenho.avaliacoes.length;
      resumoDesempenho.mediaGeral += discDesempenho.media;
      
      if (discDesempenho.status === 'aprovado') {
        resumoDesempenho.aprovadas++;
      } else if (discDesempenho.status === 'reprovado') {
        resumoDesempenho.reprovadas++;
      } else {
        resumoDesempenho.emAndamento++;
      }
    });
    
    // Calcular média geral
    if (disciplinasDesempenho.length > 0) {
      resumoDesempenho.mediaGeral /= disciplinasDesempenho.length;
    }
    
    // Salvar resumo para estatísticas
    localStorage.setItem(PERFORMANCE_SUMMARY_KEY, JSON.stringify(resumoDesempenho));
    
  } catch (error) {
    console.error("Erro ao processar dados de desempenho:", error);
  }
}

/**
 * Salva os dados sincronizados no localStorage
 */
function salvarDadosSincronizados(disciplinas: DisciplinaSincronizada[]): void {
  try {
    localStorage.setItem(GLOBAL_DISCIPLINES_KEY, JSON.stringify(disciplinas));
  } catch (error) {
    console.error("Erro ao salvar disciplinas sincronizadas:", error);
  }
}

/**
 * Obtém estatísticas para o dashboard/estatísticas
 */
export function obterDadosEstatisticas() {
  try {
    // Carregar dados resumidos
    const resumoPlanos = JSON.parse(localStorage.getItem(PLANS_SUMMARY_KEY) || '{}');
    const resumoSessoes = JSON.parse(localStorage.getItem(SESSIONS_SUMMARY_KEY) || '{}');
    const resumoDesempenho = JSON.parse(localStorage.getItem(PERFORMANCE_SUMMARY_KEY) || '{}');
    
    // Combinar em um único objeto de estatísticas
    return {
      planejamento: {
        ...resumoPlanos
      },
      estudo: {
        ...resumoSessoes
      },
      desempenho: {
        ...resumoDesempenho
      },
      disciplinas: obterDisciplinasSincronizadas()
    };
  } catch (error) {
    console.error("Erro ao obter dados de estatísticas:", error);
    return {};
  }
}

/**
 * Define um tipo para a estrutura do módulo Disciplina para uso com TypeScript
 */
export type { Disciplina };

/**
 * Inicializar o módulo - deve ser chamado na inicialização da aplicação
 */
export function inicializarSincronizacao(): void {
  // Carregar dados do localStorage
  obterDisciplinasSincronizadas();
  
  // Executar primeira sincronização
  setTimeout(() => {
    sincronizarDados().catch(err => {
      console.error("Erro na sincronização inicial:", err);
    });
  }, 500);
} 