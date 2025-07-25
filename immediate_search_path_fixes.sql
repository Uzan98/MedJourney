-- Script de correção imediata para as funções mais críticas
-- Execute este script primeiro para corrigir as funções de maior risco

-- BATCH 1: Funções de autenticação e segurança (CRÍTICAS)

-- 1. handle_new_user - Função crítica de criação de usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. create_profile_for_new_user
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    INSERT INTO public.profiles (id, username, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. get_user_info - Função de busca de usuário
CREATE OR REPLACE FUNCTION public.get_user_info(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    RETURN QUERY
    SELECT p.id, p.username, p.full_name, p.avatar_url
    FROM profiles p
    WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. get_user_email
CREATE OR REPLACE FUNCTION public.get_user_email(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_email TEXT;
BEGIN
    SET search_path TO pg_temp, public;
    
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = user_id;
    
    RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BATCH 2: Funções de administração (ALTA PRIORIDADE)

-- 5. exec_sql - Função administrativa crítica
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. exec_sql_select
CREATE OR REPLACE FUNCTION public.exec_sql_select(sql_query TEXT)
RETURNS TABLE(result JSONB) AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    RETURN QUERY EXECUTE 'SELECT to_jsonb(t) FROM (' || sql_query || ') t';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. is_environment_admin
CREATE OR REPLACE FUNCTION public.is_environment_admin(user_id UUID, env_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN := FALSE;
BEGIN
    SET search_path TO pg_temp, public;
    
    SELECT EXISTS(
        SELECT 1 FROM learning_environment_members
        WHERE user_id = $1 AND environment_id = $2 AND role = 'admin'
    ) INTO is_admin;
    
    RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. is_faculty_admin
CREATE OR REPLACE FUNCTION public.is_faculty_admin(user_id UUID, faculty_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin BOOLEAN := FALSE;
BEGIN
    SET search_path TO pg_temp, public;
    
    SELECT EXISTS(
        SELECT 1 FROM faculty_members
        WHERE user_id = $1 AND faculty_id = $2 AND role IN ('admin', 'owner')
    ) INTO is_admin;
    
    RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BATCH 3: Funções de triggers e atualizações (MÉDIA PRIORIDADE)

-- 9. update_deck_timestamp
CREATE OR REPLACE FUNCTION public.update_deck_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. update_profiles_updated_at_column
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. update_timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BATCH 4: Funções de gamificação e XP (MÉDIA PRIORIDADE)

-- 13. add_user_xp
CREATE OR REPLACE FUNCTION public.add_user_xp(user_id UUID, xp_amount INTEGER)
RETURNS VOID AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    UPDATE user_stats
    SET total_xp = total_xp + xp_amount,
        updated_at = NOW()
    WHERE user_id = $1;
    
    -- Verificar se precisa criar registro
    IF NOT FOUND THEN
        INSERT INTO user_stats (user_id, total_xp)
        VALUES ($1, xp_amount);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. process_xp_gain
CREATE OR REPLACE FUNCTION public.process_xp_gain(user_id UUID, xp_amount INTEGER, source TEXT)
RETURNS VOID AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    -- Adicionar XP
    PERFORM add_user_xp(user_id, xp_amount);
    
    -- Registrar histórico
    INSERT INTO xp_history (user_id, xp_amount, source, created_at)
    VALUES (user_id, xp_amount, source, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. check_level_badges
CREATE OR REPLACE FUNCTION public.check_level_badges(user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_xp INTEGER;
    current_level INTEGER;
BEGIN
    SET search_path TO pg_temp, public;
    
    SELECT total_xp INTO user_xp
    FROM user_stats
    WHERE user_id = $1;
    
    -- Calcular nível baseado no XP
    current_level := FLOOR(user_xp / 1000) + 1;
    
    -- Atualizar nível do usuário
    UPDATE user_stats
    SET level = current_level
    WHERE user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BATCH 5: Funções de contadores e estatísticas

-- 16. increment_post_likes_count
CREATE OR REPLACE FUNCTION public.increment_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    UPDATE faculty_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. decrement_post_likes_count
CREATE OR REPLACE FUNCTION public.decrement_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    UPDATE faculty_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. get_post_likes_count
CREATE OR REPLACE FUNCTION public.get_post_likes_count(post_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    likes_count INTEGER;
BEGIN
    SET search_path TO pg_temp, public;
    
    SELECT COUNT(*) INTO likes_count
    FROM faculty_post_likes
    WHERE post_id = post_uuid;
    
    RETURN COALESCE(likes_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. increment_faculty_member_count
CREATE OR REPLACE FUNCTION public.increment_faculty_member_count()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    UPDATE faculties
    SET member_count = member_count + 1
    WHERE id = NEW.faculty_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. decrement_faculty_member_count
CREATE OR REPLACE FUNCTION public.decrement_faculty_member_count()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    UPDATE faculties
    SET member_count = member_count - 1
    WHERE id = OLD.faculty_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INSTRUÇÕES:
-- 1. Execute este script em lotes (5 funções por vez)
-- 2. Teste cada lote antes de continuar
-- 3. Monitore logs de erro
-- 4. Este script cobre as 20 funções mais críticas
-- 5. Use os outros scripts para as demais 100 funções

-- Para verificar se as correções foram aplicadas:
-- SELECT routine_name, 
--        (routine_definition LIKE '%SET search_path%') as has_search_path
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN (
--     'handle_new_user', 'create_profile_for_new_user', 'get_user_info',
--     'get_user_email', 'exec_sql', 'exec_sql_select', 'is_environment_admin',
--     'is_faculty_admin', 'update_deck_timestamp', 'update_profiles_updated_at_column'
-- );

-- IMPORTANTE: Execute em ambiente de desenvolvimento primeiro!