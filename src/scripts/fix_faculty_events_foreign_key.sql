-- Adicionar a chave estrangeira para creator_id que está faltando
ALTER TABLE public.faculty_events 
DROP CONSTRAINT IF EXISTS faculty_events_creator_id_fkey;

ALTER TABLE public.faculty_events
ADD CONSTRAINT faculty_events_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE; 