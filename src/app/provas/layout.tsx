import React from 'react';
import { Metadata } from 'next';
import ProtectedLayout from '@/components/layout/ProtectedLayout';

export const metadata: Metadata = {
  title: 'Provas e Simulados | MedJourney',
  description: 'Acesse provas de residência médica, ENEM, concursos públicos e vestibulares. Pratique com simulados organizados por categoria.',
};

export default function ProvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}