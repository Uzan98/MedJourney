# Documentação da API do MedJourney

Esta documentação descreve os endpoints disponíveis no MedJourney para manipulação de dados.

## Autenticação

*Observação: A autenticação não está implementada completamente no estado atual.*

Para endpoints que exigem autenticação, inclua um token JWT no cabeçalho:

```
Authorization: Bearer <token>
```

## Formatos de Resposta

Todas as respostas seguem o formato padrão:

```json
{
  "success": true/false,
  "data/error": {...}/mensagem de erro
}
```

## Endpoints

### Verificação de Saúde

#### GET /api/health

Verifica se o servidor está online.

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2023-05-15T10:30:45.123Z"
}
```

### Disciplinas

#### GET /api/disciplines

Lista todas as disciplinas.

**Parâmetros:**
- `onlyUser` (opcional): Se `true`, retorna apenas disciplinas do usuário atual.

**Resposta:**
```json
{
  "success": true,
  "disciplines": [
    {
      "Id": 1,
      "Name": "Anatomia",
      "Description": "Estudo de estruturas anatômicas",
      "Theme": "vermelho",
      "CreatedAt": "2023-05-15T10:30:45.123Z",
      "UpdatedAt": "2023-05-15T10:30:45.123Z"
    }
  ]
}
```

#### POST /api/disciplines

Cria uma nova disciplina.

**Corpo:**
```json
{
  "name": "Anatomia",
  "description": "Estudo de estruturas anatômicas",
  "theme": "vermelho"
}
```

**Resposta:**
```json
{
  "success": true,
  "discipline": {
    "Id": 1,
    "Name": "Anatomia",
    "Description": "Estudo de estruturas anatômicas",
    "Theme": "vermelho",
    "CreatedAt": "2023-05-15T10:30:45.123Z"
  }
}
```

#### GET /api/disciplines/{id}

Obtém detalhes de uma disciplina específica.

**Resposta:**
```json
{
  "success": true,
  "discipline": {
    "Id": 1,
    "Name": "Anatomia",
    "Description": "Estudo de estruturas anatômicas",
    "Theme": "vermelho",
    "CreatedAt": "2023-05-15T10:30:45.123Z",
    "UpdatedAt": "2023-05-15T10:30:45.123Z"
  }
}
```

#### PUT /api/disciplines/{id}

Atualiza uma disciplina existente.

**Corpo:**
```json
{
  "name": "Anatomia Humana",
  "description": "Estudo detalhado de estruturas anatômicas",
  "theme": "vermelho"
}
```

**Resposta:**
```json
{
  "success": true,
  "discipline": {
    "Id": 1,
    "Name": "Anatomia Humana",
    "Description": "Estudo detalhado de estruturas anatômicas",
    "Theme": "vermelho",
    "UpdatedAt": "2023-05-15T10:35:45.123Z"
  }
}
```

#### DELETE /api/disciplines/{id}

Exclui uma disciplina.

**Resposta:**
```json
{
  "success": true,
  "message": "Disciplina excluída com sucesso"
}
```

### Assuntos

#### GET /api/disciplines/{id}/subjects

Lista todos os assuntos de uma disciplina.

**Resposta:**
```json
{
  "success": true,
  "subjects": [
    {
      "Id": 1,
      "DisciplineId": 1,
      "Name": "Sistema Cardiovascular",
      "Description": "Estudo do coração e vasos sanguíneos",
      "Difficulty": "média",
      "Importance": "alta",
      "EstimatedHours": 8,
      "CreatedAt": "2023-05-15T10:30:45.123Z",
      "UpdatedAt": "2023-05-15T10:30:45.123Z"
    }
  ]
}
```

#### POST /api/disciplines/{id}/subjects

Cria um novo assunto em uma disciplina.

**Corpo:**
```json
{
  "name": "Sistema Cardiovascular",
  "description": "Estudo do coração e vasos sanguíneos",
  "difficulty": "média",
  "importance": "alta",
  "estimatedHours": 8
}
```

**Resposta:**
```json
{
  "success": true,
  "subject": {
    "Id": 1,
    "DisciplineId": 1,
    "Name": "Sistema Cardiovascular",
    "Description": "Estudo do coração e vasos sanguíneos",
    "Difficulty": "média",
    "Importance": "alta",
    "EstimatedHours": 8,
    "CreatedAt": "2023-05-15T10:30:45.123Z"
  }
}
```

### Planos de Estudo

#### GET /api/study-plans

Lista todos os planos de estudo.

**Parâmetros:**
- `status` (opcional): Filtra por status ("ativo", "pausado", "concluido")
- `limit` (opcional): Limita o número de resultados

**Resposta:**
```json
{
  "success": true,
  "plans": [
    {
      "Id": 1,
      "Name": "Plano para Residência",
      "Description": "Preparação para prova de residência",
      "StartDate": "2023-05-15",
      "EndDate": "2023-11-15",
      "Status": "ativo",
      "CreatedAt": "2023-05-15T10:30:45.123Z",
      "UpdatedAt": "2023-05-15T10:30:45.123Z"
    }
  ]
}
```

#### POST /api/study-plans

Cria um novo plano de estudo.

**Corpo:**
```json
{
  "name": "Plano para Residência",
  "description": "Preparação para prova de residência",
  "startDate": "2023-05-15",
  "endDate": "2023-11-15",
  "status": "ativo",
  "metaData": "{\"disciplinas\":[...], \"diasSemana\":[...], \"cronograma\":[...]}"
}
```

**Resposta:**
```json
{
  "success": true,
  "plan": {
    "Id": 1,
    "Name": "Plano para Residência",
    "Description": "Preparação para prova de residência",
    "StartDate": "2023-05-15",
    "EndDate": "2023-11-15",
    "Status": "ativo",
    "CreatedAt": "2023-05-15T10:30:45.123Z"
  }
}
```

#### PUT /api/study-plans

Atualiza um plano de estudo existente.

**Corpo:**
```json
{
  "id": 1,
  "name": "Plano para Residência 2023",
  "status": "pausado",
  "metaData": "{\"disciplinas\":[...], \"diasSemana\":[...], \"cronograma\":[...]}"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Plano de estudo atualizado com sucesso",
  "plan": {
    "id": 1,
    "name": "Plano para Residência 2023",
    "description": "Preparação para prova de residência",
    "startDate": "2023-05-15",
    "endDate": "2023-11-15",
    "status": "pausado",
    "createdAt": "2023-05-15T10:30:45.123Z",
    "updatedAt": "2023-05-15T10:35:45.123Z"
  }
}
```

#### DELETE /api/study-plans

Exclui um plano de estudo.

**Parâmetros:**
- `id`: ID do plano a ser excluído

**Resposta:**
```json
{
  "success": true,
  "message": "Plano de estudo excluído com sucesso"
}
```

### Atualização do Esquema do Banco de Dados

#### POST /api/sql/update-schema

Atualiza o esquema do banco de dados (protegido por chave API).

**Cabeçalhos:**
- `x-api-key`: Chave de API definida em DB_UPDATE_KEY no .env

**Corpo:**
```json
{
  "action": "add-metadata-column"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Coluna MetaData adicionada com sucesso à tabela StudyPlans"
}
```

## Códigos de Erro

- 400: Solicitação inválida (dados incompletos ou incorretos)
- 401: Não autorizado (autenticação necessária)
- 403: Proibido (sem permissão para acessar o recurso)
- 404: Recurso não encontrado
- 409: Conflito (por exemplo, tentativa de criar um recurso que já existe)
- 500: Erro interno do servidor 