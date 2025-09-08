export interface ParsedQuestion {
  number: number;
  statement: string;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
  hasImage?: boolean;
  imageUrl?: string;
}

export interface ParsedExam {
  title: string;
  institution?: string;
  year?: number;
  questions: ParsedQuestion[];
}

export interface TextParserResult {
  success: boolean;
  exam?: ParsedExam;
  error?: string;
  warnings?: string[];
}

export class TextParserService {
  // Padrões para identificar questões
  private static readonly QUESTION_PATTERNS = [
    /^(\d+)\)\s*(.+?)$/m,           // 1) Texto da questão
    /^(\d+)\.\s*(.+?)$/m,          // 1. Texto da questão
    /^(\d+)\s*[-–—]\s*(.+?)$/m,    // 1 - Texto da questão
    /^(\d+)\s+(.+?)$/m,            // 1 Texto da questão
    /^Questão\s+(\d+)[\)\.]?\s*(.+?)$/mi, // Questão 1) ou Questão 1.
    /^Q\s*(\d+)[\)\.]?\s*(.+?)$/mi,       // Q1) ou Q1.
  ];

  // Padrões para identificar alternativas
  private static readonly OPTION_PATTERNS = [
    /^([A-E])\)\s*(.+?)$/m,        // A) Alternativa
    /^([A-E])\.\s*(.+?)$/m,       // A. Alternativa
    /^([A-E])\s*[-–—]\s*(.+?)$/m, // A - Alternativa
    /^([A-E])\s+(.+?)$/m,         // A Alternativa
    /^\(([A-E])\)\s*(.+?)$/m,     // (A) Alternativa
  ];

  // Padrões para identificar título da prova
  private static readonly TITLE_PATTERNS = [
    /(?:exame|prova|simulado|teste|avaliação|concurso|vestibular|enem|revalida)\s+[^\n]+/i,
    /residência\s+médica\s+[^\n]+/i,
    /^[^\n]*(?:20\d{2}|19\d{2})[^\n]*$/m,
    /^[A-Z][^\n]{10,80}$/m
  ];

  // Padrões para identificar gabarito
  private static readonly ANSWER_KEY_PATTERNS = [
    /(\d+)\)\s*([A-E])\s*[-–—]?/g,  // 1) A - ou 1) A
    /(\d+)\.\s*([A-E])\s*[-–—]?/g,  // 1. A - ou 1. A
    /(\d+)\s*[-–—]\s*([A-E])\s*[-–—]?/g, // 1 - A -
    /(\d+)\s+([A-E])\s*[-–—]?/g,    // 1 A -
  ];

  // Padrões para identificar instituição
  private static readonly INSTITUTION_PATTERNS = [
    /(?:INEP|CESPE|FCC|VUNESP|FUVEST|UNICAMP|UERJ|UFRJ|USP|UNIFESP)/i,
    /universidade\s+[^\n]+/i,
    /faculdade\s+[^\n]+/i,
    /instituto\s+[^\n]+/i
  ];

  public static parseText(text: string): TextParserResult {
    try {
      console.log('🔍 Iniciando análise do texto...');
      console.log('📝 Tamanho do texto:', text.length, 'caracteres');
      
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'Texto vazio ou inválido'
        };
      }

      const warnings: string[] = [];
      
      // Limpar e normalizar o texto
      const cleanText = this.cleanText(text);
      console.log('🧹 Texto limpo, tamanho:', cleanText.length);

      // Extrair informações básicas
      const title = this.extractTitle(cleanText);
      const institution = this.extractInstitution(cleanText);
      const year = this.extractYear(cleanText);
      
      console.log('📋 Informações extraídas:', { title, institution, year });

      // Dividir texto em seções de questões
      const questionSections = this.splitIntoQuestionSections(cleanText);
      console.log('📊 Seções de questões encontradas:', questionSections.length);

      if (questionSections.length === 0) {
        return {
          success: false,
          error: 'Nenhuma questão foi identificada no texto. Verifique se o formato está correto.'
        };
      }

      // Processar cada seção
      const questions: ParsedQuestion[] = [];
      
      for (let i = 0; i < questionSections.length; i++) {
        const section = questionSections[i];
        console.log(`🔍 Processando seção ${i + 1}:`, section.substring(0, 100) + '...');
        
        try {
          const question = this.parseQuestionSection(section, i + 1);
          if (question) {
            questions.push(question);
            console.log(`✅ Questão ${question.number} processada com sucesso`);
          } else {
            warnings.push(`Questão ${i + 1}: Não foi possível processar completamente`);
            console.log(`⚠️ Falha ao processar seção ${i + 1}`);
          }
        } catch (error) {
          console.error(`❌ Erro na seção ${i + 1}:`, error);
          warnings.push(`Questão ${i + 1}: Erro no processamento - ${error}`);
        }
      }

      console.log('📈 Total de questões processadas:', questions.length);

      if (questions.length === 0) {
        return {
          success: false,
          error: 'Nenhuma questão válida foi encontrada. Verifique o formato do texto.'
        };
      }

      // Validar numeração sequencial
      const missingNumbers = this.validateQuestionNumbers(questions);
      if (missingNumbers.length > 0) {
        warnings.push(`Questões com numeração inconsistente: ${missingNumbers.join(', ')}`);
      }

      return {
        success: true,
        exam: {
          title: title || 'Prova Importada',
          institution,
          year,
          questions
        },
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('❌ Erro geral no parser:', error);
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  private static cleanText(text: string): string {
    return text
      // Normalizar quebras de linha
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remover espaços extras
      .replace(/[ \t]+/g, ' ')
      // Remover linhas vazias excessivas
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim geral
      .trim();
  }

  private static extractTitle(text: string): string | undefined {
    const lines = text.split('\n').slice(0, 10); // Primeiras 10 linhas
    
    for (const pattern of this.TITLE_PATTERNS) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          return match[0].trim();
        }
      }
    }
    
    // Fallback: primeira linha não vazia que não seja questão
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && !this.looksLikeQuestion(trimmed)) {
        return trimmed;
      }
    }
    
    return undefined;
  }

  private static extractInstitution(text: string): string | undefined {
    for (const pattern of this.INSTITUTION_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    return undefined;
  }

  private static extractYear(text: string): number | undefined {
    const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : undefined;
  }

  private static splitIntoQuestionSections(text: string): string[] {
    const sections: string[] = [];
    
    // Padrão robusto para identificar início de questões
    // Busca por números seguidos de ) ou . no início de linha ou após quebra
    const questionPattern = /(?:^|\n)\s*(\d+)\s*[\)\.]\s*/gm;
    const questionStarts: Array<{ index: number; number: number; match: string }> = [];
    
    let match;
    while ((match = questionPattern.exec(text)) !== null) {
      const questionNumber = parseInt(match[1]);
      questionStarts.push({
        index: match.index + (match[0].startsWith('\n') ? 1 : 0), // Ajustar se começar com \n
        number: questionNumber,
        match: match[0].trim()
      });
    }
    
    // Ordenar por posição no texto
    questionStarts.sort((a, b) => a.index - b.index);
    
    console.log('🎯 Inícios de questões encontrados:', questionStarts.length);
    console.log('📊 Números das questões:', questionStarts.map(q => q.number));
    
    if (questionStarts.length === 0) {
      // Fallback: buscar padrões mais flexíveis
      const flexiblePattern = /(?:^|\n)\s*(?:questão\s*)?(\d+)\s*[\)\.]?\s*/gmi;
      let fallbackMatch;
      while ((fallbackMatch = flexiblePattern.exec(text)) !== null) {
        const questionNumber = parseInt(fallbackMatch[1]);
        questionStarts.push({
          index: fallbackMatch.index + (fallbackMatch[0].startsWith('\n') ? 1 : 0),
          number: questionNumber,
          match: fallbackMatch[0].trim()
        });
      }
      
      questionStarts.sort((a, b) => a.index - b.index);
      console.log('🎯 Inícios flexíveis encontrados:', questionStarts.length);
    }
    
    // Dividir o texto em seções baseado nos marcadores encontrados
    for (let i = 0; i < questionStarts.length; i++) {
      const start = questionStarts[i].index;
      const end = i + 1 < questionStarts.length ? questionStarts[i + 1].index : text.length;
      
      const section = text.substring(start, end).trim();
      if (section.length > 10) { // Filtrar seções muito pequenas
        sections.push(section);
        console.log(`📝 Seção ${i + 1} (Q${questionStarts[i].number}): ${section.substring(0, 50)}...`);
      }
    }
    
    return sections;
  }

  private static parseQuestionSection(section: string, expectedNumber: number): ParsedQuestion | null {
    console.log(`\n🔍 === ANALISANDO QUESTÃO ${expectedNumber} ===`);
    console.log(`📄 Seção completa (primeiros 200 chars): ${section.substring(0, 200)}...`);
    
    // Extrair número da questão
    const questionNumber = this.extractQuestionNumber(section);
    console.log(`🔢 Número extraído: ${questionNumber}`);
    
    // Extrair enunciado
    const statement = this.extractStatement(section);
    if (!statement) {
      console.log(`❌ Falha ao extrair enunciado da questão ${expectedNumber}`);
      return null;
    }
    console.log(`📝 Enunciado extraído (${statement.length} chars): ${statement.substring(0, 100)}...`);
    
    // Extrair alternativas
    const options = this.extractOptions(section);
    console.log(`📋 Alternativas encontradas: ${options.length}`);
    
    if (options.length === 0) {
      console.log(`❌ Nenhuma alternativa encontrada para questão ${expectedNumber}`);
      return null;
    }
    
    // Validar se temos pelo menos 2 alternativas (mínimo esperado)
    if (options.length < 2) {
      console.log(`⚠️ Questão ${expectedNumber} tem apenas ${options.length} alternativa(s), pode estar incompleta`);
    }
    
    // Verificar se tem imagem
    const hasImage = this.checkForImage(section);
    if (hasImage) {
      console.log(`🖼️ Questão ${expectedNumber} contém referência a imagem`);
    }
    
    const question = {
      number: questionNumber || expectedNumber,
      statement,
      options,
      hasImage
    };
    
    console.log(`✅ Questão ${expectedNumber} processada com sucesso!`);
    console.log(`📊 Resumo: ${statement.length} chars no enunciado, ${options.length} alternativas`);
    
    return question;
  }

  private static extractQuestionNumber(section: string): number | null {
    // Buscar número no início da seção com padrões robustos
    const patterns = [
      /^\s*(\d+)\s*[\)\.]\s*/, // 1) ou 1.
      /^\s*questão\s*(\d+)/i,   // Questão 1
      /^\s*(\d+)\s+/,          // 1 (seguido de espaço)
      /^\s*(\d+)/              // Qualquer número no início
    ];
    
    for (const pattern of patterns) {
      const match = section.match(pattern);
      if (match && match[1]) {
        const number = parseInt(match[1]);
        console.log(`🔢 Número da questão encontrado: ${number}`);
        return number;
      }
    }
    
    console.log('⚠️ Número da questão não encontrado');
    return null;
  }

  private static extractStatement(section: string): string | null {
    console.log('📝 Extraindo enunciado da seção:', section.substring(0, 100) + '...');
    
    // Primeiro, remover o marcador da questão (número + ) ou .)
    let cleanSection = section.replace(/^\s*\d+\s*[\)\.]\s*/, '').trim();
    
    // Se o texto está em uma única linha (sem quebras), usar estratégia diferente
    if (!cleanSection.includes('\n')) {
      console.log('📄 Texto contínuo detectado, processando como linha única');
      
      // Encontrar o início da primeira alternativa (A) ou a)
      const firstOptionMatch = cleanSection.match(/\b[Aa]\s*[\)\.]\s*/);
      if (firstOptionMatch && firstOptionMatch.index !== undefined) {
        const statement = cleanSection.substring(0, firstOptionMatch.index).trim();
        console.log('✂️ Enunciado extraído (texto contínuo):', statement.substring(0, 50) + '...');
        return statement.length > 0 ? statement : null;
      }
      
      // Se não encontrou alternativas, retornar todo o texto limpo
      console.log('⚠️ Nenhuma alternativa encontrada no texto contínuo');
      return cleanSection.length > 0 ? cleanSection : null;
    }
    
    // Para texto com quebras de linha, processar linha por linha
    console.log('📄 Texto com quebras de linha detectado');
    const lines = cleanSection.split('\n');
    const statementLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Pular linhas vazias
      if (line.length === 0) {
        continue;
      }
      
      // Verificar se a linha é uma alternativa (A), B), C), D), E))
      if (this.isOptionLine(line)) {
        console.log('🛑 Primeira alternativa encontrada na linha:', line);
        break; // Parar quando encontrar a primeira alternativa
      }
      
      // Adicionar linha ao enunciado
      statementLines.push(line);
    }
    
    const statement = statementLines.join(' ').trim();
    console.log('✅ Enunciado final extraído:', statement.substring(0, 100) + '...');
    
    return statement.length > 0 ? statement : null;
  }

  private static extractOptions(section: string): string[] {
    console.log('📋 Extraindo alternativas da seção');
    const options: string[] = [];
    
    // Se o texto está em uma única linha, usar regex global
    if (!section.includes('\n')) {
      console.log('📄 Processando alternativas em texto contínuo');
      
      // Padrão para capturar alternativas em texto contínuo: A) texto B) texto C) texto
      const continuousPattern = /\b([A-Ea-e])\s*[\)\.]\s*([^A-Ea-e\)\.].*?)(?=\s*\b[A-Ea-e]\s*[\)\.]|$)/g;
      let match;
      
      while ((match = continuousPattern.exec(section)) !== null) {
        const optionLetter = match[1].toUpperCase();
        const optionText = match[2].trim();
        
        if (optionText.length > 0) {
          options.push(optionText);
          console.log(`✅ Alternativa ${optionLetter}: ${optionText.substring(0, 30)}...`);
        }
      }
      
      return options;
    }
    
    // Para texto com quebras de linha, processar linha por linha
    console.log('📄 Processando alternativas linha por linha');
    const lines = section.split('\n');
    let foundFirstOption = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.length === 0) {
        continue;
      }
      
      // Verificar se é uma linha de alternativa
      const optionMatch = this.parseOptionLine(trimmed);
      if (optionMatch) {
        foundFirstOption = true;
        options.push(optionMatch.text);
        console.log(`✅ Alternativa ${optionMatch.letter}: ${optionMatch.text.substring(0, 30)}...`);
      } else if (foundFirstOption && trimmed.length > 0) {
        // Se já encontramos alternativas e esta linha não é uma alternativa,
        // pode ser continuação da alternativa anterior
        if (options.length > 0 && !this.looksLikeNewQuestion(trimmed)) {
          options[options.length - 1] += ' ' + trimmed;
          console.log('📝 Continuação da alternativa anterior:', trimmed.substring(0, 30) + '...');
        }
      }
    }
    
    console.log(`📊 Total de alternativas extraídas: ${options.length}`);
    return options;
  }

  private static looksLikeQuestion(text: string): boolean {
    return this.QUESTION_PATTERNS.some(pattern => pattern.test(text));
  }

  private static looksLikeOption(text: string): boolean {
    return this.OPTION_PATTERNS.some(pattern => pattern.test(text));
  }
  
  private static isOptionLine(text: string): boolean {
    // Verifica se a linha começa com A), B), C), D), E) ou a), b), c), d), e)
    return /^\s*[A-Ea-e]\s*[\)\.]\s*/.test(text);
  }
  
  private static parseOptionLine(text: string): { letter: string; text: string } | null {
    const match = text.match(/^\s*([A-Ea-e])\s*[\)\.]\s*(.*)$/);
    if (match) {
      return {
        letter: match[1].toUpperCase(),
        text: match[2].trim()
      };
    }
    return null;
  }
  
  private static looksLikeNewQuestion(text: string): boolean {
    // Verifica se o texto parece ser o início de uma nova questão
    return /^\s*\d+\s*[\)\.]\s*/.test(text);
  }

  private static checkForImage(section: string): boolean {
    const imageKeywords = ['figura', 'imagem', 'gráfico', 'tabela', 'esquema', 'diagrama'];
    const lowerSection = section.toLowerCase();
    return imageKeywords.some(keyword => lowerSection.includes(keyword));
  }

  /**
   * Extrai gabarito do texto no formato: 1) A - 2) B - 3) C - etc.
   */
  public static extractAnswerKey(text: string): Map<number, string> {
    console.log('🔑 Iniciando extração de gabarito...');
    const answerKey = new Map<number, string>();
    
    // Limpar texto
    const cleanText = this.cleanText(text);
    
    // Tentar cada padrão de gabarito
    for (const pattern of this.ANSWER_KEY_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex global
      let match;
      
      while ((match = pattern.exec(cleanText)) !== null) {
        const questionNumber = parseInt(match[1]);
        const answer = match[2].toUpperCase();
        
        if (questionNumber > 0 && /^[A-E]$/.test(answer)) {
          answerKey.set(questionNumber, answer);
          console.log(`✅ Gabarito encontrado: Questão ${questionNumber} = ${answer}`);
        }
      }
      
      // Se encontrou respostas com este padrão, usar este resultado
      if (answerKey.size > 0) {
        break;
      }
    }
    
    console.log(`🔑 Total de respostas no gabarito: ${answerKey.size}`);
    return answerKey;
  }

  /**
   * Aplica gabarito às questões processadas
   */
  public static applyAnswerKey(questions: ParsedQuestion[], answerKey: Map<number, string>): ParsedQuestion[] {
    console.log('🎯 Aplicando gabarito às questões...');
    
    return questions.map(question => {
      const correctAnswer = answerKey.get(question.number);
      if (correctAnswer) {
        console.log(`✅ Aplicando resposta ${correctAnswer} à questão ${question.number}`);
        return {
          ...question,
          correctAnswer
        };
      }
      return question;
    });
  }

  /**
   * Identifica se o texto contém um gabarito
   */
  public static hasAnswerKey(text: string): boolean {
    const cleanText = this.cleanText(text);
    
    for (const pattern of this.ANSWER_KEY_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(cleanText)) {
        return true;
      }
    }
    
    return false;
  }

  private static validateQuestionNumbers(questions: ParsedQuestion[]): number[] {
    const numbers = questions.map(q => q.number).sort((a, b) => a - b);
    const missing: number[] = [];
    
    for (let i = 1; i <= numbers[numbers.length - 1]; i++) {
      if (!numbers.includes(i)) {
        missing.push(i);
      }
    }
    
    return missing;
  }
}