import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export const metadata: Metadata = {
  title: 'Genomed Bank | MedJourney',
  description: 'Acesse o banco de questões do Genomed para praticar e testar seus conhecimentos médicos.',
};

export default function GenomedBankLayout({
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