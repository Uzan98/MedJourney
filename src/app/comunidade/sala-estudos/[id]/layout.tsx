'use client';

import { ReactNode } from 'react';
import SupabaseProvider from '@/contexts/SupabaseProvider';

export default function SalaEstudosDetalheLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SupabaseProvider>
      <div className="relative">
        {children}
      </div>
    </SupabaseProvider>
  );
} 