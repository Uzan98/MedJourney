"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  
  // Campos adicionais
  const [location, setLocation] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [university, setUniversity] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [bio, setBio] = useState('');
  
  const { signUp } = useAuth();
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
      
      // Preparar os dados adicionais do usuário
      const additionalData = {
        bio: bio || 'Estudante apaixonado por aprender e compartilhar conhecimento.',
        location: location || '',
        specialty: specialty || '',
        university: university || '',
        graduationYear: graduationYear || ''
      };
      
      const { success, error } = await signUp(email, password, name, additionalData);
      
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

  // Lista de áreas de estudo para o select
  const specialties = [
    'Estudos Gerais',
    'Cardiologia',
    'Dermatologia',
    'Neurologia',
    'Pediatria',
    'Ginecologia e Obstetrícia',
    'Ortopedia',
    'Psiquiatria',
    'Oftalmologia',
    'Radiologia',
    'Anestesiologia',
    'Cirurgia Geral',
    'Endocrinologia',
    'Gastroenterologia',
    'Urologia',
    'Outra'
  ];

  // Gerar anos para o select de ano de formatura
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 10 }, (_, i) => (currentYear + i).toString());

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
        
        {/* Botão para mostrar/ocultar campos adicionais */}
        <div className="mb-6">
          <button
            type="button"
            className="flex items-center justify-between w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-left"
            onClick={() => setShowAdditionalFields(!showAdditionalFields)}
          >
            <span className="font-medium">
              {showAdditionalFields ? "Ocultar informações adicionais" : "Adicionar mais informações (opcional)"}
            </span>
            {showAdditionalFields ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>
        
        {/* Campos adicionais (opcionais) */}
        {showAdditionalFields && (
          <div className="mb-6 space-y-4 border-t border-gray-200 pt-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="specialty">
                Especialidade
              </label>
              <select
                id="specialty"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                disabled={loading}
              >
                <option value="">Selecione uma especialidade</option>
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="university">
                Universidade
              </label>
              <input
                id="university"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                disabled={loading}
                placeholder="Ex: Universidade de São Paulo"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="graduationYear">
                Ano de Formatura
              </label>
              <select
                id="graduationYear"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                disabled={loading}
              >
                <option value="">Selecione o ano</option>
                {graduationYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="location">
                Localização
              </label>
              <input
                id="location"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
                placeholder="Ex: São Paulo, Brasil"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bio">
                Biografia
              </label>
              <textarea
                id="bio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading}
                rows={3}
                placeholder="Conte um pouco sobre você e seus objetivos de estudo"
              />
            </div>
          </div>
        )}
        
        <button
          type="submit"
          className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          disabled={loading}
        >
          {loading ? 'Criando Conta...' : 'Criar Conta'}
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
