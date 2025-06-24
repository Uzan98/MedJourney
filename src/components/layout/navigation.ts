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
  MoreHorizontal,
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

// Rotas para o menu "Mais" no mobile
export const maisMenu = [
  {
    title: "Estudos",
    href: "/estudos",
    icon: BookOpen,
    description: "Sessões de estudo e anotações",
  },
  {
    title: "Banco de Questões",
    href: "/banco-questoes",
    icon: FileQuestion,
    description: "Pratique com questões",
  },
  {
    title: "Simulados",
    href: "/simulados",
    icon: ClipboardList,
    description: "Prepare-se com simulados",
  },
  {
    title: "Comunidade",
    href: "/comunidade",
    icon: Users,
    description: "Estude com outros alunos",
  },
]; 