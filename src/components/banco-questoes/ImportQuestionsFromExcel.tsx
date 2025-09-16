import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Upload, AlertCircle, Check, Info, Globe } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { QuestionsBankService, Question, AnswerOption } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';
import { Spinner } from '../Spinner';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface ImportQuestionsFromExcelProps {
  onImportComplete?: () => void;
  className?: string;
  defaultIsPublic?: boolean; // Nova prop para definir se as questões são públicas por padrão
}

interface AlertProps {
  variant?: "default" | "destructive" | "success" | "warning";
  className?: string;
  children: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ variant = "default", className, children }) => {
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    destructive: "bg-red-100 text-red-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800"
  };
  
  return (
    <div className={`p-4 rounded-md ${variantClasses[variant]} ${className || ''}`}>
      {children}
    </div>
  );
};

const AlertTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h5 className="font-medium mb-1">{children}</h5>
);

const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-sm">{children}</div>
);

export const ImportQuestionsFromExcel: React.FC<ImportQuestionsFromExcelProps> = ({
  onImportComplete,
  className,
  defaultIsPublic = false
}) => {
  const { checkFeatureAccess, subscriptionLimits, hasReachedLimit } = useSubscription();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    total: number;
    success: number;
    failed: number;
    isPublic: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(defaultIsPublic);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('média');
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Carregar disciplinas ao montar o componente
  useEffect(() => {
    loadDisciplines();
  }, []);

  // Carregar assuntos quando a disciplina selecionada mudar
  useEffect(() => {
    if (selectedDiscipline) {
      loadSubjects(selectedDiscipline);
    } else {
      setSubjects([]);
      setSelectedSubject(null);
    }
  }, [selectedDiscipline]);

  const loadDisciplines = async () => {
    try {
      setIsLoadingDisciplines(true);
      const disciplinesData = await DisciplinesRestService.getDisciplines(true);
      setDisciplines(disciplinesData || []);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Erro ao carregar disciplinas');
    } finally {
      setIsLoadingDisciplines(false);
    }
  };

  const loadSubjects = async (disciplineId: number) => {
    try {
      const subjectsData = await DisciplinesRestService.getSubjects(disciplineId);
      setSubjects(subjectsData || []);
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
      setSubjects([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadStats(null);
      setParsedQuestions([]);
      setShowPreview(false);

      const data = await readExcelFile(file);
      if (!data || data.length === 0) {
        throw new Error('O arquivo está vazio ou em formato inválido');
      }

      // Apenas analisar as questões e mostrar prévia
      const parsed = parseQuestions(data);
      setParsedQuestions(parsed);
      setShowPreview(true);
      toast.success(`${parsed.length} questões encontradas no arquivo`);
    } catch (err: any) {
      console.error('Erro ao ler arquivo:', err);
      setError(err.message || 'Erro ao processar o arquivo');
      toast.error('Erro ao ler o arquivo');
    } finally {
      setIsUploading(false);
      // Limpar o input file para permitir selecionar o mesmo arquivo novamente
      e.target.value = '';
    }
  };

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (err) {
          reject(new Error('Erro ao ler o arquivo Excel'));
        }
      };
      reader.onerror = () => {
        reject(new Error('Erro ao ler o arquivo'));
      };
      reader.readAsBinaryString(file);
    });
  };

  // Apenas analisa as questões do Excel sem salvar
  const parseQuestions = (data: any[]): any[] => {
    const parsedQuestions = [];
    const errors: string[] = [];

    for (const row of data) {
      try {
        // Validar campos obrigatórios
        if (!row.question_text) {
          errors.push(`Linha sem texto da questão`);
          continue;
        }

        const questionType = row.question_type?.toLowerCase() || 'multiple_choice';
        
        // Processar opções de resposta para questões de múltipla escolha
        const options = [];
        if (questionType === 'multiple_choice') {
          for (let i = 1; i <= 5; i++) {
            if (row[`option_${i}`]) {
              options.push({
                text: row[`option_${i}`],
                is_correct: row.correct_answer === `option_${i}` || 
                            row.correct_answer === i.toString() ||
                            row.correct_answer === String.fromCharCode(64 + i) // A, B, C, D, E
              });
            }
          }
          
          if (options.length < 2) {
            errors.push(`Questão de múltipla escolha precisa de pelo menos 2 opções`);
            continue;
          }
        }

        parsedQuestions.push({
          question_text: row.question_text,
          explanation: row.explanation || '',
          question_type: questionType,
          options: options,
          correct_answer: row.correct_answer || ''
        });
      } catch (err: any) {
        console.error('Erro ao analisar questão:', err);
        errors.push(err.message || 'Erro desconhecido');
      }
    }

    if (errors.length > 0) {
      console.error('Erros durante a análise:', errors);
      // Mostrar apenas os 3 primeiros erros para não sobrecarregar o usuário
      if (errors.length > 3) {
        setError(`${errors.slice(0, 3).join('\n')}\n... e mais ${errors.length - 3} erros.`);
      } else {
        setError(errors.join('\n'));
      }
    }

    return parsedQuestions;
  };

  // Salvar questões analisadas no banco de dados
  const saveQuestions = async () => {
    if (!selectedDiscipline) {
      toast.error('Selecione uma disciplina antes de salvar as questões');
      return;
    }

    if (parsedQuestions.length === 0) {
      toast.error('Nenhuma questão para salvar');
      return;
    }

    // Verificar se o usuário tem permissão para importação em lote
    if (!checkFeatureAccess('bulk_import')) {
      toast.error('A importação em lote está disponível apenas para planos Pro e Pro+');
      return;
    }

    // Verificar se a importação não excederá o limite diário
    if (subscriptionLimits) {
      const questionsUsedToday = subscriptionLimits.questionsUsedToday;
      const questionsLimitPerDay = subscriptionLimits.questionsLimitPerDay;
      const questionsToImport = parsedQuestions.length;
      
      // Se o limite não for ilimitado (-1), verificar se a importação excederá o limite
      if (questionsLimitPerDay !== -1) {
        const totalAfterImport = questionsUsedToday + questionsToImport;
        
        if (totalAfterImport > questionsLimitPerDay) {
          const remainingQuestions = questionsLimitPerDay - questionsUsedToday;
          toast.error(
            `Você pode importar no máximo ${remainingQuestions} questões hoje. ` +
            `Tentando importar ${questionsToImport} questões, mas você já usou ${questionsUsedToday} de ${questionsLimitPerDay} questões diárias.`
          );
          return;
        }
      }
    }

    try {
      setIsUploading(true);
      setError(null);
      
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const parsedQuestion of parsedQuestions) {
        try {
          // Criar a questão
          const question: Question = {
            content: parsedQuestion.question_text,
            discipline_id: selectedDiscipline,
            subject_id: selectedSubject || undefined,
            difficulty: selectedDifficulty as 'baixa' | 'média' | 'alta',
            question_type: parsedQuestion.question_type as 'multiple_choice' | 'true_false' | 'essay',
            explanation: parsedQuestion.explanation || '',
            is_public: isPublic,
            correct_answer: parsedQuestion.correct_answer || '',
          };

          // Adicionar a questão ao banco com skipLimitCheck=true para importação em lote
          const questionId = await QuestionsBankService.addQuestion(
            question, 
            parsedQuestion.options,
            false, // skipCounter = false (queremos contar as questões)
            true   // skipLimitCheck = true (já verificamos o limite total acima)
          );
          
          if (questionId) {
            success++;
          } else {
            errors.push(`Erro ao adicionar questão: ${parsedQuestion.question_text.substring(0, 30)}...`);
            failed++;
          }
        } catch (err: any) {
          console.error('Erro ao salvar questão:', err);
          errors.push(err.message || 'Erro desconhecido');
          failed++;
        }
      }

      if (errors.length > 0) {
        console.error('Erros durante o salvamento:', errors);
        // Mostrar apenas os 3 primeiros erros para não sobrecarregar o usuário
        if (errors.length > 3) {
          setError(`${errors.slice(0, 3).join('\n')}\n... e mais ${errors.length - 3} erros.`);
        } else {
          setError(errors.join('\n'));
        }
      }

      setUploadStats({
        total: parsedQuestions.length,
        success,
        failed,
        isPublic
      });

      if (success > 0) {
        toast.success(`${success} questões importadas com sucesso`);
        // Limpar prévia após salvar com sucesso
        if (success === parsedQuestions.length) {
          setParsedQuestions([]);
          setShowPreview(false);
        }
        
        if (onImportComplete) {
          onImportComplete();
        }
      }
    } catch (err: any) {
      console.error('Erro ao salvar questões:', err);
      setError(err.message || 'Erro ao salvar questões');
      toast.error('Erro ao salvar questões');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Criar um template básico para download
    const template = [
      {
        question_text: 'Exemplo: Qual é a principal função do sistema cardiovascular?',
        question_type: 'multiple_choice', // multiple_choice, true_false, essay
        explanation: 'Explicação da resposta correta',
        correct_answer: 'option_1', // Para múltipla escolha: option_1, option_2, etc.
        option_1: 'Transportar oxigênio e nutrientes',
        option_2: 'Produzir hormônios',
        option_3: 'Eliminar toxinas',
        option_4: 'Regular a temperatura corporal',
        option_5: 'Proteger contra infecções'
      },
      {
        question_text: 'Exemplo: O coração humano possui quatro câmaras.',
        question_type: 'true_false',
        explanation: 'O coração humano possui duas câmaras superiores (átrios) e duas câmaras inferiores (ventrículos).',
        correct_answer: 'true' // true ou false
      },
      {
        question_text: 'Exemplo: Descreva o ciclo cardíaco e suas fases.',
        question_type: 'essay',
        explanation: 'Explicação ou resposta modelo para referência'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_importacao_questoes.xlsx');
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg sm:text-xl font-medium">Importar Questões do Excel</h3>
        <p className="text-sm text-gray-500">
          Faça upload de um arquivo Excel com suas questões para importação em massa.
        </p>
        
        <div className="bg-blue-50 p-3 rounded-md mt-2 flex gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-blue-800">
            <p className="font-medium">Formato simplificado:</p>
            <ul className="list-disc pl-4 sm:pl-5 mt-1 space-y-1">
              <li>Apenas inclua o enunciado, alternativas e explicação no Excel</li>
              <li>Selecione a disciplina e outros detalhes aqui na interface</li>
              <li className="hidden sm:list-item">Para questões de múltipla escolha, defina option_1 até option_5</li>
              <li className="hidden sm:list-item">Defina correct_answer como "option_X" (ex: option_1)</li>
            </ul>
          </div>
        </div>
        
        {/* Seleção de disciplina e assunto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disciplina <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDiscipline?.toString() || ''}
              onChange={(e) => setSelectedDiscipline(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
              disabled={isLoadingDisciplines || isUploading}
              required
            >
              <option value="">Selecione uma disciplina</option>
              {disciplines.map((discipline) => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assunto (opcional)
            </label>
            <select
              value={selectedSubject?.toString() || ''}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
              disabled={!selectedDiscipline || subjects.length === 0 || isUploading}
            >
              <option value="">Selecione um assunto</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.title || subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Seleção de dificuldade */}
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dificuldade
          </label>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {['baixa', 'média', 'alta'].map((difficulty) => (
              <label key={difficulty} className="flex items-center touch-manipulation">
                <input
                  type="radio"
                  name="difficulty"
                  value={difficulty}
                  checked={selectedDifficulty === difficulty}
                  onChange={() => setSelectedDifficulty(difficulty)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  disabled={isUploading}
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {difficulty}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Opção para tornar públicas */}
        {!defaultIsPublic && (
          <div className="mt-3">
            <label className="flex items-start cursor-pointer p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors touch-manipulation">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded mt-0.5 flex-shrink-0"
                disabled={isUploading}
              />
              <div className="ml-3">
                <span className="flex items-center text-gray-700 font-medium">
                  <Globe className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm">Adicionar ao Genoma Bank</span>
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Compartilhar estas questões publicamente para outros usuários
                </p>
              </div>
            </label>
            {isPublic && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 flex items-center">
                  <Globe className="h-4 w-4 mr-2 text-green-600" />
                  Estas questões serão visíveis para todos os usuários no Genoma Bank.
                </p>
              </div>
            )}
          </div>
        )}
        
        {defaultIsPublic && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center text-purple-700">
              <Globe className="h-4 w-4 mr-2 text-purple-600" />
              <Check className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                Todas as questões serão adicionadas ao Genoma Bank (públicas)
              </span>
            </div>
            <p className="text-sm text-purple-600 mt-1 ml-8">
              Estas questões serão visíveis para todos os usuários.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        <Button 
          variant="outline" 
          onClick={downloadTemplate}
          className="flex items-center justify-center gap-2 w-full sm:w-auto py-2.5 sm:py-2 text-sm touch-manipulation"
          disabled={isUploading}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Baixar Template</span>
          <span className="sm:hidden">Template</span>
        </Button>
        
        <div className="relative w-full sm:w-auto">
          <input
            type="file"
            id="excel-upload"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading || isLoadingDisciplines}
          />
          <Button 
            variant="default" 
            className="flex items-center justify-center gap-2 w-full sm:w-auto py-2.5 sm:py-2 text-sm touch-manipulation"
            disabled={isUploading || isLoadingDisciplines}
          >
            {isUploading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isUploading ? 'Processando...' : isLoadingDisciplines ? 'Carregando...' : (
              <>
                <span className="hidden sm:inline">Selecionar Arquivo</span>
                <span className="sm:hidden">Arquivo</span>
              </>
            )}
          </Button>
        </div>
        
        {showPreview && parsedQuestions.length > 0 && (
          <Button
            variant="success"
            className="flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 w-full sm:w-auto sm:ml-auto py-2.5 sm:py-2 text-sm touch-manipulation"
            onClick={saveQuestions}
            disabled={isUploading || !selectedDiscipline}
          >
            {isUploading ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {isUploading ? 'Salvando...' : (
              <>
                <span className="hidden sm:inline">Salvar {parsedQuestions.length} questões</span>
                <span className="sm:hidden">Salvar ({parsedQuestions.length})</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Prévia das questões */}
      {showPreview && parsedQuestions.length > 0 && (
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 flex justify-between items-center">
            <h4 className="text-sm sm:text-base font-medium">Prévia das questões ({parsedQuestions.length})</h4>
            <Button
              variant="outline"
              size="sm"
              className="text-xs px-2 py-1"
              onClick={() => setParsedQuestions([])}
            >
              <span className="hidden sm:inline">Limpar todas</span>
              <span className="sm:hidden">Limpar</span>
            </Button>
          </div>
          <div className="max-h-64 sm:max-h-80 overflow-y-auto">
            {parsedQuestions.map((q, index) => (
              <PreviewQuestion 
                key={index} 
                question={q} 
                index={index} 
                onDelete={() => {
                  const newQuestions = [...parsedQuestions];
                  newQuestions.splice(index, 1);
                  setParsedQuestions(newQuestions);
                }} 
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            <pre className="whitespace-pre-wrap text-xs mt-1">{error}</pre>
          </AlertDescription>
        </Alert>
      )}

      {uploadStats && (
        <Alert variant={uploadStats.failed > 0 ? "warning" : "success"} className="mt-2">
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 mt-0.5" />
            <div>
              <AlertTitle>Importação concluída</AlertTitle>
              <AlertDescription>
                <div className="mt-1">
                  <p>Total de questões processadas: {uploadStats.total}</p>
                  <p className="text-green-600">Questões importadas com sucesso: {uploadStats.success}</p>
                  {uploadStats.failed > 0 && (
                    <p className="text-red-600">Questões com erro: {uploadStats.failed}</p>
                  )}
                  {uploadStats.isPublic && (
                    <p className="mt-1">As questões foram adicionadas ao Genoma Bank (públicas)</p>
                  )}
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
};

function Download(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
} 

const PreviewQuestion = ({ 
  question, 
  index, 
  onDelete 
}: { 
  question: any; 
  index: number; 
  onDelete: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
      <div className="flex justify-between">
        <div 
          className="flex-1 cursor-pointer" 
          onClick={() => setExpanded(!expanded)}
        >
          <p className="font-medium text-sm flex items-center flex-wrap">
            <span className="mr-2">{index + 1}.</span>
            <span className="flex-1 min-w-0">
              {question.question_text.length > 80 
                ? question.question_text.substring(0, 80) + '...' 
                : question.question_text}
            </span>
            <button 
              className="ml-2 text-blue-500 hover:text-blue-700 text-xs touch-manipulation px-2 py-1 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? 'Recolher' : 'Expandir'}
            </button>
          </p>
          <div className="text-xs text-gray-500 mt-1">
            Tipo: {question.question_type === 'multiple_choice' 
              ? 'Múltipla Escolha' 
              : question.question_type === 'true_false' 
                ? 'Verdadeiro/Falso' 
                : 'Dissertativa'}
            {question.options && question.options.length > 0 && (
              <span> • {question.options.length} alternativas</span>
            )}
          </div>
        </div>
        <button 
          className="text-red-500 hover:text-red-700 ml-2 p-2 touch-manipulation rounded"
          onClick={onDelete}
          title="Remover questão"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      
      {expanded && (
        <div className="mt-3 pl-3 sm:pl-6 border-l-2 border-gray-200">
          <p className="text-sm mb-2 break-words">{question.question_text}</p>
          
          {question.question_type === 'multiple_choice' && question.options && (
            <div className="space-y-1 mb-2">
              {question.options.map((option: any, i: number) => (
                <div 
                  key={i} 
                  className={`text-xs p-2 rounded break-words ${option.is_correct 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-gray-50 border border-gray-200'}`}
                >
                  <span className="font-medium mr-1">{String.fromCharCode(65 + i)})</span>
                  <span className="break-words">{option.text}</span>
                  {option.is_correct && (
                    <span className="ml-1 text-green-700 font-medium">(Correta)</span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {question.question_type === 'true_false' && (
            <div className="text-xs mb-2">
              <span className="font-medium">Resposta correta: </span>
              {question.correct_answer === 'true' ? 'Verdadeiro' : 'Falso'}
            </div>
          )}
          
          {question.explanation && (
            <div className="text-xs text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">
              <span className="font-medium">Explicação: </span>
              <span className="break-words">{question.explanation}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};