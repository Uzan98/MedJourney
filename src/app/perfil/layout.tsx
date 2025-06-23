import ProtectedLayout from "@/components/layout/ProtectedLayout";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
} 
