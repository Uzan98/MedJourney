import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Provas Integra - MedJourney',
  description: 'Sistema inteligente de processamento e resolução de provas completas para residência médica, concursos públicos, ENEM e vestibulares.',
  keywords: 'provas, residência médica, concursos, ENEM, vestibulares, simulados, medicina',
};

export default function ProvasIntegraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
