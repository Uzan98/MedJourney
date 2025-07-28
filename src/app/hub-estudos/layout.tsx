import ProtectedLayout from "@/components/layout/ProtectedLayout";

interface HubEstudosLayoutProps {
  children: React.ReactNode;
}

export default function HubEstudosLayout({ children }: HubEstudosLayoutProps) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}