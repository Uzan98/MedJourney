-- Script para corrigir o acesso aos simulados compartilhados em grupos
-- Este script adiciona políticas RLS para permitir que membros de um grupo acessem
-- simulados compartilhados, mesmo que não sejam os donos do simulado

-- Atualizar política para visualização de simulados
DROP POLICY IF EXISTS "Exams are viewable by owner or if public or if in group" ON public.exams;
CREATE POLICY "Exams are viewable by owner or if public or if in group"
  ON public.exams FOR SELECT
  USING (
    auth.uid() = user_id 
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM public.group_exams ge
      JOIN public.study_group_members sgm ON ge.group_id = sgm.group_id
      WHERE ge.exam_id = exams.id
      AND sgm.user_id = auth.uid()
    )
  );

-- Atualizar política para visualização de questões de simulados
DROP POLICY IF EXISTS "Exam questions are viewable by exam owner or if exam is public or if in group" ON public.exam_questions;
CREATE POLICY "Exam questions are viewable by exam owner or if exam is public or if in group"
  ON public.exam_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exams
      WHERE exams.id = exam_questions.exam_id
      AND (
        exams.user_id = auth.uid() 
        OR exams.is_public = true
        OR EXISTS (
          SELECT 1 FROM public.group_exams ge
          JOIN public.study_group_members sgm ON ge.group_id = sgm.group_id
          WHERE ge.exam_id = exams.id
          AND sgm.user_id = auth.uid()
        )
      )
    )
  );

-- Permitir que usuários iniciem tentativas em simulados compartilhados em seus grupos
DROP POLICY IF EXISTS "Exam attempts are insertable for group exams" ON public.exam_attempts;
CREATE POLICY "Exam attempts are insertable for group exams"
  ON public.exam_attempts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.exams
        WHERE exams.id = exam_attempts.exam_id
        AND (
          exams.user_id = auth.uid() 
          OR exams.is_public = true
          OR EXISTS (
            SELECT 1 FROM public.group_exams ge
            JOIN public.study_group_members sgm ON ge.group_id = sgm.group_id
            WHERE ge.exam_id = exams.id
            AND sgm.user_id = auth.uid()
          )
        )
      )
    )
  );

-- Permitir que usuários vejam detalhes de questões em simulados compartilhados
DROP POLICY IF EXISTS "Questions are viewable if in shared exam" ON public.questions;
CREATE POLICY "Questions are viewable if in shared exam"
  ON public.questions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.exam_questions eq
      JOIN public.exams e ON eq.exam_id = e.id
      LEFT JOIN public.group_exams ge ON e.id = ge.exam_id
      LEFT JOIN public.study_group_members sgm ON ge.group_id = sgm.group_id
      WHERE eq.question_id = questions.id
      AND (
        e.is_public = true
        OR (ge.exam_id IS NOT NULL AND sgm.user_id = auth.uid())
      )
    )
  );

-- Permitir que usuários vejam opções de resposta em simulados compartilhados
DROP POLICY IF EXISTS "Answer options are viewable if in shared exam" ON public.answer_options;
CREATE POLICY "Answer options are viewable if in shared exam"
  ON public.answer_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.exam_questions eq ON q.id = eq.question_id
      JOIN public.exams e ON eq.exam_id = e.id
      LEFT JOIN public.group_exams ge ON e.id = ge.exam_id
      LEFT JOIN public.study_group_members sgm ON ge.group_id = sgm.group_id
      WHERE answer_options.question_id = q.id
      AND (
        q.user_id = auth.uid()
        OR e.is_public = true
        OR (ge.exam_id IS NOT NULL AND sgm.user_id = auth.uid())
      )
    )
  ); 