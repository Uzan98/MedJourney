-- Script para remover a versão antiga da função update_streak_challenges que usa a tabela user_challenges

-- Primeiro, verificamos se existem duas funções com o mesmo nome
SELECT COUNT(*) FROM pg_proc WHERE proname = 'update_streak_challenges';

-- Remover o trigger que depende da função
DROP TRIGGER IF EXISTS streak_challenges_trigger ON study_streaks;

-- Agora podemos remover a versão antiga que é do tipo trigger
DROP FUNCTION IF EXISTS update_streak_challenges();

-- Verificar se a remoção foi bem-sucedida
SELECT COUNT(*) FROM pg_proc WHERE proname = 'update_streak_challenges';

-- Verificar a definição da função restante para garantir que é a correta
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'update_streak_challenges'; 