'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

export default function PricingSection() {
  const plans = [
    {
      name: 'Básico',
      price: 'Grátis',
      description: 'Para começar a organizar seus estudos.',
      features: [
        'Até 3 disciplinas',
        'Criação de plano de estudos manual',
        'Acesso limitado ao banco de questões',
        'Análise de desempenho básica',
      ],
      cta: 'Começar agora',
      isPopular: false,
    },
    {
      name: 'Pro',
      price: 'R$29,90',
      pricePeriod: '/mês',
      description: 'A ferramenta completa para sua aprovação.',
      features: [
        'Tudo do plano Básico, e mais:',
        'Disciplinas ilimitadas',
        'Planejamento de estudos com IA',
        'Acesso completo ao banco de questões',
        'Criação de simulados ilimitados',
        'Análise de desempenho avançada',
        'Salas de estudo em comunidade',
      ],
      cta: 'Assinar Pro',
      isPopular: true,
    },
    {
      name: 'Premium',
      price: 'R$49,90',
      pricePeriod: '/mês',
      description: 'Para quem busca o máximo de performance.',
      features: [
        'Tudo do plano Pro, e mais:',
        'Geração de questões com IA',
        'Suporte prioritário',
        'Análise de dados preditiva (em breve)',
        'Acesso a conteúdos exclusivos',
      ],
      cta: 'Assinar Premium',
      isPopular: false,
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Planos que cabem na sua jornada</h2>
          <p className="mt-4 text-lg text-gray-600">Escolha o plano ideal para acelerar sua aprovação.</p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <div key={index} className={`relative flex flex-col p-8 bg-white rounded-2xl shadow-lg ${plan.isPopular ? 'border-2 border-blue-500' : ''}`}>
              {plan.isPopular && (
                <div className="absolute top-0 -translate-y-1/2 px-3 py-1 text-sm text-white bg-blue-500 rounded-full shadow-md">
                  Mais Popular
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-gray-600">{plan.description}</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                {plan.pricePeriod && <span className="text-lg font-medium text-gray-500">{plan.pricePeriod}</span>}
              </div>
              <ul className="mt-6 space-y-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="flex-shrink-0 w-6 h-6 text-green-500" />
                    <span className="ml-3 text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/auth/signup" className={`btn w-full ${plan.isPopular ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-blue-600 bg-white border-2 border-blue-500 hover:bg-blue-50'}`}>
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 