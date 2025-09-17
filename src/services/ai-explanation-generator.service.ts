import { getAccessToken } from '@/lib/auth-utils';

export interface AIExplanationParams {
  questionContent: string;
  alternatives: string[];
  correctAnswer: string;
  discipline?: string;
  subject?: string;
}

export interface AIGeneratedExplanation {
  explanation: string;
}

export class AIExplanationGeneratorService {
  // Chama a rota interna protegida do Groq
  private static async callGroqAPI(prompt: string): Promise<string> {
    try {
      // Obter token de acesso para autenticação
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('Você precisa estar logado para gerar explicações com IA');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      };

      const response = await fetch('/api/groq/explanation', {
        method: 'POST',
        headers,
        credentials: 'include', // Importante para enviar cookies de sessão
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        
        // Tratar erros específicos de permissão e limite
        if (response.status === 401) {
          throw new Error('Você precisa estar logado para gerar explicações com IA.');
        }
        
        if (response.status === 403) {
          if (errorData.requiresUpgrade) {
            throw new Error('A geração de explicações por IA é exclusiva para usuários Pro e Pro+. Faça upgrade do seu plano para acessar este recurso.');
          }
          throw new Error('Você não tem permissão para acessar este recurso.');
        }
        
        if (response.status === 429) {
          if (errorData.limitReached) {
            throw new Error('Você atingiu o limite diário de explicações. Tente novamente amanhã ou faça upgrade para o plano Pro+ para explicações ilimitadas.');
          }
          throw new Error('Muitas requisições. Tente novamente em alguns minutos.');
        }
        
        throw new Error(errorData.error || `Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Erro ao chamar a API Groq para explicação:', error);
      throw error;
    }
  }

  static async generateExplanation(params: AIExplanationParams): Promise<AIGeneratedExplanation> {
    const { questionContent, alternatives, correctAnswer, discipline, subject } = params;
    
    let prompt = `Você é um professor especialista em educação médica. Analise a seguinte questão e gere uma explicação detalhada e didática.\n\n`;
    
    prompt += `**QUESTÃO:**\n${questionContent}\n\n`;
    
    prompt += `**ALTERNATIVAS:**\n`;
    alternatives.forEach((alt, index) => {
      const letter = String.fromCharCode(65 + index); // A, B, C, D, E
      prompt += `${letter}) ${alt}\n`;
    });
    
    prompt += `\n**GABARITO CORRETO:** ${correctAnswer}\n\n`;
    
    if (discipline) {
      prompt += `**DISCIPLINA:** ${discipline}`;
      if (subject) {
        prompt += ` - ${subject}`;
      }
      prompt += `\n\n`;
    }
    
    prompt += `**INSTRUÇÕES:**\n`;
    prompt += `1. Explique detalhadamente por que a alternativa ${correctAnswer} está correta\n`;
    prompt += `2. Analise cada alternativa incorreta, explicando por que estão erradas\n`;
    prompt += `3. Use um tom didático e claro, adequado para estudantes de medicina\n`;
    prompt += `4. Seja conciso mas abrangente o suficiente para esclarecer dúvidas\n`;
    prompt += `5. Use conceitos médicos precisos e atualizados\n\n`;
    
    prompt += `**FORMATO DA RESPOSTA:**\n`;
    prompt += `Formate sua resposta em texto corrido, organizando as informações de forma clara e lógica. `;
    prompt += `Não use JSON ou formatação especial, apenas texto explicativo bem estruturado.`;
    
    try {
      const responseText = await this.callGroqAPI(prompt);
      
      // Limpar a resposta removendo possíveis formatações desnecessárias
      const cleanedExplanation = responseText
        .replace(/```[\s\S]*?```/g, '') // Remove blocos de código
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove negrito markdown
        .replace(/\*(.*?)\*/g, '$1') // Remove itálico markdown
        .trim();
      
      return { explanation: cleanedExplanation };
    } catch (error) {
      console.error('Erro ao gerar explicação:', error);
      throw error;
    }
  }
}