import { 
  Home, 
  BookOpen, 
  Calendar, 
  Sparkles, 
  Users, 
  FileText, 
  BarChart2, 
  Brain, 
  Building2, 
  Layers, 
  Lightbulb,
  Clock,
  User,
  Settings,
  CreditCard,
  BookMarked,
  Trello
} from 'lucide-react';
import { SubscriptionTier } from '@/types/subscription';

export interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  requiresAuth?: boolean;
  requiredSubscription?: SubscriptionTier;
  featureKey?: string;
  badge?: string;
  badgeColor?: string;
}

export const mainNavigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    requiresAuth: true,
  },
  {
    name: 'Disciplinas',
    href: '/disciplinas',
    icon: BookOpen,
    requiresAuth: true,
  },

  {
    name: 'Planejamento IA',
    href: '/planejamento/inteligente',
    icon: Brain,
    requiresAuth: true,
    requiredSubscription: SubscriptionTier.PRO,
    featureKey: 'ai_planning',
    badge: 'PRO',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    name: 'Estudos',
    href: '/estudos',
    icon: Clock,
    requiresAuth: true,
  },
  {
    name: 'Painel de Tarefas',
    href: '/tarefas',
    icon: Trello,
    requiresAuth: true,
  },
  {
    name: 'Flashcards',
    href: '/flashcards',
    icon: Layers,
    requiresAuth: true,
  },
  {
    name: 'Banco de Questões',
    href: '/banco-questoes',
    icon: FileText,
    requiresAuth: true,
  },
  {
    name: 'Simulados',
    href: '/simulados',
    icon: BookMarked,
    requiresAuth: true,
  },
  {
    name: 'Desempenho',
    href: '/desempenho',
    icon: BarChart2,
    requiresAuth: true,
    requiredSubscription: SubscriptionTier.PRO,
    featureKey: 'advanced_analytics',
    badge: 'PRO',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    name: 'Comunidade',
    href: '/comunidade',
    icon: Users,
    requiresAuth: true,
    featureKey: 'community_features',
  },
  {
    name: 'Minha Faculdade',
    href: '/minha-faculdade',
    icon: Building2,
    requiresAuth: true,
    featureKey: 'faculty_features',
  },
];

export const profileNavigation: NavigationItem[] = [
  {
    name: 'Perfil',
    href: '/perfil',
    icon: User,
    requiresAuth: true,
  },
  {
    name: 'Assinatura',
    href: '/perfil/assinatura',
    icon: CreditCard,
    requiresAuth: true,
  },
  {
    name: 'Configurações',
    href: '/perfil/configuracoes',
    icon: Settings,
    requiresAuth: true,
  },
];