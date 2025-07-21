-- Criar uma view que relaciona faculty_events com os usuários
CREATE OR REPLACE VIEW public.faculty_events_with_creator AS
SELECT 
  fe.*,
  u.email,
  p.username,
  p.full_name as name,
  p.avatar_url
FROM 
  public.faculty_events fe
JOIN 
  auth.users u ON fe.creator_id = u.id
LEFT JOIN
  public.profiles p ON u.id = p.id;

-- Conceder permissões para a view
GRANT SELECT ON public.faculty_events_with_creator TO authenticated;
GRANT SELECT ON public.faculty_events_with_creator TO anon; 