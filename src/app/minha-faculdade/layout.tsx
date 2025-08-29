import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export const metadata: Metadata = {
  title: 'Meu Curso | Genoma',
  description: 'Crie ou participe de ambientes compartilhados com sua turma',
};

export default function MinhaFaculdadeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <AppLayout>
        {children}
      </AppLayout>
    </ProtectedRoute>
  );
}