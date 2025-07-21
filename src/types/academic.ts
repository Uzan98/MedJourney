/**
 * Tipos e interfaces para o módulo de desempenho acadêmico
 */

// Interface para as disciplinas
export interface Disciplina {
  id: number;
  nome: string;
  semestre: string;
  avaliacoes: Array<{nome: string, nota: number}>;
  media: number;
  status: 'aprovado' | 'reprovado' | 'em andamento';
}

// Interface para o formulário de notas
export interface NotaForm {
  disciplinaId: number;
  nome: string;
  tipo: 'prova' | 'trabalho' | 'exercicio' | 'seminario' | 'projeto' | 'outra';
  formato: 'numerica' | 'conceito' | 'aprovado_reprovado';
  valorNumerico?: number;
  valorConceito?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'S' | 'N' | 'O' | 'I';
  valorAprovacao?: 'aprovado' | 'reprovado';
  peso: number;
  data: string;
  observacoes?: string;
}

// Interface para o formulário de faltas
export interface FaltaForm {
  disciplinaId: number;
  data: string;
  quantidade: number;
  justificada: boolean;
  observacoes?: string;
}

// Interface para registro de faltas
export interface RegistroFalta {
  data: string;
  quantidade: number;
  justificada: boolean;
  observacoes?: string;
}

// Interface para dados de frequência
export interface DadosFrequencia {
  id: number;
  disciplina: string;
  semestre: string;
  totalAulas: number;
  faltas: number;
  limite: number;
  porcentagem: number;
  status: 'otimo' | 'regular' | 'atencao' | 'critico';
  registrosFaltas: RegistroFalta[];
}

// Interface para configuração de frequência
export interface ConfigFrequenciaForm {
  disciplinaId: number;
  modoCalculo: 'total' | 'periodo';
  totalAulas: number;
  aulasPorSemana: number;
  dataInicio: string;
  dataFim: string;
  frequenciaMinima: number;
} 