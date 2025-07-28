/**
 * Configuração do logo personalizado da aplicação
 * 
 * Para usar seu próprio logo:
 * 1. Adicione seu arquivo PNG na pasta /public/icons/ (ex: /public/icons/meu-logo.png)
 * 2. Atualize o CUSTOM_LOGO_PATH abaixo com o caminho correto
 * 3. Defina USE_CUSTOM_LOGO como true
 */

export const LOGO_CONFIG = {
  // Defina como true para usar o logo personalizado
  USE_CUSTOM_LOGO: true,
  
  // Caminho para o logo personalizado (relativo à pasta public)
  CUSTOM_LOGO_PATH: '/icons/meu-logo.png',
  
  // Configurações de tamanho para diferentes contextos
  SIZES: {
    SIDEBAR_DESKTOP: 48,
    SIDEBAR_MOBILE: 32,
    HEADER: 24,
    MENU_ITEM: 20
  },
  
  // Cores padrão quando usar o ícone BookOpen
  DEFAULT_COLORS: {
    SIDEBAR: 'text-blue-600',
    HEADER: 'text-blue-600',
    MENU: 'text-blue-600'
  }
} as const;

// Função helper para obter o caminho do logo
export const getLogoPath = (): string | undefined => {
  return LOGO_CONFIG.USE_CUSTOM_LOGO ? LOGO_CONFIG.CUSTOM_LOGO_PATH : undefined;
};

// Função helper para verificar se deve usar logo personalizado
export const shouldUseCustomLogo = (): boolean => {
  return LOGO_CONFIG.USE_CUSTOM_LOGO;
};