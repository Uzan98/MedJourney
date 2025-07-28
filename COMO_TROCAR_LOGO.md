# Como Trocar o Logo da Aplicação

Este guia explica como substituir o ícone padrão (BookOpen) pelo seu logo personalizado em PNG.

## 📁 Estrutura de Arquivos

Os arquivos relacionados ao logo estão organizados da seguinte forma:

```
src/
├── components/ui/CustomLogo.tsx     # Componente do logo personalizado
├── config/logo.ts                   # Configurações do logo
public/
├── icons/                          # Pasta para seus logos personalizados
    ├── meu-logo.png                # Seu logo aqui (exemplo)
    └── ...
```

## 🚀 Passo a Passo

### 1. Adicione seu logo

1. Coloque seu arquivo PNG na pasta `public/icons/`
2. Recomendamos usar um nome descritivo como `meu-logo.png` ou `logo-empresa.png`
3. **Tamanhos recomendados**: 32x32px, 64x64px ou 128x128px (o componente redimensiona automaticamente)

### 2. Configure o logo

Edite o arquivo `src/config/logo.ts`:

```typescript
export const LOGO_CONFIG = {
  // ✅ Mude para true para ativar seu logo personalizado
  USE_CUSTOM_LOGO: true,
  
  // ✅ Atualize com o caminho do seu logo
  CUSTOM_LOGO_PATH: '/icons/meu-logo.png',
  
  // Tamanhos em diferentes contextos (opcional ajustar)
  SIZES: {
    SIDEBAR_DESKTOP: 20,
    SIDEBAR_MOBILE: 20,
    HEADER: 16,
    MENU_ITEM: 16
  },
  
  // Cores do ícone padrão (caso volte ao BookOpen)
  DEFAULT_COLORS: {
    SIDEBAR: 'text-blue-600',
    HEADER: 'text-blue-600',
    MENU: 'text-blue-600'
  }
};
```

### 3. Teste a aplicação

Após fazer as alterações:

1. Salve os arquivos
2. A aplicação deve recarregar automaticamente
3. Verifique se o logo aparece nos seguintes locais:
   - Sidebar desktop (lado esquerdo)
   - Sidebar mobile (menu hambúrguer)
   - Header (topo da página, em telas pequenas)

## 🔄 Voltar ao Logo Padrão

Para voltar ao ícone BookOpen padrão:

```typescript
// Em src/config/logo.ts
export const LOGO_CONFIG = {
  USE_CUSTOM_LOGO: false,  // ← Mude para false
  // ... resto da configuração
};
```

## 🎨 Dicas de Design

### Formatos Suportados
- ✅ **PNG** (recomendado para logos com transparência)
- ✅ **SVG** (ideal para ícones vetoriais)
- ✅ **JPG** (para fotos, mas sem transparência)

### Recomendações
- Use **fundo transparente** (PNG) para melhor integração
- **Proporção quadrada** (1:1) funciona melhor
- **Cores contrastantes** com o fundo azul dos containers
- **Tamanho mínimo**: 32x32px
- **Tamanho máximo**: 512x512px

## 🛠️ Personalização Avançada

### Ajustar Tamanhos

Para diferentes tamanhos em cada contexto:

```typescript
SIZES: {
  SIDEBAR_DESKTOP: 24,  // Maior no sidebar desktop
  SIDEBAR_MOBILE: 20,   // Padrão no mobile
  HEADER: 18,           // Ligeiramente maior no header
  MENU_ITEM: 16         // Menor nos itens de menu
}
```

### Múltiplos Logos

Para usar logos diferentes em contextos diferentes, você pode:

1. Criar variações do `CustomLogo.tsx`
2. Adicionar propriedades específicas no `LOGO_CONFIG`
3. Usar logos diferentes para tema claro/escuro

## 🐛 Solução de Problemas

### Logo não aparece
- ✅ Verifique se `USE_CUSTOM_LOGO: true`
- ✅ Confirme o caminho em `CUSTOM_LOGO_PATH`
- ✅ Verifique se o arquivo existe em `public/icons/`
- ✅ Teste com um arquivo PNG simples primeiro

### Logo muito grande/pequeno
- ✅ Ajuste os valores em `SIZES`
- ✅ Use um arquivo de origem menor/maior
- ✅ Verifique se a proporção está correta

### Logo com qualidade ruim
- ✅ Use um arquivo de maior resolução
- ✅ Prefira PNG ou SVG ao invés de JPG
- ✅ Verifique se o arquivo não está corrompido

## 📍 Locais Onde o Logo Aparece

O logo personalizado será exibido em:

1. **Sidebar Desktop** - Menu lateral esquerdo (sempre visível em telas grandes)
2. **Sidebar Mobile** - Menu lateral que abre com o botão hambúrguer
3. **Header** - Topo da página (visível em telas pequenas)

## 🔧 Arquivos Modificados

Este sistema de logo personalizado modificou:

- `src/components/ui/CustomLogo.tsx` (novo)
- `src/config/logo.ts` (novo)
- `src/components/layout/AppLayout.tsx` (atualizado)

Todos os outros usos do ícone `BookOpen` na aplicação permanecem inalterados.