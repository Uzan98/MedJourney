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

export class AIFlashcardGeneratorService {
  // Rastrear progresso de geração assíncrona
  static async trackProgress(sessionId: string): Promise<any> {
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/groq/flashcards/progress/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Retry para timeout 504
        if (response.status === 504 && retryCount < maxRetries) {
          console.log(`Timeout detectado, tentativa ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
          return this.callGroqAPI(prompt, retryCount + 1);
        }
        
        // Erros específicos
        if (response.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        }
        
        if (response.status === 401) {
          throw new Error('Erro de autenticação. Faça login novamente.');
        }
        
        if (response.status === 403) {
          throw new Error('Acesso negado. Verifique suas permissões.');
        }
        
        throw new Error(errorData.error || `Erro na API: ${response.status}`);
      }

      const data = await response.json();
      
      // Se a resposta indica processamento assíncrono
      if (data.isAsync && data.sessionId) {
        return data; // Retorna o objeto com sessionId
      }
      
      // Se a resposta já contém os flashcards
      if (data.flashcards) {
        return data; // Retorna o objeto já parseado
      }
      
      // Se é uma string de resposta da IA
      return data.result || data.response || data;
      
    } catch (error: any) {
      if (retryCount < maxRetries && (error.message?.includes('timeout') || error.message?.includes('network'))) {
        console.log(`Erro de rede, tentativa ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return this.callGroqAPI(prompt, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Gerar flashcards a partir de tema
  static async generateFromTheme(params: AIFlashcardParams): Promise<AIFlashcardResponse> {
    if (!params.theme) {
      throw new Error('Tema é obrigatório para gerar flashcards');
    }

    const numberOfCards = params.numberOfCards || 10;
    const difficulty = params.difficulty || 'medium';
    const language = params.language || 'português brasileiro';

    const prompt = `
Você é um especialista em educação e criação de flashcards educacionais. Sua tarefa é criar flashcards de alta qualidade sobre o tema: "${params.theme}".

INSTRUÇÕES ESPECÍFICAS:
- Crie exatamente ${numberOfCards} flashcards
- Nível de dificuldade: ${difficulty}
- Idioma: ${language}
- Foque nos conceitos mais importantes e fundamentais do tema
- Cada flashcard deve ter uma pergunta clara na frente e uma resposta completa no verso
- Inclua dicas quando apropriado
- Adicione tags relevantes para categorização

FORMATO DE RESPOSTA (JSON válido):
{
  "deckName": "Nome do deck baseado no tema",
  "description": "Descrição breve do deck",
  "flashcards": [
    {
      "front": "Pergunta ou conceito a ser testado",
      "back": "Resposta completa e explicativa",
      "hint": "Dica opcional para ajudar na resposta",
      "tags": ["tag1", "tag2", "tag3"],
      "difficulty": "${difficulty}"
    }
  ]
}

REGRAS IMPORTANTES:
1. Retorne APENAS o JSON válido, sem texto adicional
2. Certifique-se de que todas as perguntas sejam claras e específicas
3. As respostas devem ser completas mas concisas
4. Use linguagem apropriada para o nível de dificuldade especificado
5. Varie os tipos de perguntas (definições, aplicações, comparações, etc.)
6. Inclua pelo menos 3 tags relevantes por flashcard

Tema: ${params.theme}
`;

    try {
      const response = await this.callGroqAPI(prompt);
      
      // Se a resposta é um objeto (resposta assíncrona ou já parseada), retorna diretamente
      if (typeof response === 'object' && response !== null) {
        // Verificar se é resposta assíncrona
        if ('isAsync' in response && response.isAsync) {
          return response as any;
        }
        
        // Se já é um objeto com flashcards, validar e retornar
        if ('flashcards' in response) {
          const flashcardResponse = response as AIFlashcardResponse;
          if (!flashcardResponse.flashcards || !Array.isArray(flashcardResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }
          return flashcardResponse;
        }
        
        return response as AIFlashcardResponse;
      }
      
      // Se a resposta é uma string, tenta fazer parse JSON
      if (typeof response === 'string') {
        try {
          const parsedResponse = JSON.parse(response) as AIFlashcardResponse;
          
          // Validar a resposta
          if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }

          return parsedResponse;
        } catch (parseError) {
          console.error('Erro ao fazer parse do JSON:', parseError);
          console.error('Resposta recebida:', response);
          throw new Error('Erro ao processar resposta da IA. A resposta não está em formato JSON válido.');
        }
      }
      
      throw new Error('Formato de resposta inesperado da API');
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
  static async generateFromText(params: AIFlashcardParams): Promise<AIFlashcardResponse> {
    if (!params.text) {
      throw new Error('Texto é obrigatório para gerar flashcards');
    }

    const numberOfCards = params.numberOfCards || 10;
    const difficulty = params.difficulty || 'medium';
    const language = params.language || 'português brasileiro';

    const prompt = `
Você é um especialista em educação e criação de flashcards educacionais. Sua tarefa é analisar o texto fornecido e criar flashcards de alta qualidade baseados no conteúdo.

TEXTO PARA ANÁLISE:
"${params.text}"

INSTRUÇÕES ESPECÍFICAS:
- Crie exatamente ${numberOfCards} flashcards baseados no texto fornecido
- Nível de dificuldade: ${difficulty}
- Idioma: ${language}
- Extraia os conceitos mais importantes do texto
- Cada flashcard deve testar a compreensão do conteúdo
- Inclua dicas quando apropriado
- Adicione tags relevantes baseadas no conteúdo

FORMATO DE RESPOSTA (JSON válido):
{
  "deckName": "Nome do deck baseado no conteúdo do texto",
  "description": "Descrição breve do deck baseada no texto",
  "flashcards": [
    {
      "front": "Pergunta baseada no texto",
      "back": "Resposta extraída ou inferida do texto",
      "hint": "Dica opcional relacionada ao conteúdo",
      "tags": ["tag1", "tag2", "tag3"],
      "difficulty": "${difficulty}"
    }
  ]
}

REGRAS IMPORTANTES:
1. Retorne APENAS o JSON válido, sem texto adicional
2. Base todas as perguntas e respostas no texto fornecido
3. Não invente informações que não estejam no texto
4. Varie os tipos de perguntas (definições, relações, aplicações, etc.)
5. Use citações diretas quando apropriado
6. Inclua pelo menos 3 tags relevantes por flashcard baseadas no conteúdo
`;

    try {
      const response = await this.callGroqAPI(prompt);
      
      // Se a resposta é um objeto (resposta assíncrona ou já parseada), retorna diretamente
      if (typeof response === 'object' && response !== null) {
        // Verificar se é resposta assíncrona
        if ('isAsync' in response && response.isAsync) {
          return response as any;
        }
        
        // Se já é um objeto com flashcards, validar e retornar
        if ('flashcards' in response) {
          const flashcardResponse = response as AIFlashcardResponse;
          if (!flashcardResponse.flashcards || !Array.isArray(flashcardResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }
          return flashcardResponse;
        }
        
        return response as AIFlashcardResponse;
      }
      
      // Se a resposta é uma string, tenta fazer parse JSON
      if (typeof response === 'string') {
        try {
          const parsedResponse = JSON.parse(response) as AIFlashcardResponse;
          
          // Validar a resposta
          if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }

          return parsedResponse;
        } catch (parseError) {
          console.error('Erro ao fazer parse do JSON:', parseError);
          console.error('Resposta recebida:', response);
          throw new Error('Erro ao processar resposta da IA. A resposta não está em formato JSON válido.');
        }
      }
      
      throw new Error('Formato de resposta inesperado da API');
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

  // Gerar flashcards a partir de PDF
  static async generateFromPDF(params: AIFlashcardParams): Promise<AIFlashcardResponse> {
    if (!params.pdfContent) {
      throw new Error('Conteúdo do PDF é obrigatório para gerar flashcards');
    }

    const numberOfCards = params.numberOfCards || 15;
    const difficulty = params.difficulty || 'medium';
    const language = params.language || 'português brasileiro';

    const prompt = `
Você é um especialista em educação e criação de flashcards educacionais. Sua tarefa é analisar o conteúdo extraído de um PDF e criar flashcards de alta qualidade baseados no material.

CONTEÚDO DO PDF:
"${params.pdfContent}"

INSTRUÇÕES ESPECÍFICAS:
- Crie exatamente ${numberOfCards} flashcards baseados no conteúdo do PDF
- Nível de dificuldade: ${difficulty}
- Idioma: ${language}
- Identifique e extraia os conceitos mais importantes do documento
- Foque em definições, processos, fórmulas, e conceitos-chave
- Cada flashcard deve testar a compreensão do material
- Inclua dicas quando apropriado
- Adicione tags relevantes baseadas no conteúdo

FORMATO DE RESPOSTA (JSON válido):
{
  "deckName": "Nome do deck baseado no conteúdo do PDF",
  "description": "Descrição breve do deck baseada no documento",
  "flashcards": [
    {
      "front": "Pergunta baseada no conteúdo do PDF",
      "back": "Resposta extraída do documento",
      "hint": "Dica opcional relacionada ao conteúdo",
      "tags": ["tag1", "tag2", "tag3"],
      "difficulty": "${difficulty}"
    }
  ]
}

REGRAS IMPORTANTES:
1. Retorne APENAS o JSON válido, sem texto adicional
2. Base todas as perguntas e respostas no conteúdo do PDF
3. Não invente informações que não estejam no documento
4. Priorize conceitos fundamentais e definições importantes
5. Se houver fórmulas ou processos, inclua-os nos flashcards
6. Inclua pelo menos 3 tags relevantes por flashcard baseadas no conteúdo
7. Organize as informações de forma didática e clara
`;

    try {
      const response = await this.callGroqAPI(prompt);
      
      // Se a resposta é um objeto (resposta assíncrona ou já parseada), retorna diretamente
      if (typeof response === 'object' && response !== null) {
        // Verificar se é resposta assíncrona
        if ('isAsync' in response && response.isAsync) {
          return response as any;
        }
        
        // Se já é um objeto com flashcards, validar e retornar
        if ('flashcards' in response) {
          const flashcardResponse = response as AIFlashcardResponse;
          if (!flashcardResponse.flashcards || !Array.isArray(flashcardResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }
          return flashcardResponse;
        }
        
        return response as AIFlashcardResponse;
      }
      
      // Se a resposta é uma string, tenta fazer parse JSON
      if (typeof response === 'string') {
        try {
          const parsedResponse = JSON.parse(response) as AIFlashcardResponse;
          
          // Validar a resposta
          if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }

          return parsedResponse;
        } catch (parseError) {
          console.error('Erro ao fazer parse do JSON:', parseError);
          console.error('Resposta recebida:', response);
          throw new Error('Erro ao processar resposta da IA. A resposta não está em formato JSON válido.');
        }
      }
      
      throw new Error('Formato de resposta inesperado da API');
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