'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface Assunto {
  id: number;
  name: string;
  discipline_id: number;
  questoes_count?: number;
}

interface UseAssuntosOptions {
  disciplinaId?: number;
  enabled?: boolean;
}

// Função para buscar assuntos do Supabase
async function fetchAssuntos(disciplinaId?: number): Promise<Assunto[]> {
  try {
    let query = supabase
      .from('subjects')
      .select('id, name, discipline_id');
    
    if (disciplinaId) {
      query = query.eq('discipline_id', disciplinaId);
    }
    
    const { data: subjects, error } = await query.order('name');
    
    if (error) {
      console.error('Erro ao buscar assuntos:', error);
      throw new Error(`Erro ao carregar assuntos: ${error.message}`);
    }
    
    // Para cada assunto, contar as questões através dos tópicos
    const assuntosComContador = await Promise.all(
      (subjects || []).map(async (subject) => {
        // Buscar tópicos do assunto
        const { data: topics } = await supabase
          .from('topics')
          .select('id')
          .eq('subject_id', subject.id);
        
        if (!topics || topics.length === 0) {
          return {
            ...subject,
            questoes_count: 0
          };
        }
        
        // Contar questões dos tópicos
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .in('topic_id', topics.map(t => t.id));
        
        return {
          ...subject,
          questoes_count: count || 0
        };
      })
    );
    
    return assuntosComContador;
  } catch (error) {
    console.error('Erro na função fetchAssuntos:', error);
    throw error;
  }
}

// Hook customizado para usar assuntos com cache
export function useAssuntos({ disciplinaId, enabled = true }: UseAssuntosOptions = {}) {
  return useQuery({
    queryKey: ['assuntos', disciplinaId],
    queryFn: () => fetchAssuntos(disciplinaId),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook para buscar todos os assuntos (sem filtro por disciplina)
export function useAllAssuntos(enabled = true) {
  return useAssuntos({ enabled });
}

// Hook para buscar assuntos de uma disciplina específica
export function useAssuntosByDisciplina(disciplinaId: number, enabled = true) {
  return useAssuntos({ disciplinaId, enabled });
}