import { supabase } from '@/lib/supabase';
import { termsOfService } from '@/data/terms-of-service';

export interface TermsAcceptance {
  id: string;
  user_id: string;
  terms_version: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface TermsOfServiceData {
  id: string;
  version: string;
  title: string;
  content: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

/**
 * Registra a aceitação dos termos de uso pelo usuário
 */
export async function recordTermsAcceptance(
  userId: string,
  termsVersion: string = termsOfService.version
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Obter informações do navegador
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : null;
    
    // Inserir registro de aceitação
    const { error } = await supabase
      .from('user_terms_acceptance')
      .insert({
        user_id: userId,
        terms_version: termsVersion,
        accepted_at: new Date().toISOString(),
        user_agent: userAgent
      });

    if (error) {
      console.error('Erro ao registrar aceitação dos termos:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar aceitação dos termos:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Erro desconhecido')
    };
  }
}

/**
 * Verifica se o usuário já aceitou os termos de uso atuais
 */
export async function checkTermsAcceptance(
  userId: string,
  termsVersion: string = termsOfService.version
): Promise<{ accepted: boolean; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('user_terms_acceptance')
      .select('id')
      .eq('user_id', userId)
      .eq('terms_version', termsVersion)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erro ao verificar aceitação dos termos:', error);
      return { accepted: false, error: new Error(error.message) };
    }

    return { accepted: !!data };
  } catch (error) {
    console.error('Erro ao verificar aceitação dos termos:', error);
    return {
      accepted: false,
      error: error instanceof Error ? error : new Error('Erro desconhecido')
    };
  }
}

/**
 * Obtém os termos de uso ativos do banco de dados
 */
export async function getActiveTerms(): Promise<{ terms: TermsOfServiceData | null; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from('terms_of_service')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Erro ao obter termos ativos:', error);
      return { terms: null, error: new Error(error.message) };
    }

    return { terms: data };
  } catch (error) {
    console.error('Erro ao obter termos ativos:', error);
    return {
      terms: null,
      error: error instanceof Error ? error : new Error('Erro desconhecido')
    };
  }
}

/**
 * Atualiza os termos de uso no banco de dados
 */
export async function updateTermsInDatabase(): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    // Primeiro, desativar todos os termos existentes
    await supabase
      .from('terms_of_service')
      .update({ is_active: false })
      .eq('is_active', true);

    // Inserir nova versão dos termos
    const { error } = await supabase
      .from('terms_of_service')
      .insert({
        version: termsOfService.version,
        title: termsOfService.title,
        content: termsOfService.content,
        effective_date: termsOfService.effectiveDate,
        is_active: true
      });

    if (error) {
      console.error('Erro ao atualizar termos no banco:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar termos no banco:', error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Erro desconhecido')
    };
  }
}