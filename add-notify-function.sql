-- Criar função RPC para notificar alterações nos membros do grupo
CREATE OR REPLACE FUNCTION notify_group_member_change(group_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
  -- Atualizar um timestamp na tabela de membros para forçar notificação de alteração
  UPDATE study_group_members
  SET last_active_at = NOW()
  WHERE group_id = $1 AND user_id = $2;
  
  -- Emitir notificação via canal PostgreSQL
  PERFORM pg_notify(
    'group_member_change',
    json_build_object(
      'group_id', group_id,
      'user_id', user_id,
      'timestamp', NOW()
    )::text
  );
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 