import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names using clsx and tailwind-merge
 * @param inputs Class names to combine
 * @returns Combined class name string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma data para o formato brasileiro (dd/mm/yyyy)
 * @param dateInput Data que pode ser um objeto Date, string, número ou qualquer valor conversível para Date
 * @returns String formatada no padrão brasileiro ou string vazia se a data for inválida
 */
export function formatDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) {
    return '';
  }
  
  let date: Date;
  
  try {
    // Se já for um objeto Date
    if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      // Tentar converter para Date
      date = new Date(dateInput);
    }
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      console.error('Data inválida recebida em formatDate:', dateInput);
      return '';
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (error) {
    console.error('Erro ao formatar data:', error, dateInput);
    return '';
  }
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}min`;
  }
  
  return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
} 