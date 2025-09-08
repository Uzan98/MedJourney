import { createClient } from '@supabase/supabase-js';

// Interfaces para o parser de PDFs
export interface ParsedQuestion {
  questionNumber: number;
  statement: string;
  options: ParsedOption[];
  correctAnswer?: string;
  explanation?: string;
  hasImage?: boolean;
  imagePosition?: number;
  imageUrl?: string;
}

export interface ParsedOption {
  key: string; // A, B, C, D, etc.
  text: string;
}

export interface ParsedExam {
  title: string;
  institution?: string;
  year?: number;
  totalQuestions: number;
  questions: ParsedQuestion[];
  extractedText: string;
}

export interface ParserResult {
  success: boolean;
  exam?: ParsedExam;
  error?: string;
  warnings?: string[];
}

export class PDFParserService {
  private static readonly QUESTION_PATTERNS = [
    // Padrão: "20)" ou "20." no início da linha
    /^(\d+)[.)]/m,
    // Padrão: "Questão 20" ou "QUESTÃO 20"
    /^(?:questão|QUESTÃO)\s+(\d+)/m,
    // Padrão: "20 -" ou "20-"
    /^(\d+)\s*[-–]/m,
    // Padrão: número seguido de espaço e texto
    /^(\d+)\s+[A-Za-z]/m,
    // Padrão: número isolado no início da linha
    /^(\d+)$/m,
    // Padrão: número com qualquer pontuação
    /^(\d+)[\s\-–.):]/m
  ];

  private static readonly OPTION_PATTERNS = [
    // Padrão: "A)" ou "a)"
    /^([A-Ea-e])[.)]/,
    // Padrão: "(A)" ou "(a)"
    /^\(([A-Ea-e])\)/,
    // Padrão: "A -" ou "a -"
    /^([A-Ea-e])\s*[-–]/,
    // Padrão: letra seguida de espaço
    /^([A-Ea-e])\s+/,
    // Padrão: letra com qualquer pontuação
    /^([A-Ea-e])[\s\-–.):]/
  ];

  private static readonly ANSWER_KEY_PATTERNS = [
    // Padrão: "Resposta: A" ou "Gabarito: A"
    /(?:resposta|gabarito|answer)\s*:?\s*([A-Ea-e])/i,
    // Padrão: "Alternativa correta: A"
    /alternativa\s+correta\s*:?\s*([A-Ea-e])/i
  ];

  private static readonly EXPLANATION_PATTERNS = [
    // Padrão: "Explicação:" ou "Comentário:"
    /(?:explicação|comentário|justificativa|resolução)\s*:?\s*(.+?)(?=\n\n|\n\d+[.)]|$)/is,
    // Padrão: "Justificativa:"
    /justificativa\s*:?\s*(.+?)(?=\n\n|\n\d+[.)]|$)/is
  ];

  /**
   * Extrai texto de um arquivo PDF usando a API route
   */
  static async extractTextFromPDF(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar PDF');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      throw new Error(`Falha na extração de texto do PDF: ${error.message}`);
    }
  }



  /**
   * Analisa o texto extraído e identifica questões
   */
  static parseExamText(extractedText: string): ParserResult {
    try {
      const warnings: string[] = [];
      
      // Debug: mostrar primeiras linhas do texto
      console.log('Texto extraído (primeiras 500 chars):', extractedText.substring(0, 500));
      console.log('Linhas do texto:', extractedText.split('\n').slice(0, 20));
      
      // Extrair informações básicas da prova
      const examInfo = this.extractExamInfo(extractedText);
      
      // Dividir o texto em seções de questões
      const questionSections = this.splitIntoQuestions(extractedText);
      
      console.log('Seções de questões encontradas:', questionSections.length);
      if (questionSections.length > 0) {
        console.log('Primeira seção:', questionSections[0]);
      }
      
      if (questionSections.length === 0) {
        // Tentar identificar padrões no texto
        const lines = extractedText.split('\n');
        const potentialQuestions = lines.filter(line => {
          const trimmed = line.trim();
          return /^\d+/.test(trimmed) || /questão/i.test(trimmed);
        });
        
        console.log('Linhas com possíveis questões:', potentialQuestions);
        
        return {
          success: false,
          error: `Nenhuma questão foi identificada no texto. Texto extraído tem ${extractedText.length} caracteres. Linhas com números: ${potentialQuestions.length}`
        };
      }

      // Processar cada questão
      const questions: ParsedQuestion[] = [];
      
      for (const section of questionSections) {
        const parsedQuestion = this.parseQuestion(section);
        if (parsedQuestion) {
          questions.push(parsedQuestion);
        } else {
          warnings.push(`Questão não pôde ser processada: ${section.substring(0, 50)}...`);
        }
      }

      const exam: ParsedExam = {
        title: examInfo.title || 'Prova Importada',
        institution: examInfo.institution,
        year: examInfo.year,
        totalQuestions: questions.length,
        questions,
        extractedText
      };

      return {
        success: true,
        exam,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      console.error('Erro ao processar texto da prova:', error);
      return {
        success: false,
        error: 'Erro interno no processamento do texto'
      };
    }
  }

  /**
   * Extrai informações básicas da prova (título, instituição, ano)
   */
  private static extractExamInfo(text: string): { title?: string; institution?: string; year?: number } {
    const lines = text.split('\n').slice(0, 10); // Primeiras 10 linhas
    
    let title: string | undefined;
    let institution: string | undefined;
    let year: number | undefined;

    // Procurar por padrões comuns
    for (const line of lines) {
      const cleanLine = line.trim();
      
      // Detectar ano
      const yearMatch = cleanLine.match(/(20\d{2})/);;
      if (yearMatch && !year) {
        year = parseInt(yearMatch[1]);
      }
      
      // Detectar tipo de prova
      if (cleanLine.match(/prova|exame|concurso|vestibular|enem|residência/i) && !title) {
        title = cleanLine;
      }
      
      // Detectar instituição
      if (cleanLine.match(/universidade|hospital|faculdade|instituto|colégio/i) && !institution) {
        institution = cleanLine;
      }
    }

    return { title, institution, year };
  }

  /**
   * Divide o texto em seções de questões
   */
  private static splitIntoQuestions(text: string): string[] {
    const sections: string[] = [];
    
    // Se o texto está em uma única linha, tentar dividir por padrões de questão
    if (text.split('\n').length <= 2) {
      // Usar regex para encontrar questões em texto contínuo
      const questionRegex = /(\d+)\)\s*([^\d]+?)(?=\d+\)|$)/g;
      let match;
      
      while ((match = questionRegex.exec(text)) !== null) {
        const questionNumber = match[1];
        const questionContent = match[2].trim();
        
        if (questionContent) {
          sections.push(`${questionNumber}) ${questionContent}`);
        }
      }
      
      return sections;
    }
    
    // Processamento original para texto com quebras de linha
    const lines = text.split('\n');
    let currentSection = '';
    let inQuestion = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Verificar se é início de uma nova questão
      const isQuestionStart = this.QUESTION_PATTERNS.some(pattern => pattern.test(line));
      
      if (isQuestionStart) {
        // Salvar seção anterior se existir
        if (currentSection.trim() && inQuestion) {
          sections.push(currentSection.trim());
        }
        
        // Iniciar nova seção
        currentSection = line + '\n';
        inQuestion = true;
      } else if (inQuestion) {
        currentSection += line + '\n';
      }
    }
    
    // Adicionar última seção
    if (currentSection.trim() && inQuestion) {
      sections.push(currentSection.trim());
    }

    return sections;
  }

  /**
   * Processa uma seção de questão individual
   */
  private static parseQuestion(section: string): ParsedQuestion | null {
    try {
      console.log('🔍 Processando seção:', section.substring(0, 100) + '...');
      
      // Extrair número da questão
      const questionNumber = this.extractQuestionNumber(section);
      console.log('📝 Número da questão extraído:', questionNumber);
      if (!questionNumber) {
        console.log('❌ Falha ao extrair número da questão');
        return null;
      }

      // Extrair enunciado
      const statement = this.extractStatement(section);
      console.log('📄 Enunciado extraído:', statement ? statement.substring(0, 50) + '...' : 'null');
      if (!statement) {
        console.log('❌ Falha ao extrair enunciado');
        return null;
      }

      // Extrair alternativas
      const options = this.extractOptions(section);
      console.log('🔤 Alternativas extraídas:', options.length, options.map(o => o.key));
      if (options.length === 0) {
        console.log('❌ Falha ao extrair alternativas');
        return null;
      }

      // Extrair resposta correta
      const correctAnswer = this.extractCorrectAnswer(section);
      console.log('✅ Resposta correta:', correctAnswer);

      // Extrair explicação
      const explanation = this.extractExplanation(section);
      console.log('💡 Explicação:', explanation ? 'encontrada' : 'não encontrada');

      // Verificar se há referência a imagem
      const hasImage = this.checkForImageReference(section);
      console.log('🖼️ Tem imagem:', hasImage);

      const result = {
        questionNumber,
        statement,
        options,
        correctAnswer,
        explanation,
        hasImage
      };
      
      console.log('✅ Questão processada com sucesso:', questionNumber);
      return result;
    } catch (error) {
      console.error('❌ Erro ao processar questão:', error);
      return null;
    }
  }

  /**
   * Extrai o número da questão
   */
  private static extractQuestionNumber(section: string): number | null {
    for (const pattern of this.QUESTION_PATTERNS) {
      const match = section.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  }

  /**
   * Extrai o enunciado da questão
   */
  private static extractStatement(section: string): string | null {
    // Para texto contínuo (sem quebras de linha)
    if (section.split('\n').length <= 2) {
      // Remover o número da questão do início
      let statement = section.replace(/^\d+\)\s*/, '');
      
      // Encontrar onde começam as alternativas e cortar antes
      const optionMatch = statement.match(/([A-E])\)/);
      if (optionMatch) {
        const optionIndex = statement.indexOf(optionMatch[0]);
        statement = statement.substring(0, optionIndex);
      }
      
      return statement.trim() || null;
    }
    
    // Processamento original para texto com quebras de linha
    const lines = section.split('\n');
    let statement = '';
    let foundStart = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Pular linha do número da questão
      if (!foundStart && this.QUESTION_PATTERNS.some(pattern => pattern.test(trimmedLine))) {
        foundStart = true;
        // Se há texto após o número na mesma linha
        const afterNumber = trimmedLine.replace(/^\d+[.)]\s*/, '');
        if (afterNumber) {
          statement += afterNumber + ' ';
        }
        continue;
      }
      
      // Parar quando encontrar primeira alternativa
      if (foundStart && this.OPTION_PATTERNS.some(pattern => pattern.test(trimmedLine))) {
        break;
      }
      
      // Adicionar linha ao enunciado
      if (foundStart && trimmedLine) {
        statement += trimmedLine + ' ';
      }
    }
    
    return statement.trim() || null;
  }

  /**
   * Extrai as alternativas da questão
   */
  private static extractOptions(section: string): ParsedOption[] {
    const options: ParsedOption[] = [];
    
    // Tentar extrair alternativas de texto contínuo primeiro
    const optionRegex = /([A-E])\)\s*([^A-E\)]+?)(?=[A-E]\)|$)/g;
    let match;
    
    while ((match = optionRegex.exec(section)) !== null) {
      const key = match[1].toUpperCase();
      const text = match[2].trim();
      
      if (text && !text.includes('Gabarito') && !text.includes('Resposta')) {
        options.push({ key, text });
      }
    }
    
    // Se não encontrou alternativas no texto contínuo, usar método original
    if (options.length === 0) {
      const lines = section.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        for (const pattern of this.OPTION_PATTERNS) {
          const lineMatch = trimmedLine.match(pattern);
          if (lineMatch) {
            const key = lineMatch[1].toUpperCase();
            const text = trimmedLine.replace(pattern, '').trim();
            
            if (text) {
              options.push({ key, text });
            }
            break;
          }
        }
      }
    }
    
    return options;
  }

  /**
   * Extrai a resposta correta
   */
  private static extractCorrectAnswer(section: string): string | undefined {
    for (const pattern of this.ANSWER_KEY_PATTERNS) {
      const match = section.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }
    return undefined;
  }

  /**
   * Extrai a explicação da questão
   */
  private static extractExplanation(section: string): string | undefined {
    for (const pattern of this.EXPLANATION_PATTERNS) {
      const match = section.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  /**
   * Verifica se há referência a imagem na questão
   */
  private static checkForImageReference(section: string): boolean {
    const imageKeywords = [
      'figura', 'imagem', 'gráfico', 'tabela', 'esquema',
      'radiografia', 'tomografia', 'ressonância', 'ultrassom',
      'eletrocardiograma', 'ecg', 'raio-x', 'rx'
    ];
    
    const lowerSection = section.toLowerCase();
    return imageKeywords.some(keyword => lowerSection.includes(keyword));
  }

  /**
   * Valida se uma prova processada está completa
   */
  static validateParsedExam(exam: ParsedExam): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!exam.title) {
      errors.push('Título da prova é obrigatório');
    }
    
    if (exam.questions.length === 0) {
      errors.push('A prova deve conter pelo menos uma questão');
    }
    
    // Validar cada questão
    exam.questions.forEach((question, index) => {
      if (!question.statement) {
        errors.push(`Questão ${index + 1}: Enunciado é obrigatório`);
      }
      
      if (question.options.length < 2) {
        errors.push(`Questão ${index + 1}: Deve ter pelo menos 2 alternativas`);
      }
      
      // Verificar se as chaves das alternativas são únicas
      const optionKeys = question.options.map(opt => opt.key);
      const uniqueKeys = new Set(optionKeys);
      if (optionKeys.length !== uniqueKeys.size) {
        errors.push(`Questão ${index + 1}: Alternativas com chaves duplicadas`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default PDFParserService;