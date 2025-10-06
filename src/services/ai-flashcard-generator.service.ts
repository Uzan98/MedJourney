import { getAccessToken } from '@/lib/auth-utils';

export interface AIFlashcardParams {
  theme?: string;
  text?: string;
  pdfContent?: string;
  deckName: string;
  numberOfCards?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
}

export interface AIGeneratedFlashcard {
  front: string;
  back: string;
  hint?: string;
  tags?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AIFlashcardResponse {
  deckName: string;
  description: string;
  flashcards: AIGeneratedFlashcard[];
}

export interface FlashcardJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_data?: AIFlashcardResponse;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export class AIFlashcardGeneratorService {
  // Cria um job assíncrono para processamento de flashcards
  private static async createJob(prompt: string): Promise<{ jobId: string; status: string; message: string }> {
    try {
      console.log('🚀 AIFlashcardGeneratorService: Criando job assíncrono...');
      
      // Obter token de acesso para autenticação
      const accessToken = await getAccessToken();
      
      console.log('🔑 AIFlashcardGeneratorService: Token obtido:', accessToken ? 'SIM' : 'NÃO');
      
      if (!accessToken) {
        console.error('❌ AIFlashcardGeneratorService: Token de acesso não disponível');
        throw new Error('Você precisa estar logado para gerar flashcards com IA');
      }

      if (!response.ok) {
        throw new Error('Erro ao rastrear progresso');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao rastrear progresso:', error);
      throw error;
    }
  }

  // Método privado para chamar a API Groq
  private static async callGroqAPI(prompt: string, retryCount = 0): Promise<string> {
    const maxRetries = 3;
    
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/groq/flashcards', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Tratar erros específicos de permissão e limite
        if (response.status === 401) {
          throw new Error('Você precisa estar logado para gerar flashcards com IA.');
        }
        
        if (response.status === 403) {
          if (errorData.requiresUpgrade) {
            throw new Error('A geração de flashcards por IA é exclusiva para usuários Pro e Pro+. Faça upgrade do seu plano para acessar este recurso.');
          }
          throw new Error('Você não tem permissão para acessar este recurso.');
        }
        
        if (response.status === 401) {
          throw new Error('Erro de autenticação. Faça login novamente.');
        }
        
        if (response.status === 400) {
          throw new Error(errorData.error || 'Dados inválidos enviados para a API.');
        }
        
        throw new Error(errorData.error || `Erro na API: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Erro ao criar job de flashcards:', error);
      throw error;
    }
  }

  // Consulta o status de um job
  private static async getJobStatus(jobId: string): Promise<FlashcardJob> {
    try {
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('Você precisa estar logado para consultar o status do job');
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
      };

      const response = await fetch(`/api/jobs/flashcards/${jobId}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `Erro ao consultar job: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Erro ao consultar status do job:', error);
      throw error;
    }
  }

  // Aguarda a conclusão de um job com polling
  private static async waitForJobCompletion(jobId: string, onProgress?: (status: string) => void): Promise<AIFlashcardResponse> {
    const maxAttempts = 60; // 5 minutos (5 segundos * 60) - reduzido de 10 para 5 minutos
    const pollInterval = 5000; // 5 segundos
    const startTime = Date.now();
    const maxDuration = 5 * 60 * 1000; // 5 minutos em millisegundos
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    
    console.log(`🔄 Iniciando polling para job ${jobId} (máximo ${maxAttempts} tentativas)`);
    
    while (attempts < maxAttempts) {
      try {
        // Verificar timeout por tempo absoluto também
        if (Date.now() - startTime > maxDuration) {
          console.error(`⏰ Timeout absoluto atingido para job ${jobId} após ${Math.round((Date.now() - startTime) / 1000)}s`);
          throw new Error('Timeout: O processamento excedeu o tempo limite de 5 minutos.');
        }

        const job = await this.getJobStatus(jobId);
        consecutiveErrors = 0; // Reset contador de erros consecutivos
        
        console.log(`📊 Job ${jobId} - Status: ${job.status}, Tentativa: ${attempts + 1}/${maxAttempts}`);
        
        if (onProgress) {
          onProgress(job.status);
        }
        
        if (job.status === 'completed') {
          console.log(`✅ Job ${jobId} concluído com sucesso`);
          if (job.result_data) {
            // Garantir que result_data seja um objeto, não uma string
            let resultData = job.result_data;
            
            // Se result_data for uma string, fazer parse
            if (typeof resultData === 'string') {
              try {
                console.log('Tentando fazer parse do JSON. Tamanho:', resultData.length);
                console.log('Primeiros 200 caracteres:', resultData.substring(0, 200));
                console.log('Últimos 200 caracteres:', resultData.substring(resultData.length - 200));
                
                resultData = JSON.parse(resultData);
              } catch (error) {
                console.error('Erro ao fazer parse do result_data:', error);
                console.error('JSON malformado. Tamanho:', resultData.length);
                
                // Mostrar contexto ao redor do erro se possível
                if (error instanceof SyntaxError && error.message.includes('position')) {
                  const match = error.message.match(/position (\d+)/);
                  if (match) {
                    const position = parseInt(match[1]);
                    const start = Math.max(0, position - 100);
                    const end = Math.min(resultData.length, position + 100);
                    console.error('Contexto do erro (posição', position, '):', resultData.substring(start, end));
                  }
                }
                
                throw new Error(`Erro ao processar dados do resultado: ${error.message}`);
              }
            }
            
            return resultData;
          } else {
            throw new Error('Job concluído mas sem dados de resultado');
          }
        }
        
        if (job.status === 'failed') {
          console.error(`❌ Job ${jobId} falhou: ${job.error_message}`);
          throw new Error(job.error_message || 'Falha no processamento dos flashcards');
        }
        
        // Aguardar antes da próxima verificação
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
        
      } catch (error: any) {
        consecutiveErrors++;
        console.error(`❌ Erro ao verificar status do job ${jobId} (tentativa ${attempts + 1}, erro consecutivo ${consecutiveErrors}):`, error);
        
        // Se muitos erros consecutivos, parar
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.error(`🚫 Muitos erros consecutivos (${consecutiveErrors}) para job ${jobId}, parando polling`);
          throw new Error(`Muitos erros consecutivos ao verificar status do job. Último erro: ${error.message}`);
        }
        
        // Se for erro de rede, tentar novamente após um delay maior
        if (error.message?.includes('fetch') || error.name === 'TypeError') {
          console.log(`🔄 Erro de rede para job ${jobId}, tentando novamente em 10s...`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos para erros de rede
          attempts++;
          continue;
        }
        
        // Para outros erros, falhar imediatamente
        throw error;
      }
    }
    
    console.error(`⏰ Timeout por tentativas para job ${jobId} após ${attempts} tentativas`);
    throw new Error('Timeout: O processamento está demorando mais que o esperado. Tente novamente mais tarde.');
  }

  // Método principal para chamar a API com sistema assíncrono
  private static async callGroqAPI(prompt: string, onProgress?: (status: string) => void): Promise<AIFlashcardResponse> {
    try {
      // Criar o job
      const jobResponse = await this.createJob(prompt);
      console.log('📋 Job criado:', jobResponse);
      
      if (onProgress) {
        onProgress('processing');
      }
      
      // Aguardar conclusão do job
      const result = await this.waitForJobCompletion(jobResponse.jobId, onProgress);
      
      // Retornar o resultado diretamente
      return result;
      
    } catch (error: any) {
      console.error('Erro no processamento assíncrono:', error);
      throw error;
    }
  }

  // Gerar flashcards a partir de um tema
  static async generateFromTheme(params: AIFlashcardParams, onProgress?: (status: string) => void): Promise<AIFlashcardResponse> {
    if (!params.theme) {
      throw new Error('Tema é obrigatório para gerar flashcards');
    }

    const numberOfCards = params.numberOfCards || 10;
    const difficulty = params.difficulty || 'medium';
    const language = params.language || 'português brasileiro';

    const prompt = `
Você é um especialista em educação e criação de flashcards educacionais otimizados para máximo aprendizado. Sua missão é criar os ${numberOfCards} MELHORES flashcards possíveis sobre "${params.theme}" que maximizem a retenção e compreensão do estudante.

ESTRATÉGIA PEDAGÓGICA AVANÇADA:
- Aplique a técnica de REPETIÇÃO ESPAÇADA: crie flashcards que se complementem e reforcem conceitos
- Use o princípio da RECUPERAÇÃO ATIVA: formule perguntas que exijam recordação, não apenas reconhecimento
- Implemente CONEXÕES CONCEITUAIS: relacione conceitos entre si para criar uma rede de conhecimento
- Aplique a PIRÂMIDE DE BLOOM: varie entre memorização, compreensão, aplicação, análise e síntese

DISTRIBUIÇÃO INTELIGENTE DOS ${numberOfCards} FLASHCARDS:
- 30% Conceitos fundamentais e definições essenciais
- 25% Aplicações práticas e exemplos reais
- 20% Relações entre conceitos e comparações
- 15% Casos específicos e detalhes importantes
- 10% Perguntas de síntese e pensamento crítico

INSTRUÇÕES ESPECÍFICAS:
- Nível de dificuldade: ${difficulty}
- Idioma: ${language}
- PRIORIZE os conceitos mais impactantes para o aprendizado do tema
- Cada flashcard deve ser ÚNICO e complementar os outros
- Varie os tipos de pergunta: "O que é?", "Como funciona?", "Por que?", "Quando usar?", "Compare X e Y"
- Use técnicas mnemônicas quando apropriado
- Inclua contexto suficiente para evitar ambiguidade

FORMATO DE RESPOSTA (JSON válido):
{
  "deckName": "Nome educativo e motivador do deck",
  "description": "Descrição que destaque o valor educacional",
  "flashcards": [
    {
      "front": "Pergunta estratégica que promove recuperação ativa",
      "back": "Resposta completa com explicação clara e contexto",
      "hint": "Dica pedagógica que guia o raciocínio sem dar a resposta",
      "tags": ["conceito-chave", "categoria", "aplicação"],
      "difficulty": "${difficulty}"
    }
  ]
}

REGRAS CRÍTICAS:
1. Retorne APENAS o JSON válido, sem texto adicional
2. Cada flashcard deve ser ESSENCIAL para dominar o tema
3. Evite redundância - cada card deve ensinar algo único
4. Use linguagem precisa e educativa para o nível ${difficulty}
5. Crie uma progressão lógica do básico ao avançado
6. Inclua pelo menos 3 tags estratégicas por flashcard
7. As dicas devem estimular o pensamento, não dar respostas diretas

TEMA PARA DOMINAR: ${params.theme}
`;

    try {
      const response = await this.callGroqAPI(prompt, onProgress);
      
      // Debug: Log da resposta completa
      console.log('🔍 DEBUG - Resposta completa da IA:', JSON.stringify(response, null, 2));
      console.log('🔍 DEBUG - Tipo da resposta:', typeof response);
      console.log('🔍 DEBUG - response.flashcards existe?', 'flashcards' in response);
      console.log('🔍 DEBUG - response.flashcards é array?', Array.isArray(response.flashcards));
      console.log('🔍 DEBUG - Propriedades da resposta:', Object.keys(response));
      
      // Validar a resposta com logs mais específicos
      if (!response) {
        throw new Error('Resposta da IA inválida: resposta é null ou undefined');
      }
      
      if (!response.flashcards) {
        throw new Error('Resposta da IA inválida: propriedade flashcards não encontrada');
      }
      
      if (!Array.isArray(response.flashcards)) {
        throw new Error(`Resposta da IA inválida: flashcards não é um array (tipo: ${typeof response.flashcards})`);
      }
      
      if (response.flashcards.length === 0) {
        throw new Error('Resposta da IA inválida: array de flashcards está vazio');
      }
      
      // Se a resposta é uma string, tenta fazer parse JSON
      if (typeof response === 'string') {
        try {
          const parsedResponse = JSON.parse(response) as AIFlashcardResponse;
          
          // Validar a resposta
          if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }

      return response;
    } catch (error: any) {
      console.error('Erro no generateFromTheme:', error);
      
      // Se o erro já é uma mensagem amigável, mantém
      if (error.message?.includes('Resposta da IA inválida') || 
          error.message?.includes('Erro ao processar resposta da IA') ||
          error.message?.includes('Formato de resposta inesperado')) {
        throw error;
      }
      
      // Para outros erros, usar mensagem genérica
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
    }
  }

  // Gerar flashcards a partir de texto
  static async generateFromText(params: AIFlashcardParams, onProgress?: (status: string) => void): Promise<AIFlashcardResponse> {
    if (!params.text) {
      throw new Error('Texto é obrigatório para gerar flashcards');
    }

    const numberOfCards = params.numberOfCards || 10;
    const difficulty = params.difficulty || 'medium';
    const language = params.language || 'português brasileiro';

    const prompt = `
Você é um especialista em educação e criação de flashcards educacionais otimizados para máximo aprendizado. Sua missão é criar os ${numberOfCards} MELHORES flashcards possíveis baseados no texto fornecido que maximizem a retenção e compreensão do estudante.

TEXTO PARA ANÁLISE E OTIMIZAÇÃO:
"${params.text}"

ESTRATÉGIA PEDAGÓGICA AVANÇADA:
- Aplique a técnica de EXTRAÇÃO INTELIGENTE: identifique os conceitos mais valiosos do texto
- Use o princípio da RECUPERAÇÃO ATIVA: transforme informações passivas em perguntas ativas
- Implemente CONEXÕES CONCEITUAIS: relacione diferentes partes do texto entre si
- Aplique a PIRÂMIDE DE BLOOM: varie entre memorização, compreensão, aplicação, análise e síntese

DISTRIBUIÇÃO INTELIGENTE DOS ${numberOfCards} FLASHCARDS:
- 35% Conceitos-chave e definições extraídas do texto
- 25% Aplicações e exemplos mencionados no texto
- 20% Relações causais e processos descritos
- 15% Detalhes importantes e dados específicos
- 5% Perguntas de síntese que conectam todo o conteúdo

INSTRUÇÕES ESPECÍFICAS:
- Nível de dificuldade: ${difficulty}
- Idioma: ${language}
- EXTRAIA apenas os conceitos mais impactantes do texto fornecido
- Cada flashcard deve testar uma compreensão única do conteúdo
- Transforme informações declarativas em perguntas desafiadoras
- Use o contexto do texto para criar perguntas precisas
- Varie os tipos: definições, causas/efeitos, comparações, aplicações

FORMATO DE RESPOSTA (JSON válido):
{
  "deckName": "Nome educativo baseado no conteúdo principal do texto",
  "description": "Descrição que destaque os principais aprendizados do texto",
  "flashcards": [
    {
      "front": "Pergunta estratégica baseada no texto que promove recuperação ativa",
      "back": "Resposta extraída/inferida do texto com explicação clara",
      "hint": "Dica que referencia o contexto do texto sem dar a resposta",
      "tags": ["conceito-do-texto", "categoria", "aplicação"],
      "difficulty": "${difficulty}"
    }
  ]
}

REGRAS CRÍTICAS:
1. Retorne APENAS o JSON válido, sem texto adicional
2. Cada flashcard deve ser ESSENCIAL para dominar o conteúdo do texto
3. Evite redundância - cada card deve testar uma compreensão única
4. Use linguagem precisa e educativa para o nível ${difficulty}
5. Mantenha fidelidade ao conteúdo original do texto
6. Inclua pelo menos 3 tags estratégicas baseadas no texto
7. As dicas devem referenciar o contexto sem revelar respostas
8. Priorize informações que o estudante DEVE saber sobre este texto
`;

    try {
      const response = await this.callGroqAPI(prompt, onProgress);
      
      // Debug: Log da resposta completa
      console.log('🔍 DEBUG - Resposta completa da IA (generateFromText):', JSON.stringify(response, null, 2));
      console.log('🔍 DEBUG - Tipo da resposta:', typeof response);
      console.log('🔍 DEBUG - response.flashcards existe?', 'flashcards' in response);
      console.log('🔍 DEBUG - response.flashcards é array?', Array.isArray(response.flashcards));
      console.log('🔍 DEBUG - Propriedades da resposta:', Object.keys(response));
      
      // Validar a resposta com logs mais específicos
      if (!response) {
        throw new Error('Resposta da IA inválida: resposta é null ou undefined');
      }
      
      if (!response.flashcards) {
        throw new Error('Resposta da IA inválida: propriedade flashcards não encontrada');
      }
      
      if (!Array.isArray(response.flashcards)) {
        throw new Error(`Resposta da IA inválida: flashcards não é um array (tipo: ${typeof response.flashcards})`);
      }
      
      if (response.flashcards.length === 0) {
        throw new Error('Resposta da IA inválida: array de flashcards está vazio');
      }
      
      // Se a resposta é uma string, tenta fazer parse JSON
      if (typeof response === 'string') {
        try {
          const parsedResponse = JSON.parse(response) as AIFlashcardResponse;
          
          // Validar a resposta
          if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }

      return response;
    } catch (error: any) {
      console.error('Erro no generateFromText:', error);
      
      // Se o erro já é uma mensagem amigável, mantém
      if (error.message?.includes('Resposta da IA inválida') || 
          error.message?.includes('Erro ao processar resposta da IA') ||
          error.message?.includes('Formato de resposta inesperado')) {
        throw error;
      }
      
      // Para outros erros, usar mensagem genérica
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
    }
  }

  // Gerar flashcards a partir de PDF (conteúdo extraído)
  static async generateFromPDF(params: AIFlashcardParams, onProgress?: (status: string) => void): Promise<AIFlashcardResponse> {
    if (!params.pdfContent) {
      throw new Error('Conteúdo do PDF é obrigatório para gerar flashcards');
    }

    const numberOfCards = params.numberOfCards || 15;
    const difficulty = params.difficulty || 'medium';
    const language = params.language || 'português brasileiro';

    const prompt = `
Você é um especialista em educação e criação de flashcards educacionais otimizados para máximo aprendizado. Sua missão é criar os ${numberOfCards} MELHORES flashcards possíveis baseados no conteúdo do PDF que maximizem a retenção e compreensão do estudante.

CONTEÚDO DO PDF PARA ANÁLISE E OTIMIZAÇÃO:
"${params.pdfContent}"

ESTRATÉGIA PEDAGÓGICA AVANÇADA:
- Aplique a técnica de MINERAÇÃO DE CONHECIMENTO: extraia os conceitos mais valiosos do documento
- Use o princípio da RECUPERAÇÃO ATIVA: transforme informações passivas em perguntas desafiadoras
- Implemente CONEXÕES CONCEITUAIS: relacione diferentes seções do documento
- Aplique a PIRÂMIDE DE BLOOM: varie entre memorização, compreensão, aplicação, análise e síntese

DISTRIBUIÇÃO INTELIGENTE DOS ${numberOfCards} FLASHCARDS:
- 30% Conceitos fundamentais e definições-chave do documento
- 25% Processos, procedimentos e metodologias descritas
- 20% Fórmulas, dados específicos e informações técnicas
- 15% Aplicações práticas e exemplos mencionados
- 10% Perguntas de síntese que integram todo o conteúdo

INSTRUÇÕES ESPECÍFICAS:
- Nível de dificuldade: ${difficulty}
- Idioma: ${language}
- IDENTIFIQUE e extraia apenas os conceitos mais impactantes do documento
- Cada flashcard deve testar uma compreensão única do material
- Priorize definições, processos, fórmulas e conceitos-chave
- Use terminologia técnica apropriada quando presente no documento
- Varie os tipos: definições, procedimentos, cálculos, aplicações

FORMATO DE RESPOSTA (JSON válido):
{
  "deckName": "Nome educativo baseado no conteúdo principal do PDF",
  "description": "Descrição que destaque os principais aprendizados do documento",
  "flashcards": [
    {
      "front": "Pergunta estratégica baseada no PDF que promove recuperação ativa",
      "back": "Resposta extraída do documento com explicação clara e contexto",
      "hint": "Dica que referencia o material sem revelar a resposta",
      "tags": ["conceito-do-pdf", "categoria", "aplicação"],
      "difficulty": "${difficulty}"
    }
  ]
}

REGRAS CRÍTICAS:
1. Retorne APENAS o JSON válido, sem texto adicional
2. Cada flashcard deve ser ESSENCIAL para dominar o conteúdo do PDF
3. Evite redundância - cada card deve testar uma compreensão única
4. Use linguagem precisa e técnica apropriada para o nível ${difficulty}
5. Mantenha fidelidade absoluta ao conteúdo original do documento
6. Inclua pelo menos 3 tags estratégicas baseadas no conteúdo
7. As dicas devem referenciar o contexto do documento
8. Priorize informações que o estudante DEVE dominar deste material
9. Se houver fórmulas ou dados técnicos, inclua-os estrategicamente
`;

    try {
      const response = await this.callGroqAPI(prompt, onProgress);
      
      // Debug: Log da resposta completa
      console.log('🔍 DEBUG - Resposta completa da IA (generateFromPDF):', JSON.stringify(response, null, 2));
      console.log('🔍 DEBUG - Tipo da resposta:', typeof response);
      console.log('🔍 DEBUG - response.flashcards existe?', 'flashcards' in response);
      console.log('🔍 DEBUG - response.flashcards é array?', Array.isArray(response.flashcards));
      console.log('🔍 DEBUG - Propriedades da resposta:', Object.keys(response));
      
      // Validar a resposta com logs mais específicos
      if (!response) {
        throw new Error('Resposta da IA inválida: resposta é null ou undefined');
      }
      
      if (!response.flashcards) {
        throw new Error('Resposta da IA inválida: propriedade flashcards não encontrada');
      }
      
      if (!Array.isArray(response.flashcards)) {
        throw new Error(`Resposta da IA inválida: flashcards não é um array (tipo: ${typeof response.flashcards})`);
      }
      
      if (response.flashcards.length === 0) {
        throw new Error('Resposta da IA inválida: array de flashcards está vazio');
      }
      
      // Se a resposta é uma string, tenta fazer parse JSON
      if (typeof response === 'string') {
        try {
          const parsedResponse = JSON.parse(response) as AIFlashcardResponse;
          
          // Validar a resposta
          if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }

      return response;
    } catch (error: any) {
      console.error('Erro no generateFromPDF:', error);
      
      // Se o erro já é uma mensagem amigável, mantém
      if (error.message?.includes('Resposta da IA inválida') || 
          error.message?.includes('Erro ao processar resposta da IA') ||
          error.message?.includes('Formato de resposta inesperado')) {
        throw error;
      }
      
      // Para outros erros, usar mensagem genérica
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
    }
  }
}