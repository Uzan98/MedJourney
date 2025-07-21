// Definições de temas para disciplinas em um único lugar
// para garantir consistência em toda a aplicação

// Interface para definição de tema
export interface ThemeDefinition {
  id: string;
  name: string;
  color: string;
  gradient: string;
  textColor: string;
}

// Temas disponíveis para disciplinas
export const DISCIPLINE_THEMES: ThemeDefinition[] = [
  {
    id: 'azul',
    name: 'Azul',
    color: '#3b82f6',
    gradient: 'from-blue-600 to-indigo-600',
    textColor: 'text-white'
  },
  {
    id: 'verde',
    name: 'Verde',
    color: '#10b981',
    gradient: 'from-green-600 to-emerald-600',
    textColor: 'text-white'
  },
  {
    id: 'vermelho',
    name: 'Vermelho',
    color: '#ef4444',
    gradient: 'from-red-600 to-rose-600',
    textColor: 'text-white'
  },
  {
    id: 'roxo',
    name: 'Roxo',
    color: '#8b5cf6',
    gradient: 'from-purple-600 to-violet-600',
    textColor: 'text-white'
  },
  {
    id: 'laranja',
    name: 'Laranja',
    color: '#f97316',
    gradient: 'from-orange-500 to-amber-600',
    textColor: 'text-white'
  },
  {
    id: 'rosa',
    name: 'Rosa',
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-500',
    textColor: 'text-white'
  },
  {
    id: 'amarelo',
    name: 'Amarelo', 
    color: '#eab308',
    gradient: 'from-yellow-400 to-amber-500',
    textColor: 'text-gray-800'
  },
  {
    id: 'indigo',
    name: 'Índigo',
    color: '#6366f1',
    gradient: 'from-indigo-600 to-blue-500',
    textColor: 'text-white'
  },
  {
    id: 'ciano',
    name: 'Ciano',
    color: '#06b6d4',
    gradient: 'from-cyan-500 to-blue-400',
    textColor: 'text-white'
  }
];

// Função helper para obter um tema por ID
export function getThemeById(themeId: string): ThemeDefinition {
  const theme = DISCIPLINE_THEMES.find(theme => theme.id === themeId);
  return theme || DISCIPLINE_THEMES[0]; // Retorna o primeiro tema se não encontrar
}

// Função helper para obter mapeamento de temas (para compatibilidade com código existente)
export function getThemesMap(): Record<string, { gradiente: string, textoCor: string }> {
  return DISCIPLINE_THEMES.reduce((acc, theme) => {
    acc[theme.id] = {
      gradiente: theme.gradient,
      textoCor: theme.textColor
    };
    return acc;
  }, {} as Record<string, { gradiente: string, textoCor: string }>);
} 