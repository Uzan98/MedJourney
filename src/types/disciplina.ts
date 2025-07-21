export interface DisciplinaSincronizada {
  id: string;
  nome: string;
  areaConhecimento?: string;
  professor?: string;
  cargaHoraria?: number;
  turno?: string;
  mediaAtual?: number;
  mediaDesejada?: number;
  totalFaltas?: number;
  totalPresencas?: number;
} 