-- Funções para gerenciar o contador de membros de uma faculdade

-- Função para incrementar o contador de membros
CREATE OR REPLACE FUNCTION public.increment_faculty_member_count(faculty_id_param integer)
RETURNS void AS $$
BEGIN
  UPDATE public.faculties
  SET member_count = member_count + 1
  WHERE id = faculty_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para decrementar o contador de membros
CREATE OR REPLACE FUNCTION public.decrement_faculty_member_count(faculty_id_param integer)
RETURNS void AS $$
BEGIN
  UPDATE public.faculties
  SET member_count = GREATEST(member_count - 1, 0)  -- Evita que o contador fique negativo
  WHERE id = faculty_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para todos os usuários autenticados
GRANT EXECUTE ON FUNCTION public.increment_faculty_member_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_faculty_member_count TO authenticated;

-- Trigger para atualizar automaticamente o contador quando um membro é adicionado
CREATE OR REPLACE FUNCTION public.update_faculty_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_faculty_member_count(NEW.faculty_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_faculty_member_count(OLD.faculty_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover o trigger existente se houver
DROP TRIGGER IF EXISTS faculty_member_count_trigger ON public.faculty_members;

-- Criar o trigger
CREATE TRIGGER faculty_member_count_trigger
AFTER INSERT OR DELETE ON public.faculty_members
FOR EACH ROW
EXECUTE FUNCTION public.update_faculty_member_count(); 