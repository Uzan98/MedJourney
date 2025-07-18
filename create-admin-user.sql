-- Script para adicionar um usuário admin ao sistema

-- Listar todos os usuários para escolher qual será o admin
SELECT id, username, full_name, role
FROM profiles
ORDER BY created_at DESC;

-- Instruções para promover um usuário existente para admin
/*
  Para promover um usuário existente para admin, execute:
  
  UPDATE profiles 
  SET role = 'admin' 
  WHERE id = 'ID_DO_USUARIO_AQUI';
  
  Substitua 'ID_DO_USUARIO_AQUI' pelo ID do usuário que você deseja promover.
*/

-- Exemplo de comando para promover o primeiro usuário para admin
-- UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);

-- Verificar se o admin foi criado
SELECT id, username, full_name, role
FROM profiles
WHERE role = 'admin'; 