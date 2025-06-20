import { Question, AnswerOption } from './questions-bank.service';

export interface AIQuestionGeneratorParams {
  discipline?: string;
  subject?: string;
  difficulty: 'baixa' | 'média' | 'alta';
  questionType: 'multiple_choice' | 'true_false' | 'essay';
  additionalContext?: string;
}

export interface AIGeneratedQuestion {
  question: Question;
  answerOptions?: AnswerOption[];
}

export class AIQuestionGeneratorService {
  // Agora chama a rota interna protegida
  private static async callGroqAPI(prompt: string): Promise<string> {
    try {
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API error: ${response.status} - ${errorData}`);
      }
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Erro ao chamar a API Groq:', error);
      throw error;
    }
  }

  static async generateQuestion(params: AIQuestionGeneratorParams): Promise<AIGeneratedQuestion> {
    const { discipline, subject, difficulty, questionType, additionalContext } = params;
    
    let prompt = `Crie uma questão de ${difficulty} dificuldade`;
    
    if (discipline) {
      prompt += ` sobre ${discipline}`;
      if (subject) {
        prompt += `, especificamente sobre ${subject}`;
      }
    }
    
    if (additionalContext) {
      prompt += `. Contexto adicional: ${additionalContext}`;
    }
    
    prompt += `\n\nA questão deve ser do tipo "${
      questionType === 'multiple_choice' ? 'múltipla escolha com 5 alternativas (A, B, C, D, E)' : 
      questionType === 'true_false' ? 'verdadeiro ou falso' : 
      'dissertativa'
    }".`;
    
    if (questionType === 'multiple_choice') {
      prompt += `\n\nFormate a resposta no seguinte formato JSON:
      {
        "content": "Texto completo da questão",
        "explanation": "Explicação detalhada da resposta correta",
        "options": [
          {"text": "Texto da opção A", "is_correct": true/false},
          {"text": "Texto da opção B", "is_correct": true/false},
          {"text": "Texto da opção C", "is_correct": true/false},
          {"text": "Texto da opção D", "is_correct": true/false},
          {"text": "Texto da opção E", "is_correct": true/false}
        ]
      }
      
      Apenas uma das opções deve ter "is_correct": true.`;
    } else if (questionType === 'true_false') {
      prompt += `\n\nFormate a resposta no seguinte formato JSON:
      {
        "content": "Afirmação para julgar como verdadeira ou falsa",
        "explanation": "Explicação detalhada de por que a afirmação é verdadeira ou falsa",
        "correct_answer": "true ou false"
      }`;
    } else { // essay
      prompt += `\n\nFormate a resposta no seguinte formato JSON:
      {
        "content": "Texto da questão dissertativa",
        "explanation": "Explicação ou pontos principais que deveriam estar na resposta",
        "correct_answer": "Exemplo de resposta esperada"
      }`;
    }
    
    try {
      const responseText = await this.callGroqAPI(prompt);
      let jsonResponse;
      
      // Extract JSON from the response (in case the API returns markdown or additional text)
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) ||
                        responseText.match(/{[\s\S]*}/);
                        
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      
      try {
        jsonResponse = JSON.parse(jsonString.trim());
      } catch (e) {
        // If parsing fails, try to find and parse just the JSON object
        const objectMatch = responseText.match(/{[\s\S]*?}/);
        if (objectMatch) {
          jsonResponse = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Não foi possível extrair JSON da resposta da API');
        }
      }
      
      // Create question object
      const question: Question = {
        content: jsonResponse.content,
        explanation: jsonResponse.explanation,
        difficulty: difficulty,
        question_type: questionType,
        tags: discipline ? [discipline] : []
      };
      
      if (subject) {
        question.tags?.push(subject);
      }
      
      // For true/false and essay questions
      if (questionType !== 'multiple_choice') {
        question.correct_answer = jsonResponse.correct_answer;
        return { question };
      }
      
      // For multiple choice questions
      const answerOptions: AnswerOption[] = jsonResponse.options.map((option: any, index: number) => ({
        id: `temp-${Date.now()}-${index}`,
        question_id: 0, // Will be set after question creation
        text: option.text,
        is_correct: option.is_correct
      }));
      
      return { question, answerOptions };
    } catch (error) {
      console.error('Erro ao gerar questão:', error);
      throw error;
    }
  }
} 