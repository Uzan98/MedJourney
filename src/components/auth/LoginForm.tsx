"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  const { signIn, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Obter URL de redirecionamento dos parâmetros da URL ou usar o dashboard por padrão
  const redirectTo = searchParams?.get('redirectTo') || searchParams?.get('redirect') || '/dashboard';

  // Verifique se já está autenticado e redirecione
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Usuário já autenticado, redirecionando para:', redirectTo);
      toast.success('Você já está autenticado!');
      router.push(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  // Efeito para lidar com o sucesso do login
  useEffect(() => {
    if (loginSuccess) {
      console.log('Efetuando redirecionamento após login com sucesso para:', redirectTo);
      // Pequeno atraso para garantir que cookies sejam definidos
      setTimeout(() => {
        router.push(redirectTo);
      }, 1000);
    }
  }, [loginSuccess, redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }
    
    try {
      setError(null);
      setLoading(true);
      console.log('Tentando fazer login com email:', email);
      
      const { success, error } = await signIn(email, password);
      
      console.log('Resultado do login:', { success, error });
      
      if (success) {
        console.log('Login bem-sucedido! Redirecionando para:', redirectTo);
        toast.success('Login realizado com sucesso!');
        setLoginSuccess(true);
      } else {
        const errorMessage = error?.message || 'Erro ao fazer login';
        console.error('Erro no login:', errorMessage);
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Ocorreu um erro ao processar o login';
      console.error('Erro de login:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loginSuccess) {
    return (
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md text-center">
        <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Login efetuado com sucesso!</h2>
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Entrar no MedJourney</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm">
            <Link 
              href="/auth/reset-password"
              className="text-blue-600 hover:text-blue-800"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </div>
        
        <button
          type="submit"
          className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Não tem uma conta?{' '}
          <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
} 