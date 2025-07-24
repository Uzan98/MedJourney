import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import QuestionsNavigation from '@/components/banco-questoes/QuestionsNavigation';
import ClientProtectedRoute from '@/components/auth/ClientProtectedRoute';

export default function BancoQuestoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      <ClientProtectedRoute>
        <div className="container mx-auto px-4 py-6">
          <QuestionsNavigation />
          {children}
        </div>
      </ClientProtectedRoute>
    </AppLayout>
  );
} 
