# MedJourney - Plataforma de Estudos para Medicina

MedJourney é uma aplicação web projetada para ajudar estudantes de medicina a organizar seus estudos de forma eficiente, com recursos de planejamento inteligente, análise de desempenho e gerenciamento de conteúdo.

## Características Principais

- **Planejamento Inteligente**: Algoritmo de repetição espaçada para otimizar a retenção de conteúdo
- **Sincronização Offline/Online**: Funcionamento mesmo sem conexão com a internet, com sincronização automática quando online
- **Organização por Disciplinas**: Gerenciamento de disciplinas, assuntos e níveis de importância
- **Acompanhamento de Progresso**: Métricas e estatísticas detalhadas sobre o desempenho nos estudos
- **Simulados**: Ferramenta de criação e execução de simulados para praticar

## Tecnologias Utilizadas

- [Next.js](https://nextjs.org) - Framework React
- [TypeScript](https://www.typescriptlang.org/) - Tipagem estática
- [TailwindCSS](https://tailwindcss.com/) - Estilização
- [Azure SQL Database](https://azure.microsoft.com/pt-br/products/azure-sql/) - Banco de dados
- [Lucide Icons](https://lucide.dev/) - Ícones

## Como Instalar

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/medjourney-app.git
cd medjourney-app

# Instalar dependências
npm install

# Criar arquivo .env.local com as configurações de banco de dados
# Exemplo:
# AZURE_SQL_SERVER=seu-servidor.database.windows.net
# AZURE_SQL_DATABASE=MedJourney
# AZURE_SQL_USER=seu-usuario
# AZURE_SQL_PASSWORD=sua-senha
# AZURE_SQL_PORT=1433
# DB_UPDATE_KEY=sua-chave-de-atualizacao

# Iniciar o servidor de desenvolvimento
npm run dev
```

## Configuração do Banco de Dados

O projeto utiliza o SQL Server da Microsoft Azure. Antes de executar a aplicação pela primeira vez:

1. Certifique-se de ter criado um banco de dados SQL no Azure ou ter um SQL Server local configurado
2. Execute os scripts de criação de tabelas disponíveis em `/src/app/api/sql/`
3. Configure as variáveis de ambiente no arquivo `.env.local`

## Funcionalidades

- **Dashboard**: Visão geral dos estudos e métricas de desempenho
- **Disciplinas**: Gerenciamento de disciplinas e assuntos
- **Planejamento Inteligente**: Criação de planos de estudo otimizados
- **Simulados**: Criação e execução de simulados com questões personalizadas
- **Estatísticas**: Análise detalhada do desempenho e progresso

## Modo Offline

A aplicação foi projetada para funcionar offline, armazenando dados localmente até que uma conexão com a internet esteja disponível para sincronização com o servidor.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

[MIT](LICENSE)
