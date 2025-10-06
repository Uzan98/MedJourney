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
  
  static async trackProgress(sessionId: string): Promise<any> {
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/groq/flashcards/progress/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao verificar progresso');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao verificar progresso:', error);
      throw error;
    }
  }

  private static async callGroqAPI(prompt: string, retryCount = 0): Promise<string> {
    const maxRetries = 3;
    
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/groq/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        if (response.status === 504 && retryCount < maxRetries) {
          console.log(`Timeout detectado, tentativa ${retryCount + 1} de ${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
          return this.callGroqAPI(prompt, retryCount + 1);
        }
        
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          throw new Error('Limite de requisições atingido. Tente novamente em alguns minutos.');
        } else if (response.status === 403) {
          throw new Error('Acesso negado. Verifique suas permissões.');
        } else if (response.status === 401) {
          throw new Error('Token de autenticação inválido.');
        }
        
        throw new Error(errorData.error || `Erro na API: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.sessionId) {
        return data;
      }
      
      return data.result || data;
    } catch (error) {
      if (retryCount < maxRetries && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        console.log(`Erro de rede, tentativa ${retryCount + 1} de ${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.callGroqAPI(prompt, retryCount + 1);
      }
      throw error;
    }
  }

  static async generateFromTheme(params: AIFlashcardParams): Promise<AIFlashcardResponse> {
    const prompt = `Crie ${params.numberOfCards || 10} flashcards sobre o tema: "${params.theme}".

Instruções específicas:
- Dificuldade: ${params.difficulty || 'medium'}
- Idioma: ${params.language || 'português'}
- Nome do deck: "${params.deckName}"

Formato de resposta JSON:
{
  "deckName": "${params.deckName}",
  "description": "Descrição breve do deck",
  "flashcards": [
    {
      "front": "Pergunta ou conceito",
      "back": "Resposta ou explicação detalhada",
      "hint": "Dica opcional",
      "tags": ["tag1", "tag2"],
      "difficulty": "easy|medium|hard"
    }
  ]
}

Regras importantes:
1. Responda APENAS com JSON válido
2. Não inclua texto adicional fora do JSON
3. Cada flashcard deve ter front e back preenchidos
4. As tags devem ser relevantes ao conteúdo
5. A dificuldade deve corresponder ao nível solicitado`;

    try {
      const response = await this.callGroqAPI(prompt);
      
      if (typeof response === 'object' && response !== null) {
        if ('isAsync' in response && response.isAsync) {
          return response as any;
        }
        
        if ('flashcards' in response) {
          const flashcardResponse = response as AIFlashcardResponse;
          if (!flashcardResponse.flashcards || !Array.isArray(flashcardResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }
          return flashcardResponse;
        }
      }
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response as string);
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta:', response);
        throw new Error('Formato de resposta inesperado da IA');
      }
      
      if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
        throw new Error('Resposta da IA inválida: estrutura de flashcards incorreta');
      }
      
      return parsedResponse;
    } catch (error) {
      console.error('Erro ao gerar flashcards do tema:', error);
      
      if (error.message?.includes('Resposta da IA inválida') || 
          error.message?.includes('Erro ao processar resposta da IA') ||
          error.message?.includes('Formato de resposta inesperado')) {
        throw error;
      }
      
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
    }
  }

  static async generateFromText(params: AIFlashcardParams): Promise<AIFlashcardResponse> {
    const prompt = `Analise o seguinte texto e crie ${params.numberOfCards || 10} flashcards baseados no conteúdo:

TEXTO:
${params.text}

Instruções específicas:
- Dificuldade: ${params.difficulty || 'medium'}
- Idioma: ${params.language || 'português'}
- Nome do deck: "${params.deckName}"
- Extraia os conceitos mais importantes do texto
- Crie perguntas que testem a compreensão do conteúdo

Formato de resposta JSON:
{
  "deckName": "${params.deckName}",
  "description": "Descrição baseada no conteúdo do texto",
  "flashcards": [
    {
      "front": "Pergunta baseada no texto",
      "back": "Resposta detalhada extraída do conteúdo",
      "hint": "Dica opcional",
      "tags": ["conceito1", "conceito2"],
      "difficulty": "easy|medium|hard"
    }
  ]
}

Regras importantes:
1. Responda APENAS com JSON válido
2. Não inclua texto adicional fora do JSON
3. Base as perguntas no conteúdo fornecido
4. Mantenha a precisão das informações do texto original
5. Use terminologia apropriada do texto`;

    try {
      const response = await this.callGroqAPI(prompt);
      
      if (typeof response === 'object' && response !== null) {
        if ('isAsync' in response && response.isAsync) {
          return response as any;
        }
        
        if ('flashcards' in response) {
          const flashcardResponse = response as AIFlashcardResponse;
          if (!flashcardResponse.flashcards || !Array.isArray(flashcardResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }
          return flashcardResponse;
        }
      }
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response as string);
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta:', response);
        throw new Error('Formato de resposta inesperado da IA');
      }
      
      if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
        throw new Error('Resposta da IA inválida: estrutura de flashcards incorreta');
      }
      
      return parsedResponse;
    } catch (error) {
      console.error('Erro ao gerar flashcards do texto:', error);
      
      if (error.message?.includes('Resposta da IA inválida') || 
          error.message?.includes('Erro ao processar resposta da IA') ||
          error.message?.includes('Formato de resposta inesperado')) {
        throw error;
      }
      
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
    }
  }

  static async generateFromPDF(params: AIFlashcardParams): Promise<AIFlashcardResponse> {
    const prompt = `Analise o seguinte conteúdo extraído de PDF e crie ${params.numberOfCards || 10} flashcards:

CONTEÚDO DO PDF:
${params.pdfContent}

Instruções específicas:
- Dificuldade: ${params.difficulty || 'medium'}
- Idioma: ${params.language || 'português'}
- Nome do deck: "${params.deckName}"
- Foque nos conceitos e informações mais relevantes
- Mantenha a precisão técnica do conteúdo original

Formato de resposta JSON:
{
  "deckName": "${params.deckName}",
  "description": "Descrição baseada no conteúdo do PDF",
  "flashcards": [
    {
      "front": "Pergunta ou conceito do PDF",
      "back": "Resposta detalhada baseada no documento",
      "hint": "Dica opcional",
      "tags": ["tópico1", "tópico2"],
      "difficulty": "easy|medium|hard"
    }
  ]
}

Regras importantes:
1. Responda APENAS com JSON válido
2. Não inclua texto adicional fora do JSON
3. Preserve a terminologia técnica do documento
4. Crie flashcards que cubram os pontos principais
5. Mantenha a fidelidade ao conteúdo original`;

    try {
      const response = await this.callGroqAPI(prompt);
      
      if (typeof response === 'object' && response !== null) {
        if ('isAsync' in response && response.isAsync) {
          return response as any;
        }
        
        if ('flashcards' in response) {
          const flashcardResponse = response as AIFlashcardResponse;
          if (!flashcardResponse.flashcards || !Array.isArray(flashcardResponse.flashcards)) {
            throw new Error('Resposta da IA inválida: flashcards não encontrados');
          }
          return flashcardResponse;
        }
      }
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response as string);
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta:', response);
        throw new Error('Formato de resposta inesperado da IA');
      }
      
      if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
        throw new Error('Resposta da IA inválida: estrutura de flashcards incorreta');
      }
      
      return parsedResponse;
    } catch (error) {
      console.error('Erro ao gerar flashcards do PDF:', error);
      
      if (error.message?.includes('Resposta da IA inválida') || 
          error.message?.includes('Erro ao processar resposta da IA') ||
          error.message?.includes('Formato de resposta inesperado')) {
        throw error;
      }
      
      throw new Error('Erro ao processar resposta da IA. Tente novamente.');
    }
  }
}