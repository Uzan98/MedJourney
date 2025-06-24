'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="pt-32 pb-12 md:pt-40 md:pb-20">
          <div className="text-center pb-12 md:pb-16">
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tighter tracking-tighter mb-4" data-aos="zoom-y-out">
              Sua jornada para a aprovação médica <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">começa aqui</span>
            </h1>
            <div className="max-w-3xl mx-auto">
              <p className="text-xl text-gray-600 mb-8" data-aos="zoom-y-out" data-aos-delay="150">
                O MedJourney é a plataforma inteligente que organiza seus estudos, otimiza seu tempo e maximiza seu desempenho para as provas de residência e faculdade.
              </p>
              <div className="max-w-xs mx-auto sm:max-w-none sm:flex sm:justify-center" data-aos="zoom-y-out" data-aos-delay="300">
                <div>
                  <Link href="/auth/signup" className="btn text-white bg-blue-600 hover:bg-blue-700 w-full mb-4 sm:w-auto sm:mb-0">
                    Começar grátis
                  </Link>
                </div>
                <div>
                  <a className="btn text-gray-900 bg-white hover:bg-gray-100 w-full sm:w-auto sm:ml-4" href="#features">
                    Ver funcionalidades
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative max-w-5xl mx-auto" data-aos="zoom-y-out" data-aos-delay="450">
            <div className="relative aspect-video">
              <Image 
                src="/screenshots/dashboard.png" 
                alt="Dashboard MedJourney"
                layout="fill"
                objectFit="cover"
                className="rounded-2xl shadow-2xl"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-100 via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>
    </section>
  );
} 