import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Matérias Acadêmicas | MedJourney',
  description: 'Configure e gerencie suas matérias do semestre acadêmico',
};

export default function MateriasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}