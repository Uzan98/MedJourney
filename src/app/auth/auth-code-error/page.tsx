"use client";

import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Erro na Autenticação
        </h1>
        
        <p className="text-gray-600 mb-6">
          Ocorreu um erro durante o processo de autenticação com o Google. 
          Por favor, tente novamente.
        </p>
        
        <div className="space-y-3">
          <Link 
            href="/auth/login"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Login
          </Link>
          
          <Link 
            href="/"
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors block"
          >
            Ir para Página Inicial
          </Link>
        </div>
      </div>
    </div>
  );
}