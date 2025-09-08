'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Upload, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ExamUploadForm, { ExamUploadData } from '@/components/exam-upload/exam-upload-form';
import { CompleteExamsService } from '@/services/complete-exams.service';
import { ImageUploadService } from '@/services/image-upload.service';
import { toast } from 'sonner';

const steps = [
  {
    number: 1,
    title: 'Upload do PDF',
    description: 'Selecione o arquivo PDF da prova',
    icon: Upload,
    status: 'current'
  },
  {
    number: 2,
    title: 'Processamento',
    description: 'Parser inteligente extrai as questões',
    icon: FileText,
    status: 'pending'
  },
  {
    number: 3,
    title: 'Revisão',
    description: 'Valide e ajuste o resultado',
    icon: CheckCircle,
    status: 'pending'
  }
];

export default function UploadProvaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleExamSubmit = async (data: ExamUploadData) => {
    if (!data.parsedExam) {
      toast.error('Nenhuma prova foi processada');
      return;
    }

    setIsLoading(true);
    try {
      // Salvar a prova no banco de dados
      const examId = await CompleteExamsService.createExam({
        title: data.title,
        exam_type: data.examType,
        institution: data.institution,
        year: data.year,
        description: data.description,
        total_questions: data.parsedExam.totalQuestions,
        duration_minutes: 180, // Padrão de 3 horas
        status: 'draft'
      });

      // Salvar as questões
      for (const question of data.parsedExam.questions) {
        const questionId = await CompleteExamsService.createQuestion({
          complete_exam_id: examId,
          question_number: question.number,
          question_text: question.text,
          option_a: question.options.A,
          option_b: question.options.B,
          option_c: question.options.C,
          option_d: question.options.D,
          option_e: question.options.E,
          correct_answer: question.correctAnswer || 'A',
          explanation: question.explanation,
          subject: question.subject,
          difficulty: question.difficulty || 'medium'
        });

        // Se há imagem para esta questão, salvar no banco
        // Nota: As imagens já foram salvas durante o upload no componente
        // Este é apenas um placeholder para futuras implementações
      }

      toast.success('Prova salva com sucesso!');
      router.push(`/simulados/provas-integra/revisar/${examId}`);
    } catch (error) {
      console.error('Erro ao salvar prova:', error);
      toast.error('Erro ao salvar a prova. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Cabeçalho */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/simulados/provas-integra">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Upload de Prova na Íntegra
            </h1>
            <p className="text-gray-600 mt-1">
              Importe uma prova em PDF e nosso sistema processará automaticamente as questões
            </p>
          </div>
        </div>

        {/* Indicador de Progresso */}
        <div className="flex items-center justify-center space-x-8 mb-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            const isActive = step.status === 'current';
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';
            
            return (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2
                    ${
                      isActive 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : isCompleted 
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 max-w-24">
                      {step.description}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Instruções */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Instruções para Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-green-700">✅ Formatos Suportados</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Arquivos PDF com texto selecionável</li>
                <li>• Questões numeradas (ex: "1)", "20)")</li>
                <li>• Alternativas formatadas (A), B), C), D), E)</li>
                <li>• Gabarito opcional no final ou separado</li>
                <li>• Explicações das questões (opcional)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-red-700">❌ Limitações</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• PDFs escaneados sem OCR</li>
                <li>• Arquivos corrompidos ou protegidos</li>
                <li>• Tamanho máximo: 50MB</li>
                <li>• Questões sem numeração clara</li>
                <li>• Formatos de alternativas inconsistentes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload da Prova</CardTitle>
        </CardHeader>
        <CardContent>
          <ExamUploadForm onSubmit={handleExamSubmit} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Dicas */}
      <Card className="mt-8 bg-blue-50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3 text-blue-800">💡 Dicas para Melhor Resultado</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <strong>Qualidade do PDF:</strong> Use PDFs originais quando possível, evite conversões desnecessárias.
            </div>
            <div>
              <strong>Estrutura Clara:</strong> Certifique-se de que as questões estão bem formatadas e numeradas.
            </div>
            <div>
              <strong>Gabarito:</strong> Inclua o gabarito no PDF ou adicione manualmente após o processamento.
            </div>
            <div>
              <strong>Imagens:</strong> Prepare imagens separadas para questões que contenham gráficos ou diagramas.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}