# Sistema de Autenticação - MedJourney App

Este documento descreve a implementação do sistema de autenticação utilizado na aplicação MedJourney, baseado no Supabase Auth.

## Visão Geral

A autenticação da aplicação utiliza o Supabase Auth com cookies para persistência de sessão, garantindo que a autenticação funcione tanto no lado do cliente quanto no lado do servidor.

## Componentes Principais

### 1. Cliente Supabase (`src/lib/supabase.ts`)
O cliente Supabase é configurado para usar cookies para persistência de sessão, permitindo que a autenticação seja mantida entre diferentes páginas e requisições.

```typescript
supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

### 2. Cliente Middleware (`src/lib/supabase-server.ts`)
Um cliente específico para uso no middleware, que pode ler e modificar cookies durante o processamento de requisições.

```typescript
export function createMiddlewareSupabaseClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { /* ... */ },
        set(name: string, value: string, options: any) { /* ... */ },
        remove(name: string, options: any) { /* ... */ },
      },
    }
  );
}
```

### 3. Contexto de Autenticação (`src/contexts/AuthContext.tsx`)
Gerencia o estado de autenticação do usuário e fornece métodos para login, cadastro e logout.

Principais funcionalidades:
- `signIn`: Autenticação com email e senha
- `signUp`: Cadastro de novos usuários
- `signOut`: Encerramento da sessão
- `refreshSession`: Atualização do estado da sessão

### 4. Middleware de Proteção de Rotas (`src/middleware.ts`)
Protege rotas que requerem autenticação, redirecionando usuários não autenticados para a página de login.

Configuração:
- Rotas públicas: páginas que não requerem autenticação
- Rotas de API públicas: endpoints que não requerem autenticação
- Verificação de autenticação para outras rotas

## Fluxo de Autenticação

1. **Login**:
   - Usuário submete email e senha no `LoginForm`
   - `signIn` é chamado e o Supabase autentica o usuário
   - Cookies de sessão são configurados
   - Usuário é redirecionado para a página de destino (geralmente `/dashboard`)

2. **Verificação de Sessão**:
   - O middleware verifica a existência de uma sessão válida em cada requisição
   - Se não houver sessão e a rota for protegida, redireciona para login
   - Se houver sessão e a rota for de autenticação, redireciona para dashboard

3. **Logout**:
   - Usuário clica em "Sair"
   - `signOut` é chamado e o Supabase remove os cookies de sessão
   - Usuário é redirecionado para página inicial

## Manutenção e Solução de Problemas

### Logs de Autenticação
O sistema inclui logs estratégicos para ajudar na depuração de problemas de autenticação:
- Eventos de mudança de estado de autenticação
- Verificações de sessão no middleware
- Resultados de tentativas de login e logout

### Problemas Comuns
1. **Cookies não persistentes**: Verifique se os cookies estão sendo corretamente configurados e persistidos.
2. **Redirecionamentos incorretos**: Verifique os parâmetros de URL `redirectTo` para garantir que os redirecionamentos estejam funcionando corretamente.
3. **Sessão não reconhecida no servidor**: Verifique se o cliente do servidor está corretamente configurado para ler cookies.

### Testes
Use o endpoint `/api/auth-test` para verificar o estado de autenticação e obter informações sobre a sessão atual. 