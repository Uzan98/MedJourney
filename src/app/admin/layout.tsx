"use client";

import { ReactNode } from 'react';

// Exportar configurações para todas as páginas admin
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 