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
  title: string;
  content: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

/**
 * Registra a aceitação da política de privacidade pelo usuário
 */
export async function recordPrivacyAcceptance(
  userId: string,
  policyVersion: string = privacyPolicy.version
): Promise<{ success: boolean; error?: Error }> {
  try {
    const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : null;
    const { error } = await supabase
      .from("user_privacy_acceptance")
      .insert({
        user_id: userId,
        policy_version: policyVersion,
        accepted_at: new Date().toISOString(),
        user_agent: userAgent
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
      .eq("policy_version", policyVersion)
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
 * Obtém a política de privacidade ativa do banco de dados
 */
export async function getActivePrivacyPolicy(): Promise<{
  policy: PrivacyPolicyData | null;
  error?: Error;
}> {
  try {
    const { data, error } = await supabase
      .from("privacy_policy")
      .select("*")
      .eq("is_active", true)
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
    await supabase
      .from("privacy_policy")
      .update({ is_active: false })
      .eq("is_active", true);
    const { error } = await supabase
      .from("privacy_policy")
      .insert({
        version: privacyPolicy.version,
        title: privacyPolicy.title,
        content: privacyPolicy.content,
        effective_date: privacyPolicy.effectiveDate,
        is_active: true
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