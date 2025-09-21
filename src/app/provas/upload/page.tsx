'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCheck, FaCheckCircle, FaFileExport, FaListOl, FaEye, FaEdit, FaImage, FaTrash, FaUpload, FaSpinner } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { ExamsService } from '@/services/exams.service';
import { QuestionsBankService } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { QuestionImageUploadService } from '@/services/question-image-upload.service';
import { supabase } from '@/lib/supabase';

interface ExamType {
  id: number;
  name: string;
  description: string;
}

interface ParsedQuestion {
  id: string;
  text: string;
  alternatives: string[];
  correctAnswer: number;
  explanation?: string;
  disciplineId?: number;
  subjectId?: number;
  topicId?: number;
  tag?: string;
  image?: File | null;
  imageUrl?: string;
  institutionName?: string;
  examYear?: number;
}

interface QuestionMetadata {
  questionNumber: number;
  grandeArea: string;
  categoria: string;
  subAssunto: string;
}

interface NewQuestionMetadata {
  questionNumber: number;
  disciplina: string;
  assunto: string;
  topico?: string;
}

interface ValidationResult {
  disciplineMatch: Discipline | null;
  subjectMatch: Subject | null;
  isValid: boolean;
  errors: string[];
}

interface Discipline {
  id: number;
  name: string;
  subjects?: Subject[];
}

interface Subject {
  id: number;
  name?: string;
  title?: string;
}

interface Topic {
  id: number;
  name: string;
  subject_id: number;
  discipline_id?: number;
}

const ADMIN_USER_IDS = [
  '9e959500-f290-4457-a5d7-2a81c496d123',
  'e6c41b94-f25c-4ef4-b723-c4a2d480cf43'
];

const Loading = ({ message = "Carregando..." }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh]">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-gray-600 font-medium">{message}</p>
  </div>
);

export default function UploadProvaPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Verificar se o usuário é admin
  const isAdmin = user && ADMIN_USER_IDS.includes(user.id);
  
  const [loading, setLoading] = useState(false);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examTypeId, setExamTypeId] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState(60);
  const [isPublic, setIsPublic] = useState(false);
  const [addToGenomaBank, setAddToGenomaBank] = useState(false);
  const [questionsText, setQuestionsText] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  // Institution and year states
  const [institutionName, setInstitutionName] = useState<string>('');
  const [examYear, setExamYear] = useState<number>(new Date().getFullYear());
  
  // Discipline and subject states
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [loadingDisciplines, setLoadingDisciplines] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  
  // Cache de assuntos por disciplina para questões individuais
  const [questionSubjects, setQuestionSubjects] = useState<{[disciplineId: number]: Subject[]}>({});
  const [loadingQuestionSubjects, setLoadingQuestionSubjects] = useState<{[disciplineId: number]: boolean}>({});
  
  // Cache de tópicos por assunto para questões individuais
  const [questionTopics, setQuestionTopics] = useState<{[subjectId: number]: Topic[]}>({});
  const [loadingQuestionTopics, setLoadingQuestionTopics] = useState<{[subjectId: number]: boolean}>({});
  
  // Estados para parser automático de metadados
  const [metadataText, setMetadataText] = useState('');
  const [parsedMetadata, setParsedMetadata] = useState<QuestionMetadata[]>([]);
  const [validationResults, setValidationResults] = useState<{[questionNumber: number]: ValidationResult}>({});
  const [showMetadataParser, setShowMetadataParser] = useState(false);
  
  // Estados para novo parser de metadados
  const [newMetadataText, setNewMetadataText] = useState('');
  const [parsedNewMetadata, setParsedNewMetadata] = useState<NewQuestionMetadata[]>([]);
  const [newValidationResults, setNewValidationResults] = useState<{[questionNumber: number]: ValidationResult}>({});
  const [showNewMetadataParser, setShowNewMetadataParser] = useState(false);
  
  // Estados para upload em lote de imagens
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [processingBulkImages, setProcessingBulkImages] = useState(false);
  
  // Ref para controlar inicialização
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (!isAdmin) {
      toast.error('Acesso negado. Apenas administradores podem criar provas.');
      router.push('/provas');
      return;
    }
    
    // Só executa uma vez após a autenticação
    if (!initializedRef.current) {
      initializedRef.current = true;
      loadExamTypes();
      loadDisciplines();
    }
  }, [user, router, isAdmin]);

  // Cleanup das URLs de objeto quando o componente for desmontado
  useEffect(() => {
    return () => {
      parsedQuestions.forEach(question => {
        if (question.imageUrl) {
          URL.revokeObjectURL(question.imageUrl);
        }
      });
    };
  }, [parsedQuestions]);
  
  const loadExamTypes = async () => {
    try {
      setLoadingTypes(true);
      const types = await ExamsService.getExamTypes();
      setExamTypes(types);
    } catch (error) {
      console.error('Erro ao carregar tipos de exames:', error);
      toast.error('Erro ao carregar categorias de provas');
    } finally {
      setLoadingTypes(false);
    }
  };



  const loadDisciplines = async () => {
    try {
      setLoadingDisciplines(true);
      console.log('🔍 Carregando disciplinas do usuário...');
      const disciplinesData = await DisciplinesRestService.getDisciplines(true);
      console.log('📚 Disciplinas carregadas:', disciplinesData);
      console.log('📊 Número de disciplinas:', disciplinesData?.length || 0);
      setDisciplines(disciplinesData || []);
      
      if (!disciplinesData || disciplinesData.length === 0) {
        console.warn('⚠️ Nenhuma disciplina encontrada para o usuário');
        toast.warning('Nenhuma disciplina encontrada. Crie disciplinas primeiro.');
      } else {
        console.log('✅ Disciplinas carregadas com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar disciplinas:', error);
      toast.error('Erro ao carregar disciplinas');
    } finally {
      setLoadingDisciplines(false);
    }
  };

  const loadSubjects = async (disciplineId: number) => {
    try {
      setLoadingSubjects(true);
      console.log('Carregando assuntos da disciplina:', disciplineId);
      const data = await DisciplinesRestService.getSubjects(disciplineId, true);
      console.log('Assuntos carregados:', data?.length || 0);
      setSubjects(data || []);
      if (!data || data.length === 0) {
        console.warn('Nenhum assunto encontrado para esta disciplina');
        toast.warning('Nenhum assunto encontrado para esta disciplina');
      }
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
      toast.error('Erro ao carregar assuntos');
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const loadTopics = async (subjectId: number) => {
    try {
      setLoadingTopics(true);
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId)
        .order('name');
      
      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Erro ao carregar tópicos:', error);
      toast.error('Erro ao carregar tópicos');
      setTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleDisciplineChange = (disciplineId: number | null) => {
    setSelectedDisciplineId(disciplineId);
    setSelectedSubjectId(null);
    setSelectedTopicId(null);
    setSubjects([]);
    setTopics([]);
    
    if (disciplineId) {
      loadSubjects(disciplineId);
    }
  };

  const handleSubjectChange = (subjectId: number | null) => {
    setSelectedSubjectId(subjectId);
    setSelectedTopicId(null);
    setTopics([]);
    
    if (subjectId) {
      loadTopics(subjectId);
    }
  };
  
  // Padrões para identificar questões
  const QUESTION_PATTERNS = [
    /^(\d+)\)\s*(.+?)$/m,           // 1) Texto da questão
    /^(\d+)\.\s*(.+?)$/m,          // 1. Texto da questão
    /^(\d+)\s*[-–—]\s*(.+?)$/m,    // 1 - Texto da questão
    /^(\d+)\s+(.+?)$/m,            // 1 Texto da questão
    /^Questão\s+(\d+)[\)\.]?\s*(.+?)$/mi, // Questão 1) ou Questão 1.
    /^Q\s*(\d+)[\)\.]?\s*(.+?)$/mi,       // Q1) ou Q1.
  ];

  // Padrões para identificar alternativas
  const OPTION_PATTERNS = [
    /^([A-E])\)\s*(.+?)$/m,        // A) Alternativa
    /^([A-E])\.\s*(.+?)$/m,       // A. Alternativa
    /^([A-E])\s*[-–—]\s*(.+?)$/m, // A - Alternativa
    /^([A-E])\s+(.+?)$/m,         // A Alternativa
    /^\(([A-E])\)\s*(.+?)$/m,     // (A) Alternativa
  ];

  // Padrões para identificar gabarito
  const ANSWER_KEY_PATTERNS = [
    /(\d+)\)\s*([A-E])\s*[-–—]?/g,  // 1) A - ou 1) A
    /(\d+)\.\s*([A-E])\s*[-–—]?/g,  // 1. A - ou 1. A
    /(\d+)\s*[-–—]\s*([A-E])\s*[-–—]?/g, // 1 - A -
    /(\d+)\s+([A-E])\s*[-–—]?/g,    // 1 A -
  ];

  const normalizeText = (text: string): string => {
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
  };

  const parseAnswerKey = (answerKeyText: string): { [key: number]: number } => {
    const answers: { [key: number]: number } = {};
    const normalizedText = normalizeText(answerKeyText);
    
    for (const pattern of ANSWER_KEY_PATTERNS) {
      const matches = [...normalizedText.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach(match => {
          const questionNum = parseInt(match[1]);
          const letter = match[2].toUpperCase();
          const answerIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
          if (answerIndex >= 0 && answerIndex <= 4) {
            answers[questionNum] = answerIndex;
          }
        });
        break; // Use o primeiro padrão que encontrar matches
      }
    }
    
    return answers;
  };

  const extractQuestions = (text: string): Array<{questionNum: number, content: string}> => {
    const normalizedText = normalizeText(text);
    const questions: Array<{questionNum: number, content: string}> = [];
    
    for (const pattern of QUESTION_PATTERNS) {
      const lines = normalizedText.split('\n');
      let currentQuestion: {questionNum: number, content: string} | null = null;
      
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          // Se já temos uma questão em andamento, salve-a
          if (currentQuestion) {
            questions.push(currentQuestion);
          }
          // Inicie uma nova questão
          currentQuestion = {
            questionNum: parseInt(match[1]),
            content: match[2] || ''
          };
        } else if (currentQuestion && line.trim()) {
          // Continue adicionando conteúdo à questão atual
          currentQuestion.content += '\n' + line;
        }
      }
      
      // Adicione a última questão
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      if (questions.length > 0) break; // Use o primeiro padrão que encontrar questões
    }
    
    return questions;
  };

  const extractAlternatives = (questionContent: string): string[] => {
    const alternatives: string[] = [];
    const normalizedContent = normalizeText(questionContent);
    
    for (const pattern of OPTION_PATTERNS) {
      const tempAlternatives: {[key: string]: string} = {};
      const lines = normalizedContent.split('\n');
      let currentOption: {letter: string, content: string} | null = null;
      
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          // Se já temos uma alternativa em andamento, salve-a
          if (currentOption) {
            tempAlternatives[currentOption.letter] = currentOption.content.trim();
          }
          // Inicie uma nova alternativa
          currentOption = {
            letter: match[1].toUpperCase(),
            content: match[2] || ''
          };
        } else if (currentOption && line.trim() && !line.match(/^[A-E][\)\.]?\s/)) {
          // Continue adicionando conteúdo à alternativa atual
          currentOption.content += ' ' + line.trim();
        }
      }
      
      // Adicione a última alternativa
      if (currentOption) {
        tempAlternatives[currentOption.letter] = currentOption.content.trim();
      }
      
      // Converta para array ordenado
      const letters = ['A', 'B', 'C', 'D', 'E'];
      for (const letter of letters) {
        if (tempAlternatives[letter]) {
          alternatives.push(tempAlternatives[letter]);
        }
      }
      
      if (alternatives.length >= 4) break; // Use o primeiro padrão que encontrar alternativas suficientes
    }
    
    return alternatives;
  };

  const parseQuestions = () => {
    if (!questionsText.trim() || !answerKey.trim()) {
      toast.error('Preencha o texto das questões e o gabarito');
      return;
    }

    try {
      // Parse do gabarito
      const answers = parseAnswerKey(answerKey);
      
      if (Object.keys(answers).length === 0) {
        toast.error('Nenhuma resposta foi encontrada no gabarito. Verifique o formato.');
        return;
      }

      // Extrair questões
      const extractedQuestions = extractQuestions(questionsText);
      
      if (extractedQuestions.length === 0) {
        toast.error('Nenhuma questão foi encontrada. Verifique o formato do texto.');
        return;
      }

      const parsed: ParsedQuestion[] = [];

      extractedQuestions.forEach(({questionNum, content}) => {
        // Separar enunciado das alternativas
        const alternatives = extractAlternatives(content);
        
        if (alternatives.length < 4) {
          console.warn(`Questão ${questionNum}: apenas ${alternatives.length} alternativas encontradas`);
          return;
        }
        
        // Extrair o enunciado (tudo antes das alternativas)
        let questionText = content;
        for (const pattern of OPTION_PATTERNS) {
          const match = content.search(pattern);
          if (match !== -1) {
            questionText = content.substring(0, match).trim();
            break;
          }
        }
        
        if (questionText && alternatives.length >= 4) {
          parsed.push({
            id: `q${questionNum}`,
            text: normalizeText(questionText),
            alternatives: alternatives.slice(0, 5), // Máximo 5 alternativas
            correctAnswer: answers[questionNum] ?? 0,
            disciplineId: selectedDisciplineId,
            subjectId: selectedSubjectId,
            institutionName: institutionName,
            examYear: examYear
          });
        }
      });

      if (parsed.length === 0) {
        toast.error('Nenhuma questão válida foi processada. Verifique o formato.');
        return;
      }

      setParsedQuestions(parsed);
      setShowPreview(true);
      toast.success(`${parsed.length} questões parseadas com sucesso!`);

    } catch (error) {
      console.error('Erro ao parsear questões:', error);
      toast.error('Erro ao processar as questões. Verifique o formato.');
    }
  };

  // Função para parsear metadados das questões
  const parseMetadata = async () => {
    if (!metadataText.trim()) {
      toast.error('Cole o texto dos metadados das questões');
      return;
    }

    try {
      const lines = metadataText.split('\n').map(line => line.trim()).filter(line => line);
      const metadata: QuestionMetadata[] = [];
      let currentQuestion: Partial<QuestionMetadata> = {};

      for (const line of lines) {
        // Detectar início de nova questão
        const questionMatch = line.match(/^Questão\s+(\d+):/i);
        if (questionMatch) {
          // Salvar questão anterior se completa
          if (currentQuestion.questionNumber && currentQuestion.grandeArea && currentQuestion.categoria && currentQuestion.subAssunto) {
            metadata.push(currentQuestion as QuestionMetadata);
          }
          // Iniciar nova questão
          currentQuestion = { questionNumber: parseInt(questionMatch[1]) };
          continue;
        }

        // Parsear campos
        const grandeAreaMatch = line.match(/^Grande\s+Área:\s*(.+?)(?:\s*\(.*\))?$/i);
        if (grandeAreaMatch) {
          currentQuestion.grandeArea = grandeAreaMatch[1].trim();
          continue;
        }

        const categoriaMatch = line.match(/^Categoria:\s*(.+?)(?:\s*\(.*\))?$/i);
        if (categoriaMatch) {
          currentQuestion.categoria = categoriaMatch[1].trim();
          continue;
        }

        const subAssuntoMatch = line.match(/^Sub-assunto:\s*(.+?)(?:\s*\(.*\))?$/i);
        if (subAssuntoMatch) {
          currentQuestion.subAssunto = subAssuntoMatch[1].trim();
          continue;
        }
      }

      // Adicionar última questão se completa
      if (currentQuestion.questionNumber && currentQuestion.grandeArea && currentQuestion.categoria && currentQuestion.subAssunto) {
        metadata.push(currentQuestion as QuestionMetadata);
      }

      if (metadata.length === 0) {
        toast.error('Nenhum metadado válido encontrado. Verifique o formato.');
        return;
      }

      setParsedMetadata(metadata);
      await validateMetadata(metadata);
      toast.success(`${metadata.length} metadados de questões processados`);
    } catch (error) {
      console.error('Erro ao parsear metadados:', error);
      toast.error('Erro ao processar metadados. Verifique o formato.');
    }
  };

  // Função para validar metadados contra disciplinas e assuntos cadastrados
  const validateMetadata = async (metadata: QuestionMetadata[]) => {
    const results: {[questionNumber: number]: ValidationResult} = {};

    for (const meta of metadata) {
      const result: ValidationResult = {
        disciplineMatch: null,
        subjectMatch: null,
        isValid: false,
        errors: []
      };

      // Buscar disciplina (Grande Área)
      // Primeiro, tentar correspondência exata (ignorando case)
      let disciplineMatch = disciplines.find(d => 
        d.name.toLowerCase() === meta.grandeArea.toLowerCase()
      );
      
      // Se não encontrar correspondência exata, usar busca por inclusão
      if (!disciplineMatch) {
        disciplineMatch = disciplines.find(d => 
          d.name.toLowerCase().includes(meta.grandeArea.toLowerCase()) ||
          meta.grandeArea.toLowerCase().includes(d.name.toLowerCase())
        );
      }
      
      console.log(`Buscando disciplina para: "${meta.grandeArea}"`); 
      console.log('Disciplinas disponíveis:', disciplines.map(d => d.name));
      console.log('Disciplina encontrada:', disciplineMatch?.name || 'Nenhuma');

      if (disciplineMatch) {
        result.disciplineMatch = disciplineMatch;
        
        // Carregar assuntos da disciplina se ainda não foram carregados
        let disciplineSubjects = disciplineMatch.subjects || questionSubjects[disciplineMatch.id] || [];
        
        if (disciplineSubjects.length === 0 && !loadingQuestionSubjects[disciplineMatch.id]) {
          console.log(`Carregando assuntos para disciplina ${disciplineMatch.name} (ID: ${disciplineMatch.id})`);
          try {
            const data = await DisciplinesRestService.getSubjects(disciplineMatch.id, true);
            console.log('Assuntos carregados diretamente:', data?.length || 0, data);
            disciplineSubjects = data || [];
            // Atualizar o estado também
            setQuestionSubjects(prev => ({ ...prev, [disciplineMatch.id]: data || [] }));
          } catch (error) {
            console.error('Erro ao carregar assuntos:', error);
            disciplineSubjects = [];
          }
        }
        
        console.log(`Disciplina: ${disciplineMatch.name}, Assuntos disponíveis:`, disciplineSubjects.map(s => s.title || s.name));
        console.log(`Procurando por categoria: "${meta.categoria}"`);
        
        const subjectMatch = disciplineSubjects.find(s => {
          const subjectName = s.title || s.name || '';
          const matches = subjectName.toLowerCase().includes(meta.categoria.toLowerCase()) ||
                         meta.categoria.toLowerCase().includes(subjectName.toLowerCase());
          console.log(`Comparando "${subjectName}" com "${meta.categoria}": ${matches}`);
          return matches;
        });

        if (subjectMatch) {
          result.subjectMatch = subjectMatch;
          result.isValid = true;
        } else {
          result.errors.push(`Assunto "${meta.categoria}" não encontrado na disciplina "${disciplineMatch.name}"`);
        }
      } else {
        result.errors.push(`Disciplina "${meta.grandeArea}" não encontrada`);
      }

      results[meta.questionNumber] = result;
    }

    setValidationResults(results);
  };

  // Função para parsear novo formato de metadados (Disciplina, Assunto, Tópico)
  const parseNewMetadataFormat = async () => {
    if (!newMetadataText.trim()) {
      toast.error('Digite os metadados para processar');
      return;
    }

    try {
      const lines = newMetadataText.split('\n').map(line => line.trim()).filter(line => line);
      const metadata: NewQuestionMetadata[] = [];
      let currentQuestion: Partial<NewQuestionMetadata> = {};

      for (const line of lines) {
        // Detectar início de nova questão
        const questionMatch = line.match(/^Questão\s+(\d+):/i);
        if (questionMatch) {
          // Salvar questão anterior se completa
          if (currentQuestion.questionNumber && currentQuestion.disciplina && currentQuestion.assunto) {
            metadata.push(currentQuestion as NewQuestionMetadata);
          }
          // Iniciar nova questão
          currentQuestion = { questionNumber: parseInt(questionMatch[1]) };
          continue;
        }

        // Parsear campos
        const disciplinaMatch = line.match(/^Disciplina:\s*(.+)$/i);
        if (disciplinaMatch) {
          currentQuestion.disciplina = disciplinaMatch[1].trim();
          continue;
        }

        const assuntoMatch = line.match(/^Assunto:\s*(.+)$/i);
        if (assuntoMatch) {
          currentQuestion.assunto = assuntoMatch[1].trim();
          continue;
        }

        const topicoMatch = line.match(/^Tópico:\s*(.+)$/i);
        if (topicoMatch) {
          currentQuestion.topico = topicoMatch[1].trim();
          continue;
        }
      }

      // Adicionar última questão se completa
      if (currentQuestion.questionNumber && currentQuestion.disciplina && currentQuestion.assunto) {
        metadata.push(currentQuestion as NewQuestionMetadata);
      }

      if (metadata.length === 0) {
        toast.error('Nenhum metadado válido encontrado. Verifique o formato.');
        return;
      }

      setParsedNewMetadata(metadata);
      await validateNewMetadata(metadata);
      toast.success(`${metadata.length} metadados de questões processados`);
    } catch (error) {
      console.error('Erro ao parsear novos metadados:', error);
      toast.error('Erro ao processar metadados. Verifique o formato.');
    }
   };

  // Função para validar novos metadados contra disciplinas, assuntos e tópicos cadastrados
  const validateNewMetadata = async (metadata: NewQuestionMetadata[]) => {
    const results: {[questionNumber: number]: ValidationResult} = {};

    for (const meta of metadata) {
      const result: ValidationResult = {
        disciplineMatch: null,
        subjectMatch: null,
        isValid: false,
        errors: []
      };

      // Buscar disciplina
      let disciplineMatch = disciplines.find(d => 
        d.name.toLowerCase() === meta.disciplina.toLowerCase()
      );
      
      // Se não encontrar correspondência exata, usar busca por inclusão
      if (!disciplineMatch) {
        disciplineMatch = disciplines.find(d => 
          d.name.toLowerCase().includes(meta.disciplina.toLowerCase()) ||
          meta.disciplina.toLowerCase().includes(d.name.toLowerCase())
        );
      }
      
      console.log(`🔍 Buscando disciplina para: "${meta.disciplina}"`);
      console.log('📚 Disciplinas disponíveis:', disciplines.map(d => d.name));
      console.log('✅ Disciplina encontrada:', disciplineMatch?.name || 'Nenhuma');

      if (disciplineMatch) {
        result.disciplineMatch = disciplineMatch;
        
        // Carregar assuntos da disciplina se ainda não foram carregados
        let disciplineSubjects = disciplineMatch.subjects || questionSubjects[disciplineMatch.id] || [];
        
        if (disciplineSubjects.length === 0 && !loadingQuestionSubjects[disciplineMatch.id]) {
          console.log(`📖 Carregando assuntos para disciplina ${disciplineMatch.name} (ID: ${disciplineMatch.id})`);
          try {
            const data = await DisciplinesRestService.getSubjects(disciplineMatch.id, true);
            console.log('📚 Assuntos carregados:', data?.length || 0, data);
            disciplineSubjects = data || [];
            // Atualizar o estado também
            setQuestionSubjects(prev => ({ ...prev, [disciplineMatch.id]: data || [] }));
          } catch (error) {
            console.error('❌ Erro ao carregar assuntos:', error);
            disciplineSubjects = [];
          }
        }
        
        console.log(`🔍 Disciplina: ${disciplineMatch.name}, Assuntos disponíveis:`, disciplineSubjects.map(s => s.title || s.name));
        console.log(`🔍 Procurando por assunto: "${meta.assunto}"`);
        
        // Buscar assunto
        const subjectMatch = disciplineSubjects.find(s => {
          const subjectName = s.title || s.name || '';
          const exactMatch = subjectName.toLowerCase() === meta.assunto.toLowerCase();
          const includesMatch = subjectName.toLowerCase().includes(meta.assunto.toLowerCase()) ||
                               meta.assunto.toLowerCase().includes(subjectName.toLowerCase());
          console.log(`📝 Comparando "${subjectName}" com "${meta.assunto}": exato=${exactMatch}, inclusão=${includesMatch}`);
          return exactMatch || includesMatch;
        });

        if (subjectMatch) {
          result.subjectMatch = subjectMatch;
          result.isValid = true;
          console.log(`✅ Assunto encontrado: ${subjectMatch.title || subjectMatch.name}`);
        } else {
          result.errors.push(`Assunto "${meta.assunto}" não encontrado na disciplina "${disciplineMatch.name}"`);
          console.log(`❌ Assunto "${meta.assunto}" não encontrado`);
        }
      } else {
        result.errors.push(`Disciplina "${meta.disciplina}" não encontrada`);
        console.log(`❌ Disciplina "${meta.disciplina}" não encontrada`);
      }

      results[meta.questionNumber] = result;
    }

    setNewValidationResults(results);
    console.log('🎯 Resultados da validação:', results);
  };

  // Função para aplicar metadados validados às questões
  const applyMetadataToQuestions = () => {
    if (parsedQuestions.length === 0) {
      toast.error('Parse as questões primeiro');
      return;
    }

    if (parsedMetadata.length === 0) {
      toast.error('Parse os metadados primeiro');
      return;
    }

    const updatedQuestions = parsedQuestions.map((question, index) => {
      const questionNumber = index + 1;
      const metadata = parsedMetadata.find(m => m.questionNumber === questionNumber);
      const validation = validationResults[questionNumber];

      if (metadata && validation && validation.isValid) {
        return {
          ...question,
          disciplineId: validation.disciplineMatch?.id,
          subjectId: validation.subjectMatch?.id,
          tag: metadata.subAssunto
        };
      }

      return question;
    });

    setParsedQuestions(updatedQuestions);
    
    const appliedCount = updatedQuestions.filter(q => q.disciplineId && q.subjectId).length;
    toast.success(`Metadados aplicados a ${appliedCount} questões`);
  };

  // Função para aplicar novos metadados validados às questões
  const applyNewMetadataToQuestions = async () => {
    if (parsedQuestions.length === 0) {
      toast.error('Parse as questões primeiro');
      return;
    }

    if (parsedNewMetadata.length === 0) {
      toast.error('Parse os metadados primeiro');
      return;
    }

    const updatedQuestions = await Promise.all(parsedQuestions.map(async (question, index) => {
      const questionNumber = index + 1;
      const metadata = parsedNewMetadata.find(m => m.questionNumber === questionNumber);
      const validation = newValidationResults[questionNumber];

      if (metadata && validation && validation.isValid) {
        let topicId = null;
        
        // Se há tópico nos metadados e temos um assunto válido, buscar o tópico
        if (metadata.topico && validation.subjectMatch?.id) {
          try {
            // Carregar tópicos se não estiverem carregados
            if (!questionTopics[validation.subjectMatch.id]) {
              await loadQuestionTopics(validation.subjectMatch.id);
            }
            
            // Buscar tópico correspondente
            const topics = questionTopics[validation.subjectMatch.id] || [];
            console.log(`🔍 Buscando tópico "${metadata.topico}" entre:`, topics.map(t => t.name));
            
            const topicMatch = topics.find(topic => {
              const topicName = topic.name.toLowerCase();
              const metadataTopico = metadata.topico!.toLowerCase();
              
              console.log(`🔍 Comparando "${topicName}" com "${metadataTopico}"`);
              
              // Busca exata primeiro
              if (topicName === metadataTopico) {
                console.log(`✅ Match exato encontrado: "${topicName}"`);
                return true;
              }
              
              // Busca por inclusão
              const includesMatch = topicName.includes(metadataTopico) || metadataTopico.includes(topicName);
              if (includesMatch) {
                console.log(`✅ Match por inclusão encontrado: "${topicName}" <-> "${metadataTopico}"`);
              }
              return includesMatch;
            });
            
            if (topicMatch) {
              topicId = topicMatch.id;
              console.log(`🎯 Tópico encontrado para questão ${questionNumber}:`, topicMatch.name);
            } else {
              console.log(`⚠️ Tópico "${metadata.topico}" não encontrado para questão ${questionNumber}`);
            }
          } catch (error) {
            console.error(`❌ Erro ao buscar tópico para questão ${questionNumber}:`, error);
          }
        }
        
        console.log(`🎯 Aplicando metadados à questão ${questionNumber}:`, {
          disciplineId: validation.disciplineMatch?.id,
          disciplineName: validation.disciplineMatch?.name,
          subjectId: validation.subjectMatch?.id,
          subjectName: validation.subjectMatch?.title || validation.subjectMatch?.name,
          topicId,
          tag: metadata.topico || metadata.assunto
        });
        
        return {
          ...question,
          disciplineId: validation.disciplineMatch?.id,
          subjectId: validation.subjectMatch?.id,
          topicId,
          tag: metadata.topico || metadata.assunto,
          institutionName: institutionName,
          examYear: examYear
        };
      }

      return question;
    }));

    setParsedQuestions(updatedQuestions);
    
    const appliedCount = updatedQuestions.filter(q => q.disciplineId && q.subjectId).length;
    console.log(`✅ Metadados aplicados a ${appliedCount} de ${parsedQuestions.length} questões`);
    toast.success(`Metadados aplicados a ${appliedCount} questões`);
  };
  
  const loadQuestionSubjects = async (disciplineId: number) => {
    if (questionSubjects[disciplineId] || loadingQuestionSubjects[disciplineId]) {
      console.log('🔄 Assuntos já carregados ou carregando para disciplina:', disciplineId);
      return; // Já carregado ou carregando
    }
    
    try {
      setLoadingQuestionSubjects(prev => ({ ...prev, [disciplineId]: true }));
      console.log('🔍 Carregando assuntos para questão individual - disciplina:', disciplineId);
      const data = await DisciplinesRestService.getSubjects(disciplineId, true);
      console.log('📚 Assuntos carregados para questão:', data?.length || 0, data);
      setQuestionSubjects(prev => ({ ...prev, [disciplineId]: data || [] }));
      
      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum assunto encontrado para disciplina:', disciplineId);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar assuntos para questão:', error);
      setQuestionSubjects(prev => ({ ...prev, [disciplineId]: [] }));
    } finally {
      setLoadingQuestionSubjects(prev => ({ ...prev, [disciplineId]: false }));
    }
  };

  const loadQuestionTopics = async (subjectId: number) => {
    if (questionTopics[subjectId] || loadingQuestionTopics[subjectId]) {
      console.log('🔄 Tópicos já carregados ou carregando para assunto:', subjectId);
      return; // Já carregado ou carregando
    }
    
    try {
      setLoadingQuestionTopics(prev => ({ ...prev, [subjectId]: true }));
      console.log('🔍 Carregando tópicos para questão individual - assunto:', subjectId);
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, subject_id, discipline_id')
        .eq('subject_id', subjectId)
        .order('name');
      
      if (error) throw error;
      
      console.log('🏷️ Tópicos carregados para questão:', data?.length || 0, data);
      setQuestionTopics(prev => ({ ...prev, [subjectId]: data || [] }));
      
      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum tópico encontrado para assunto:', subjectId);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tópicos para questão:', error);
      setQuestionTopics(prev => ({ ...prev, [subjectId]: [] }));
    } finally {
      setLoadingQuestionTopics(prev => ({ ...prev, [subjectId]: false }));
    }
  };

  const editQuestion = (index: number, field: keyof ParsedQuestion, value: any) => {
    console.log('🔧 Editando questão:', { index, field, value, type: typeof value });
    
    setParsedQuestions(prev => prev.map((q, i) => {
      if (i === index) {
        const updatedQuestion = { ...q, [field]: value };
        
        // Se mudou a disciplina, carregar assuntos e resetar assunto e tópico
        if (field === 'disciplineId' && value && typeof value === 'number') {
          console.log('🏫 Disciplina alterada, carregando assuntos para disciplina:', value);
          loadQuestionSubjects(value);
          updatedQuestion.subjectId = null;
          updatedQuestion.topicId = null;
        }
        
        // Se mudou o assunto, carregar tópicos e resetar tópico
        if (field === 'subjectId' && value && typeof value === 'number') {
          console.log('📖 Assunto alterado, carregando tópicos para assunto:', value);
          loadQuestionTopics(value);
          updatedQuestion.topicId = null;
        }
        
        console.log('✅ Questão atualizada:', updatedQuestion);
        return updatedQuestion;
      }
      return q;
    }));
  };

  const removeQuestion = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (index: number, file: File | null) => {
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP.');
        return;
      }

      // Validar tamanho (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Tamanho máximo: 5MB.');
        return;
      }

      // Criar URL para preview
      const imageUrl = URL.createObjectURL(file);
      
      editQuestion(index, 'image', file);
      editQuestion(index, 'imageUrl', imageUrl);
      
      toast.success('Imagem adicionada com sucesso!');
    }
  };

  const removeImage = (index: number) => {
    const question = parsedQuestions[index];
    if (question.imageUrl) {
      URL.revokeObjectURL(question.imageUrl);
    }
    editQuestion(index, 'image', null);
    editQuestion(index, 'imageUrl', '');
    toast.success('Imagem removida!');
  };

  // Funções para upload em lote de imagens
  const handleBulkImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    Array.from(files).forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} (tipo não suportado)`);
        return;
      }
      
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (muito grande - máx 5MB)`);
        return;
      }
      
      validFiles.push(file);
    });
    
    setBulkImages(validFiles);
    
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} imagem(ns) válida(s) selecionada(s)!`);
    }
    
    if (invalidFiles.length > 0) {
      toast.error(`Arquivos inválidos: ${invalidFiles.slice(0, 3).join(', ')}${invalidFiles.length > 3 ? '...' : ''}`);
    }
  };
  
  const processBulkImages = async () => {
    if (bulkImages.length === 0) {
      toast.error('Nenhuma imagem selecionada.');
      return;
    }
    
    if (parsedQuestions.length === 0) {
      toast.error('Nenhuma questão disponível para associar imagens.');
      return;
    }
    
    setProcessingBulkImages(true);
    
    try {
      let associatedCount = 0;
      let notFoundCount = 0;
      const processedFiles: string[] = [];
      const unprocessedFiles: string[] = [];
      
      // Função inteligente para extrair número da questão
      const extractQuestionNumber = (fileName: string): number | null => {
        const name = fileName.toLowerCase().replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
        
        // Padrões suportados (em ordem de prioridade):
        const patterns = [
          /^q(\d+)$/i,                    // Q1, Q2, q1, q2
          /^questao[_\s]*(\d+)$/i,        // questao1, questao_1, questao 1
          /^question[_\s]*(\d+)$/i,       // question1, question_1, question 1
          /^(\d+)$/,                      // 1, 2, 3 (apenas números)
          /^img[_\s]*(\d+)$/i,           // img1, img_1, img 1
          /^image[_\s]*(\d+)$/i,          // image1, image_1, image 1
          /^figura[_\s]*(\d+)$/i,         // figura1, figura_1, figura 1
          /^fig[_\s]*(\d+)$/i,            // fig1, fig_1, fig 1
          /(\d+)[_\s]*questao/i,          // 1questao, 1_questao, 1 questao
          /(\d+)[_\s]*question/i,         // 1question, 1_question, 1 question
          /questao[_\s]*(\d+)[_\s]*img/i, // questao1img, questao_1_img
          /q[_\s]*(\d+)[_\s]*img/i,       // q1img, q_1_img
          /.*[_\s](\d+)$/,                // qualquer_coisa_1, arquivo 1
          /^(\d+)[_\s]*.*/,               // 1_qualquer_coisa, 1 arquivo
        ];
        
        for (const pattern of patterns) {
          const match = name.match(pattern);
          if (match && match[1]) {
            const num = parseInt(match[1]);
            if (num > 0 && num <= 999) { // Limite razoável
              return num;
            }
          }
        }
        
        return null;
      };
      
      // Processar cada arquivo
      bulkImages.forEach((file) => {
        const questionNumber = extractQuestionNumber(file.name);
        
        if (questionNumber !== null) {
          const questionIndex = questionNumber - 1; // Array é 0-indexed
          
          if (questionIndex >= 0 && questionIndex < parsedQuestions.length) {
            // Verificar se a questão já tem imagem
            const currentQuestion = parsedQuestions[questionIndex];
            const hasExistingImage = currentQuestion.image || currentQuestion.imageUrl;
            
            const imageUrl = URL.createObjectURL(file);
            editQuestion(questionIndex, 'image', file);
            editQuestion(questionIndex, 'imageUrl', imageUrl);
            
            associatedCount++;
            const status = hasExistingImage ? '(substituída)' : '(nova)';
            processedFiles.push(`${file.name} → Questão ${questionNumber} ${status}`);
          } else {
            notFoundCount++;
            unprocessedFiles.push(`${file.name} (questão ${questionNumber} não existe)`);
          }
        } else {
          notFoundCount++;
          unprocessedFiles.push(`${file.name} (padrão não reconhecido)`);
        }
      });
      
      // Feedback detalhado
      if (associatedCount > 0) {
        const successMessage = `✅ ${associatedCount} imagem(ns) distribuída(s) com sucesso!`;
        const details = processedFiles.slice(0, 5).join('\n');
        const moreInfo = processedFiles.length > 5 ? `\n... e mais ${processedFiles.length - 5}` : '';
        
        toast.success(successMessage + '\n\n' + details + moreInfo, {
          duration: 6000,
          style: {
            maxWidth: '500px',
            whiteSpace: 'pre-line'
          }
        });
      }
      
      if (notFoundCount > 0) {
        const errorMessage = `❌ ${notFoundCount} arquivo(s) não processado(s):`;
        const details = unprocessedFiles.slice(0, 3).join('\n');
        const moreInfo = unprocessedFiles.length > 3 ? `\n... e mais ${unprocessedFiles.length - 3}` : '';
        const helpText = '\n\n💡 Padrões suportados: Q1, questao1, 1.jpg, img1, etc.';
        
        toast.error(errorMessage + '\n\n' + details + moreInfo + helpText, {
          duration: 8000,
          style: {
            maxWidth: '500px',
            whiteSpace: 'pre-line'
          }
        });
      }
      
      // Limpar apenas se pelo menos uma imagem foi processada
      if (associatedCount > 0) {
        setBulkImages([]);
      }
      
    } catch (error) {
      console.error('Erro ao processar imagens:', error);
      toast.error('❌ Erro interno ao processar imagens. Tente novamente.');
    } finally {
      setProcessingBulkImages(false);
    }
  };
  
  const clearBulkImages = () => {
    setBulkImages([]);
    toast.success('Imagens em lote removidas.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para criar uma prova');
      return;
    }

    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    
    if (isAdmin && !examTypeId) {
      toast.error('Selecione uma categoria');
      return;
    }
    
    if (parsedQuestions.length === 0) {
      toast.error('Parse pelo menos uma questão');
      return;
    }
    
    // Validar se apenas admins podem enviar questões ao Genoma Bank
    if (addToGenomaBank && !isAdmin) {
      toast.error('Apenas administradores podem enviar questões diretamente ao Genoma Bank');
      return;
    }
    
    // Verificar se há questões com IDs inválidos
    const questionsWithInvalidIds = parsedQuestions.filter(question => {
      const disciplineValid = !question.disciplineId || disciplines.some(d => d.id === question.disciplineId);
      
      // Para validar assuntos, verificar no cache específico da disciplina
      let subjectValid = true;
      if (question.subjectId && question.disciplineId) {
        const disciplineSubjects = questionSubjects[question.disciplineId] || [];
        subjectValid = disciplineSubjects.some(s => s.id === question.subjectId);
      }
      
      return !disciplineValid || !subjectValid;
    });
    
    if (questionsWithInvalidIds.length > 0) {
      toast.error(`${questionsWithInvalidIds.length} questão(ões) possuem disciplina ou assunto inválidos. Verifique as seleções.`);
      return;
    }
    
    try {
      setLoading(true);
      
      // Criar a prova
      const newExam: any = {
        title: title.trim(),
        description: description.trim(),
        time_limit: timeLimit,
        is_public: isPublic,
        user_id: user.id
      };
      
      // Só incluir exam_type_id se o usuário for admin
      if (isAdmin && examTypeId) {
        newExam.exam_type_id = examTypeId;
      }
      
      const createdExam = await ExamsService.addExam(newExam);
      
      // Criar questões no banco e adicionar à prova
      const questionIds: number[] = [];
      
      for (let i = 0; i < parsedQuestions.length; i++) {
        const question = parsedQuestions[i];
        
        // Validar se os IDs existem antes de enviar
        const questionData: any = {
          content: question.text,
          question_type: 'multiple_choice',
          correct_answer: question.correctAnswer.toString(),
          difficulty: 'média',
          is_public: addToGenomaBank // Marcar como pública se for para o Genoma Bank
        };
        
        // Adicionar tags se existir
        if (question.tag && question.tag.trim()) {
          questionData.tags = [question.tag.trim()];
        }
        
        // Só adicionar discipline_id se for um número válido e existir na lista de disciplines carregadas
        if (question.disciplineId && typeof question.disciplineId === 'number') {
          const disciplineExists = disciplines.some(discipline => discipline.id === question.disciplineId);
          if (disciplineExists) {
            questionData.discipline_id = question.disciplineId;
          } else {
            console.warn(`Discipline ID ${question.disciplineId} não encontrado na lista de disciplines carregadas`);
          }
        }
        
        // Só adicionar subject_id se for um número válido e existir na lista de subjects carregados
        if (question.subjectId && typeof question.subjectId === 'number' && question.disciplineId) {
          const disciplineSubjects = questionSubjects[question.disciplineId] || [];
          const subjectExists = disciplineSubjects.some(subject => subject.id === question.subjectId);
          if (subjectExists) {
            questionData.subject_id = question.subjectId;
          } else {
            console.warn(`Subject ID ${question.subjectId} não encontrado na lista de subjects da disciplina ${question.disciplineId}`);
          }
        }
        
        // Adicionar topic_id se fornecido
        if (question.topicId && typeof question.topicId === 'number') {
          questionData.topic_id = question.topicId;
        }
        
        // Buscar institution_id pelo nome da instituição
        if (question.institutionName && typeof question.institutionName === 'string') {
          try {
            const { data: institutions, error: instError } = await supabase
              .from('exam_institutions')
              .select('id')
              .ilike('name', question.institutionName)
              .limit(1);
            
            if (instError) {
              console.warn('Erro ao buscar instituição:', instError);
            } else if (institutions && institutions.length > 0) {
              questionData.institution_id = institutions[0].id;
            } else {
              // Se não encontrar a instituição, criar uma nova
              const { data: newInstitution, error: createError } = await supabase
                .from('exam_institutions')
                .insert({ name: question.institutionName, category: 'residencia_medica' })
                .select('id')
                .single();
              
              if (createError) {
                console.warn('Erro ao criar nova instituição:', createError);
              } else if (newInstitution) {
                questionData.institution_id = newInstitution.id;
              }
            }
          } catch (error) {
            console.warn('Erro ao processar instituição:', error);
          }
        }
        
        // Adicionar exam_year se fornecido
        if (question.examYear && typeof question.examYear === 'number') {
          questionData.exam_year = question.examYear;
        }
        
        const questionId = await QuestionsBankService.addQuestion(
          questionData,
          question.alternatives.map((alt, index) => ({
            text: alt,
            is_correct: index === question.correctAnswer
          }))
        );
        
        if (questionId) {
          questionIds.push(questionId);
          
          // Upload da imagem se existir
          if (question.image) {
            toast.loading(`Fazendo upload da imagem da questão ${i + 1}...`);
            const imageResult = await QuestionImageUploadService.uploadAndSaveImage(
              question.image,
              questionId,
              1
            );
            toast.dismiss();
            
            if (!imageResult.success) {
              toast.error(`Falha no upload da imagem da questão ${i + 1}: ${imageResult.error}`);
            } else {
              toast.success(`Imagem da questão ${i + 1} salva com sucesso!`);
            }
          }
        }
      }

      // Adicionar todas as questões à prova
        if (questionIds.length > 0) {
          if (!createdExam || typeof createdExam !== 'number' || isNaN(createdExam)) {
            throw new Error('Falha ao criar a prova - ID inválido');
          }
          
          await ExamsService.addQuestionsToExam(createdExam, questionIds);
        }
        
        const successMessage = addToGenomaBank && isAdmin 
          ? `Prova criada com ${parsedQuestions.length} questões e enviadas ao Genoma Bank!`
          : `Prova criada com ${parsedQuestions.length} questões!`;
        toast.success(successMessage);
        
        // Redirecionar para a página da prova criada
        router.push(`/provas/${createdExam}`);
      
    } catch (error) {
      console.error('Erro ao criar prova:', error);
      toast.error('Erro ao criar prova. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return <Loading message="Verificando autenticação..." />;
  }
  
  if (loadingTypes) {
    return <Loading message="Carregando categorias..." />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/provas" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Voltar para Provas
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Criar Nova Prova
        </h1>
        <p className="text-gray-600">
          Cole o texto das questões e o gabarito para criar automaticamente um novo simulado.
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Informações da Prova
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título da Prova *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: ENEM 2023 - Ciências da Natureza"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descrição opcional da prova..."
              />
            </div>
            
            {/* Categoria da Prova - Apenas para Admins Específicos */}
            {isAdmin && (
              <div>
                <label htmlFor="examType" className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria da Prova *
                </label>
                <select
                  id="examType"
                  value={examTypeId || ''}
                  onChange={(e) => setExamTypeId(Number(e.target.value) || null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {examTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Instituição da Prova */}
            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-2">
                Instituição
              </label>
              <input
                type="text"
                id="institution"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite o nome da instituição (ex: UNIFESP, USP, UFMG)"
                required
              />
            </div>
            
            {/* Ano da Prova */}
            <div>
              <label htmlFor="examYear" className="block text-sm font-medium text-gray-700 mb-2">
                Ano da Prova
              </label>
              <input
                type="number"
                id="examYear"
                value={examYear}
                onChange={(e) => setExamYear(Number(e.target.value))}
                min="1990"
                max={new Date().getFullYear() + 1}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: 2024"
              />
            </div>
            
            <div>
              <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-2">
                Disciplina
              </label>
              <select
                id="discipline"
                value={selectedDisciplineId || ''}
                onChange={(e) => handleDisciplineChange(Number(e.target.value) || null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingDisciplines}
              >
                <option value="">Selecione uma disciplina</option>
                {disciplines.map(discipline => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
              {loadingDisciplines && (
                <p className="text-sm text-gray-500 mt-1">Carregando disciplinas...</p>
              )}
            </div>
            
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Assunto
              </label>
              <select
                id="subject"
                value={selectedSubjectId || ''}
                onChange={(e) => setSelectedSubjectId(Number(e.target.value) || null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedDisciplineId || loadingSubjects}
              >
                <option value="">Selecione um assunto</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.title || subject.name}
                  </option>
                ))}
              </select>
              {loadingSubjects && (
                <p className="text-sm text-gray-500 mt-1">Carregando assuntos...</p>
              )}
              {!selectedDisciplineId && (
                <p className="text-sm text-gray-500 mt-1">Selecione uma disciplina primeiro</p>
              )}
            </div>
            
            <div>
              <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 mb-2">
                Tempo Limite (minutos)
              </label>
              <input
                type="number"
                id="timeLimit"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                min="1"
                max="480"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="md:col-span-2 space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Tornar esta prova pública (outros usuários poderão acessar)
                </span>
              </label>
              
              {isAdmin && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={addToGenomaBank}
                    onChange={(e) => setAddToGenomaBank(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Adicionar questões ao Genoma Bank (questões ficam públicas para todos os usuários)
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>
        
        {/* Parser de Questões */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            <FaFileExport className="inline mr-2" />
            Texto das Questões
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="questionsText" className="block text-sm font-medium text-gray-700 mb-2">
                Cole o texto completo das questões *
              </label>
              <textarea
                id="questionsText"
                value={questionsText}
                onChange={(e) => setQuestionsText(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder={`Exemplo de formato:

1. Qual é a capital do Brasil?
A) São Paulo
B) Rio de Janeiro
C) Brasília
D) Belo Horizonte
E) Salvador

2. Quanto é 2 + 2?
A) 3
B) 4
C) 5
D) 6
E) 7`}
                required
              />
            </div>
            
            <div>
              <label htmlFor="answerKey" className="block text-sm font-medium text-gray-700 mb-2">
                Gabarito *
              </label>
              <textarea
                id="answerKey"
                value={answerKey}
                onChange={(e) => setAnswerKey(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder={`Exemplo de formato:

1-C
2-B
3-A
4-D
5-E`}
                required
              />
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={parseQuestions}
                disabled={!questionsText.trim() || !answerKey.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <FaListOl className="mr-2" />
                Processar Questões
              </button>
              
              <button
                type="button"
                onClick={() => setShowMetadataParser(!showMetadataParser)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <FaEdit className="mr-2" />
                {showMetadataParser ? 'Ocultar' : 'Mostrar'} Parser Antigo
              </button>
              
              <button
                type="button"
                onClick={() => setShowNewMetadataParser(!showNewMetadataParser)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <FaEdit className="mr-2" />
                {showNewMetadataParser ? 'Ocultar' : 'Mostrar'} Novo Parser
              </button>
            </div>
          </div>
        </div>
        
        {/* Novo Parser de Metadados */}
        {showNewMetadataParser && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              <FaEdit className="inline mr-2" />
              Novo Parser de Metadados (Disciplina/Assunto/Tópico)
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="newMetadataText" className="block text-sm font-medium text-gray-700 mb-2">
                  Cole os metadados das questões *
                </label>
                <textarea
                  id="newMetadataText"
                  value={newMetadataText}
                  onChange={(e) => setNewMetadataText(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder={`Exemplo de formato:

Questão 1:

Disciplina: Cirurgia Geral

Assunto: Pancreatite aguda

Tópico: Pancreatite aguda - Diagnóstico e Etiologias

Questão 2:

Disciplina: Cirurgia Geral

Assunto: Pneumotórax Espontâneo`}
                />
              </div>
              
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={parseNewMetadataFormat}
                  disabled={!newMetadataText.trim()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <FaListOl className="mr-2" />
                  Processar Metadados
                </button>
                
                {parsedNewMetadata.length > 0 && (
                  <button
                    type="button"
                    onClick={applyNewMetadataToQuestions}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <FaCheck className="mr-2" />
                    Aplicar às Questões
                  </button>
                )}
              </div>
              
              {/* Resultados da Validação */}
              {parsedNewMetadata.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados da Validação</h3>
                  <div className="space-y-3">
                    {parsedNewMetadata.map((meta) => {
                      const validation = newValidationResults[meta.questionNumber];
                      const isValid = validation?.isValid;
                      
                      return (
                        <div
                          key={meta.questionNumber}
                          className={`p-4 rounded-lg border-2 ${
                            isValid
                              ? 'border-green-200 bg-green-50'
                              : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                Questão {meta.questionNumber}
                              </h4>
                              <div className="mt-2 space-y-1 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-700">Disciplina:</span>
                                  <span className={isValid ? 'text-green-700' : 'text-red-700'}>
                                    {meta.disciplina}
                                  </span>
                                  {validation?.disciplineMatch && (
                                    <span className="text-green-600 text-xs">
                                      → {validation.disciplineMatch.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-700">Assunto:</span>
                                  <span className={isValid ? 'text-green-700' : 'text-red-700'}>
                                    {meta.assunto}
                                  </span>
                                  {validation?.subjectMatch && (
                                    <span className="text-green-600 text-xs">
                                      → {validation.subjectMatch.title || validation.subjectMatch.name}
                                    </span>
                                  )}
                                </div>
                                {meta.topico && (
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-700">Tópico:</span>
                                    <span className="text-gray-700">
                                      {meta.topico}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              {isValid ? (
                                <FaCheck className="text-green-600 text-xl" />
                              ) : (
                                <div className="text-red-600">
                                  <div className="text-xs font-medium mb-1">Erros:</div>
                                  {validation?.errors.map((error, idx) => (
                                    <div key={idx} className="text-xs text-red-600">
                                      {error}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Parser Automático de Metadados */}
        {showMetadataParser && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              <FaEdit className="inline mr-2" />
              Parser Automático de Metadados
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="metadataText" className="block text-sm font-medium text-gray-700 mb-2">
                  Cole os metadados das questões *
                </label>
                <textarea
                  id="metadataText"
                  value={metadataText}
                  onChange={(e) => setMetadataText(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder={`Exemplo de formato:

Questão 1:
Grande Área: Clínica Médica
Categoria: Infectologia
Sub-assunto: Hepatite C

Questão 2:
Grande Área: Clínica Médica
Categoria: Hepatologia
Sub-assunto: Porfiria`}
                />
              </div>
              
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  onClick={parseMetadata}
                  disabled={!metadataText.trim()}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <FaListOl className="mr-2" />
                  Processar Metadados
                </button>
                
                {parsedMetadata.length > 0 && (
                  <button
                    type="button"
                    onClick={applyMetadataToQuestions}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <FaCheck className="mr-2" />
                    Aplicar às Questões
                  </button>
                )}
              </div>
              
              {/* Resultados da Validação */}
              {parsedMetadata.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados da Validação</h3>
                  <div className="space-y-3">
                    {parsedMetadata.map((meta) => {
                      const validation = validationResults[meta.questionNumber];
                      const isValid = validation?.isValid;
                      
                      return (
                        <div
                          key={meta.questionNumber}
                          className={`p-4 rounded-lg border-2 ${
                            isValid
                              ? 'border-green-200 bg-green-50'
                              : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                Questão {meta.questionNumber}
                              </h4>
                              <div className="mt-2 space-y-1 text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-700">Grande Área:</span>
                                  <span className={isValid ? 'text-green-700' : 'text-red-700'}>
                                    {meta.grandeArea}
                                  </span>
                                  {validation?.disciplineMatch && (
                                    <span className="text-green-600 text-xs">
                                      → {validation.disciplineMatch.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-700">Categoria:</span>
                                  <span className={isValid ? 'text-green-700' : 'text-red-700'}>
                                    {meta.categoria}
                                  </span>
                                  {validation?.subjectMatch && (
                                    <span className="text-green-600 text-xs">
                                      → {validation.subjectMatch.title || validation.subjectMatch.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-700">Sub-assunto:</span>
                                  <span className="text-gray-700">{meta.subAssunto}</span>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4">
                              {isValid ? (
                                <div className="flex items-center text-green-600">
                                  <FaCheck className="mr-1" />
                                  <span className="text-sm font-medium">Válido</span>
                                </div>
                              ) : (
                                <div className="text-red-600">
                                  <span className="text-sm font-medium">Inválido</span>
                                  {validation?.errors && (
                                    <div className="mt-1 text-xs">
                                      {validation.errors.map((error, idx) => (
                                        <div key={idx} className="text-red-500">
                                          • {error}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">
                        <strong>Resumo:</strong> {parsedMetadata.filter(m => validationResults[m.questionNumber]?.isValid).length} de {parsedMetadata.length} metadados válidos
                      </span>
                      <span className="text-blue-600">
                        Mapeamento: Grande Área → Disciplina | Categoria → Assunto | Sub-assunto → Tag
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Aplicar Disciplina e Assunto em Lote */}
        {parsedQuestions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              <FaEdit className="inline mr-2" />
              Aplicar Disciplina e Assunto em Lote
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplina para todas as questões:
                </label>
                <select
                  value={selectedDisciplineId || ''}
                  onChange={(e) => handleDisciplineChange(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loadingDisciplines}
                >
                  <option value="">Selecione uma disciplina</option>
                  {disciplines.map(discipline => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assunto para todas as questões:
                </label>
                <select
                  value={selectedSubjectId || ''}
                  onChange={(e) => handleSubjectChange(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedDisciplineId || loadingSubjects}
                >
                  <option value="">Selecione um assunto</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.title || subject.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tópico para todas as questões:
                </label>
                <select
                  value={selectedTopicId || ''}
                  onChange={(e) => setSelectedTopicId(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedSubjectId || loadingTopics}
                >
                  <option value="">Selecione um tópico (opcional)</option>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setParsedQuestions(prev => prev.map(q => ({
                      ...q,
                      disciplineId: selectedDisciplineId,
                      subjectId: selectedSubjectId,
                      topicId: selectedTopicId
                    })));
                    toast.success('Disciplina, assunto e tópico aplicados a todas as questões!');
                  }}
                  disabled={!selectedDisciplineId}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Aplicar a Todas
                </button>
              </div>
            </div>
          </div>
        )}        
        
        {/* Upload Automático de Imagens por Nomenclatura */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <FaUpload className="text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Upload Automático de Imagens por Nomenclatura
              </h2>
            </div>
            
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                  <FaImage className="mr-2" />
                  Padrões de Nomenclatura Suportados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-700">
                  <div>
                    <strong>Padrões Principais:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• <code className="bg-blue-100 px-1 rounded">Q1.jpg</code>, <code className="bg-blue-100 px-1 rounded">Q2.png</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">questao1.jpg</code>, <code className="bg-blue-100 px-1 rounded">questao_2.png</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">1.jpg</code>, <code className="bg-blue-100 px-1 rounded">2.png</code> (apenas números)</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Padrões Alternativos:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>• <code className="bg-blue-100 px-1 rounded">img1.jpg</code>, <code className="bg-blue-100 px-1 rounded">image_1.png</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">figura1.jpg</code>, <code className="bg-blue-100 px-1 rounded">fig_1.png</code></li>
                      <li>• <code className="bg-blue-100 px-1 rounded">arquivo_1.jpg</code>, <code className="bg-blue-100 px-1 rounded">1_questao.png</code></li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-3 font-medium">
                  💡 O sistema é inteligente e reconhece automaticamente o número da questão em diversos formatos!
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Imagens (padrão Q + número):
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleBulkImageUpload(e.target.files)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                />
              </div>
              
              {/* Mensagem quando há questões mas não há imagens */}
              {parsedQuestions.length > 0 && bulkImages.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <FaCheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">
                        ✅ {parsedQuestions.length} questão{parsedQuestions.length !== 1 ? 'ões' : ''} processada{parsedQuestions.length !== 1 ? 's' : ''} - Pronto para receber imagens!
                      </h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>
                          Suas questões foram processadas com sucesso. Agora você pode:
                        </p>
                        <ul className="mt-2 ml-4 list-disc">
                          <li><strong>Selecionar imagens</strong> usando o campo acima</li>
                          <li><strong>Nomear as imagens</strong> seguindo os padrões (Q1.jpg, Q2.png, etc.)</li>
                          <li><strong>Distribuir automaticamente</strong> as imagens para as questões correspondentes</li>
                        </ul>
                        <p className="mt-2 font-medium text-green-800">
                          💡 Dica: O sistema reconhece automaticamente o número da questão no nome do arquivo!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mensagem quando há imagens mas não há questões */}
              {bulkImages.length > 0 && parsedQuestions.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        ⚠️ Imagens selecionadas, mas nenhuma questão foi processada
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Você selecionou <strong>{bulkImages.length} imagem{bulkImages.length !== 1 ? 's' : ''}</strong>, mas ainda não processou nenhuma questão.
                          <br />
                          <strong>Para distribuir as imagens:</strong>
                        </p>
                        <ol className="mt-2 ml-4 list-decimal">
                          <li>Cole o texto das questões na seção acima</li>
                          <li>Cole o gabarito das questões</li>
                          <li>Clique em "Processar Questões"</li>
                          <li>Depois volte aqui para distribuir as imagens</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {bulkImages.length > 0 && parsedQuestions.length > 0 && (
                <div className="bg-white rounded-lg p-4 border">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Imagens selecionadas ({bulkImages.length}):
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {bulkImages.map((file, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {file.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={processBulkImages}
                      disabled={processingBulkImages}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        processingBulkImages
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                      }`}
                    >
                      {processingBulkImages ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processando Imagens...</span>
                        </>
                      ) : (
                        <>
                          <FaUpload className="text-lg" />
                          <span>🚀 Distribuir {bulkImages.length} Imagem{bulkImages.length !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={clearBulkImages}
                      disabled={processingBulkImages}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        processingBulkImages
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                      }`}
                    >
                      <FaTrash className="text-lg" />
                      <span>🗑️ Limpar Seleção</span>
                    </button>
                    
                    <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                      <FaCheck className="text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        ✅ {bulkImages.length} arquivo{bulkImages.length !== 1 ? 's' : ''} pronto{bulkImages.length !== 1 ? 's' : ''} para distribuição
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Estatísticas de Distribuição */}
              {parsedQuestions.length > 0 && bulkImages.length > 0 && (
                <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center">
                    <FaImage className="mr-2" />
                    📊 Estatísticas de Distribuição Inteligente
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <div className="text-purple-600 font-medium">Questões Disponíveis</div>
                      <div className="text-2xl font-bold text-purple-800">{parsedQuestions.length}</div>
                      <div className="text-xs text-purple-500">questões prontas para receber imagens</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <div className="text-indigo-600 font-medium">Imagens Selecionadas</div>
                      <div className="text-2xl font-bold text-indigo-800">{bulkImages.length}</div>
                      <div className="text-xs text-indigo-500">arquivos aguardando distribuição</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <div className="text-green-600 font-medium">Potencial de Match</div>
                      <div className="text-2xl font-bold text-green-800">
                        {Math.min(parsedQuestions.length, bulkImages.length)}
                      </div>
                      <div className="text-xs text-green-500">possíveis associações automáticas</div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white rounded-lg border border-purple-100">
                    <div className="text-xs text-purple-700">
                      💡 <strong>Dica:</strong> O sistema tentará associar automaticamente as imagens às questões baseado nos padrões de nomenclatura. 
                      Imagens não associadas serão listadas para revisão manual.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        
        {/* Preview das Questões Parseadas */}
        {parsedQuestions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                <FaEye className="inline mr-2" />
                Questões Processadas ({parsedQuestions.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showPreview ? 'Ocultar' : 'Mostrar'} Preview
              </button>
            </div>
            
            {showPreview && (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {parsedQuestions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">
                        Questão {index + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-500 hover:text-red-700 transition-colors text-sm"
                      >
                        Remover
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Enunciado:
                        </label>
                        <textarea
                          value={question.text}
                          onChange={(e) => editQuestion(index, 'text', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          rows={2}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alternativas:
                        </label>
                        {question.alternatives.map((alt, altIndex) => (
                          <div key={altIndex} className="flex items-center space-x-2 mb-1">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              altIndex === question.correctAnswer 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {String.fromCharCode(65 + altIndex)}
                            </span>
                            <input
                              type="text"
                              value={alt}
                              onChange={(e) => {
                                const newAlts = [...question.alternatives];
                                newAlts[altIndex] = e.target.value;
                                editQuestion(index, 'alternatives', newAlts);
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => editQuestion(index, 'correctAnswer', altIndex)}
                              className={`px-2 py-1 rounded text-xs ${
                                altIndex === question.correctAnswer
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Correta
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Instituição:
                          </label>
                          <input
                            type="text"
                            value={question.institutionName || ''}
                            onChange={(e) => {
                              editQuestion(index, 'institutionName', e.target.value);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Digite o nome da instituição"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ano da Prova:
                          </label>
                          <input
                            type="number"
                            value={question.examYear || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const examYear = value ? Number(value) : null;
                              editQuestion(index, 'examYear', examYear);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Ex: 2024"
                            min="1900"
                            max="2030"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Disciplina:
                          </label>
                          <select
                            value={question.disciplineId || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const disciplineId = value ? Number(value) : null;
                              editQuestion(index, 'disciplineId', disciplineId);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Selecione uma disciplina</option>
                            {disciplines.map(discipline => (
                              <option key={discipline.id} value={discipline.id}>
                                {discipline.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assunto:
                          </label>
                          <select
                            value={question.subjectId || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const subjectId = value ? Number(value) : null;
                              editQuestion(index, 'subjectId', subjectId);
                            }}
                            disabled={!question.disciplineId}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {!question.disciplineId 
                                ? 'Selecione uma disciplina primeiro' 
                                : loadingQuestionSubjects[question.disciplineId]
                                  ? 'Carregando assuntos...'
                                  : 'Selecione um assunto'
                              }
                            </option>
                            {question.disciplineId && questionSubjects[question.disciplineId]?.map(subject => (
                              <option key={subject.id} value={subject.id}>
                                {subject.title || subject.name}
                              </option>
                            ))}
                          </select>

                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tópico:
                          </label>
                          <select
                            value={question.topicId || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              const topicId = value ? Number(value) : null;
                              editQuestion(index, 'topicId', topicId);
                            }}
                            disabled={!question.subjectId}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {!question.subjectId 
                                ? 'Selecione um assunto primeiro' 
                                : loadingQuestionTopics[question.subjectId]
                                  ? 'Carregando tópicos...'
                                  : 'Selecione um tópico (opcional)'
                              }
                            </option>
                            {question.subjectId && questionTopics[question.subjectId]?.map(topic => (
                              <option key={topic.id} value={topic.id}>
                                {topic.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* Seção de Upload de Imagem */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FaImage className="inline mr-1" />
                          Imagem da Questão (opcional):
                        </label>
                        
                        {question.imageUrl ? (
                          <div className="space-y-2">
                            <div className="relative inline-block">
                              <img 
                                src={question.imageUrl} 
                                alt={`Imagem da questão ${index + 1}`}
                                className="max-w-full max-h-48 rounded border shadow-sm"
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors flex items-center"
                              >
                                <FaTrash className="mr-1" />
                                Remover Imagem
                              </button>
                              <label className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors cursor-pointer flex items-center">
                                <FaUpload className="mr-1" />
                                Trocar Imagem
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    handleImageUpload(index, file);
                                    e.target.value = ''; // Reset input
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <FaUpload className="w-8 h-8 mb-2 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Clique para fazer upload</span> ou arraste uma imagem
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF ou WebP (máx. 5MB)</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleImageUpload(index, file);
                                e.target.value = ''; // Reset input
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Botões de Ação */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/provas"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || parsedQuestions.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Criando...
              </>
            ) : (
              <>
                <FaCheck className="mr-2" />
                Criar Prova ({parsedQuestions.length} questões)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}