import React from 'react';
import AppLayout from '@/components/layout/AppLayout';

export default function BancoQuestoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
} 
