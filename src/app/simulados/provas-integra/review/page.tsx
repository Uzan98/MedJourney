'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff,
  FileText,
  Users,
  Calendar,
  BookOpen,
  Target
} from 'lucide-react';
import { ParsedExam, ParsedQuestion } from '@/services/text-parser.service';
import { QuestionEditor } from '@/components/simulados/question-editor';

interface ExamData extends ParsedExam {
  subject?: string;
  difficulty?: string;
  examType?: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [editingQuestions, setEditingQuestions] = useState<Set<number>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    // Carregar dados do localStorage
    const savedData = localStorage.getItem('pendingExam');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setExamData(parsed);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        router.push('/simulados/provas-integra/text-parser');
      }
    } else {
      router.push('/simulados/provas-integra/text-parser');
    }
  }, [router]);

  const toggleQuestionExpansion = (questionNumber: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionNumber)) {
      newExpanded.delete(questionNumber);
    } else {
      newExpanded.add(questionNumber);
    }
    setExpandedQuestions(newExpanded);
  };

  const expandAllQuestions = () => {
    if (!examData) return;
    const allNumbers = new Set(examData.questions.map(q => q.number));
    setExpandedQuestions(allNumbers);
  };

  const collapseAllQuestions = () => {
    setExpandedQuestions(new Set());
  };

  const handleSave = async () => {
    if (!examData) return;

    setIsSaving(true);
    try {
      // Importar o serviço de provas completas
      const { CompleteExamsService } = await import('@/services/complete-exams.service');
      
      // Determinar o tipo de prova baseado na categoria
      let examTypeId = 1; // Default: residencia
      if (examData.category) {
        const categoryLower = examData.category.toLowerCase();
        if (categoryLower.includes('concurso')) examTypeId = 2;
        else if (categoryLower.includes('enem')) examTypeId = 3;
        else if (categoryLower.includes('vestibular')) examTypeId = 4;
      }
      
      // Criar a prova completa no banco de dados
      const examId = await CompleteExamsService.createCompleteExam({
        exam_type_id: examTypeId,
        title: examData.title,
        description: examData.description || `Prova ${examData.category || 'Geral'} - ${examData.institution || 'Instituição'}`,
        institution: examData.institution,
        year: examData.year,
        total_questions: examData.questions.length,
        time_limit: examData.timeLimit || null,
        is_public: false,
        is_approved: null // null = pending_review, true = approved, false = rejected
      });

      if (!examId) {
        throw new Error('Falha ao criar a prova');
      }

      // Salvar cada questão e suas opções
      for (let i = 0; i < examData.questions.length; i++) {
        const question = examData.questions[i];
        
        // Criar a questão
        const questionId = await CompleteExamsService.createCompleteExamQuestion({
          complete_exam_id: examId,
          question_number: question.number,
          statement: question.statement,
          explanation: question.explanation || '',
          correct_answer_key: question.correctAnswer,
          image_url: question.hasImage && question.imageUrl ? question.imageUrl : null,
          position: i + 1
        });

        if (!questionId) {
          throw new Error(`Falha ao criar a questão ${question.number}`);
        }

        // Salvar imagem da questão se existir
        if (question.hasImage && question.imageUrl) {
          try {
            const { CompleteExamImageUploadService } = await import('@/services/complete-exam-image-upload.service');
            await CompleteExamImageUploadService.saveImageInfo({
              complete_exam_question_id: questionId,
              image_url: question.imageUrl,
              position: 1,
              description: `Imagem da questão ${question.number}`
            });
          } catch (imageError) {
            console.error(`Erro ao salvar imagem da questão ${question.number}:`, imageError);
            // Não interromper o processo por erro de imagem
          }
        }

        // Criar as opções da questão
        const options = question.options.map((optionText, index) => {
          const optionKey = String.fromCharCode(65 + index); // A, B, C, D, E
          return {
            question_id: questionId,
            option_key: optionKey,
            option_text: optionText,
            is_correct: optionKey === question.correctAnswer
          };
        });

        const optionsCreated = await CompleteExamsService.createCompleteExamOptions(options);
        if (!optionsCreated) {
          throw new Error(`Falha ao criar as opções da questão ${question.number}`);
        }
      }
      
      // Limpar localStorage
      localStorage.removeItem('pendingExam');
      
      // Mostrar mensagem de sucesso
      alert(`Prova "${examData.title}" salva com sucesso! ${examData.questions.length} questões foram importadas.`);
      
      // Redirecionar para lista de provas
      router.push('/simulados');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar a prova: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleQuestionEdit = (questionNumber: number) => {
    const newEditing = new Set(editingQuestions);
    if (newEditing.has(questionNumber)) {
      newEditing.delete(questionNumber);
    } else {
      newEditing.add(questionNumber);
      // Expandir a questão quando entrar em modo de edição
      const newExpanded = new Set(expandedQuestions);
      newExpanded.add(questionNumber);
      setExpandedQuestions(newExpanded);
    }
    setEditingQuestions(newEditing);
  };

  const handleQuestionSave = (updatedQuestion: ParsedQuestion) => {
    if (!examData) return;

    // Encontrar a questão original que está sendo editada
    const originalQuestionIndex = examData.questions.findIndex(q => 
      editingQuestions.has(q.number) && 
      (q.statement === updatedQuestion.statement || 
       q.options.join('') === updatedQuestion.options.join(''))
    );

    if (originalQuestionIndex === -1) {
      alert('Erro: não foi possível identificar a questão original.');
      return;
    }

    const originalQuestion = examData.questions[originalQuestionIndex];

    // Verificar se o novo número da questão já existe em outra questão
    const duplicateQuestion = examData.questions.find((q, index) => 
      q.number === updatedQuestion.number && index !== originalQuestionIndex
    );

    if (duplicateQuestion) {
      alert(`Já existe uma questão com o número ${updatedQuestion.number}. Por favor, escolha um número diferente.`);
      return;
    }

    const updatedQuestions = examData.questions.map((q, index) => 
      index === originalQuestionIndex ? updatedQuestion : q
    );

    setExamData({
      ...examData,
      questions: updatedQuestions
    });

    // Atualizar localStorage
    localStorage.setItem('pendingExam', JSON.stringify({
      ...examData,
      questions: updatedQuestions
    }));

    // Sair do modo de edição (usar o número original da questão)
    const newEditing = new Set(editingQuestions);
    newEditing.delete(originalQuestion.number);
    setEditingQuestions(newEditing);

    setHasUnsavedChanges(true);
  };

  const handleQuestionCancel = (questionNumber: number) => {
    const newEditing = new Set(editingQuestions);
    newEditing.delete(questionNumber);
    setEditingQuestions(newEditing);
  };

  const handleBack = () => {
    router.back();
  };

  if (!examData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando dados da prova...</p>
        </div>
      </div>
    );
  }

  const questionsWithIssues = examData.questions.filter(q => 
    !q.statement || q.options.length < 2
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Revisão da Prova</h1>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs">
                Alterações não salvas
              </Badge>
            )}
            {editingQuestions.size > 0 && (
              <Badge variant="outline" className="text-xs">
                {editingQuestions.size} questão(ões) em edição
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={collapseAllQuestions}>
            <EyeOff className="h-4 w-4 mr-2" />
            Recolher Todas
          </Button>
          <Button variant="outline" onClick={expandAllQuestions}>
            <Eye className="h-4 w-4 mr-2" />
            Expandir Todas
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Prova
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Informações da Prova */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações da Prova
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Título</p>
                <p className="font-medium">{examData.title}</p>
              </div>
            </div>
            
            {examData.institution && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Instituição</p>
                  <p className="font-medium">{examData.institution}</p>
                </div>
              </div>
            )}
            
            {examData.year && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">Ano</p>
                  <p className="font-medium">{examData.year}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Questões</p>
                <p className="font-medium">{examData.questions.length}</p>
              </div>
            </div>
          </div>
          
          {(examData.subject || examData.difficulty || examData.examType) && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-2">
                {examData.examType && (
                  <Badge variant="secondary">
                    {examData.examType === 'residencia' ? 'Residência Médica' :
                     examData.examType === 'concurso' ? 'Concurso Público' :
                     examData.examType === 'vestibular' ? 'Vestibular' :
                     examData.examType === 'enem' ? 'ENEM' :
                     examData.examType === 'certificacao' ? 'Certificação' :
                     'Outros'}
                  </Badge>
                )}
                {examData.difficulty && (
                  <Badge variant="outline">
                    {examData.difficulty === 'easy' ? 'Fácil' :
                     examData.difficulty === 'medium' ? 'Médio' :
                     'Difícil'}
                  </Badge>
                )}
                {examData.subject && (
                  <Badge variant="outline">{examData.subject}</Badge>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Alertas */}
      {questionsWithIssues.length > 0 && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> {questionsWithIssues.length} questão(ões) podem ter problemas de formatação.
            Questões: {questionsWithIssues.map(q => q.number).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <Alert className="mb-6">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Revise as questões abaixo antes de salvar. Você pode expandir cada questão para verificar o conteúdo.
        </AlertDescription>
      </Alert>

      {/* Lista de Questões */}
      <div className="space-y-4">
        {examData.questions.map((question, index) => {
          const isEditing = editingQuestions.has(question.number);
          
          return (
            <QuestionEditor
              key={`question-${index}-${question.number}`}
              question={question}
              isEditing={isEditing}
              onToggleEdit={() => toggleQuestionEdit(question.number)}
              onSave={handleQuestionSave}
              onCancel={() => handleQuestionCancel(question.number)}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Total: {examData.questions.length} questões processadas
        </p>
        
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Prova
            </>
          )}
        </Button>
      </div>
    </div>
  );
}