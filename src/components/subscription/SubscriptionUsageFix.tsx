'use client';

import React, { useState } from 'react';
import { initializeSubscriptionUsage, checkSubscriptionUsageExists } from '@/utils/subscription-fix';
import { toast } from 'react-hot-toast';

interface SubscriptionUsageFixProps {
  onSuccess?: () => void;
}

export default function SubscriptionUsageFix({ onSuccess }: SubscriptionUsageFixProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [hasUsageRecord, setHasUsageRecord] = useState<boolean | null>(null);

  const handleCheckUsage = async () => {
    setIsChecking(true);
    try {
      const exists = await checkSubscriptionUsageExists();
      setHasUsageRecord(exists);
      
      if (exists) {
        toast.success('Registro de uso encontrado! Você pode adicionar questões normalmente.');
      } else {
        toast.info('Registro de uso não encontrado. Clique em "Inicializar" para criar.');
      }
    } catch (error) {
      console.error('Erro ao verificar subscription_usage:', error);
      toast.error('Erro ao verificar registro de uso.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleInitialize = async () => {
    setIsLoading(true);
    try {
      const result = await initializeSubscriptionUsage();
      
      if (result.success) {
        toast.success('Registro de uso inicializado com sucesso!');
        setHasUsageRecord(true);
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Erro ao inicializar subscription_usage:', error);
      toast.error('Erro ao inicializar registro de uso.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Problema ao adicionar questões?
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Se você está enfrentando erro 406 ao tentar adicionar questões, 
              pode ser necessário inicializar seu registro de uso.
            </p>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="button"
              onClick={handleCheckUsage}
              disabled={isChecking}
              className="bg-yellow-100 px-3 py-2 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
            >
              {isChecking ? 'Verificando...' : 'Verificar Status'}
            </button>
            
            {hasUsageRecord === false && (
              <button
                type="button"
                onClick={handleInitialize}
                disabled={isLoading}
                className="bg-yellow-600 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                {isLoading ? 'Inicializando...' : 'Inicializar Registro'}
              </button>
            )}
          </div>
          
          {hasUsageRecord !== null && (
            <div className="mt-3">
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                hasUsageRecord 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {hasUsageRecord ? '✓ Registro encontrado' : '✗ Registro não encontrado'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}