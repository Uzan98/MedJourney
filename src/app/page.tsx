"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';



export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [rendering, setRendering] = useState(false);
  const router = useRouter();

  // Verificar renderização do lado do cliente
  useEffect(() => {
    setRendering(true);
  }, []);

  // Efeito para quando o usuário estiver autenticado
  useEffect(() => {
    if (rendering && isAuthenticated && !isLoading) {
      console.log('HomePage: Usuário autenticado, redirecionando para o dashboard');
      // Redirecionamento para o dashboard
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, rendering, router]);

  // Mostrar uma mensagem de carregamento enquanto verifica a autenticação
  if (isLoading || !rendering) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se estiver autenticado, mostrar uma tela de redirecionamento enquanto redireciona
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecionando para o Dashboard...</p>
        </div>
      </div>
    );
  }

  // Conteúdo para usuários não autenticados (Página de boas-vindas)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      {/* Elementos decorativos */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl"></div>
      
      {/* Navbar */}
      <nav className="bg-white/10 backdrop-blur-xl border-b border-white/20 relative z-10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="bg-blue-500 p-1.5 rounded-md mr-2">
            <div className="h-6 w-6 bg-blue-100 rounded-md flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"></path>
                <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"></path>
                <circle cx="20" cy="10" r="2"></circle>
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Genoma</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/auth/login"
            className="text-white/80 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 hover:bg-white/10 backdrop-blur-sm"
          >
            Entrar
          </Link>
          <Link
            href="/auth/signup"
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 backdrop-blur-sm"
          >
            Criar Conta
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 px-6 pt-16 pb-24 md:pt-24 md:pb-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <div className="mb-8">
              <div className="inline-block p-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20">
                <div className="bg-black/20 backdrop-blur-sm rounded-full px-6 py-2">
                  <span className="text-cyan-300 text-sm font-medium">✨ Plataforma de Estudos Inteligente</span>
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Sua jornada de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">estudos</span> começa aqui
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/80 max-w-xl mx-auto md:mx-0">
              Organize, planeje e otimize seus estudos com a plataforma completa para estudantes com inteligência artificial
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center md:justify-start">
              <Link
                href="/auth/signup"
                className="group relative bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-10 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 backdrop-blur-sm border border-white/20"
              >
                <span className="relative z-10">Começar agora</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              </Link>
              <Link
                href="/auth/login"
                className="group relative bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 px-10 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 hover:shadow-lg"
              >
                <span className="relative z-10">Já tenho conta</span>
              </Link>
            </div>
          </div>
          
          {/* Imagem ilustrativa */}
          <div className="relative hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl opacity-10 blur-2xl transform rotate-3"></div>
            <div className="relative">
              <img 
                src="/icons/dashboard1.png" 
                alt="Dashboard da plataforma Genoma" 
                className="w-full h-auto rounded-3xl shadow-xl border border-blue-100/50 backdrop-blur-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block p-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20 mb-6">
              <div className="bg-black/20 backdrop-blur-sm rounded-full px-4 py-1">
                <span className="text-cyan-300 text-sm font-medium">🚀 Recursos Avançados</span>
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Recursos exclusivos para impulsionar seus estudos</h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto">Ferramentas poderosas projetadas para otimizar seu tempo e maximizar seu aprendizado</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/20 transition-all duration-500 border border-white/20 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20">
              <div className="w-full h-48 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl mb-6 flex items-center justify-center overflow-hidden border border-white/20 backdrop-blur-sm">
                <img src="/planejamento-screenshot.svg" alt="Planejamento Inteligente" className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-cyan-300 transition-colors duration-300">Planejamento Inteligente</h3>
              <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300">Organize seus estudos com IA e acompanhe seu progresso em tempo real.</p>
            </div>

            {/* Feature 2 */}
             <div className="group relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/20 transition-all duration-500 border border-white/20 hover:border-green-400/50 hover:shadow-2xl hover:shadow-green-500/20">
               <div className="w-full h-48 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl mb-6 flex items-center justify-center overflow-hidden border border-white/20 backdrop-blur-sm">
                 <img src="/banco-questoes-screenshot.svg" alt="Banco de Questões" className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
               </div>
               <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-green-300 transition-colors duration-300">Banco de Questões</h3>
               <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300">Acesse milhares de questões organizadas por disciplina e dificuldade.</p>
             </div>

            {/* Feature 3 */}
             <div className="group relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/20 transition-all duration-500 border border-white/20 hover:border-purple-400/50 hover:shadow-2xl hover:shadow-purple-500/20">
               <div className="w-full h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl mb-6 flex items-center justify-center overflow-hidden border border-white/20 backdrop-blur-sm">
                 <img src="/simulados-screenshot.png" alt="Simulações Personalizadas" className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
               </div>
               <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-purple-300 transition-colors duration-300">Simulações Personalizadas</h3>
               <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300">Pratique com simulados adaptados ao seu nível e objetivos.</p>
             </div>

            {/* Feature 4 */}
             <div className="group relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/20 transition-all duration-500 border border-white/20 hover:border-yellow-400/50 hover:shadow-2xl hover:shadow-yellow-500/20">
               <div className="w-full h-48 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl mb-6 flex items-center justify-center overflow-hidden border border-white/20 backdrop-blur-sm">
                 <img src="/dashboard.png" alt="Dashboard" className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
               </div>
               <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-yellow-300 transition-colors duration-300">Dashboard Completo</h3>
               <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300">Visualize seu progresso e estatísticas de estudo em um painel intuitivo.</p>
             </div>

            {/* Feature 5 */}
             <div className="group relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/20 transition-all duration-500 border border-white/20 hover:border-red-400/50 hover:shadow-2xl hover:shadow-red-500/20">
               <div className="w-full h-48 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-xl mb-6 flex items-center justify-center overflow-hidden border border-white/20 backdrop-blur-sm">
                 <img src="/flashcards-screenshot.svg" alt="Flashcards" className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
               </div>
               <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-red-300 transition-colors duration-300">Flashcards</h3>
               <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300">Memorize conceitos importantes com repetição espaçada inteligente.</p>
             </div>

            {/* Feature 6 */}
             <div className="group relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 hover:bg-white/20 transition-all duration-500 border border-white/20 hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/20">
               <div className="w-full h-48 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-xl mb-6 flex items-center justify-center overflow-hidden border border-white/20 backdrop-blur-sm">
                 <img src="/comunidade-screenshot.svg" alt="Comunidade" className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500" />
               </div>
               <h3 className="text-xl font-semibold mb-3 text-white group-hover:text-indigo-300 transition-colors duration-300">Comunidade</h3>
               <p className="text-white/70 group-hover:text-white/90 transition-colors duration-300">Conecte-se com outros estudantes e compartilhe conhecimento.</p>
             </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-3xl"></div>
            <div className="relative z-10">
              <div className="inline-block p-1 rounded-full bg-gradient-to-r from-cyan-500/30 to-purple-500/30 backdrop-blur-sm border border-white/30 mb-6">
                <div className="bg-black/20 backdrop-blur-sm rounded-full px-6 py-2">
                  <span className="text-cyan-300 text-sm font-medium">🎯 Comece Agora</span>
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Pronto para transformar seus estudos?</h2>
              <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">Junte-se a milhares de estudantes que já estão otimizando seu aprendizado com o Genoma</p>
              
              <Link
                href="/auth/signup"
                className="group relative bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-12 py-5 rounded-2xl text-xl font-semibold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 backdrop-blur-sm border border-white/20 inline-block"
              >
                <span className="relative z-10">Criar minha conta gratuitamente</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-xl border-t border-white/20 relative z-10 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="bg-blue-500 p-1.5 rounded-md mr-2">
                <div className="h-6 w-6 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"></path>
                    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"></path>
                    <circle cx="20" cy="10" r="2"></circle>
                  </svg>
                </div>
              </div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Genoma</h1>
            </div>
            
            <div className="text-sm text-white/70">
              &copy; {new Date().getFullYear()} Genoma. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
}
