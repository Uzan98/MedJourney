'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  AlertCircle, 
  Image as ImageIcon,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { ParsedExam, ParsedQuestion } from '@/services/pdf-parser.service';
import { QuestionImageUpload } from './question-image-upload';

interface ExamPreviewProps {
  exam: ParsedExam;
  questionImages: Record<number, File[]>;
  onImageUpload: (questionNumber: number, files: File[]) => void;
}

export function ExamPreview({ exam, questionImages, onImageUpload }: ExamPreviewProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [showRawText, setShowRawText] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  const toggleQuestion = (questionNumber: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionNumber)) {
      newExpanded.delete(questionNumber);
    } else {
      newExpanded.add(questionNumber);
    }
    setExpandedQuestions(newExpanded);
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(exam.questions.map(q => q.questionNumber)));
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  const getQuestionStatus = (question: ParsedQuestion) => {
    const issues = [];
    
    if (!question.statement.trim()) {
      issues.push('Enunciado vazio');
    }
    
    if (question.options.length < 2) {
      issues.push('Poucas alternativas');
    }
    
    if (!question.correctAnswer) {
      issues.push('Sem gabarito');
    }
    
    if (question.hasImage && !questionImages[question.questionNumber]) {
      issues.push('Imagem necessária');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  };

  const validQuestions = exam.questions.filter(q => getQuestionStatus(q).isValid).length;
  const questionsWithIssues = exam.questions.length - validQuestions;

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview da Prova
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRawText(!showRawText)}
              >
                <FileText className="h-4 w-4 mr-2" />
                {showRawText ? 'Ocultar' : 'Ver'} Texto Original
              </Button>
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expandir Todas
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Recolher Todas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{exam.totalQuestions}</div>
              <div className="text-sm text-gray-600">Total de Questões</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{validQuestions}</div>
              <div className="text-sm text-gray-600">Questões Válidas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{questionsWithIssues}</div>
              <div className="text-sm text-gray-600">Com Problemas</div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <div><strong>Título:</strong> {exam.title}</div>
            {exam.institution && (
              <div><strong>Instituição:</strong> {exam.institution}</div>
            )}
            {exam.year && (
              <div><strong>Ano:</strong> {exam.year}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Texto Original */}
      {showRawText && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Texto Original Extraído
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full border rounded-md p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {exam.extractedText}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Lista de Questões */}
      <div className="space-y-4">
        {exam.questions.map((question) => {
          const status = getQuestionStatus(question);
          const isExpanded = expandedQuestions.has(question.questionNumber);
          const hasImages = questionImages[question.questionNumber]?.length > 0;
          
          return (
            <Card key={question.questionNumber} className="overflow-hidden">
              <Collapsible
                open={isExpanded}
                onOpenChange={() => toggleQuestion(question.questionNumber)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold">
                          Questão {question.questionNumber}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {status.isValid ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Válida
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {status.issues.length} problema(s)
                            </Badge>
                          )}
                          
                          {question.hasImage && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              Imagem
                            </Badge>
                          )}
                          
                          {hasImages && (
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              {questionImages[question.questionNumber].length} arquivo(s)
                            </Badge>
                          )}
                          
                          {question.correctAnswer && (
                            <Badge variant="outline">
                              Gabarito: {question.correctAnswer}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!status.isValid && (
                          <div className="text-sm text-red-600">
                            {status.issues.join(', ')}
                          </div>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Enunciado */}
                      <div>
                        <h4 className="font-medium mb-2">Enunciado:</h4>
                        <div className="p-3 bg-gray-50 rounded-md">
                          {question.statement || (
                            <span className="text-red-500 italic">Enunciado não encontrado</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Alternativas */}
                      <div>
                        <h4 className="font-medium mb-2">Alternativas:</h4>
                        <div className="space-y-2">
                          {question.options.length > 0 ? (
                            question.options.map((option) => (
                              <div
                                key={option.key}
                                className={`p-3 rounded-md border ${
                                  option.key === question.correctAnswer
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                <span className="font-medium">{option.key})</span> {option.text}
                              </div>
                            ))
                          ) : (
                            <div className="text-red-500 italic">Nenhuma alternativa encontrada</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Explicação */}
                      {question.explanation && (
                        <div>
                          <h4 className="font-medium mb-2">Explicação:</h4>
                          <div className="p-3 bg-blue-50 rounded-md">
                            {question.explanation}
                          </div>
                        </div>
                      )}
                      
                      {/* Upload de Imagens */}
                      {question.hasImage && (
                        <div>
                          <h4 className="font-medium mb-2">Imagens da Questão:</h4>
                          <QuestionImageUpload
                            questionNumber={question.questionNumber}
                            existingFiles={questionImages[question.questionNumber] || []}
                            onFilesChange={(files) => onImageUpload(question.questionNumber, files)}
                          />
                        </div>
                      )}
                      
                      {/* Problemas Identificados */}
                      {!status.isValid && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <h4 className="font-medium text-red-800 mb-2">Problemas Identificados:</h4>
                          <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                            {status.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
      
      {/* Resumo Final */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <div className="text-lg font-semibold">
              Resumo da Validação
            </div>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{validQuestions}</div>
                <div className="text-sm text-gray-600">Questões Prontas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{questionsWithIssues}</div>
                <div className="text-sm text-gray-600">Precisam Revisão</div>
              </div>
            </div>
            
            {questionsWithIssues > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-orange-800 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Algumas questões precisam de revisão antes da importação.
                  Verifique os problemas identificados acima.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExamPreview;