import { supabase } from '@/lib/supabase';
import { privacyPolicy } from "@/data/privacy-policy";

export interface PrivacyAcceptance {
  id: string;
  user_id: string;
  policy_version: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PrivacyPolicyData {
  id: string;
  version: string;
  content: string;
  effective_date: string;
  created_at: string;
}

/**
 * Registra a aceitação da política de privacidade pelo usuário
 */
export async function recordPrivacyAcceptance(
  userId: string,
  policyVersion: string = privacyPolicy.version
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Primeiro, obter o ID da política de privacidade atual
    const { data: policyData, error: policyError } = await supabase
      .from("privacy_policy")
      .select("id")
      .eq("version", policyVersion)
      .single();
    
    if (policyError) {
      console.error("Erro ao obter política:", policyError);
      return { success: false, error: new Error(policyError.message) };
    }

    const { error } = await supabase
      .from("user_privacy_acceptance")
      .insert({
        user_id: userId,
        privacy_policy_id: policyData.id,
        accepted_at: new Date().toISOString()
      });
    if (error) {
      console.error("Erro ao registrar aceitação da política:", error);
      return { success: false, error: new Error(error.message) };
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao registrar aceitação da política:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Erro desconhecido")
    };
  }
}

/**
 * Verifica se o usuário já aceitou a política de privacidade atual
 */
export async function checkPrivacyAcceptance(
  userId: string,
  policyVersion: string = privacyPolicy.version
): Promise<{ accepted: boolean; error?: Error }> {
  try {
    const { data, error } = await supabase
      .from("user_privacy_acceptance")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (error && error.code !== "PGRST116") {
      console.error("Erro ao verificar aceitação da política:", error);
      return { accepted: false, error: new Error(error.message) };
    }
    return { accepted: !!data };
  } catch (error) {
    console.error("Erro ao verificar aceitação da política:", error);
    return {
      accepted: false,
      error: error instanceof Error ? error : new Error("Erro desconhecido")
    };
  }
}

/**
 * Obtém a política de privacidade mais recente do banco de dados
 */
export async function getActivePrivacyPolicy(): Promise<{
  policy: PrivacyPolicyData | null;
  error?: Error;
}> {
  try {
    const { data, error } = await supabase
      .from("privacy_policy")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (error) {
      console.error("Erro ao obter política ativa:", error);
      return { policy: null, error: new Error(error.message) };
    }
    return { policy: data };
  } catch (error) {
    console.error("Erro ao obter política ativa:", error);
    return {
      policy: null,
      error: error instanceof Error ? error : new Error("Erro desconhecido")
    };
  }
}

/**
 * Atualiza a política de privacidade no banco de dados
 */
export async function updatePrivacyPolicyInDatabase(): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    // Verificar se já existe uma política com esta versão
    const { data: existingPolicy } = await supabase
      .from("privacy_policy")
      .select("id")
      .eq("version", privacyPolicy.version)
      .single();

    if (existingPolicy) {
      console.log("Política de privacidade já existe no banco de dados");
      return { success: true };
    }

    const { error } = await supabase
      .from("privacy_policy")
      .insert({
        version: privacyPolicy.version,
        content: privacyPolicy.content,
        effective_date: privacyPolicy.effectiveDate
      });
    if (error) {
      console.error("Erro ao atualizar política no banco:", error);
      return { success: false, error: new Error(error.message) };
    }
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar política no banco:", error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Erro desconhecido")
    };
  }
}