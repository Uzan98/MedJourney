import { supabase } from '@/lib/supabase';
import { Deck, Flashcard, StudySession, CardReview, FlashcardStats, StudyAlgorithm } from '@/types/flashcards';

export class FlashcardsService {
  /**
   * Busca todos os decks do usuário
   */
  static async getDecks(userId: string): Promise<Deck[]> {
    const { data, error } = await supabase
      .from('flashcard_decks_view')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Erro ao buscar decks:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Busca decks públicos
   */
  static async getPublicDecks(limit = 20): Promise<Deck[]> {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .select(`
        *,
        disciplines(name)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar decks públicos:', error);
      throw error;
    }
    
    return data.map(deck => ({
      ...deck,
      discipline_name: deck.disciplines?.name
    })) || [];
  }

  /**
   * Busca um deck específico por ID
   */
  static async getDeck(deckId: string): Promise<Deck | null> {
    const { data, error } = await supabase
      .from('flashcard_decks_view')
      .select('*')
      .eq('deck_id', deckId)
      .single();
      
    if (error) {
      if (error.code !== 'PGRST116') { // Não é um erro de "não encontrado"
        console.error('Erro ao buscar deck:', error);
        throw error;
      }
      return null;
    }
    
    return data;
  }

  /**
   * Cria um novo deck
   */
  static async createDeck(deck: Partial<Deck>): Promise<Deck> {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .insert(deck)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar deck:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Atualiza um deck existente
   */
  static async updateDeck(deckId: string, updates: Partial<Deck>): Promise<Deck> {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .update(updates)
      .eq('id', deckId)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao atualizar deck:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Exclui um deck e todos os seus flashcards
   */
  static async deleteDeck(deckId: string): Promise<void> {
    // Primeiro excluir os flashcards relacionados
    const { error: flashcardsError } = await supabase
      .from('flashcards')
      .delete()
      .eq('deck_id', deckId);
      
    if (flashcardsError) {
      console.error('Erro ao excluir flashcards do deck:', flashcardsError);
      throw flashcardsError;
    }
    
    // Depois excluir o deck
    const { error } = await supabase
      .from('flashcard_decks')
      .delete()
      .eq('id', deckId);
      
    if (error) {
      console.error('Erro ao excluir deck:', error);
      throw error;
    }
  }

  /**
   * Busca flashcards de um deck
   */
  static async getFlashcards(deckId: string): Promise<Flashcard[]> {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId);
      
    if (error) {
      console.error('Erro ao buscar flashcards:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Busca flashcards para estudo baseado no algoritmo escolhido
   */
  static async getFlashcardsForStudy(deckId: string, algorithm: StudyAlgorithm = StudyAlgorithm.SPACED_REPETITION, limit = 20): Promise<Flashcard[]> {
    let query = supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .limit(limit);

    switch (algorithm) {
      case StudyAlgorithm.SPACED_REPETITION:
        // Prioriza cartões que estão para revisão
        query = query.or(`next_review.is.null,next_review.lte.${new Date().toISOString()}`);
        query = query.order('next_review', { ascending: true, nullsFirst: true });
        break;
      case StudyAlgorithm.LEITNER:
        // Prioriza cartões com menor mastery_level
        query = query.order('mastery_level', { ascending: true });
        break;
      case StudyAlgorithm.DIFFICULT_FIRST:
        // Prioriza cartões marcados como difíceis
        query = query.order('difficulty', { ascending: false });
        break;
      case StudyAlgorithm.RANDOM:
      default:
        // Ordem aleatória
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Erro ao buscar flashcards para estudo do deck ${deckId}:`, error);
      throw error;
    }
    
    // Se não tiver cartões suficientes para revisão, completa com outros cartões
    if (data.length < limit && algorithm === StudyAlgorithm.SPACED_REPETITION) {
      const remainingLimit = limit - data.length;
      const { data: additionalCards, error: additionalError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .not('id', 'in', `(${data.map(c => c.id).join(',')})`)
        .limit(remainingLimit);
        
      if (!additionalError && additionalCards) {
        data.push(...additionalCards);
      }
    }
    
    return data || [];
  }

  /**
   * Cria um novo flashcard
   */
  static async createFlashcard(flashcard: Partial<Flashcard>): Promise<Flashcard> {
    const { data, error } = await supabase
      .from('flashcards')
      .insert(flashcard)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao criar flashcard:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Atualiza um flashcard existente
   */
  static async updateFlashcard(cardId: string, updates: Partial<Flashcard>): Promise<Flashcard> {
    console.log('Atualizando flashcard:', cardId, updates); // Log para debug
    
    // Garantir que os valores numéricos sejam números
    if (updates.mastery_level !== undefined) {
      updates.mastery_level = Number(updates.mastery_level);
    }
    
    if (updates.review_count !== undefined) {
      updates.review_count = Number(updates.review_count);
    }
    
    const { data, error } = await supabase
      .from('flashcards')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao atualizar flashcard:', error);
      throw error;
    }
    
    console.log('Flashcard atualizado com sucesso:', data);
    return data;
  }

  /**
   * Exclui um flashcard
   */
  static async deleteFlashcard(cardId: string): Promise<void> {
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', cardId);
      
    if (error) {
      console.error('Erro ao excluir flashcard:', error);
      throw error;
    }
  }

  /**
   * Verifica e finaliza sessões abertas antes de criar uma nova
   */
  static async closeOpenSessions(deckId: string, userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('flashcard_study_sessions')
      .select('id')
      .eq('deck_id', deckId)
      .eq('user_id', userId)
      .is('end_time', null);
      
    if (error) {
      console.error('Erro ao buscar sessões abertas:', error);
      throw error;
    }
    
    if (data && data.length > 0) {
      // Finaliza todas as sessões abertas para este deck e usuário
      const { error: updateError } = await supabase
        .from('flashcard_study_sessions')
        .update({
          end_time: new Date().toISOString(),
          cards_studied: 0,
          duration_seconds: 0
        })
        .in('id', data.map(session => session.id));
        
      if (updateError) {
        console.error('Erro ao finalizar sessões abertas:', updateError);
        throw updateError;
      }
    }
  }

  /**
   * Inicia uma sessão de estudo
   */
  static async startStudySession(deckId: string, userId: string, algorithm: StudyAlgorithm = StudyAlgorithm.SPACED_REPETITION): Promise<StudySession> {
    // Primeiro, fecha qualquer sessão aberta
    await this.closeOpenSessions(deckId, userId);
    
    // Agora cria uma nova sessão
    const { data, error } = await supabase
      .from('flashcard_study_sessions')
      .insert({
        deck_id: deckId,
        user_id: userId,
        algorithm: algorithm,
        start_time: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error(`Erro ao iniciar sessão de estudo para deck ${deckId}:`, error);
      throw error;
    }
    
    return data;
  }

  /**
   * Finaliza uma sessão de estudo
   */
  static async endStudySession(sessionId: string, stats: { cards_studied: number, cards_mastered: number, duration_seconds: number }): Promise<StudySession> {
    const { data, error } = await supabase
      .from('flashcard_study_sessions')
      .update({
        end_time: new Date().toISOString(),
        cards_studied: stats.cards_studied,
        cards_mastered: stats.cards_mastered,
        duration_seconds: stats.duration_seconds
      })
      .eq('id', sessionId)
      .select()
      .single();
      
    if (error) {
      console.error(`Erro ao finalizar sessão de estudo ${sessionId}:`, error);
      throw error;
    }
    
    return data;
  }

  /**
   * Calcula o próximo intervalo de revisão baseado no resultado
   */
  private static calculateNextReview(result: string, previousMastery: number): { days: number, newMastery: number } {
    let days = 1;
    let newMastery = previousMastery;
    
    switch (result) {
      case 'easy':
        days = previousMastery < 30 ? 2 : previousMastery < 60 ? 4 : previousMastery < 80 ? 7 : 14;
        newMastery = Math.min(100, previousMastery + 15);
        break;
      case 'correct':
        days = previousMastery < 30 ? 1 : previousMastery < 60 ? 3 : previousMastery < 80 ? 5 : 10;
        newMastery = Math.min(100, previousMastery + 10);
        break;
      case 'hard':
        days = 1;
        newMastery = Math.min(100, previousMastery + 5);
        break;
      case 'incorrect':
        days = 0;
        newMastery = Math.max(0, previousMastery - 10);
        break;
    }
    
    return { days, newMastery };
  }

  /**
   * Registra uma revisão de flashcard
   */
  static async recordCardReview(review: Partial<CardReview>): Promise<CardReview> {
    const { data, error } = await supabase
      .from('flashcard_reviews')
      .insert(review)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao registrar revisão de cartão:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Busca estatísticas do usuário
   */
  static async getUserStats(userId: string): Promise<FlashcardStats> {
    const { data, error } = await supabase
      .from('flashcard_user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Se não encontrar estatísticas, retorna valores padrão
      if (error.code === 'PGRST116') {
        return {
          total_cards: 0,
          mastered_cards: 0,
          cards_to_review: 0,
          mastery_percentage: 0,
          total_study_sessions: 0,
          total_study_time_minutes: 0,
          study_streak_days: 0
        };
      }
      throw error;
    }
    
    // Arredonda o valor de mastery_percentage
    if (data && data.mastery_percentage !== null) {
      data.mastery_percentage = Math.round(data.mastery_percentage);
    }
    
    return data || {
      total_cards: 0,
      mastered_cards: 0,
      cards_to_review: 0,
      mastery_percentage: 0,
      total_study_sessions: 0,
      total_study_time_minutes: 0,
      study_streak_days: 0
    };
  }

  // Método para estudo personalizado (não afeta o domínio)
  static async startCustomStudySession(deckId: string, userId: string): Promise<StudySession> {
    // Primeiro, fecha qualquer sessão aberta
    await this.closeOpenSessions(deckId, userId);
    
    // Criamos uma sessão de estudo normal, já que não há campo para diferenciar
    const { data, error } = await supabase
      .from('flashcard_study_sessions')
      .insert({
        deck_id: deckId,
        user_id: userId,
        start_time: new Date().toISOString(),
        algorithm: StudyAlgorithm.RANDOM // Usamos algoritmo aleatório para estudo personalizado
      })
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao iniciar sessão de estudo personalizado:', error);
      throw error;
    }
    
    // Adicionamos a flag is_custom_study na memória, não no banco
    return {
      ...data,
      is_custom_study: true // Esta flag existe apenas na memória
    };
  }
  
  static async recordCustomCardReview(review: Partial<CardReview>): Promise<CardReview> {
    // Para estudo personalizado, registramos a revisão mas não atualizamos o nível de domínio
    const { data, error } = await supabase
      .from('flashcard_reviews')
      .insert({
        ...review,
        // Garantir que o novo nível de domínio seja igual ao anterior (não afeta o domínio)
        new_mastery: review.previous_mastery
      })
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao registrar revisão de cartão personalizada:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Verifica se há cards disponíveis para estudo hoje
   */
  static async hasCardsForTodayStudy(deckId: string): Promise<boolean> {
    const today = new Date().toISOString();
    
    // Busca cards que nunca foram revisados ou que têm data de revisão para hoje ou antes
    const { data, error } = await supabase
      .from('flashcards')
      .select('id')
      .eq('deck_id', deckId)
      .or(`next_review.is.null,next_review.lte.${today}`)
      .limit(1);
      
    if (error) {
      console.error('Erro ao verificar cards para estudo:', error);
      throw error;
    }
    
    return data && data.length > 0;
  }
} 