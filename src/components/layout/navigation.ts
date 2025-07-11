import {
  LayoutGrid,
  BookOpen,
  ClipboardList,
  Users,
  BookA,
  Brain,
  Briefcase,
  Calendar,
  FileQuestion,
} from "lucide-react";

export const mainNavigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    color: "text-blue-500",
  },
  {
    title: "Disciplinas",
    href: "/disciplinas",
    icon: "BookOpen",
    color: "text-purple-500",
  },
  {
    title: "Estudos",
    href: "/estudos",
    icon: "GraduationCap",
    color: "text-green-500",
  },
  {
    title: "Planejamento",
    href: "/planejamento",
    icon: "CalendarDays",
    color: "text-orange-500",
  },
  {
    title: "Flashcards",
    href: "/flashcards",
    icon: "Layers",
    color: "text-pink-500",
  },
  {
    title: "Simulados",
    href: "/simulados",
    icon: "FileText",
    color: "text-yellow-500",
  },
  {
    title: "Banco de Questões",
    href: "/banco-questoes",
    icon: "Database",
    color: "text-cyan-500",
  },
  {
    title: "Comunidade",
    href: "/comunidade",
    icon: "Users",
    color: "text-indigo-500",
  },
  {
    title: "Desempenho",
    href: "/desempenho",
    icon: "BarChart",
    color: "text-red-500",
  },
  {
    title: "Mais",
    href: "/mais",
    icon: "MoreHorizontal",
    color: "text-gray-500",
  },
]; 