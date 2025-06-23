'use client';

import ProtectedLayout from "../../components/layout/ProtectedLayout";

export default function ComunidadeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
} 
