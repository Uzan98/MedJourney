"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Globe } from 'lucide-react';

export default function QuestionsNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Determinar qual aba está ativa
  const isGenomaBankActive = pathname?.includes('/genoma-bank');
  
  return (
    <div className="bg-white shadow-sm rounded-xl mb-8 overflow-hidden">
      <div className="flex">
        <Link
          href="/banco-questoes"
          className={`flex items-center px-6 py-4 text-base font-medium transition-colors ${
            !isGenomaBankActive
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <FileText className="h-5 w-5 mr-2" />
          Minhas Questões
        </Link>
        
        <Link
          href="/banco-questoes/genoma-bank"
          className={`flex items-center px-6 py-4 text-base font-medium transition-colors ${
            isGenomaBankActive
              ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Globe className="h-5 w-5 mr-2" />
          Genoma Bank
        </Link>
      </div>
    </div>
  );
} 