-- Criar extensão uuid-ossp se ainda não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de conquistas
CREATE TABLE IF NOT EXISTS study_group_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  achievement_type TEXT NOT NULL, -- 'pomodoro_cycle_completed', 'pomodoro_cycles_milestone', 'study_time_milestone', etc.
  achievement_data JSONB DEFAULT '{}'::jsonb, -- dados adicionais específicos da conquista
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_study_group_members
    FOREIGN KEY (group_id, user_id)
    REFERENCES study_group_members(group_id, user_id)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_study_group_achievements_group_id ON study_group_achievements(group_id);
CREATE INDEX IF NOT EXISTS idx_study_group_achievements_created_at ON study_group_achievements(created_at);

-- Habilitar realtime para a tabela
ALTER TABLE study_group_achievements REPLICA IDENTITY FULL;

-- Política de segurança - apenas membros do grupo podem ver as conquistas
CREATE POLICY "Membros do grupo podem ver conquistas" ON study_group_achievements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE study_group_members.group_id = study_group_achievements.group_id
      AND study_group_members.user_id = auth.uid()
    )
  );

-- Política de segurança - apenas o próprio usuário pode criar suas conquistas
CREATE POLICY "Usuários podem criar suas próprias conquistas" ON study_group_achievements
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Habilitar RLS
ALTER TABLE study_group_achievements ENABLE ROW LEVEL SECURITY;

-- Permitir acesso público à tabela (RLS ainda se aplica)
GRANT SELECT, INSERT ON study_group_achievements TO public; 