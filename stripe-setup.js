/**
 * Script para configurar produtos e preços no Stripe
 * 
 * Este script cria automaticamente os produtos e preços no Stripe
 * e atualiza os IDs no banco de dados Supabase.
 * 
 * Uso:
 * node stripe-setup.js
 */

require('dotenv').config();
const { Stripe } = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Configuração do Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Definição dos planos
const plans = [
  {
    name: 'Free',
    tier: 'free',
    description: 'Plano gratuito com recursos básicos',
    prices: []
  },
  {
    name: 'Pro',
    tier: 'pro',
    description: 'Acesso a recursos avançados',
    prices: [
      {
        name: 'Pro Mensal',
        period: 'monthly',
        unit_amount: 2990,
        currency: 'brl',
        interval: 'month'
      },
      {
        name: 'Pro Anual',
        period: 'annual',
        unit_amount: 29900,
        currency: 'brl',
        interval: 'year'
      }
    ]
  },
  {
    name: 'Pro+',
    tier: 'pro_plus',
    description: 'Acesso ilimitado a todos os recursos',
    prices: [
      {
        name: 'Pro+ Mensal',
        period: 'monthly',
        unit_amount: 4990,
        currency: 'brl',
        interval: 'month'
      },
      {
        name: 'Pro+ Anual',
        period: 'annual',
        unit_amount: 49900,
        currency: 'brl',
        interval: 'year'
      }
    ]
  }
];

/**
 * Função principal para configurar produtos e preços no Stripe
 */
async function setupStripe() {
  try {
    console.log('Iniciando configuração do Stripe...');
    
    // Para cada plano, criar produto e preços no Stripe
    for (const plan of plans) {
      console.log(`\nConfigurando plano: ${plan.name}`);
      
      // Criar produto
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          tier: plan.tier
        }
      });
      
      console.log(`Produto criado: ${product.id}`);
      
      // Criar preços para o produto
      for (const priceConfig of plan.prices) {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceConfig.unit_amount,
          currency: priceConfig.currency,
          recurring: {
            interval: priceConfig.interval
          },
          metadata: {
            tier: plan.tier,
            period: priceConfig.period
          }
        });
        
        console.log(`Preço criado: ${price.id} (${priceConfig.name})`);
        
        // Atualizar o ID do preço no banco de dados
        const { data, error } = await supabase
          .from('subscription_plans')
          .update({ stripe_price_id: price.id })
          .eq('name', priceConfig.name)
          .select();
        
        if (error) {
          console.error(`Erro ao atualizar o plano ${priceConfig.name}:`, error);
        } else {
          console.log(`Plano ${priceConfig.name} atualizado no banco de dados`);
        }
      }
    }
    
    console.log('\nConfiguração do Stripe concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a configuração do Stripe:', error);
  }
}

// Executar a função principal
setupStripe(); 