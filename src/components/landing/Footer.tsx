'use client';

import React from 'react';
import Link from 'next/link';
import { BrainCircuit } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="py-8 md:py-12 border-t border-gray-800">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <Link href="/" className="flex items-center">
                <BrainCircuit className="w-8 h-8 text-blue-500" />
                <span className="ml-2 text-2xl font-extrabold text-white">MedJourney</span>
              </Link>
            </div>

            <div className="text-sm text-gray-600">
              © {new Date().getFullYear()} MedJourney. Todos os direitos reservados.
            </div>

            <div className="flex mt-4 sm:mt-0">
              {/* Links para redes sociais (placeholders) */}
              <a href="#" className="text-gray-400 hover:text-white ml-4">
                <span className="sr-only">Twitter</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white ml-4">
                <span className="sr-only">Instagram</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.013-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.08 3.525c.636-.247 1.363-.416 2.427-.465C9.53 2.013 9.884 2 12.315 2zM12 7.188c-2.649 0-4.812 2.163-4.812 4.812s2.163 4.812 4.812 4.812 4.812-2.163 4.812-4.812S14.649 7.188 12 7.188zm0 7.625c-1.556 0-2.812-1.256-2.812-2.812s1.256-2.812 2.812-2.812 2.812 1.256 2.812 2.812-1.256 2.812-2.812 2.812zm5.438-7.812c-.596 0-1.08.484-1.08 1.08s.484 1.08 1.08 1.08 1.08-.484 1.08-1.08-.484-1.08-1.08-1.08z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 