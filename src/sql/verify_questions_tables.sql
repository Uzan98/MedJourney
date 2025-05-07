-- Script para verificar e configurar as tabelas do Banco de Questões
-- Execute este script no Console SQL do Supabase para verificar e criar/modificar as tabelas necessárias

-- Função para verificar se tabelas existem
CREATE OR REPLACE FUNCTION check_tables_exist() 
RETURNS TABLE(table_name text, exists_in_schema boolean) AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::text, true
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_name IN ('questions', 'answer_options', 'disciplines', 'subjects');
END;
$$ LANGUAGE plpgsql;

-- Verificar tabelas existentes
SELECT * FROM check_tables_exist();

-- PARTE 1: Verificar e criar tabelas de disciplinas e assuntos se não existirem

-- Verificar e criar tabela disciplines se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'disciplines') THEN
        CREATE TABLE public.disciplines (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            theme TEXT,
            is_system BOOLEAN DEFAULT false,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
        
        -- Políticas RLS para disciplinas
        ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Disciplines are viewable by owner"
            ON public.disciplines FOR SELECT
            USING (auth.uid() = user_id);
            
        CREATE POLICY "Disciplines are insertable by owner"
            ON public.disciplines FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Disciplines are updatable by owner"
            ON public.disciplines FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Disciplines are deletable by owner"
            ON public.disciplines FOR DELETE
            USING (auth.uid() = user_id);
            
        RAISE NOTICE 'Tabela disciplines criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela disciplines já existe';
    END IF;
END
$$;

-- Verificar e criar tabela subjects se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subjects') THEN
        CREATE TABLE public.subjects (
            id BIGSERIAL PRIMARY KEY,
            discipline_id BIGINT REFERENCES public.disciplines(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            name TEXT, -- Para compatibilidade
            content TEXT,
            description TEXT, -- Para compatibilidade
            status TEXT DEFAULT 'pending',
            difficulty TEXT DEFAULT 'média',
            importance TEXT DEFAULT 'média',
            estimated_hours NUMERIC,
            due_date TIMESTAMPTZ,
            completed BOOLEAN DEFAULT false,
            progress_percent INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
        
        -- Políticas RLS para assuntos
        ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Subjects are viewable by owner"
            ON public.subjects FOR SELECT
            USING (auth.uid() = user_id);
            
        CREATE POLICY "Subjects are insertable by owner"
            ON public.subjects FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Subjects are updatable by owner"
            ON public.subjects FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Subjects are deletable by owner"
            ON public.subjects FOR DELETE
            USING (auth.uid() = user_id);
            
        RAISE NOTICE 'Tabela subjects criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela subjects já existe';
    END IF;
END
$$;

-- PARTE 2: Verificar e criar tabelas do banco de questões

-- Verificar e criar tabela questions se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questions') THEN
        CREATE TABLE public.questions (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            discipline_id BIGINT REFERENCES public.disciplines(id) ON DELETE SET NULL,
            subject_id BIGINT REFERENCES public.subjects(id) ON DELETE SET NULL,
            content TEXT NOT NULL,
            explanation TEXT,
            difficulty TEXT CHECK (difficulty IN ('baixa', 'média', 'alta')) NOT NULL DEFAULT 'média',
            question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'essay')) NOT NULL,
            correct_answer TEXT,
            tags TEXT[] DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
        
        -- Índices para melhorar o desempenho
        CREATE INDEX idx_questions_user_id ON public.questions(user_id);
        CREATE INDEX idx_questions_discipline_id ON public.questions(discipline_id);
        CREATE INDEX idx_questions_subject_id ON public.questions(subject_id);
        CREATE INDEX idx_questions_question_type ON public.questions(question_type);
        CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);
        
        -- Política RLS para questões (somente o proprietário pode manipular)
        ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Questions are viewable by owner"
            ON public.questions FOR SELECT
            USING (auth.uid() = user_id);
            
        CREATE POLICY "Questions are insertable by owner"
            ON public.questions FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Questions are updatable by owner"
            ON public.questions FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Questions are deletable by owner"
            ON public.questions FOR DELETE
            USING (auth.uid() = user_id);
            
        RAISE NOTICE 'Tabela questions criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela questions já existe';
        
        -- Verifica se é necessário adicionar a coluna tags se a tabela já existir
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'questions' 
            AND column_name = 'tags'
        ) THEN
            ALTER TABLE public.questions ADD COLUMN tags TEXT[] DEFAULT '{}';
            RAISE NOTICE 'Coluna tags adicionada à tabela questions';
        END IF;
    END IF;
END
$$;

-- Verificar e criar tabela answer_options se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'answer_options') THEN
        CREATE TABLE public.answer_options (
            id BIGSERIAL PRIMARY KEY,
            question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
            text TEXT NOT NULL,
            is_correct BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
        
        -- Índice para melhorar o desempenho
        CREATE INDEX idx_answer_options_question_id ON public.answer_options(question_id);
        
        -- Política RLS para opções de resposta
        ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Answer options are viewable by question owner"
            ON public.answer_options FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM public.questions
                WHERE questions.id = answer_options.question_id
                AND questions.user_id = auth.uid()
            ));
            
        CREATE POLICY "Answer options are insertable by question owner"
            ON public.answer_options FOR INSERT
            WITH CHECK (EXISTS (
                SELECT 1 FROM public.questions
                WHERE questions.id = answer_options.question_id
                AND questions.user_id = auth.uid()
            ));
            
        CREATE POLICY "Answer options are updatable by question owner"
            ON public.answer_options FOR UPDATE
            USING (EXISTS (
                SELECT 1 FROM public.questions
                WHERE questions.id = answer_options.question_id
                AND questions.user_id = auth.uid()
            ))
            WITH CHECK (EXISTS (
                SELECT 1 FROM public.questions
                WHERE questions.id = answer_options.question_id
                AND questions.user_id = auth.uid()
            ));
            
        CREATE POLICY "Answer options are deletable by question owner"
            ON public.answer_options FOR DELETE
            USING (EXISTS (
                SELECT 1 FROM public.questions
                WHERE questions.id = answer_options.question_id
                AND questions.user_id = auth.uid()
            ));
            
        RAISE NOTICE 'Tabela answer_options criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela answer_options já existe';
    END IF;
END
$$;

-- PARTE 3: Criar triggers para atualização automática do updated_at

-- Função para atualizar automaticamente o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers para todas as tabelas
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['questions', 'answer_options', 'disciplines', 'subjects'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at
                        BEFORE UPDATE ON public.%s
                        FOR EACH ROW
                        EXECUTE FUNCTION update_updated_at_column()', t, t);
        RAISE NOTICE 'Trigger de atualização criado para a tabela %', t;
    END LOOP;
END
$$;

-- PARTE 4: Inserir dados de exemplo para disciplinas de medicina (se não existirem)

-- Função para criar disciplinas de exemplo
CREATE OR REPLACE FUNCTION create_sample_disciplines(p_user_id UUID)
RETURNS void AS $$
DECLARE
    discipline_id BIGINT;
BEGIN
    -- Verificar se já existem disciplinas para o usuário
    IF EXISTS (SELECT 1 FROM public.disciplines WHERE user_id = p_user_id LIMIT 1) THEN
        RAISE NOTICE 'Usuário já possui disciplinas, pulando criação de disciplinas de exemplo';
        RETURN;
    END IF;
    
    -- Inserir disciplinas de exemplo
    INSERT INTO public.disciplines (name, description, user_id, is_system)
    VALUES 
    ('Cardiologia', 'Estudo das doenças do coração e sistema cardiovascular', p_user_id, true),
    ('Neurologia', 'Estudo do sistema nervoso e suas doenças', p_user_id, true),
    ('Endocrinologia', 'Estudo do sistema endócrino e hormônios', p_user_id, true),
    ('Imunologia', 'Estudo do sistema imunológico', p_user_id, true),
    ('Anatomia', 'Estudo da estrutura do corpo humano', p_user_id, true)
    RETURNING id INTO discipline_id;
    
    RAISE NOTICE 'Disciplinas de exemplo criadas para o usuário %', p_user_id;
END;
$$ LANGUAGE plpgsql;

-- PARTE 5: Função para gerar estatísticas das tabelas do banco de questões

CREATE OR REPLACE FUNCTION get_questions_stats(p_user_id UUID)
RETURNS TABLE(
    total_questions BIGINT,
    questions_by_type JSON,
    questions_by_difficulty JSON,
    questions_by_discipline JSON,
    questions_by_date JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH 
    question_count AS (
        SELECT COUNT(*) AS count FROM public.questions 
        WHERE user_id = p_user_id
    ),
    type_stats AS (
        SELECT 
            question_type,
            COUNT(*) AS count
        FROM public.questions
        WHERE user_id = p_user_id
        GROUP BY question_type
    ),
    difficulty_stats AS (
        SELECT 
            difficulty,
            COUNT(*) AS count
        FROM public.questions
        WHERE user_id = p_user_id
        GROUP BY difficulty
    ),
    discipline_stats AS (
        SELECT 
            d.name AS discipline_name,
            COUNT(q.id) AS count
        FROM public.questions q
        LEFT JOIN public.disciplines d ON q.discipline_id = d.id
        WHERE q.user_id = p_user_id
        GROUP BY d.name
    ),
    date_stats AS (
        SELECT 
            DATE_TRUNC('day', created_at) AS date,
            COUNT(*) AS count
        FROM public.questions
        WHERE user_id = p_user_id
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 30
    )
    SELECT
        (SELECT count FROM question_count),
        (SELECT json_object_agg(question_type, count) FROM type_stats),
        (SELECT json_object_agg(difficulty, count) FROM difficulty_stats),
        (SELECT json_object_agg(discipline_name, count) FROM discipline_stats),
        (SELECT json_object_agg(date, count) FROM date_stats);
END;
$$ LANGUAGE plpgsql;

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE 'Verificação e configuração das tabelas do Banco de Questões concluídas!';
    RAISE NOTICE 'Para criar disciplinas de exemplo, execute: SELECT create_sample_disciplines(''seu-user-id-aqui'');';
    RAISE NOTICE 'Para ver estatísticas das questões, execute: SELECT * FROM get_questions_stats(''seu-user-id-aqui'');';
END
$$; 