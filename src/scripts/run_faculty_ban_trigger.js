const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL para criar apenas o trigger e as funções
const triggerSQL = `
-- Criar trigger para impedir que usuários banidos sejam adicionados como membros
CREATE OR REPLACE FUNCTION public.check_faculty_ban_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o usuário está banido
  IF EXISTS (
    SELECT 1 FROM public.faculty_banned_users
    WHERE faculty_id = NEW.faculty_id
    AND user_id = NEW.user_id
    AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Este usuário está banido desta faculdade e não pode ser adicionado como membro';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger na tabela faculty_members
DROP TRIGGER IF EXISTS check_faculty_ban_before_insert_trigger ON public.faculty_members;

CREATE TRIGGER check_faculty_ban_before_insert_trigger
BEFORE INSERT ON public.faculty_members
FOR EACH ROW
EXECUTE FUNCTION public.check_faculty_ban_before_insert();

-- Recriar as funções para banir e desbanir usuários
CREATE OR REPLACE FUNCTION public.is_user_banned_from_faculty(
  p_faculty_id INTEGER,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.faculty_banned_users
    WHERE faculty_id = p_faculty_id
    AND user_id = p_user_id
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.ban_faculty_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.unban_faculty_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_banned_from_faculty TO authenticated;
`;

async function executeSql() {
  try {
    console.log('Executando SQL para configurar o trigger do sistema de banimento...');

    // Executar o SQL
    const { error } = await supabase.rpc('exec_sql', { sql: triggerSQL });

    if (error) {
      console.error('Erro ao executar SQL:', error);
      process.exit(1);
    }

    console.log('Trigger e funções do sistema de banimento configurados com sucesso!');
  } catch (error) {
    console.error('Erro ao executar o script:', error);
    process.exit(1);
  }
}

// Executar o script
executeSql(); 