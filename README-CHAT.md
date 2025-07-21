# Sistema de Chat em Tempo Real - MedJourney

Este documento descreve a implementação do sistema de chat em tempo real para as salas de estudo do MedJourney.

## Visão Geral

O sistema de chat foi implementado utilizando Supabase Realtime, possibilitando:
- Envio e recebimento de mensagens em tempo real
- Chat por sala de estudo (cada sala tem seu próprio canal)
- Persistência de mensagens (com limpeza automática)
- Interface de usuário amigável integrada às salas de estudo

## Componentes

O sistema é composto por vários componentes React:

1. **ChatMessage**: Componente de baixo nível que renderiza uma mensagem individual com avatar, nome, conteúdo e timestamp.

2. **ChatInput**: Campo de entrada para o usuário digitar e enviar mensagens.

3. **ChatRoom**: Componente principal que gerencia o estado das mensagens, integração com o Supabase e renderização da lista de mensagens.

4. **EstudoRoomChat**: Componente especializado para as salas de estudo, implementando uma interface flutuante com botões para expandir/minimizar o chat.

5. **SupabaseProvider**: Contexto React para fornecer acesso ao cliente Supabase e verificar se o Realtime está habilitado.

## Hooks Personalizados

- **useChatScroll**: Gerencia a rolagem automática do chat quando novas mensagens chegam, respeitando a navegação manual do usuário.

## Estrutura do Banco de Dados

### Tabela: `chat_messages`

| Campo     | Tipo      | Descrição                     |
|-----------|-----------|-------------------------------|
| id        | UUID      | Identificador único           |
| room_id   | TEXT      | ID da sala (referência)       |
| user_id   | UUID      | ID do usuário (referência)    |
| username  | TEXT      | Nome do usuário               |
| content   | TEXT      | Conteúdo da mensagem          |
| created_at| TIMESTAMP | Data de criação               |

## Configuração do Supabase

1. **Tabela**: A tabela `chat_messages` está configurada com todos os campos necessários e referências às tabelas de usuários e salas.

2. **Índices**: Índices criados para os campos mais consultados (room_id, user_id, created_at).

3. **Políticas RLS**: Configuradas para:
   - Permitir leitura de todas as mensagens
   - Restringir inserção apenas ao próprio usuário
   - Restringir edição e exclusão apenas ao autor da mensagem

4. **Realtime**: A tabela está configurada na publicação `supabase_realtime` para permitir o acesso em tempo real.

5. **Trigger de Limpeza**: Um trigger foi implementado para manter apenas as 100 mensagens mais recentes por sala, evitando sobrecarga do banco de dados.

## Como Usar

### Integração em Novas Páginas

1. **Importar o componente**:
   ```tsx
   import EstudoRoomChat from '@/components/estudos/EstudoRoomChat';
   ```

2. **Adicionar o componente ao layout**:
   ```tsx
   <SupabaseProvider>
     <div className="relative">
       {children}
       {roomId && <EstudoRoomChat roomId={roomId} />}
     </div>
   </SupabaseProvider>
   ```

### Execução do Script SQL

Para configurar o banco de dados:
1. Acesse o console Supabase
2. Vá para SQL Editor
3. Execute o script `src/scripts/study_rooms_setup.sql`

### Salas Mockadas

O sistema inclui um mock para criar salas de estudo automaticamente se não existirem no banco:
- Cardiologia Avançada
- Neurologia e Neurociência
- Técnicas Cirúrgicas
- Pediatria Geral
- Preparação para Residência

## Considerações de Performance

- **Limpeza automática**: As mensagens antigas são automaticamente removidas, mantendo apenas as 100 mais recentes por sala.
- **Rolagem inteligente**: O hook `useChatScroll` garante que o chat role para a última mensagem apenas quando apropriado.
- **Memoização**: Componentes usam React.memo para otimizar renderizações.

## Limitações Atuais e Melhorias Futuras

- **Suporte a mídias**: Atualmente só suporta texto, sem imagens ou anexos.
- **Indicador de digitação**: Não há indicação de quando um usuário está digitando.
- **Reações**: Não há suporte para reações com emojis ou semelhantes.
- **Histórico**: Acesso limitado a mensagens antigas (apenas as 100 mais recentes).
- **Menções**: Não há suporte para menções a usuários.

## Solução de Problemas

### Mensagens não aparecem em tempo real

1. Verifique se a publicação `supabase_realtime` está configurada corretamente.
2. Confirme que o usuário está autenticado.
3. Verifique as permissões RLS da tabela `chat_messages`.

### Canal não conecta

1. Verifique se Supabase Realtime está habilitado no projeto.
2. Certifique-se de que a tabela está adicionada à publicação.
3. Verifique a conectividade de rede.

---

## Referências 

- [Documentação do Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [React Chat UI Components](https://supabase.com/ui/docs/nextjs/realtime-chat) 