"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Brain, CreditCard, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SmartPlanForm from '@/components/planning/SmartPlanForm';
import SmartPlanningService, { SmartPlanFormData } from '@/services/smart-planning.service';
import { toast } from 'react-hot-toast';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionTier } from '@/types/subscription';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function CreateSmartPlanPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { checkFeatureAccess } = useSubscription();
  const hasAiPlanningAccess = checkFeatureAccess('ai_planning');
  
  // Redirecionar para a página de assinaturas se o usuário não tiver acesso
  useEffect(() => {
    if (!hasAiPlanningAccess) {
      toast.error('Acesso restrito. Este recurso requer um plano Pro ou superior.');
      router.push('/perfil/assinatura');
    }
  }, [hasAiPlanningAccess, router]);

  // Efeito para garantir que o estado isSubmitting seja resetado após um tempo
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isSubmitting) {
      // Definir um tempo máximo para o estado isSubmitting
      timeoutId = setTimeout(() => {
        setIsSubmitting(false);
      }, 15000); // 15 segundos é um tempo razoável para a maioria das operações
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSubmitting]);

  const handleCancel = () => {
    router.push('/planejamento/inteligente');
  };

  const handleSubmit = async (data: SmartPlanFormData) => {
    try {
      setIsSubmitting(true);
      const smartPlanningService = new SmartPlanningService();
      const plan = await smartPlanningService.createSmartPlan(data);
      
      if (plan) {
        toast.success('Plano inteligente criado com sucesso!');
        // Redirecionar para a página de visualização do plano
        router.push(`/planejamento/visualizar-plano/${plan.id}`);
      } else {
        // Em caso de falha no retorno, voltar para a lista de planos
        toast.error('Não foi possível criar o plano. Tente novamente.');
        setIsSubmitting(false); // Importante: reseta o estado em caso de falha
        router.push('/planejamento/inteligente');
      }
    } catch (error) {
      console.error('Erro ao criar plano inteligente:', error);
      toast.error('Ocorreu um erro ao criar o plano inteligente');
      setIsSubmitting(false); // Importante: reseta o estado em caso de erro
    }
  };

  // If user doesn't have access to AI planning, show upgrade message
  if (!hasAiPlanningAccess) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-purple-800 p-8 text-white">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg p-3 rounded-xl shadow-lg">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold">Planejamento Inteligente com IA</h1>
            </div>
            <p className="text-xl text-indigo-100 max-w-3xl">
              Recurso exclusivo para assinantes dos planos Pro e Pro+
            </p>
          </div>
          
          <div className="p-8">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-8">
              <h2 className="text-lg font-semibold text-amber-800 mb-2">Acesso Restrito</h2>
              <p className="text-amber-700">
                O Planejamento Inteligente com IA é um recurso premium que permite criar planos de estudo 
                personalizados e otimizados usando inteligência artificial.
          </p>
            </div>
            
            <div className="text-center mt-8">
              <Button 
                onClick={() => router.push('/perfil/assinatura')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg flex items-center justify-center mx-auto"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Ver planos de assinatura
              </Button>
              
              <Link 
                href="/planejamento"
                className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Voltar para Planejamento
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="mb-6">
        <Link
          href="/planejamento/inteligente"
          className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors font-medium mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para Planejamento Inteligente
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-full mb-4">
            <Brain className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">Criar Plano Inteligente</h1>
          <p className="text-gray-600 max-w-2xl">
            Nosso sistema de IA analisará suas disciplinas, prioridades e disponibilidade 
            para criar um plano de estudos personalizado e otimizado para suas necessidades.
          </p>
        </div>

        <SmartPlanForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
} 
