# Documentação do Recurso "Minha Faculdade"

## Visão Geral

O recurso "Minha Faculdade" permite que os usuários criem ambientes compartilhados para suas turmas, onde podem trocar materiais, tirar dúvidas, compartilhar avisos e organizar informações sobre provas e exercícios.

## Estrutura de Dados

### Tabelas Principais

1. **faculties** - Armazena informações sobre os ambientes de faculdade
2. **faculty_members** - Relacionamento entre usuários e ambientes
3. **faculty_posts** - Posts e anúncios dentro dos ambientes
4. **faculty_comments** - Comentários nos posts
5. **faculty_materials** - Materiais compartilhados
6. **faculty_exams** - Informações sobre provas e avaliações

## Funcionalidades

### Para Usuários

- Criar um ambiente para sua turma
- Entrar em um ambiente existente usando um código
- Visualizar e participar de fóruns de discussão
- Compartilhar e baixar materiais de estudo
- Acompanhar datas de provas e entregas
- Receber avisos importantes

### Para Administradores

- Gerenciar membros do ambiente
- Criar anúncios fixados
- Moderar conteúdo
- Configurar permissões

## Fluxos de Uso

### Criação de Ambiente

1. Usuário acessa a página "Minha Faculdade"
2. Clica em "Criar Ambiente"
3. Preenche informações como nome, descrição, instituição, etc.
4. Ambiente é criado e um código único é gerado
5. Usuário pode compartilhar o código com colegas

### Entrada em Ambiente

1. Usuário acessa a página "Minha Faculdade"
2. Clica em "Entrar com Código"
3. Insere o código fornecido pelo criador do ambiente
4. Usuário é adicionado como membro e redirecionado para o ambiente

## Permissões

- **Admin**: Criador do ambiente ou usuário promovido. Pode gerenciar membros, criar anúncios, moderar conteúdo.
- **Moderador**: Pode criar anúncios, moderar conteúdo, mas não pode gerenciar membros.
- **Membro**: Pode visualizar conteúdo, criar posts, fazer comentários e compartilhar materiais.

## Implementação Técnica

### Front-end

- Páginas principais em `/src/app/minha-faculdade/`
- Componentes específicos em `/src/components/faculty/`
- Tipos definidos em `/src/types/faculty.ts`

### Back-end

- Serviço em `/src/services/faculty.service.ts`
- Script SQL de configuração em `/src/scripts/faculty_setup.sql`

## Segurança

- Row Level Security (RLS) implementado no banco de dados
- Verificação de associação ao ambiente antes de permitir acesso aos dados
- Proteção contra acesso não autorizado a ambientes privados

## Próximos Passos

1. Implementar notificações para novos posts e comentários
2. Adicionar sistema de avaliação de materiais
3. Integrar com o calendário para eventos e provas
4. Implementar sistema de busca dentro dos materiais
5. Adicionar estatísticas de uso e engajamento 