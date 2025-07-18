-- Script para atualizar os IDs dos preços do Stripe no banco de dados

-- Atualizar o ID do preço do plano Pro Mensal
UPDATE subscription_plans 
SET stripe_price_id = 'price_1RNmKkPDAWBZddLb0MrUHu6r' 
WHERE name = 'Pro Mensal';

-- Atualizar o ID do preço do plano Pro Anual (calculando 20% de desconto do valor mensal)
UPDATE subscription_plans 
SET stripe_price_id = 'price_1RNmKkPDAWBZddLb0MrUHu6r' 
WHERE name = 'Pro Anual';

-- Atualizar o ID do preço do plano Pro+ Mensal
UPDATE subscription_plans 
SET stripe_price_id = 'price_1Rlx2tPDAWBZddLbYu1N1Syl' 
WHERE name = 'Pro+ Mensal';

-- Atualizar o ID do preço do plano Pro+ Anual (calculando 20% de desconto do valor mensal)
UPDATE subscription_plans 
SET stripe_price_id = 'price_1Rlx2tPDAWBZddLbYu1N1Syl' 
WHERE name = 'Pro+ Anual';

-- Verificar se os IDs foram atualizados corretamente
SELECT name, tier, period, price_cents, stripe_price_id 
FROM subscription_plans 
ORDER BY tier, period; 