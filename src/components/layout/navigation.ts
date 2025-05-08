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

export const navbarMenu = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutGrid,
    color: "text-blue-500",
  },
  {
    title: "Flashcards",
    href: "/flashcards",
    icon: BookA,
    color: "text-orange-500",
  },
  {
    title: "Disciplinas",
    href: "/disciplinas",
    icon: BookOpen,
    color: "text-green-500",
  },
  {
    title: "Banco de Questões",
    href: "/banco-questoes",
    icon: FileQuestion,
    color: "text-indigo-500",
  },
]; 