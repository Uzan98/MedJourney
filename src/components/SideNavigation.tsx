import {
  LucideIcon,
  Home,
  BookOpen,
  Users,
  Archive,
  LucideLifeBuoy,
  LucideSettings,
  LucideLeaf,
  LucideHelpCircle,
  LucideLogOut,
  LayoutDashboard,
  FileText,
  ClipboardEdit
} from "lucide-react";

const SideNavigation = () => {
  const menuItems = [
    {
      href: "/banco-questoes",
      icon: FileText,
      text: "Banco de Questões",
      protected: false,
    },
    {
      href: "/simulados",
      icon: ClipboardEdit,
      text: "Simulados",
      protected: false,
    },
  ];
} 