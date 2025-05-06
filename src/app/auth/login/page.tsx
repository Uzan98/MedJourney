import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login | MedJourney',
  description: 'Entre na sua conta MedJourney para gerenciar seus estudos',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center p-4">
        <LoginForm />
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