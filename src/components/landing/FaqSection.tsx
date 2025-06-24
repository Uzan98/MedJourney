'use client';

import React from 'react';

const FaqItem = ({ question, answer }: { question: string; answer: string }) => (
  <details className="group border-b pb-4 mb-4">
    <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
      <span>{question}</span>
      <span className="transition group-open:rotate-180">
        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
      </span>
    </summary>
    <p className="text-gray-600 mt-3 group-open:animate-fadeIn">
      {answer}
    </p>
  </details>
);

export default function FaqSection() {
  const faqs = [
    {
      question: 'O que é o MedJourney?',
      answer: 'O MedJourney é uma plataforma de estudos inteligente projetada para ajudar estudantes de medicina a organizar, otimizar e acompanhar seu processo de aprendizagem para a faculdade e provas de residência.'
    },
    {
      question: 'Como funciona o planejamento com Inteligência Artificial?',
      answer: 'Nossa IA analisa seus objetivos, o tempo que você tem disponível e as matérias da sua prova. Com base nisso, ela cria um cronograma de estudos otimizado, distribuindo os conteúdos de forma inteligente para maximizar sua retenção e cobrir todo o edital.'
    },
    {
      question: 'Posso cancelar minha assinatura a qualquer momento?',
      answer: 'Sim! Você pode cancelar sua assinatura a qualquer momento, sem taxas ou burocracia. Você continuará com acesso aos recursos do seu plano até o final do período de faturamento.'
    },
    {
      question: 'O MedJourney funciona em dispositivos móveis?',
      answer: 'Sim! O MedJourney é um Progressive Web App (PWA), o que significa que ele funciona perfeitamente no seu celular ou tablet, com uma experiência similar a de um aplicativo nativo, inclusive com funcionalidades offline.'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Perguntas Frequentes</h2>
          <p className="mt-4 text-lg text-gray-600">
            Ainda tem dúvidas? Veja se podemos ajudar aqui.
          </p>
        </div>
        <div className="mt-12">
          {faqs.map((faq, index) => (
            <FaqItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
} 