-- Criar função para verificar e atualizar status de membros inativos
CREATE OR REPLACE FUNCTION check_inactive_members()
RETURNS TRIGGER AS $$
DECLARE
  inactive_threshold INTERVAL := '1 minute';
BEGIN
  -- Se um membro está sendo marcado como ativo, verificar se há outros membros inativos
  IF NEW.is_active = TRUE THEN
    -- Atualizar membros que estão inativos por mais de 1 minuto
    UPDATE study_group_members
    SET is_active = FALSE
    WHERE group_id = NEW.group_id
      AND user_id != NEW.user_id
      AND is_active = TRUE
      AND (NOW() - last_active_at) > inactive_threshold;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para verificar membros inativos quando um membro é atualizado
DROP TRIGGER IF EXISTS check_inactive_members_trigger ON study_group_members;
CREATE TRIGGER check_inactive_members_trigger
AFTER UPDATE OF is_active ON study_group_members
FOR EACH ROW
WHEN (NEW.is_active = TRUE)
EXECUTE FUNCTION check_inactive_members();

-- Criar função para notificar alterações em membros
CREATE OR REPLACE FUNCTION notify_member_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Emitir notificação via canal PostgreSQL
  PERFORM pg_notify(
    'member_status_change',
    json_build_object(
      'group_id', NEW.group_id,
      'user_id', NEW.user_id,
      'is_active', NEW.is_active,
      'timestamp', NOW()
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para notificar quando o status de um membro muda
DROP TRIGGER IF EXISTS notify_member_change_trigger ON study_group_members;
CREATE TRIGGER notify_member_change_trigger
AFTER UPDATE OF is_active ON study_group_members
FOR EACH ROW
WHEN (NEW.is_active IS DISTINCT FROM OLD.is_active)
EXECUTE FUNCTION notify_member_change(); 