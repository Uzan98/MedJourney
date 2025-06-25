-- Script para adicionar um usuário como administrador
-- Substitua 'SEU_EMAIL_AQUI' pelo email do usuário que você deseja tornar administrador

-- Primeiro, verificamos se a tabela admin_users existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users'
    ) THEN
        -- Criar a tabela admin_users se ela não existir
        CREATE TABLE public.admin_users (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Adicionar políticas de segurança RLS
        ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
        
        -- Política que permite apenas administradores visualizarem a tabela
        CREATE POLICY "Apenas administradores podem ver" ON public.admin_users
            FOR SELECT USING (
                auth.uid() IN (SELECT user_id FROM public.admin_users)
            );
            
        -- Política que permite apenas superadmins adicionarem novos admins
        CREATE POLICY "Apenas administradores podem inserir" ON public.admin_users
            FOR INSERT WITH CHECK (
                auth.uid() IN (SELECT user_id FROM public.admin_users)
            );
    END IF;
END
$$;

-- Adicionar um usuário específico como administrador
-- Substitua 'SEU_EMAIL_AQUI' pelo email do usuário que você deseja tornar administrador
INSERT INTO public.admin_users (user_id)
SELECT id FROM auth.users 
WHERE email = 'SEU_EMAIL_AQUI'
ON CONFLICT (user_id) DO NOTHING;

-- Para verificar os usuários administradores:
SELECT u.email, u.id, au.created_at
FROM auth.users u
JOIN public.admin_users au ON u.id = au.user_id; 