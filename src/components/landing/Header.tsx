'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BrainCircuit } from 'lucide-react';

export default function Header() {
  const [top, setTop] = useState(true);

  useEffect(() => {
    const scrollHandler = () => {
      window.pageYOffset > 10 ? setTop(false) : setTop(true);
    };
    window.addEventListener('scroll', scrollHandler);
    return () => window.removeEventListener('scroll', scrollHandler);
  }, [top]);

  return (
    <header className={`fixed w-full z-30 md:bg-opacity-90 transition duration-300 ease-in-out ${!top && 'bg-white backdrop-blur-sm shadow-lg'}`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex-shrink-0 mr-4">
            <Link href="/" className="flex items-center">
              <BrainCircuit className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-2xl font-extrabold text-gray-800">MedJourney</span>
            </Link>
          </div>
          <nav className="hidden md:flex md:flex-grow">
            <ul className="flex flex-grow justify-end flex-wrap items-center">
              <li>
                <Link href="/auth/login" className="font-medium text-gray-600 hover:text-gray-900 px-5 py-3 flex items-center transition duration-150 ease-in-out">
                  Entrar
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="btn-sm text-white bg-blue-600 hover:bg-blue-700 ml-3">
                  <span>Criar Conta</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
} 