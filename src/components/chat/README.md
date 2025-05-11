# Sistema de Chat em Tempo Real com Supabase

Este diretório contém os componentes para implementação de um sistema de chat em tempo real utilizando Supabase Realtime para o MedJourney.

## Componentes

### 1. ChatMessage

O componente `ChatMessage` renderiza uma única mensagem do chat, exibindo o conteúdo, nome do remetente, avatar (com iniciais do nome) e horário da mensagem.

```tsx
<ChatMessage
  id="uuid"
  content="Olá, tudo bem?"
  username="João Silva"
  createdAt="2023-06-20T14:30:00Z"
  isCurrentUser={true}
/>
```

### 2. ChatInput

Componente para entrada de texto pelo usuário, com botão de envio e comportamento para enviar mensagens ao pressionar Enter.

```tsx
<ChatInput
  onSendMessage={handleSendMessage}
  disabled={false}
  placeholder="Digite sua mensagem..."
/>
```

### 3. ChatRoom

Componente principal que gerencia a lista de mensagens, carrega mensagens anteriores do Supabase e implementa a funcionalidade de tempo real para novas mensagens.

```tsx
<ChatRoom
  roomId="sala-123"
/>
```

### 4. EstudoRoomChat

Componente específico para salas de estudo, implementando um chat flutuante com botões para minimizar/maximizar e fechar.

```tsx
<EstudoRoomChat
  roomId="sala-123"
/>
```

## Hooks

### useChatScroll

Hook personalizado para gerenciar a rolagem automática no chat quando novas mensagens chegam, mas respeitando se o usuário está rolando manualmente para visualizar mensagens anteriores.

```tsx
const chatContainerRef = useChatScroll({
  messages,
  dependencies: [loading],
  smooth: true,
  bottomOffset: 100
});
```

## Integração com Supabase

O sistema utiliza a tabela `chat_messages` configurada no Supabase com os seguintes campos:

- `id`: UUID (chave primária)
- `room_id`: String (identificador da sala)
- `user_id`: UUID (referência para auth.users)
- `username`: String (nome do usuário)
- `content`: String (conteúdo da mensagem)
- `created_at`: Timestamp (data de criação)

A funcionalidade de tempo real é implementada utilizando o Supabase Realtime com canais específicos para cada sala.

## Como Usar

1. Importe o componente `EstudoRoomChat` para qualquer página onde deseja incluir o chat:

```tsx
import { EstudoRoomChat } from '@/components/estudos/EstudoRoomChat';

// Em um componente React:
return (
  <div>
    {/* Conteúdo da página */}
    <EstudoRoomChat roomId={roomId} />
  </div>
);
```

2. Certifique-se de que a tabela `chat_messages` esteja configurada corretamente no Supabase com as permissões RLS adequadas.

3. Verifique se o Supabase Realtime está habilitado para a tabela `chat_messages` através da publicação `supabase_realtime`.

## Requisitos

- Contexto de autenticação para acessar o usuário logado
- Cliente Supabase configurado
- Biblioteca UUID para geração de IDs únicos

## Contribuição

Para contribuir com este componente, considere:

1. Adicionar suporte para anexos/imagens
2. Implementar digitação em tempo real ("usuário está digitando...")
3. Adicionar suporte para reações às mensagens (emojis)
4. Implementar histórico de mensagens com paginação 