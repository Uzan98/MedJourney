/**
 * Formata uma data para formato localizado
 * @param dateString String de data ou objeto Date
 * @returns Data formatada (ex: 15/04/2023)
 */
export function formatarData(dateString: string | Date): string {
  if (!dateString) return 'Data não definida';
  
  const data = new Date(dateString);
  
  // Verificar se a data é válida
  if (isNaN(data.getTime())) {
    return 'Data inválida';
  }
  
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata um horário para formato localizado
 * @param dateString String de data/hora ou objeto Date
 * @returns Hora formatada (ex: 14:30)
 */
export function formatarHora(dateString: string | Date): string {
  if (!dateString) return 'Horário não definido';
  
  const data = new Date(dateString);
  
  // Verificar se a data é válida
  if (isNaN(data.getTime())) {
    return 'Horário inválido';
  }
  
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formata minutos para horas e minutos
 * @param minutes Número de minutos
 * @returns String formatada (ex: 2h 30min)
 */
export function formatarMinutosParaHorasMinutos(minutes: number): string {
  if (!minutes && minutes !== 0) return '-';
  
  const horas = Math.floor(minutes / 60);
  const minutos = minutes % 60;
  
  if (horas === 0) {
    return `${minutos}min`;
  } else if (minutos === 0) {
    return `${horas}h`;
  } else {
    return `${horas}h ${minutos}min`;
  }
}

/**
 * Formata um valor monetário
 * @param valor Valor a ser formatado
 * @returns String formatada como moeda (ex: R$ 1.234,56)
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

/**
 * Formata um número com pontos e vírgulas
 * @param valor Valor numérico
 * @param casasDecimais Número de casas decimais (padrão: 2)
 * @returns String formatada com separadores localizados
 */
export function formatarNumero(valor: number, casasDecimais: number = 2): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais
  });
}

/**
 * Formata porcentagem
 * @param valor Valor decimal (ex: 0.75 para 75%)
 * @param casasDecimais Número de casas decimais (padrão: 1)
 * @returns String formatada com símbolo de porcentagem
 */
export function formatarPorcentagem(valor: number, casasDecimais: number = 1): string {
  return `${(valor * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais
  })}%`;
} 