-- Criação da tabela de faltas (absences)
CREATE TABLE IF NOT EXISTS public.absences (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    absence_date DATE NOT NULL,
    reason TEXT,
    is_justified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key para a tabela users
    CONSTRAINT fk_absences_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES public.users(user_id) 
        ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_absences_user_id ON public.absences(user_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON public.absences(absence_date);
CREATE INDEX IF NOT EXISTS idx_absences_subject ON public.absences(subject_name);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_absences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_absences_updated_at
    BEFORE UPDATE ON public.absences
    FOR EACH ROW
    EXECUTE FUNCTION update_absences_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.absences ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários só podem ver suas próprias faltas
CREATE POLICY "Users can view own absences" ON public.absences
    FOR SELECT USING (auth.uid()::text = user_id);

-- Política RLS: Apenas usuários PRO/PRO+ podem inserir faltas
CREATE POLICY "Only PRO users can insert absences" ON public.absences
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id AND
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_subscriptions us ON u.id = us.user_id
            WHERE u.user_id = auth.uid()::text
            AND us.tier IN ('pro', 'pro_plus')
            AND us.status = 'active'
        )
    );

-- Política RLS: Apenas usuários PRO/PRO+ podem atualizar suas faltas
CREATE POLICY "Only PRO users can update own absences" ON public.absences
    FOR UPDATE USING (
        auth.uid()::text = user_id AND
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_subscriptions us ON u.id = us.user_id
            WHERE u.user_id = auth.uid()::text
            AND us.tier IN ('pro', 'pro_plus')
            AND us.status = 'active'
        )
    );

-- Política RLS: Apenas usuários PRO/PRO+ podem deletar suas faltas
CREATE POLICY "Only PRO users can delete own absences" ON public.absences
    FOR DELETE USING (
        auth.uid()::text = user_id AND
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_subscriptions us ON u.id = us.user_id
            WHERE u.user_id = auth.uid()::text
            AND us.tier IN ('pro', 'pro_plus')
            AND us.status = 'active'
        )
    );

-- Comentários para documentação
COMMENT ON TABLE public.absences IS 'Tabela para controle de faltas dos usuários';
COMMENT ON COLUMN public.absences.user_id IS 'ID do usuário que registrou a falta';
COMMENT ON COLUMN public.absences.subject_name IS 'Nome da matéria/disciplina';
COMMENT ON COLUMN public.absences.absence_date IS 'Data da falta';
COMMENT ON COLUMN public.absences.reason IS 'Motivo da falta (opcional)';
COMMENT ON COLUMN public.absences.is_justified IS 'Indica se a falta é justificada';

-- Verificar se a coluna subscription_type existe na tabela users
-- Se não existir, você precisará adicioná-la primeiro:
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) DEFAULT 'free';

-- Exemplo de como popular alguns dados de teste (opcional):
-- INSERT INTO public.absences (user_id, subject_name, absence_date, reason, is_justified)
-- VALUES 
--     ('user123', 'Anatomia', '2024-01-15', 'Consulta médica', true),
--     ('user123', 'Fisiologia', '2024-01-16', null, false);