import ProtectedLayout from "@/components/layout/ProtectedLayout";

export default function MindMapNativeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}