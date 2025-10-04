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
  // Chama a rota interna protegida do Groq com retry automático
  private static async callGroqAPI(prompt: string, retryCount = 0): Promise<string> {
    const maxRetries = 2;
    
    try {
      console.log('🚀 AIFlashcardGeneratorService: Iniciando chamada para API Groq...');
      
      // Obter token de acesso para autenticação
      const accessToken = await getAccessToken();
      
      console.log('🔑 AIFlashcardGeneratorService: Token obtido:', accessToken ? 'SIM' : 'NÃO');
      
      if (!accessToken) {
        console.error('❌ AIFlashcardGeneratorService: Token de acesso não disponível');
        throw new Error('Você precisa estar logado para gerar flashcards com IA');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      };

      console.log('📡 AIFlashcardGeneratorService: Fazendo requisição para /api/groq/flashcards');

      const response = await fetch('/api/groq/flashcards', {
        method: 'POST',
        headers,
        credentials: 'include', // Importante para enviar cookies de sessão
        body: JSON.stringify({ prompt }),
      });
      
      console.log('📥 AIFlashcardGeneratorService: Resposta recebida, status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        
        console.error('❌ AIFlashcardGeneratorService: Erro na resposta:', {
          status: response.status,
          errorData
        });
        
        // Se for timeout (504) e ainda temos tentativas, retry automaticamente
        if (response.status === 504 && retryCount < maxRetries) {
          console.log(`Timeout na tentativa ${retryCount + 1}, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1 segundo
          return this.callGroqAPI(prompt, retryCount + 1);
        }
        
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
        
        if (response.status === 429) {
          if (errorData.limitReached) {
            throw new Error('Você atingiu o limite diário de flashcards. Tente novamente amanhã ou faça upgrade para o plano Pro+ para flashcards ilimitados.');
          }
          throw new Error('Muitas requisições. Tente novamente em alguns minutos.');
        }
        
        if (response.status === 504) {
          throw new Error('A requisição demorou demais para ser processada. Tente novamente.');
        }
        
        throw new Error(errorData.error || `Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return data.result;
    } catch (error: any) {
      // Se for erro de rede/timeout e ainda temos tentativas, retry automaticamente
      if ((error.name === 'TypeError' || error.message?.includes('fetch')) && retryCount < maxRetries) {
        console.log(`Erro de rede na tentativa ${retryCount + 1}, tentando novamente...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1 segundo
        return this.callGroqAPI(prompt, retryCount + 1);
      }
      
      console.error('Erro ao chamar a API Groq para flashcards:', error);
      throw error;
    }
  }

  // Gerar flashcards a partir de um tema
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
      const parsedResponse = JSON.parse(response) as AIFlashcardResponse;
      
      // Validar a resposta
      if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
        throw new Error('Resposta da IA inválida: flashcards não encontrados');
      }

      return parsedResponse;
    } catch (error: any) {
      if (error.message?.includes('JSON')) {
        throw new Error('Erro ao processar resposta da IA. Tente novamente.');
      }
      throw error;
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
      const parsedResponse = JSON.parse(response) as AIFlashcardResponse;
      
      // Validar a resposta
      if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
        throw new Error('Resposta da IA inválida: flashcards não encontrados');
      }

      return parsedResponse;
    } catch (error: any) {
      if (error.message?.includes('JSON')) {
        throw new Error('Erro ao processar resposta da IA. Tente novamente.');
      }
      throw error;
    }
  }

  // Gerar flashcards a partir de PDF (conteúdo extraído)
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
      const parsedResponse = JSON.parse(response) as AIFlashcardResponse;
      
      // Validar a resposta
      if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
        throw new Error('Resposta da IA inválida: flashcards não encontrados');
      }

      return parsedResponse;
    } catch (error: any) {
      if (error.message?.includes('JSON')) {
        throw new Error('Erro ao processar resposta da IA. Tente novamente.');
      }
      throw error;
    }
  }
}