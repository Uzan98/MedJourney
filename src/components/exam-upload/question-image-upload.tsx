'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  Eye, 
  AlertCircle,
  FileImage
} from 'lucide-react';
import { ImageUploadService } from '@/services/image-upload.service';
import Image from 'next/image';

interface QuestionImageUploadProps {
  questionNumber: number;
  existingFiles: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
}

interface FilePreview {
  file: File;
  preview: string;
  id: string;
}

export function QuestionImageUpload({ 
  questionNumber, 
  existingFiles, 
  onFilesChange,
  maxFiles = 5
}: QuestionImageUploadProps) {
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Atualizar previews quando existingFiles mudar
  React.useEffect(() => {
    const generatePreviews = async () => {
      const previews: FilePreview[] = [];
      
      for (const file of existingFiles) {
        const preview = URL.createObjectURL(file);
        previews.push({
          file,
          preview,
          id: `${file.name}-${file.lastModified}`
        });
      }
      
      setFilePreviews(previews);
    };

    generatePreviews();

    // Cleanup URLs quando componente desmontar
    return () => {
      filePreviews.forEach(fp => URL.revokeObjectURL(fp.preview));
    };
  }, [existingFiles]);

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setIsProcessing(true);
    setUploadErrors([]);
    
    const errors: string[] = [];
    
    // Processar arquivos rejeitados
    rejectedFiles.forEach(({ file, errors: fileErrors }) => {
      fileErrors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          errors.push(`${file.name}: Arquivo muito grande (máx. 5MB)`);
        } else if (error.code === 'file-invalid-type') {
          errors.push(`${file.name}: Tipo de arquivo não suportado`);
        } else {
          errors.push(`${file.name}: ${error.message}`);
        }
      });
    });

    // Validar arquivos aceitos
    const validFiles: File[] = [];
    
    for (const file of acceptedFiles) {
      const validation = ImageUploadService.validateImage(file);
      
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
      }
    }

    // Verificar limite de arquivos
    const totalFiles = existingFiles.length + validFiles.length;
    if (totalFiles > maxFiles) {
      errors.push(`Máximo de ${maxFiles} imagens por questão`);
      const allowedCount = maxFiles - existingFiles.length;
      validFiles.splice(allowedCount);
    }

    if (errors.length > 0) {
      setUploadErrors(errors);
    }

    if (validFiles.length > 0) {
      const newFiles = [...existingFiles, ...validFiles];
      onFilesChange(newFiles);
    }
    
    setIsProcessing(false);
  }, [existingFiles, onFilesChange, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: isProcessing || existingFiles.length >= maxFiles
  });

  const removeFile = (fileId: string) => {
    const fileToRemove = filePreviews.find(fp => fp.id === fileId);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.preview);
      const newFiles = existingFiles.filter(f => 
        `${f.name}-${f.lastModified}` !== fileId
      );
      onFilesChange(newFiles);
    }
  };

  const clearAllFiles = () => {
    filePreviews.forEach(fp => URL.revokeObjectURL(fp.preview));
    onFilesChange([]);
    setUploadErrors([]);
  };

  const openImagePreview = (preview: string) => {
    window.open(preview, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing || existingFiles.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-8 w-8 text-gray-400" />
          {isDragActive ? (
            <p className="text-blue-600">Solte as imagens aqui...</p>
          ) : (
            <div>
              <p className="text-gray-600">
                {existingFiles.length >= maxFiles 
                  ? `Máximo de ${maxFiles} imagens atingido`
                  : 'Arraste imagens aqui ou clique para selecionar'
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, WebP, GIF (máx. 5MB cada)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Erros */}
      {uploadErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium mb-1">Erros no upload:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {uploadErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Preview das Imagens */}
      {filePreviews.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                <span className="font-medium">
                  Imagens da Questão {questionNumber}
                </span>
                <Badge variant="outline">
                  {filePreviews.length} de {maxFiles}
                </Badge>
              </div>
              
              {filePreviews.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFiles}
                >
                  Remover Todas
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filePreviews.map((filePreview) => (
                <div key={filePreview.id} className="relative group">
                  <div className="aspect-square relative overflow-hidden rounded-lg border border-gray-200">
                    <Image
                      src={filePreview.preview}
                      alt={`Preview ${filePreview.file.name}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    
                    {/* Overlay com ações */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openImagePreview(filePreview.preview)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFile(filePreview.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Info do arquivo */}
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-600 truncate" title={filePreview.file.name}>
                      {filePreview.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(filePreview.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status */}
      {isProcessing && (
        <Alert>
          <Upload className="h-4 w-4" />
          <AlertDescription>
            Processando imagens...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default QuestionImageUpload;