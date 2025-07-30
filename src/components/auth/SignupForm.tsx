"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'react-hot-toast';

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação dos campos obrigatórios
    if (!name || !email || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    try {
      setError(null);
      setLoading(true);
      
      const { success, error } = await signUp(email, password, name);
      
      if (success) {
        setSuccess(true);
        // Não redirecionamos aqui porque o usuário pode precisar confirmar o email
      } else {
        setError(error?.message || 'Erro ao criar conta');
      }
    } catch (err) {
      setError('Ocorreu um erro ao processar o cadastro');
      console.error('Erro de cadastro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log('Tentando fazer cadastro com Google');
      
      const { success, error } = await signInWithGoogle();
      
      if (!success && error) {
        const errorMessage = error?.message || 'Erro ao fazer cadastro com Google';
        console.error('Erro no cadastro com Google:', errorMessage);
        setError(errorMessage);
        toast.error(errorMessage);
      }
      // Note: Se o cadastro for bem-sucedido, o usuário será redirecionado pelo OAuth
    } catch (err) {
      const errorMessage = 'Ocorreu um erro ao processar o cadastro com Google';
      console.error('Erro de cadastro com Google:', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">Cadastro Realizado!</h2>
        <p className="mb-6">
          Enviamos um email de confirmação para <strong>{email}</strong>. 
          Por favor, verifique sua caixa de entrada para ativar sua conta.
        </p>
        <Link 
          href="/auth/login"
          className="inline-block py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Voltar para o Login
        </Link>
      </div>
    );
  }



  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Crie sua Conta</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Campos obrigatórios */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email <span className="text-red-500">*</span>
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
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Senha <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            minLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
            Confirmar Senha <span className="text-red-500">*</span>
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        
        <button
          type="button"
          onClick={handleGoogleSignup}
          className={`w-full py-2 px-4 mb-4 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center gap-2 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={loading}
        >
          <FcGoogle className="w-5 h-5" />
          {loading ? 'Criando Conta...' : 'Cadastrar com Google'}
        </button>
        
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ou</span>
          </div>
        </div>
        
        <button
          type="submit"
          className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={loading}
        >
          {loading ? 'Criando Conta...' : 'Criar Conta com Email'}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Já tem uma conta?{' '}
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-800">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
