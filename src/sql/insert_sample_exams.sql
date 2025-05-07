-- Script para inserir dados de amostra para simulados
-- Substitua 'YOUR_USER_ID' pelo ID do usuário autenticado

-- Inserir simulados
INSERT INTO public.exams (
  user_id,
  title,
  description,
  time_limit,
  is_public,
  shuffle_questions,
  show_answers
) VALUES
-- Simulado 1
(
  'YOUR_USER_ID'::uuid,
  'Simulado de Cardiologia',
  'Teste seus conhecimentos em cardiologia com questões de múltipla escolha.',
  60, -- 60 minutos
  true, -- público
  true, -- embaralhar questões
  true  -- mostrar respostas
),
-- Simulado 2
(
  'YOUR_USER_ID'::uuid,
  'Revisão de Neurologia',
  'Revisão completa dos principais temas de neurologia para provas de residência.',
  120, -- 2 horas
  false, -- privado
  true, -- embaralhar questões
  true  -- mostrar respostas
),
-- Simulado 3
(
  'YOUR_USER_ID'::uuid,
  'Simulado Geral - Medicina Interna',
  'Questões gerais de medicina interna abrangendo vários sistemas.',
  NULL, -- sem limite de tempo
  true, -- público
  true, -- embaralhar questões
  true  -- mostrar respostas
);

-- Para adicionar questões aos simulados, você precisará conhecer os IDs dos simulados criados
-- e os IDs das questões existentes no seu banco de dados.
-- Você pode executar o seguinte comando para obter os IDs dos simulados:

-- SELECT id, title FROM public.exams WHERE user_id = 'YOUR_USER_ID'::uuid;

-- E o seguinte comando para obter as questões disponíveis:

-- SELECT id, content FROM public.questions WHERE user_id = 'YOUR_USER_ID'::uuid LIMIT 20;

-- Com esses IDs, você pode adicionar questões aos simulados:

-- Exemplo: Adicionar questões ao Simulado 1 (substitua os IDs conforme necessário)
-- INSERT INTO public.exam_questions (exam_id, question_id, position) VALUES
-- (1, 10, 1),
-- (1, 15, 2),
-- (1, 20, 3),
-- (1, 25, 4);

-- Exemplo: Adicionar questões ao Simulado 2 (substitua os IDs conforme necessário)
-- INSERT INTO public.exam_questions (exam_id, question_id, position) VALUES
-- (2, 30, 1),
-- (2, 35, 2),
-- (2, 40, 3);

-- Exemplo: Adicionar questões ao Simulado 3 (substitua os IDs conforme necessário)
-- INSERT INTO public.exam_questions (exam_id, question_id, position) VALUES
-- (3, 45, 1),
-- (3, 50, 2),
-- (3, 55, 3),
-- (3, 60, 4),
-- (3, 65, 5); 