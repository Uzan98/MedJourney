"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, Brain } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SmartPlanForm from '@/components/planning/SmartPlanForm';
import SmartPlanningService, { SmartPlanFormData } from '@/services/smart-planning.service';
import { toast } from 'react-hot-toast';

export default function CreateSmartPlanPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

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
