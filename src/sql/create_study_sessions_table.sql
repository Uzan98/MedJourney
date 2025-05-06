-- IMPORTANTE: Execute este script no console SQL do Supabase para criar a tabela de sessões de estudo
-- Acesse: https://app.supabase.com/project/seu-projeto/sql
-- Cole este script e clique em "Run"

-- Criar tabela para registrar sessões de estudo detalhadas
CREATE TABLE IF NOT EXISTS study_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline_id INTEGER, -- ID da disciplina associada
  subject_id INTEGER, -- ID do assunto associado (opcional)
  title VARCHAR(255) NOT NULL,
  scheduled_date TIMESTAMPTZ, -- Data e hora agendada (pode ser nulo para sessões não agendadas)
  duration_minutes INTEGER NOT NULL DEFAULT 0, -- Duração planejada em minutos
  actual_duration_minutes INTEGER, -- Duração real (após conclusão)
  notes TEXT, -- Notas sobre a sessão
  completed BOOLEAN NOT NULL DEFAULT false, -- Indica se a sessão foi concluída
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- 'pendente', 'agendada', 'em-andamento', 'concluida', 'cancelada'
  type VARCHAR(20), -- 'new-content', 'revision', 'practice', 'exam-prep'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionar políticas RLS (Row Level Security) para controle de acesso
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias sessões
CREATE POLICY "Users can view their own study sessions"
  ON study_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para permitir que usuários insiram suas próprias sessões
CREATE POLICY "Users can insert their own study sessions"
  ON study_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários atualizem suas próprias sessões
CREATE POLICY "Users can update their own study sessions"
  ON study_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política para permitir que usuários excluam suas próprias sessões
CREATE POLICY "Users can delete their own study sessions"
  ON study_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para melhorar o desempenho de consultas
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_discipline_id ON study_sessions(discipline_id);
CREATE INDEX idx_study_sessions_scheduled_date ON study_sessions(scheduled_date);
CREATE INDEX idx_study_sessions_status ON study_sessions(status);
CREATE INDEX idx_study_sessions_completed ON study_sessions(completed);

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_sessions_updated_at
BEFORE UPDATE ON study_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 