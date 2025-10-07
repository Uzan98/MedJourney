import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';

// Configurar Supabase Admin (apenas para operações de background/processamento)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configurar Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
});

export interface FlashcardJobMessage {
  id: string;
  user_id: string;
  type: 'text' | 'pdf' | 'theme';
  prompt: string;
  source?: string;
  deckName: string;
  numberOfCards: number;
  difficulty: string;
  cover_color?: string;
  created_at: string;
}

export interface FlashcardJobResult {
  flashcards: any[];
  deck_id: string;
  total_flashcards: number;
}

export class FlashcardQueueService {
  private static readonly QUEUE_NAME = 'flashcard_jobs';
  private static readonly VISIBILITY_TIMEOUT = 300; // 5 minutos

  /**
   * Envia um novo job para a queue PGMQ
   */
  static async createJob(
    supabaseClient: SupabaseClient,
    userId: string, 
    type: 'text' | 'pdf' | 'theme',
    prompt: string,
    deckName: string,
    numberOfCards: number,
    difficulty: string,
    source?: string,
    coverColor?: string
  ): Promise<string> {
    try {
      const jobId = randomUUID();
      
      const message: FlashcardJobMessage = {
        id: jobId,
        user_id: userId,
        type,
        prompt,
        source,
        deckName,
        numberOfCards,
        difficulty,
        cover_color: coverColor,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseClient.rpc('pgmq_send', {
        queue_name: this.QUEUE_NAME,
        msg: message
      });

      if (error) {
        console.error('Erro ao criar job na queue PGMQ:', error);
        throw new Error(`Erro ao criar job: ${error.message}`);
      }

      console.log(`Job ${jobId} criado na queue PGMQ com ID da mensagem:`, data);
      return jobId;
    } catch (error) {
      console.error('Erro ao criar job:', error);
      throw error;
    }
  }

  /**
   * Verifica o status de um job específico
   */
  static async getJobStatus(
    supabaseClient: SupabaseClient,
    jobId: string
  ): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result_data?: FlashcardJobResult;
    error_message?: string;
    user_id?: string;
    id?: string;
    created_at?: string;
    updated_at?: string;
    completed_at?: string;
  }> {
    try {
      // Primeiro verifica se existe na tabela de resultados
      const { data: resultData, error: resultError } = await supabaseClient
        .from('flashcard_job_results')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (!resultError && resultData) {
        let userIdFromResult = (resultData as any).user_id as string | undefined;
        // Fallback: buscar user_id na tabela pública flashcard_jobs se ausente
        if (!userIdFromResult) {
          const { data: jobRow, error: jobError } = await supabaseClient
            .from('flashcard_jobs')
            .select('user_id')
            .eq('id', jobId)
            .single();
          if (!jobError && jobRow) {
            userIdFromResult = jobRow.user_id;
          }
        }

        return {
          status: resultData.status,
          result_data: resultData.result_data,
          error_message: resultData.error_message,
          user_id: userIdFromResult,
          id: resultData.job_id,
          created_at: resultData.created_at,
          updated_at: resultData.updated_at,
          completed_at: resultData.completed_at
        };
      }

      // Se não encontrou resultado, verifica se ainda está na queue
      const { data: queueData, error: queueError } = await supabaseClient.rpc('pgmq_read', {
        qty: 100, // Lê até 100 mensagens para procurar o job
        queue_name: this.QUEUE_NAME,
        visibility_timeout: 1 // 1 segundo apenas para verificar
      });

      if (queueError) {
        console.error('Erro ao verificar queue:', queueError);
        return { status: 'failed', error_message: 'Erro ao verificar status do job' };
      }

      // Procura o job específico nas mensagens da queue
      if (queueData && Array.isArray(queueData)) {
        for (const msg of queueData) {
          let payload: any = undefined;
          try {
            payload = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
          } catch {
            payload = undefined;
          }
          if (payload && payload.id === jobId) {
            return {
              status: 'pending',
              user_id: payload.user_id,
              id: payload.id,
              created_at: payload.created_at
            };
          }
        }
      }

      // Se não encontrou nem na queue nem nos resultados, pode estar sendo processado
      return { status: 'processing' };
    } catch (error) {
      console.error('Erro ao verificar status do job:', error);
      return { status: 'failed', error_message: 'Erro interno ao verificar status' };
    }
  }

  /**
   * Processa todos os jobs pendentes na queue
   */
  static async processAllPendingJobs(): Promise<void> {
    try {
      console.log('Iniciando processamento de jobs pendentes...');
      
      // Lê mensagens da queue
      const { data: messages, error } = await adminSupabase.rpc('pgmq_read', {
        qty: 10, // Processa até 10 jobs por vez
        queue_name: this.QUEUE_NAME,
        visibility_timeout: this.VISIBILITY_TIMEOUT
      });

      if (error) {
        console.error('Erro ao ler mensagens da queue:', error);
        return;
      }

      if (!messages || messages.length === 0) {
        console.log('Nenhum job pendente encontrado');
        return;
      }

      console.log(`Encontrados ${messages.length} jobs para processar`);

      // Processa cada mensagem
      for (const message of messages) {
        try {
          const jobData: FlashcardJobMessage = JSON.parse(message.message);
          console.log(`Processando job ${jobData.id}...`);

          await this.processJob(jobData, message.msg_id);
          
          // Remove a mensagem da queue após processamento bem-sucedido
          await adminSupabase.rpc('pgmq_delete', {
            queue_name: this.QUEUE_NAME,
            msg_id: message.msg_id
          });

          console.log(`Job ${jobData.id} processado e removido da queue`);
        } catch (jobError) {
          console.error(`Erro ao processar job:`, jobError);
          
          // Em caso de erro, arquiva a mensagem
          await adminSupabase.rpc('pgmq_archive', {
            queue_name: this.QUEUE_NAME,
            msg_id: message.msg_id
          });
        }
      }
    } catch (error) {
      console.error('Erro no processamento de jobs:', error);
    }
  }

  /**
   * Processa um job específico
   */
  private static async processJob(jobData: FlashcardJobMessage, messageId: number): Promise<void> {
    try {
      // Salva o status como "processing" na tabela de resultados
      await this.saveJobResult(jobData.id, 'processing', undefined, undefined, jobData.user_id);

      console.log(`Gerando flashcards para o job ${jobData.id}...`);
      
      // Gera os flashcards usando Groq
      const flashcardsResponse = await this.generateFlashcards(
        jobData.prompt,
        jobData.numberOfCards,
        jobData.difficulty
      );

      if (!flashcardsResponse || flashcardsResponse.length === 0) {
        throw new Error('Nenhum flashcard foi gerado');
      }

      console.log(`${flashcardsResponse.length} flashcards gerados para o job ${jobData.id}`);

      // Cria o deck
      const { data: deckData, error: deckError } = await adminSupabase
        .from('flashcard_decks')
        .insert({
          name: jobData.deckName,
          user_id: jobData.user_id,
          description: `Deck gerado automaticamente - ${jobData.type}`,
          cover_color: jobData.cover_color || null
        })
        .select('id')
        .single();

      if (deckError) {
        throw new Error(`Erro ao criar deck: ${deckError.message}`);
      }

      const deckId = deckData.id;
      console.log(`Deck criado com ID: ${deckId}`);

      // Salva os flashcards
      const flashcardsToInsert = flashcardsResponse.map((card: any) => ({
        deck_id: deckId,
        user_id: jobData.user_id,
        front: card.front || card.pergunta,
        back: card.back || card.resposta,
        difficulty: jobData.difficulty,
        created_at: new Date().toISOString()
      }));

      const { error: flashcardsError } = await adminSupabase
        .from('flashcards')
        .insert(flashcardsToInsert);

      if (flashcardsError) {
        throw new Error(`Erro ao salvar flashcards: ${flashcardsError.message}`);
      }

      console.log(`${flashcardsToInsert.length} flashcards salvos no banco`);

      // Salva o resultado final
      const resultData: FlashcardJobResult = {
        flashcards: flashcardsResponse,
        deck_id: deckId,
        total_flashcards: flashcardsResponse.length
      };

      await this.saveJobResult(jobData.id, 'completed', resultData, undefined, jobData.user_id);
      console.log(`Job ${jobData.id} concluído com sucesso`);

    } catch (error) {
      console.error(`Erro ao processar job ${jobData.id}:`, error);
      await this.saveJobResult(jobData.id, 'failed', undefined, error instanceof Error ? error.message : 'Erro desconhecido', jobData.user_id);
      throw error;
    }
  }

  /**
   * Salva o resultado de um job na tabela de resultados
   */
  private static async saveJobResult(
    jobId: string,
    status: 'processing' | 'completed' | 'failed',
    resultData?: FlashcardJobResult,
    errorMessage?: string,
    userId?: string
  ): Promise<void> {
    const payload: any = {
      job_id: jobId,
      status,
      result_data: resultData,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
      ...(status === 'completed' && { completed_at: new Date().toISOString() }),
      ...(userId && { user_id: userId })
    };

    const { error } = await adminSupabase
      .from('flashcard_job_results')
      .upsert(payload, { onConflict: 'job_id' });

    if (error) {
      console.error('Erro ao salvar resultado do job:', error);
    }
  }

  /**
   * Gera flashcards usando Groq
   */
  private static async generateFlashcards(
    prompt: string,
    numberOfCards: number,
    difficulty: string
  ): Promise<any[]> {
    try {
      const systemPrompt = `Você é um gerador de flashcards concisos em pt-BR.
      Crie exatamente ${numberOfCards} flashcards com base no conteúdo fornecido.
      Nível de dificuldade: ${difficulty}.

      REQUISITOS DE IDIOMA:
      - Responda EXCLUSIVAMENTE em Português Brasileiro (pt-BR).
      - Utilize vocabulário, ortografia e exemplos do Brasil.
      - Se o conteúdo de entrada estiver em outro idioma, traduza fielmente para pt-BR.
      - Evite termos em inglês; mantenha siglas e nomes próprios quando necessário.

      REGRAS DE FORMATAÇÃO DO VERSO:
      - Verso deve ter 2–4 bullets curtos (6–12 palavras cada).
      - Limite o verso a, no máximo, 240 caracteres totais.
      - Nunca use tabelas, HTML, cabeçalhos, emojis ou parágrafos longos.
      - Use formatação simples: cada bullet inicia com "- " e separação por quebra de linha.
      - Concentre nos pontos essenciais e no que mais cai em prova; evite redundâncias.
      - Se houver listas longas no material, sintetize apenas os critérios-chave.

      FORMATO DE SAÍDA:
      - Retorne APENAS um array JSON válido com objetos no formato:
        [{"front": "pergunta clara em pt-BR", "back": "bullets curtos em pt-BR"}]
      - No campo "back", retorne bullets simples separados por \n, cada um iniciando com "- ".
      - Não inclua explicações adicionais, apenas o JSON.`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.1-70b-versatile',
        temperature: 0.7,
        max_tokens: 2000
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Resposta vazia da API Groq');
      }

      // Extrai JSON da resposta
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Formato de resposta inválido da API Groq');
      }

      const flashcards = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        throw new Error('Nenhum flashcard válido foi gerado');
      }

      return flashcards;
    } catch (error) {
      console.error('Erro ao gerar flashcards:', error);
      throw error;
    }
  }

  /**
   * Processa um job específico por ID (para processamento manual)
   */
  static async processSpecificJob(jobId: string): Promise<boolean> {
    try {
      // Lê mensagens da queue procurando pelo job específico
      const { data: messages, error } = await adminSupabase.rpc('pgmq_read', {
        qty: 100, // Lê muitas mensagens para encontrar o job específico
        queue_name: this.QUEUE_NAME,
        visibility_timeout: this.VISIBILITY_TIMEOUT
      });

      if (error) {
        console.error('Erro ao ler mensagens da queue:', error);
        return false;
      }

      if (!messages || messages.length === 0) {
        console.log('Nenhuma mensagem encontrada na queue');
        return false;
      }

      // Procura o job específico
      const targetMessage = messages.find((msg: any) => {
        try {
          const jobData = JSON.parse(msg.message);
          return jobData.id === jobId;
        } catch {
          return false;
        }
      });

      if (!targetMessage) {
        console.log(`Job ${jobId} não encontrado na queue`);
        return false;
      }

      const jobData: FlashcardJobMessage = JSON.parse(targetMessage.message);
      console.log(`Processando job específico ${jobId}...`);

      await this.processJob(jobData, targetMessage.msg_id);
      
      // Remove a mensagem da queue após processamento bem-sucedido
      await adminSupabase.rpc('pgmq_delete', {
        queue_name: this.QUEUE_NAME,
        msg_id: targetMessage.msg_id
      });

      console.log(`Job ${jobId} processado e removido da queue`);
      return true;
    } catch (error) {
      console.error(`Erro ao processar job específico ${jobId}:`, error);
      return false;
    }
  }
}