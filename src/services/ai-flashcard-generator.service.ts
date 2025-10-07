import { AIFlashcardParams, AIFlashcardResponse } from '@/types/flashcards';
import { getAccessToken } from '@/lib/auth-utils';

export class AIFlashcardGeneratorService {
  private static readonly API_BASE_URL = '/api/groq/flashcards';

  /**
   * Gera flashcards a partir de um tema usando o sistema de queue
   */
  static async generateFromTheme(params: AIFlashcardParams): Promise<AIFlashcardResponse> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Token de autorização necessário');
      }

      const response = await fetch(this.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: params.theme,
          type: 'theme',
          deckName: params.deckName,
          numberOfCards: params.numberOfCards,
          difficulty: params.difficulty,
          cover_color: params.coverColor
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      return {
        isAsync: false,
        flashcards: data.flashcards || [],
        totalGenerated: data.totalGenerated,
        deckName: data.deckName,
        description: data.description,
        deckId: data.deckId
      };
    } catch (error: any) {
      console.error('Erro ao gerar flashcards por tema:', error);
      throw new Error(error.message || 'Erro ao processar resposta da IA. Tente novamente.');
    }
  }

  /**
   * Gera flashcards a partir de texto usando o sistema de queue
   */
  static async generateFromText(params: AIFlashcardParams): Promise<AIFlashcardResponse> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Token de autorização necessário');
      }

      const response = await fetch(this.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: params.text,
          type: 'text',
          deckName: params.deckName,
          numberOfCards: params.numberOfCards,
          difficulty: params.difficulty,
          cover_color: params.coverColor
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      return {
        isAsync: false,
        flashcards: data.flashcards || [],
        totalGenerated: data.totalGenerated,
        deckName: data.deckName,
        description: data.description,
        deckId: data.deckId
      };
    } catch (error: any) {
      console.error('Erro ao gerar flashcards por texto:', error);
      throw new Error(error.message || 'Erro ao processar resposta da IA. Tente novamente.');
    }
  }

  /**
   * Gera flashcards a partir de PDF usando o sistema de queue
   */
  static async generateFromPDF(params: AIFlashcardParams): Promise<AIFlashcardResponse> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Token de autorização necessário');
      }

      const response = await fetch(this.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: params.pdfContent,
          type: 'pdf',
          deckName: params.deckName,
          numberOfCards: params.numberOfCards,
          difficulty: params.difficulty,
          cover_color: params.coverColor
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      return {
        isAsync: false,
        flashcards: data.flashcards || [],
        totalGenerated: data.totalGenerated,
        deckName: data.deckName,
        description: data.description,
        deckId: data.deckId
      };
    } catch (error: any) {
      console.error('Erro ao gerar flashcards por PDF:', error);
      throw new Error(error.message || 'Erro ao processar resposta da IA. Tente novamente.');
    }
  }

  /**
   * Verifica o status de um job de geração de flashcards
   */
  // Rotas síncronas não precisam de polling
}