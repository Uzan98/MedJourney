import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login | MedJourney',
  description: 'Entre na sua conta MedJourney para gerenciar seus estudos',
};

// Componente de fallback para o Suspense
function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-6 mx-auto w-3/4"></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded mt-6"></div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
      
      <div className="hidden lg:flex flex-1 bg-blue-600 items-center justify-center">
        <div className="max-w-md text-white p-8">
          <h1 className="text-4xl font-bold mb-6">MedJourney</h1>
          <p className="text-xl mb-4">
            Sua plataforma completa para estudos de medicina
          </p>
          <ul className="space-y-2 mb-8 list-disc pl-5">
            <li>Organize disciplinas e matérias</li>
            <li>Acompanhe seu progresso</li>
            <li>Crie planos de estudo eficientes</li>
            <li>Acesse de qualquer dispositivo</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 