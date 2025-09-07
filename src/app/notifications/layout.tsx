import ProtectedLayout from "@/components/layout/ProtectedLayout";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}