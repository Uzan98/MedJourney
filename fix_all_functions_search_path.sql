-- Script para corrigir o problema de search_path mutável em todas as funções
-- Este script adiciona 'SET search_path TO pg_temp, public;' em todas as funções do esquema public

-- Função para gerar o script de correção automaticamente
CREATE OR REPLACE FUNCTION generate_search_path_fixes()
RETURNS TEXT AS $$
DECLARE
    func_record RECORD;
    func_definition TEXT;
    new_definition TEXT;
    result_script TEXT := '';
BEGIN
    -- Buscar todas as funções do esquema public
    FOR func_record IN 
        SELECT 
            routine_name,
            routine_schema
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
        ORDER BY routine_name
    LOOP
        -- Obter a definição atual da função
        SELECT pg_get_functiondef(p.oid) INTO func_definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = func_record.routine_schema
        AND p.proname = func_record.routine_name;
        
        -- Verificar se a função já tem SET search_path
        IF func_definition IS NOT NULL AND func_definition NOT LIKE '%SET search_path%' THEN
            -- Substituir o início do corpo da função para adicionar SET search_path
            new_definition := regexp_replace(
                func_definition,
                '(\$\$[\s\n]*)(BEGIN|DECLARE)',
                E'\\1SET search_path TO pg_temp, public;\\n\\2',
                'gi'
            );
            
            -- Se não encontrou BEGIN ou DECLARE, tentar adicionar após $$
            IF new_definition = func_definition THEN
                new_definition := regexp_replace(
                    func_definition,
                    '(\$\$[\s\n]*)',
                    E'\\1SET search_path TO pg_temp, public;\\n',
                    'g'
                );
            END IF;
            
            -- Adicionar ao script resultado
            result_script := result_script || E'\n-- Corrigindo função: ' || func_record.routine_name || E'\n';
            result_script := result_script || new_definition || E';\n\n';
        END IF;
    END LOOP;
    
    RETURN result_script;
END;
$$ LANGUAGE plpgsql;

-- Executar a função para gerar o script
-- SELECT generate_search_path_fixes();

-- Alternativamente, aqui estão as correções manuais para as principais funções:

-- 1. handle_new_user
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

-- 2. update_deck_timestamp
CREATE OR REPLACE FUNCTION public.update_deck_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. update_member_activity
CREATE OR REPLACE FUNCTION public.update_member_activity()
RETURNS TRIGGER AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    UPDATE group_members 
    SET last_activity = NOW()
    WHERE user_id = NEW.user_id AND group_id = NEW.group_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. cleanup_old_chat_messages
CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS void AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    DELETE FROM chat_messages 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. get_user_info
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

-- 6. get_post_likes_count
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

-- 7. register_correct_answers_in_challenges
CREATE OR REPLACE FUNCTION public.register_correct_answers_in_challenges(p_user_id UUID, p_correct_answers INTEGER)
RETURNS void AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    UPDATE user_challenges
    SET current_progress = current_progress + p_correct_answers,
        updated_at = NOW()
    WHERE user_id = p_user_id
    AND challenge_type = 'correct_answers'
    AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. process_exam_completion
CREATE OR REPLACE FUNCTION public.process_exam_completion(p_user_id UUID, p_exam_id UUID, p_score DECIMAL)
RETURNS void AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    -- Atualizar estatísticas do usuário
    UPDATE user_stats
    SET exams_completed = exams_completed + 1,
        total_score = total_score + p_score,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Registrar XP baseado na pontuação
    PERFORM add_user_xp(p_user_id, (p_score * 10)::INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. get_study_metrics
CREATE OR REPLACE FUNCTION public.get_study_metrics(p_user_id UUID)
RETURNS TABLE(
    total_sessions INTEGER,
    total_time_minutes INTEGER,
    avg_session_time DECIMAL
) AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_sessions,
        SUM(EXTRACT(EPOCH FROM (ended_at - started_at))/60)::INTEGER as total_time_minutes,
        AVG(EXTRACT(EPOCH FROM (ended_at - started_at))/60)::DECIMAL as avg_session_time
    FROM study_sessions
    WHERE user_id = p_user_id
    AND ended_at IS NOT NULL;
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

-- Lista completa das 120 funções que precisam ser corrigidas:
-- add_exam_to_group, add_user_xp, assign_daily_challenges, assign_weekly_challenges,
-- authorize_presence_channel, award_challenge_winners_xp, ban_faculty_user, check_deck_limit,
-- check_faculty_ban_before_insert, check_faculty_membership, check_inactive_members,
-- check_level_badges, check_questions_per_day_limit, check_simulados_limit,
-- check_study_sessions_per_day_limit, check_tables_exist, clean_offline_group_members,
-- cleanup_old_chat_messages, create_faculty_comment, create_faculty_forum_reply,
-- create_faculty_forum_tag, create_faculty_forum_topic, create_faculty_material,
-- create_faculty_post, create_faculty_with_admin, create_learning_environment_with_admin,
-- create_profile_for_new_user, create_sample_disciplines, create_subscription_usage_on_user_insert,
-- decrement_faculty_member_count, decrement_post_likes_count, enforce_user_id_on_insert,
-- exec_sql, exec_sql_select, find_group_by_code, force_member_status_change,
-- generate_access_code, generate_invite_code, generate_sessions_from_schedule,
-- get_current_session_data, get_event_attendees_count, get_faculty_comments,
-- get_faculty_disciplines, get_faculty_forum_replies, get_faculty_forum_tags,
-- get_faculty_forum_topics, get_faculty_materials, get_faculty_posts,
-- get_global_xp_ranking, get_post_likes_count, get_questions_stats, get_study_metrics,
-- get_study_streak, get_user_details, get_user_email, get_user_info, handle_new_user,
-- has_liked_faculty_post, increment_faculty_member_count, increment_forum_topic_view_count,
-- increment_material_download_count_by_id, increment_post_comments_count,
-- increment_post_likes_count, increment_question_answers_count, init_user_streak,
-- initialize_user_gamification, is_attending_event, is_environment_admin,
-- is_environment_member, is_faculty_admin, is_faculty_member, is_faculty_owner,
-- is_group_admin, is_group_member, is_user_banned_from_faculty,
-- join_learning_environment_by_code, link_study_session_to_plan,
-- mark_forum_reply_as_solution, notify_group_member_change, notify_member_change,
-- process_exam_completion, process_question_creation, process_simulado_completion,
-- process_study_session_completion, process_study_streak_update, process_xp_gain,
-- record_daily_login, register_correct_answers_in_challenges,
-- register_study_time_in_challenges, reset_usage_counters, set_invite_code,
-- share_faculty_exam, sync_user_emails, toggle_faculty_post_like, unban_faculty_user,
-- update_active_users_count, update_banco_questoes_count, update_challenge_progress,
-- update_deck_timestamp, update_exam_challenges, update_faculty_event_attendees_updated_at,
-- update_faculty_events_updated_at, update_faculty_member_count, update_member_activity,
-- update_modified_column, update_post_comments_count, update_profiles_updated_at_column,
-- update_question_answers_count, update_session_challenges, update_streak_challenges,
-- update_study_streak, update_study_streak_on_completion, update_timestamp,
-- update_updated_at_column, vote_faculty_forum_item

-- INSTRUÇÕES DE USO:
-- 1. Execute primeiro a função generate_search_path_fixes() no Supabase para gerar o script completo
-- 2. Copie o resultado e salve em um arquivo .sql
-- 3. Revise o script gerado antes de executar
-- 4. Execute as correções em lotes pequenos (10-20 funções por vez)
-- 5. Teste cada lote após a execução
-- 6. As 10 funções principais já estão corrigidas manualmente acima

-- Para executar a geração automática:
-- SELECT generate_search_path_fixes();

-- IMPORTANTE: Sempre faça backup antes de executar correções em massa!