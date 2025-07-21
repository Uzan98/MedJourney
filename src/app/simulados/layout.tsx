import React from 'react';
import ProtectedLayout from '@/components/layout/ProtectedLayout';

export default function SimuladosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
} 
