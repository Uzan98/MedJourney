'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, AlertCircle, CheckCircle, Eye, X, Image as ImageIcon } from 'lucide-react';
import { PDFParserService, ParsedExam, ParsedQuestion } from '@/services/pdf-parser.service';
import { ImageUploadService } from '@/services/image-upload.service';
import { ExamPreview } from './exam-preview';
import { QuestionImageUpload } from './question-image-upload';

export interface ExamUploadData {
  title: string;
  examType: string;
  institution?: string;
  year?: number;
  description?: string;
  parsedExam?: ParsedExam;
}

interface ExamUploadFormProps {
  onSubmit: (data: ExamUploadData) => Promise<void>;
  isLoading?: boolean;
}

export function ExamUploadForm({ onSubmit, isLoading = false }: ExamUploadFormProps) {
  const [formData, setFormData] = useState<ExamUploadData>({
    title: '',
    examType: '',
    institution: '',
    year: undefined,
    description: ''
  });
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedExam, setParsedExam] = useState<ParsedExam | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [questionImages, setQuestionImages] = useState<Record<number, File[]>>({});

  const examTypes = [
    { value: 'residencia', label: 'Residência Médica' },
    { value: 'concurso', label: 'Concurso Público' },
    { value: 'enem', label: 'ENEM' },
    { value: 'vestibular', label: 'Vestibular' },
    { value: 'pos-graduacao', label: 'Pós-graduação' },
    { value: 'certificacao', label: 'Certificação Profissional' }
  ];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setParseError('Apenas arquivos PDF são aceitos');
      return;
    }

    setUploadedFile(file);
    setParseError(null);
    setParseWarnings([]);
    setParsedExam(null);
    setIsProcessing(true);

    try {
      // Extrair texto do PDF
      const extractedText = await PDFParserService.extractTextFromPDF(file);
      
      // Processar texto extraído
      const parseResult = PDFParserService.parseExamText(extractedText);
      
      if (parseResult.success && parseResult.exam) {
        setParsedExam(parseResult.exam);
        
        // Preencher dados do formulário automaticamente
        setFormData(prev => ({
          ...prev,
          title: parseResult.exam!.title || prev.title,
          institution: parseResult.exam!.institution || prev.institution,
          year: parseResult.exam!.year || prev.year
        }));
        
        if (parseResult.warnings) {
          setParseWarnings(parseResult.warnings);
        }
      } else {
        setParseError(parseResult.error || 'Erro desconhecido no processamento');
      }
    } catch (error) {
      console.error('Erro no processamento:', error);
      setParseError('Erro interno no processamento do arquivo');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isProcessing || isLoading
  });

  const handleInputChange = (field: keyof ExamUploadData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (questionNumber: number, files: File[]) => {
    setQuestionImages(prev => ({
      ...prev,
      [questionNumber]: files
    }));
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setParsedExam(null);
    setParseError(null);
    setParseWarnings([]);
    setQuestionImages({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!parsedExam) {
      setParseError('É necessário fazer upload e processar um arquivo PDF primeiro');
      return;
    }

    // Validar dados obrigatórios
    if (!formData.title.trim()) {
      setParseError('Título da prova é obrigatório');
      return;
    }

    if (!formData.examType) {
      setParseError('Tipo de prova é obrigatório');
      return;
    }

    // Validar prova processada
    const validation = PDFParserService.validateParsedExam(parsedExam);
    if (!validation.isValid) {
      setParseError(`Prova inválida: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      await onSubmit({
        ...formData,
        parsedExam
      });
    } catch (error) {
      console.error('Erro no envio:', error);
      setParseError('Erro ao salvar a prova');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Prova
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${isProcessing || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600">Solte o arquivo PDF aqui...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Arraste um arquivo PDF aqui ou clique para selecionar
                </p>
                <p className="text-sm text-gray-500">
                  Apenas arquivos PDF são aceitos
                </p>
              </div>
            )}
          </div>

          {/* Arquivo Carregado */}
          {uploadedFile && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeUploadedFile}
                disabled={isProcessing || isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Status do Processamento */}
          {isProcessing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Processando arquivo PDF... Isso pode levar alguns segundos.
              </AlertDescription>
            </Alert>
          )}

          {/* Erros */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Avisos */}
          {parseWarnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <p className="font-medium mb-2">Avisos encontrados:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {parseWarnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Sucesso */}
          {parsedExam && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Prova processada com sucesso! {parsedExam.totalQuestions} questões encontradas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Formulário de Dados */}
      {parsedExam && (
        <Card>
          <CardHeader>
            <CardTitle>Informações da Prova</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título da Prova *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Ex: Prova de Residência Médica 2024"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="examType">Tipo de Prova *</Label>
                  <Select
                    value={formData.examType}
                    onValueChange={(value) => handleInputChange('examType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="institution">Instituição</Label>
                  <Input
                    id="institution"
                    value={formData.institution || ''}
                    onChange={(e) => handleInputChange('institution', e.target.value)}
                    placeholder="Ex: Hospital Universitário"
                  />
                </div>
                
                <div>
                  <Label htmlFor="year">Ano</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year || ''}
                    onChange={(e) => handleInputChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Ex: 2024"
                    min="2000"
                    max="2030"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrição adicional sobre a prova..."
                  rows={3}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">
                    {parsedExam.totalQuestions} questões
                  </Badge>
                  {Object.keys(questionImages).length > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {Object.keys(questionImages).length} questões com imagens
                    </Badge>
                  )}
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Ocultar' : 'Visualizar'} Preview
                </Button>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isLoading || !formData.title.trim() || !formData.examType}
                  className="flex-1"
                >
                  {isLoading ? 'Salvando...' : 'Salvar Prova'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Preview da Prova */}
      {showPreview && parsedExam && (
        <ExamPreview
          exam={parsedExam}
          questionImages={questionImages}
          onImageUpload={handleImageUpload}
        />
      )}
    </div>
  );
}

export default ExamUploadForm;