-- Criação das tabelas de flashcards

-- Tabela de decks de flashcards
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_color TEXT,
    cover_image TEXT,
    is_public BOOLEAN DEFAULT false,
    discipline_id BIGINT REFERENCES public.disciplines(id),
    subject_id BIGINT REFERENCES public.subjects(id),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT deck_name_length CHECK (char_length(name) > 0)
);

-- Tabela de flashcards
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    difficulty TEXT DEFAULT 'medium',
    last_reviewed TIMESTAMPTZ,
    next_review TIMESTAMPTZ,
    review_count INTEGER DEFAULT 0,
    mastery_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de sessões de estudo
CREATE TABLE IF NOT EXISTS public.flashcard_study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT now(),
    end_time TIMESTAMPTZ,
    cards_studied INTEGER DEFAULT 0,
    cards_mastered INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    algorithm TEXT DEFAULT 'spaced_repetition',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de revisões de flashcards
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.flashcard_study_sessions(id) ON DELETE SET NULL,
    result TEXT NOT NULL,
    response_time_ms INTEGER,
    previous_mastery INTEGER,
    new_mastery INTEGER,
    reviewed_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de configurações de estudo
CREATE TABLE IF NOT EXISTS public.flashcard_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    algorithm TEXT DEFAULT 'spaced_repetition',
    cards_per_session INTEGER DEFAULT 20,
    include_mastered BOOLEAN DEFAULT false,
    prioritize_due_cards BOOLEAN DEFAULT true,
    review_new_cards_same_day BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- View para estatísticas de decks
CREATE OR REPLACE VIEW public.flashcard_deck_stats AS
SELECT 
    d.id,
    d.user_id,
    d.name,
    d.description,
    d.cover_color,
    d.cover_image,
    d.is_public,
    d.discipline_id,
    d.subject_id,
    d.tags,
    d.created_at,
    d.updated_at,
    COALESCE(s.discipline_name, '') as discipline_name,
    COALESCE(s.subject_name, '') as subject_name,
    COALESCE(c.card_count, 0) as card_count,
    COALESCE(c.mastery_average, 0) as mastery_average,
    COALESCE(ss.study_count, 0) as study_count
FROM 
    public.flashcard_decks d
LEFT JOIN (
    SELECT 
        deck_id,
        COUNT(*) as card_count,
        ROUND(AVG(mastery_level)) as mastery_average
    FROM 
        public.flashcards
    GROUP BY 
        deck_id
) c ON d.id = c.deck_id
LEFT JOIN (
    SELECT 
        deck_id,
        COUNT(*) as study_count
    FROM 
        public.flashcard_study_sessions
    WHERE 
        end_time IS NOT NULL
    GROUP BY 
        deck_id
) ss ON d.id = ss.deck_id
LEFT JOIN (
    SELECT 
        d.id as discipline_id,
        d.name as discipline_name,
        s.id as subject_id,
        s.name as subject_name
    FROM 
        public.disciplines d
    LEFT JOIN 
        public.subjects s ON d.id = s.discipline_id
) s ON d.discipline_id = s.discipline_id AND (d.subject_id = s.subject_id OR d.subject_id IS NULL);

-- View para estatísticas de usuário
CREATE OR REPLACE VIEW public.flashcard_user_stats AS
SELECT 
    u.id as user_id,
    COALESCE(c.total_cards, 0) as total_cards,
    COALESCE(c.mastered_cards, 0) as mastered_cards,
    COALESCE(c.cards_to_review, 0) as cards_to_review,
    CASE 
        WHEN COALESCE(c.total_cards, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(c.mastered_cards, 0)::numeric / COALESCE(c.total_cards, 1)::numeric) * 100)
    END as mastery_percentage,
    COALESCE(s.total_study_sessions, 0) as total_study_sessions,
    COALESCE(s.total_study_time_minutes, 0) as total_study_time_minutes,
    COALESCE(streak.study_streak_days, 0) as study_streak_days
FROM 
    auth.users u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_cards,
        COUNT(*) FILTER (WHERE mastery_level >= 80) as mastered_cards,
        COUNT(*) FILTER (WHERE next_review <= now() OR next_review IS NULL) as cards_to_review
    FROM 
        public.flashcards
    GROUP BY 
        user_id
) c ON u.id = c.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_study_sessions,
        COALESCE(ROUND(SUM(duration_seconds) / 60), 0) as total_study_time_minutes
    FROM 
        public.flashcard_study_sessions
    WHERE 
        end_time IS NOT NULL
    GROUP BY 
        user_id
) s ON u.id = s.user_id
LEFT JOIN (
    -- Cálculo simplificado de streak - pode ser melhorado com função específica
    SELECT 
        user_id,
        COUNT(DISTINCT DATE(start_time)) as study_streak_days
    FROM 
        public.flashcard_study_sessions
    WHERE 
        start_time >= now() - INTERVAL '30 days'
    GROUP BY 
        user_id
) streak ON u.id = streak.user_id;

-- Adicionar políticas de segurança RLS
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para flashcard_decks
CREATE POLICY "Usuários podem ver seus próprios decks" 
    ON public.flashcard_decks FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver decks públicos" 
    ON public.flashcard_decks FOR SELECT 
    USING (is_public = true);

CREATE POLICY "Usuários podem criar seus próprios decks" 
    ON public.flashcard_decks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios decks" 
    ON public.flashcard_decks FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios decks" 
    ON public.flashcard_decks FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para flashcards
CREATE POLICY "Usuários podem ver seus próprios flashcards" 
    ON public.flashcards FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver flashcards em decks públicos" 
    ON public.flashcards FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM public.flashcard_decks d 
        WHERE d.id = deck_id AND d.is_public = true
    ));

CREATE POLICY "Usuários podem criar seus próprios flashcards" 
    ON public.flashcards FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios flashcards" 
    ON public.flashcards FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios flashcards" 
    ON public.flashcards FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para flashcard_study_sessions
CREATE POLICY "Usuários podem ver suas próprias sessões de estudo" 
    ON public.flashcard_study_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias sessões de estudo" 
    ON public.flashcard_study_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias sessões de estudo" 
    ON public.flashcard_study_sessions FOR UPDATE 
    USING (auth.uid() = user_id);

-- Políticas para flashcard_reviews
CREATE POLICY "Usuários podem ver suas próprias revisões" 
    ON public.flashcard_reviews FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias revisões" 
    ON public.flashcard_reviews FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Políticas para flashcard_settings
CREATE POLICY "Usuários podem ver suas próprias configurações" 
    ON public.flashcard_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias configurações" 
    ON public.flashcard_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações" 
    ON public.flashcard_settings FOR UPDATE 
    USING (auth.uid() = user_id);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_flashcard_decks_updated_at
BEFORE UPDATE ON public.flashcard_decks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flashcard_settings_updated_at
BEFORE UPDATE ON public.flashcard_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column(); 