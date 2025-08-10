# Implementação do Google Analytics 4 (GA4) - MedJourney

## 1. Visão Geral

Este documento detalha a implementação completa do Google Analytics 4 no projeto MedJourney, uma plataforma educacional para estudantes de medicina. A implementação incluirá tracking de eventos personalizados, configuração de conversões e conformidade com LGPD/GDPR.

## 2. Configuração Inicial

### 2.1 Criação da Propriedade GA4

1. Acesse [Google Analytics](https://analytics.google.com/)
2. Crie uma nova propriedade GA4
3. Configure o nome da propriedade: "MedJourney"
4. Selecione fuso horário: "Brasil (GMT-3)"
5. Configure a moeda: "Real brasileiro (BRL)"
6. Anote o **Measurement ID** (formato: G-XXXXXXXXXX)

### 2.2 Configuração de Streams de Dados

- **Web Stream**: Configure para o domínio principal
- **Enhanced Measurement**: Ativar todas as opções:
  - Page views
  - Scrolls
  - Outbound clicks
  - Site search
  - Video engagement
  - File downloads

## 3. Implementação Técnica

### 3.1 Instalação de Dependências

```bash
npm install gtag
npm install @types/gtag --save-dev
```

### 3.2 Configuração de Variáveis de Ambiente

```env
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_ENVIRONMENT=production
```

### 3.3 Configuração do Google Analytics

**Arquivo: `src/lib/analytics/google-analytics.ts`**

```typescript
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Verificar se GA está habilitado
export const isGAEnabled = () => {
  return (
    GA_MEASUREMENT_ID &&
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' &&
    typeof window !== 'undefined'
  );
};

// Inicializar GA
export const initGA = () => {
  if (!isGAEnabled()) return;

  window.gtag('config', GA_MEASUREMENT_ID!, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Tracking de page views
export const trackPageView = (url: string, title?: string) => {
  if (!isGAEnabled()) return;

  window.gtag('config', GA_MEASUREMENT_ID!, {
    page_title: title || document.title,
    page_location: url,
  });
};

// Tracking de eventos personalizados
export const trackEvent = ({
  action,
  category,
  label,
  value,
  custom_parameters = {},
}: {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}) => {
  if (!isGAEnabled()) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...custom_parameters,
  });
};
```

### 3.4 Componente de Analytics

**Arquivo: `src/components/analytics/google-analytics.tsx`**

```typescript
'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { GA_MEASUREMENT_ID, isGAEnabled, trackPageView } from '@/lib/analytics/google-analytics';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isGAEnabled()) return;

    const url = pathname + searchParams.toString();
    trackPageView(url);
  }, [pathname, searchParams]);

  if (!isGAEnabled()) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_title: document.title,
              page_location: window.location.href,
            });
          `,
        }}
      />
    </>
  );
}
```

### 3.5 Hook de Analytics

**Arquivo: `src/hooks/use-analytics.ts`**

```typescript
'use client';

import { useCallback } from 'react';
import { trackEvent } from '@/lib/analytics/google-analytics';

export const useAnalytics = () => {
  // Eventos de autenticação
  const trackLogin = useCallback((method: 'email' | 'google') => {
    trackEvent({
      action: 'login',
      category: 'authentication',
      label: method,
    });
  }, []);

  const trackSignup = useCallback((method: 'email' | 'google') => {
    trackEvent({
      action: 'sign_up',
      category: 'authentication',
      label: method,
    });
  }, []);

  // Eventos de estudo
  const trackStudySessionStart = useCallback((subject: string, duration?: number) => {
    trackEvent({
      action: 'study_session_start',
      category: 'study',
      label: subject,
      value: duration,
    });
  }, []);

  const trackStudySessionComplete = useCallback((subject: string, duration: number) => {
    trackEvent({
      action: 'study_session_complete',
      category: 'study',
      label: subject,
      value: duration,
    });
  }, []);

  // Eventos de flashcards
  const trackFlashcardCreated = useCallback((deckName: string) => {
    trackEvent({
      action: 'flashcard_created',
      category: 'flashcards',
      label: deckName,
    });
  }, []);

  const trackFlashcardStudied = useCallback((deckName: string, correct: boolean) => {
    trackEvent({
      action: 'flashcard_studied',
      category: 'flashcards',
      label: deckName,
      custom_parameters: {
        correct: correct,
      },
    });
  }, []);

  // Eventos de simulados
  const trackSimulationStart = useCallback((simulationId: string, subject: string) => {
    trackEvent({
      action: 'simulation_start',
      category: 'simulation',
      label: subject,
      custom_parameters: {
        simulation_id: simulationId,
      },
    });
  }, []);

  const trackSimulationComplete = useCallback((
    simulationId: string,
    subject: string,
    score: number,
    duration: number
  ) => {
    trackEvent({
      action: 'simulation_complete',
      category: 'simulation',
      label: subject,
      value: score,
      custom_parameters: {
        simulation_id: simulationId,
        duration: duration,
      },
    });
  }, []);

  // Eventos de navegação
  const trackPageVisit = useCallback((pageName: string, section?: string) => {
    trackEvent({
      action: 'page_visit',
      category: 'navigation',
      label: pageName,
      custom_parameters: {
        section: section,
      },
    });
  }, []);

  // Eventos de engajamento
  const trackFeatureUsage = useCallback((feature: string, action: string) => {
    trackEvent({
      action: 'feature_usage',
      category: 'engagement',
      label: feature,
      custom_parameters: {
        feature_action: action,
      },
    });
  }, []);

  // Eventos de XP e conquistas
  const trackXPGained = useCallback((eventType: string, xpAmount: number) => {
    trackEvent({
      action: 'xp_gained',
      category: 'gamification',
      label: eventType,
      value: xpAmount,
    });
  }, []);

  const trackAchievementUnlocked = useCallback((achievementId: string, achievementName: string) => {
    trackEvent({
      action: 'achievement_unlocked',
      category: 'gamification',
      label: achievementName,
      custom_parameters: {
        achievement_id: achievementId,
      },
    });
  }, []);

  return {
    trackLogin,
    trackSignup,
    trackStudySessionStart,
    trackStudySessionComplete,
    trackFlashcardCreated,
    trackFlashcardStudied,
    trackSimulationStart,
    trackSimulationComplete,
    trackPageVisit,
    trackFeatureUsage,
    trackXPGained,
    trackAchievementUnlocked,
  };
};
```

## 4. Integração com Layout Principal

**Arquivo: `src/app/layout.tsx`**

```typescript
import GoogleAnalytics from '@/components/analytics/google-analytics';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
```

## 5. Eventos Personalizados por Funcionalidade

### 5.1 Integração com Sistema de XP

**Modificação no arquivo: `src/hooks/use-xp-system.ts`**

```typescript
import { useAnalytics } from '@/hooks/use-analytics';

// Dentro do hook useXPSystem
const { trackXPGained, trackAchievementUnlocked } = useAnalytics();

// No método trackXPEvent
const trackXPEvent = useCallback(async (
  eventType: XPEventType,
  metadata: Record<string, any> = {}
): Promise<XPEventResult | null> => {
  // ... código existente ...
  
  if (result.success) {
    // Tracking do GA4
    if (result.xp_gained > 0) {
      trackXPGained(eventType, result.xp_gained);
    }
    
    // ... resto do código ...
  }
  
  return result;
}, [user, loadUserProgress, trackXPGained]);

// Para conquistas desbloqueadas
const processUnnotifiedAchievements = useCallback(() => {
  // ... código existente ...
  
  unnotifiedAchievements.forEach(achievement => {
    // Tracking do GA4
    trackAchievementUnlocked(achievement.id, achievement.name);
    
    // ... resto do código ...
  });
}, [trackAchievementUnlocked]);
```

### 5.2 Integração com Autenticação

**Modificação no arquivo: `src/contexts/AuthContext.tsx`**

```typescript
import { useAnalytics } from '@/hooks/use-analytics';

// Dentro do AuthProvider
const { trackLogin, trackSignup } = useAnalytics();

// No método signIn
const signIn = async (email: string, password: string) => {
  // ... código existente ...
  
  if (!error) {
    trackLogin('email');
  }
  
  return { error, success: !error };
};

// No método signInWithGoogle
const signInWithGoogle = async () => {
  // ... código existente ...
  
  if (!error) {
    trackLogin('google');
  }
  
  return { error, success: !error };
};

// No método signUp
const signUp = async (email: string, password: string, name: string) => {
  // ... código existente ...
  
  if (!error) {
    trackSignup('email');
  }
  
  return { error, success: !error };
};
```

### 5.3 Integração com Simulados

**Modificação no arquivo: `src/app/simulados/[id]/iniciar/page.tsx`**

```typescript
import { useAnalytics } from '@/hooks/use-analytics';

// Dentro do componente
const { trackSimulationStart, trackSimulationComplete } = useAnalytics();

// No início do simulado
useEffect(() => {
  if (exam) {
    trackSimulationStart(exam.id, exam.title);
  }
}, [exam, trackSimulationStart]);

// No método handleFinishExam
const handleFinishExam = async () => {
  // ... código existente ...
  
  if (result) {
    // Tracking do GA4
    trackSimulationComplete(
      exam?.id || '',
      exam?.title || '',
      result.score || 0,
      exam?.time_limit ? (exam.time_limit * 60 - (timeRemaining || 0)) : 0
    );
    
    // ... resto do código ...
  }
};
```

## 6. Configuração de Conversões e Metas

### 6.1 Eventos de Conversão

Configurar os seguintes eventos como conversões no GA4:

1. **sign_up** - Cadastro de novos usuários
2. **simulation_complete** - Conclusão de simulados
3. **study_session_complete** - Conclusão de sessões de estudo
4. **achievement_unlocked** - Desbloqueio de conquistas

### 6.2 Metas Personalizadas

1. **Taxa de Retenção**: Usuários que retornam após 7 dias
2. **Engajamento de Estudo**: Usuários que completam pelo menos 3 sessões de estudo por semana
3. **Performance em Simulados**: Usuários que atingem score > 70% em simulados
4. **Progressão de Nível**: Usuários que sobem de nível no sistema de XP

## 7. Conformidade com LGPD/GDPR

### 7.1 Componente de Consentimento

**Arquivo: `src/components/analytics/cookie-consent.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CONSENT_KEY = 'medjourney-analytics-consent';

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShowConsent(false);
    
    // Inicializar GA4 após consentimento
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied',
      });
    }
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setShowConsent(false);
    
    // Negar consentimento para analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
      });
    }
  };

  if (!showConsent) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cookies e Privacidade</CardTitle>
          <CardDescription>
            Utilizamos cookies e ferramentas de análise para melhorar sua experiência e entender como você usa nossa plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleAccept} className="flex-1">
              Aceitar
            </Button>
            <Button onClick={handleDecline} variant="outline" className="flex-1">
              Recusar
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Você pode alterar suas preferências a qualquer momento nas configurações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 7.2 Configuração de Consentimento

**Modificação no arquivo: `src/components/analytics/google-analytics.tsx`**

```typescript
// Adicionar configuração de consentimento
const consentScript = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  // Configuração inicial de consentimento
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    wait_for_update: 500,
  });
  
  gtag('js', new Date());
  gtag('config', '${GA_MEASUREMENT_ID}');
`;
```

### 7.3 Página de Configurações de Privacidade

**Arquivo: `src/app/privacidade/page.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const CONSENT_KEY = 'medjourney-analytics-consent';

export default function PrivacySettings() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    setAnalyticsEnabled(consent === 'accepted');
  }, []);

  const handleToggleAnalytics = (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    localStorage.setItem(CONSENT_KEY, enabled ? 'accepted' : 'declined');
    
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: enabled ? 'granted' : 'denied',
        ad_storage: 'denied',
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Configurações de Privacidade</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Analytics e Cookies</CardTitle>
          <CardDescription>
            Gerencie suas preferências de coleta de dados e cookies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Google Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Permite que coletemos dados anônimos sobre o uso da plataforma para melhorar a experiência.
              </p>
            </div>
            <Switch
              checked={analyticsEnabled}
              onCheckedChange={handleToggleAnalytics}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 8. Monitoramento e Relatórios

### 8.1 Dashboards Personalizados

Configurar os seguintes dashboards no GA4:

1. **Dashboard de Engajamento Educacional**
   - Sessões de estudo por usuário
   - Tempo médio de estudo
   - Simulados completados
   - Taxa de conclusão de flashcards

2. **Dashboard de Gamificação**
   - XP ganho por categoria
   - Conquistas mais desbloqueadas
   - Progressão de níveis
   - Engajamento por funcionalidade

3. **Dashboard de Retenção**
   - Taxa de retenção por coorte
   - Frequência de uso
   - Jornada do usuário
   - Pontos de abandono

### 8.2 Relatórios Automatizados

Configurar relatórios semanais/mensais para:
- Performance de funcionalidades
- Métricas de engajamento
- Análise de conversões
- Insights de comportamento do usuário

## 9. Testes e Validação

### 9.1 Teste de Implementação

1. **Verificar tracking em desenvolvimento**:
   ```bash
   # Usar GA4 Debug View
   # Instalar extensão GA Debugger
   # Verificar eventos no Real-Time do GA4
   ```

2. **Validar eventos personalizados**:
   - Login/Signup
   - Sessões de estudo
   - Simulados
   - Conquistas
   - Navegação

3. **Testar consentimento LGPD**:
   - Verificar bloqueio inicial
   - Testar aceitação/recusa
   - Validar persistência de preferências

### 9.2 Monitoramento de Qualidade

- Configurar alertas para anomalias nos dados
- Verificar integridade dos eventos
- Monitorar performance de carregamento
- Validar conformidade com privacidade

## 10. Manutenção e Otimização

### 10.1 Revisões Periódicas

- **Mensal**: Revisar métricas e KPIs
- **Trimestral**: Otimizar eventos e conversões
- **Semestral**: Avaliar novos recursos do GA4
- **Anual**: Auditoria completa de implementação

### 10.2 Evolução Contínua

- Adicionar novos eventos conforme funcionalidades
- Otimizar dashboards baseado em feedback
- Implementar Enhanced Ecommerce se necessário
- Integrar com outras ferramentas de analytics

Esta implementação fornece uma base sólida para analytics no MedJourney, respeitando a privacidade dos usuários e fornecendo insights valiosos sobre o eng