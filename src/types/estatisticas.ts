// Tipos para estatísticas
import { DisciplinaSincronizada } from '@/types/disciplina';

export interface SessaoEstudo {
  id: string;
  disciplina: string;
  data: string;
  duracao: number; // em minutos
  concluida: boolean;
  notasEstudo?: string;
  pontuacaoProdutividade?: number;
}

export interface Simulado {
  id: number;
  disciplina: string;
  data: string;
  acertos: number;
  total: number;
  tempo: number; // em minutos
}

export interface EstudoStats {
  horasEstudo: number;
  sessoesEstudo: SessaoEstudo[];
  total?: number;
  concluidas?: number;
  pendentes?: number;
}

export interface PlanejamentoStats {
  totalPlanos: number;
  planosAtivos: number;
  disciplinas?: number;
  assuntos?: number;
  horasPlanejadas?: number;
}

export interface DesempenhoStats {
  mediaGeral: number;
  aprovadas?: number;
  avaliacoes?: number;
}

export interface DadosEstatisticas {
  planejamento: PlanejamentoStats;
  estudo: EstudoStats;
  desempenho: DesempenhoStats;
  disciplinas: DisciplinaSincronizada[];
  simulados: Simulado[];
} 