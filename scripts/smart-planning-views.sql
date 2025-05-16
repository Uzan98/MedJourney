-- View para mostrar detalhes básicos dos planos
CREATE OR REPLACE VIEW view_smart_plans_basic AS
SELECT 
  sp.id,
  sp.name,
  sp.user_id,
  sp.start_date,
  sp.end_date,
  sp.status,
  sp.settings,
  sp.created_at,
  sp.updated_at
FROM 
  smart_plans sp;

-- View de contagem de sessões por plano e disciplina
CREATE OR REPLACE VIEW view_smart_plan_discipline_stats AS
SELECT 
  sps.plan_id,
  sps.discipline_id,
  d.name AS discipline_name,
  COUNT(sps.id) AS session_count,
  SUM(sps.duration_minutes) AS total_minutes,
  COUNT(CASE WHEN sps.is_revision THEN 1 END) AS revision_count
FROM 
  smart_plan_sessions sps
JOIN
  disciplines d ON sps.discipline_id = d.id
GROUP BY 
  sps.plan_id, sps.discipline_id, d.name;

-- View para mostrar detalhes completos dos planos
CREATE OR REPLACE VIEW view_smart_plans AS
SELECT 
  p.id,
  p.name,
  p.user_id,
  p.start_date,
  p.end_date,
  p.status,
  p.settings,
  p.created_at,
  p.updated_at,
  COALESCE(SUM(stats.session_count), 0) AS total_sessions,
  COALESCE(SUM(stats.total_minutes), 0) AS total_minutes,
  COUNT(DISTINCT stats.discipline_id) AS discipline_count,
  COALESCE(SUM(stats.revision_count), 0) AS revision_count,
  COALESCE(
    (SELECT 
      jsonb_agg(
        jsonb_build_object(
          'id', stats.discipline_id,
          'name', stats.discipline_name,
          'session_count', stats.session_count,
          'minutes', stats.total_minutes
        )
      )
    FROM view_smart_plan_discipline_stats stats
    WHERE stats.plan_id = p.id),
    '[]'::jsonb
  ) AS disciplines
FROM 
  view_smart_plans_basic p
LEFT JOIN 
  view_smart_plan_discipline_stats stats ON p.id = stats.plan_id
GROUP BY 
  p.id, p.name, p.user_id, p.start_date, p.end_date, p.status, p.settings, p.created_at, p.updated_at;

-- View para mostrar sessões com detalhes das disciplinas
CREATE OR REPLACE VIEW view_smart_plan_sessions AS
SELECT 
  sps.id,
  sps.plan_id,
  sps.title,
  sps.date,
  sps.start_time,
  sps.end_time,
  sps.duration_minutes,
  sps.is_revision,
  sps.original_session_id,
  sps.discipline_id,
  sps.subject_id,
  d.name AS discipline_name,
  s.name AS subject_name,
  sps.created_at,
  sps.updated_at
FROM 
  smart_plan_sessions sps
LEFT JOIN 
  disciplines d ON sps.discipline_id = d.id
LEFT JOIN 
  subjects s ON sps.subject_id = s.id;

-- View temporária para agrupar sessões por dia
CREATE OR REPLACE VIEW view_smart_plan_sessions_by_day AS
SELECT 
  plan_id,
  date,
  COUNT(*) AS session_count,
  SUM(duration_minutes) AS total_minutes
FROM 
  view_smart_plan_sessions
GROUP BY 
  plan_id, date;

-- View para agrupar sessões por dia com detalhes das sessões
CREATE OR REPLACE VIEW view_smart_plan_daily_sessions AS
SELECT 
  s_day.plan_id,
  s_day.date,
  s_day.session_count,
  s_day.total_minutes,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'discipline_id', s.discipline_id,
        'discipline_name', s.discipline_name,
        'start_time', s.start_time,
        'end_time', s.end_time,
        'duration_minutes', s.duration_minutes,
        'is_revision', s.is_revision
      ) ORDER BY s.start_time
    )
    FROM view_smart_plan_sessions s
    WHERE s.plan_id = s_day.plan_id AND s.date = s_day.date
  ) AS sessions
FROM 
  view_smart_plan_sessions_by_day s_day
ORDER BY 
  s_day.date;

-- View com estatísticas de planos por usuário
CREATE OR REPLACE VIEW view_user_plan_stats AS
SELECT 
  sp.user_id,
  COUNT(DISTINCT sp.id) AS total_plans,
  COUNT(DISTINCT CASE WHEN sp.status = 'active' THEN sp.id END) AS active_plans,
  COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.id END) AS completed_plans,
  COALESCE(SUM(sps.duration_minutes), 0) AS total_planned_minutes
FROM 
  smart_plans sp
LEFT JOIN 
  smart_plan_sessions sps ON sp.id = sps.plan_id
GROUP BY 
  sp.user_id;

-- View intermediária com estatísticas de cada plano
CREATE OR REPLACE VIEW view_plan_session_stats AS
SELECT 
  p.id AS plan_id,
  p.name,
  p.user_id,
  p.start_date,
  p.end_date,
  p.status,
  COUNT(DISTINCT sps.id) AS session_count,
  COALESCE(SUM(sps.duration_minutes), 0) AS total_minutes
FROM 
  smart_plans p
LEFT JOIN 
  smart_plan_sessions sps ON p.id = sps.plan_id
GROUP BY 
  p.id, p.name, p.user_id, p.start_date, p.end_date, p.status;

-- View para resumo de planos por usuário
CREATE OR REPLACE VIEW view_user_smart_plan_summary AS
SELECT 
  stats.user_id,
  stats.total_plans,
  stats.active_plans,
  stats.completed_plans,
  stats.total_planned_minutes,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ps.plan_id,
        'name', ps.name,
        'start_date', ps.start_date,
        'end_date', ps.end_date,
        'status', ps.status,
        'session_count', ps.session_count,
        'total_minutes', ps.total_minutes
      )
    )
    FROM view_plan_session_stats ps
    WHERE ps.user_id = stats.user_id
  ) AS plans
FROM 
  view_user_plan_stats stats;

-- Funções de acesso às views com segurança baseada no usuário atual
CREATE OR REPLACE FUNCTION get_my_smart_plans()
RETURNS SETOF view_smart_plans
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM view_smart_plans WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_my_smart_plan(plan_id bigint)
RETURNS SETOF view_smart_plans
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM view_smart_plans 
  WHERE id = plan_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_smart_plan_sessions(plan_id bigint)
RETURNS SETOF view_smart_plan_sessions
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT s.* FROM view_smart_plan_sessions s
  JOIN smart_plans p ON s.plan_id = p.id
  WHERE s.plan_id = plan_id AND p.user_id = auth.uid()
  ORDER BY s.date, s.start_time;
$$;

CREATE OR REPLACE FUNCTION get_my_smart_plan_daily_sessions(plan_id bigint)
RETURNS SETOF view_smart_plan_daily_sessions
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT d.* FROM view_smart_plan_daily_sessions d
  JOIN smart_plans p ON d.plan_id = p.id
  WHERE d.plan_id = plan_id AND p.user_id = auth.uid()
  ORDER BY d.date;
$$;

-- Permissões para as funções
REVOKE ALL ON FUNCTION get_my_smart_plans() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_smart_plans() TO authenticated;

REVOKE ALL ON FUNCTION get_my_smart_plan(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_smart_plan(bigint) TO authenticated;

REVOKE ALL ON FUNCTION get_my_smart_plan_sessions(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_smart_plan_sessions(bigint) TO authenticated;

REVOKE ALL ON FUNCTION get_my_smart_plan_daily_sessions(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_smart_plan_daily_sessions(bigint) TO authenticated; 