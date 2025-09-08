'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUploadService } from '@/services/image-upload.service'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void
  onImageRemoved?: () => void
  currentImageUrl?: string
  examId?: string
  questionNumber?: number
  disabled?: boolean
  className?: string
}

export function ImageUpload({
  onImageUploaded,
  onImageRemoved,
  currentImageUrl,
  examId = 'temp',
  questionNumber = 1,
  disabled = false,
  className = ''
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (disabled) return

    setIsUploading(true)
    
    try {
      // Validar arquivo
      const validation = ImageUploadService.validateImage(file)
      if (!validation.isValid) {
        toast.error(validation.errors.join(', '))
        return
      }

      // Comprimir imagem se necessário
      const compressedFile = await ImageUploadService.compressImage(file, 0.8)
      
      // Fazer upload
      const result = await ImageUploadService.uploadImage(
        compressedFile,
        examId,
        questionNumber
      )

      if (result.success && result.publicUrl) {
        onImageUploaded(result.publicUrl)
        toast.success('Imagem carregada com sucesso!')
      } else {
        toast.error(result.error || 'Erro ao carregar imagem')
      }
    } catch (error) {
      console.error('Erro no upload:', error)
      toast.error('Erro inesperado ao carregar imagem')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleRemoveImage = () => {
    if (onImageRemoved) {
      onImageRemoved()
    }
    toast.success('Imagem removida')
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Label>Imagem da Questão</Label>
      
      {currentImageUrl ? (
        <Card>
          <CardContent className="p-4">
            <div className="relative group">
              <div className="relative w-full max-w-md mx-auto">
                <Image
                  src={currentImageUrl}
                  alt="Imagem da questão"
                  width={400}
                  height={300}
                  className="w-full h-auto rounded-lg border"
                  style={{ objectFit: 'contain' }}
                />
                
                {!disabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {!disabled && (
                <div className="mt-2 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openFileDialog}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Substituir Imagem
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`border-2 border-dashed transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              {isUploading ? (
                <>
                  <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Carregando imagem...</p>
                    <p className="text-xs text-muted-foreground">
                      Aguarde enquanto processamos sua imagem
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Clique para selecionar ou arraste uma imagem
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF ou WebP até 5MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      openFileDialog()
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
}

export default ImageUpload