import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Cadastro | MedJourney',
  description: 'Crie sua conta no MedJourney e comece a gerenciar seus estudos',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center p-4">
        <SignupForm />
      </div>
      
      <div className="hidden lg:flex flex-1 bg-blue-700 items-center justify-center">
        <div className="max-w-md text-white p-8">
          <h1 className="text-4xl font-bold mb-6">Bem-vindo ao MedJourney</h1>
          <p className="text-xl mb-4">
            O caminho mais inteligente para seus estudos de medicina
          </p>
          <ul className="space-y-2 mb-8 list-disc pl-5">
            <li>Sistema de repetição espaçada para memorização eficiente</li>
            <li>Estatísticas detalhadas de desempenho</li>
            <li>Sincronização entre dispositivos</li>
            <li>Acesso offline a seu material de estudo</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 
