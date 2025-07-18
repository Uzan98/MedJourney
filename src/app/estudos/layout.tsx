import ProtectedLayout from "@/components/layout/ProtectedLayout";

export default function EstudosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
} 
