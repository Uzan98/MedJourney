import { supabase } from '@/lib/supabase';

export interface ImageUploadResult {
  success: boolean;
  imageId?: string;
  publicUrl?: string;
  error?: string;
}

export interface QuestionImage {
  id: string;
  questionId: string;
  imageUrl: string;
  position: number;
  description?: string;
  createdAt: string;
}

export interface ImageValidation {
  isValid: boolean;
  errors: string[];
}

export class ImageUploadService {
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ];
  
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly STORAGE_BUCKET = 'question-images';

  /**
   * Valida um arquivo de imagem antes do upload
   */
  static validateImage(file: File): ImageValidation {
    const errors: string[] = [];

    // Verificar tipo de arquivo
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      errors.push(`Tipo de arquivo não suportado. Tipos aceitos: ${this.ALLOWED_TYPES.join(', ')}`);
    }

    // Verificar tamanho do arquivo
    if (file.size > this.MAX_FILE_SIZE) {
      const maxSizeMB = this.MAX_FILE_SIZE / (1024 * 1024);
      errors.push(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
    }

    // Verificar se o arquivo não está vazio
    if (file.size === 0) {
      errors.push('Arquivo está vazio');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Faz upload de uma imagem para o Supabase Storage
   */
  static async uploadImage(
    file: File, 
    examId: string, 
    questionNumber: number
  ): Promise<ImageUploadResult> {
    try {
      // Validar arquivo
      const validation = this.validateImage(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Gerar nome único para o arquivo
      const fileExtension = file.name.split('.').pop();
      const fileName = `${examId}/question-${questionNumber}-${Date.now()}.${fileExtension}`;

      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        return {
          success: false,
          error: 'Falha no upload da imagem'
        };
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(fileName);

      if (!urlData.publicUrl) {
        return {
          success: false,
          error: 'Falha ao obter URL da imagem'
        };
      }

      return {
        success: true,
        imageId: uploadData.path,
        publicUrl: urlData.publicUrl
      };
    } catch (error) {
      console.error('Erro no upload de imagem:', error);
      return {
        success: false,
        error: 'Erro interno no upload'
      };
    }
  }

  /**
   * Faz upload de múltiplas imagens
   */
  static async uploadMultipleImages(
    files: File[],
    examId: string,
    questionNumber: number
  ): Promise<ImageUploadResult[]> {
    const results: ImageUploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadImage(file, examId, questionNumber);
      results.push(result);
    }

    return results;
  }

  /**
   * Salva informações da imagem no banco de dados
   */
  static async saveImageRecord(
    questionId: string,
    imageUrl: string,
    position: number,
    description?: string
  ): Promise<{ success: boolean; imageId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('exam_images')
        .insert({
          complete_exam_question_id: questionId,
          image_url: imageUrl,
          position,
          description
        })
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao salvar registro da imagem:', error);
        return {
          success: false,
          error: 'Falha ao salvar informações da imagem'
        };
      }

      return {
        success: true,
        imageId: data.id
      };
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      return {
        success: false,
        error: 'Erro interno ao salvar imagem'
      };
    }
  }

  /**
   * Busca imagens de uma questão específica
   */
  static async getQuestionImages(questionId: string): Promise<QuestionImage[]> {
    try {
      const { data, error } = await supabase
        .from('exam_images')
        .select('*')
        .eq('complete_exam_question_id', questionId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Erro ao buscar imagens:', error);
        return [];
      }

      return data.map(item => ({
        id: item.id,
        questionId: item.complete_exam_question_id,
        imageUrl: item.image_url,
        position: item.position,
        description: item.description,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
      return [];
    }
  }

  /**
   * Remove uma imagem do storage e do banco de dados
   */
  static async deleteImage(imageId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Buscar informações da imagem
      const { data: imageData, error: fetchError } = await supabase
        .from('exam_images')
        .select('image_url')
        .eq('id', imageId)
        .single();

      if (fetchError || !imageData) {
        return {
          success: false,
          error: 'Imagem não encontrada'
        };
      }

      // Extrair caminho do arquivo da URL
      const url = new URL(imageData.image_url);
      const filePath = url.pathname.split('/').slice(-1)[0]; // Último segmento da URL

      // Remover do storage
      const { error: storageError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .remove([filePath]);

      if (storageError) {
        console.error('Erro ao remover do storage:', storageError);
      }

      // Remover do banco de dados
      const { error: dbError } = await supabase
        .from('exam_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        console.error('Erro ao remover do banco:', dbError);
        return {
          success: false,
          error: 'Falha ao remover registro da imagem'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      return {
        success: false,
        error: 'Erro interno ao deletar imagem'
      };
    }
  }

  /**
   * Atualiza a posição de uma imagem
   */
  static async updateImagePosition(
    imageId: string, 
    newPosition: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('exam_images')
        .update({ position: newPosition })
        .eq('id', imageId);

      if (error) {
        console.error('Erro ao atualizar posição:', error);
        return {
          success: false,
          error: 'Falha ao atualizar posição da imagem'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar posição:', error);
      return {
        success: false,
        error: 'Erro interno ao atualizar posição'
      };
    }
  }

  /**
   * Comprime uma imagem antes do upload (opcional)
   */
  static async compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calcular dimensões mantendo proporção
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Retorna original se falhar
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Gera thumbnail de uma imagem
   */
  static async generateThumbnail(file: File, size: number = 150): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        canvas.width = size;
        canvas.height = size;

        // Calcular crop para manter proporção quadrada
        const minDimension = Math.min(img.width, img.height);
        const x = (img.width - minDimension) / 2;
        const y = (img.height - minDimension) / 2;

        ctx.drawImage(
          img,
          x, y, minDimension, minDimension,
          0, 0, size, size
        );

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Verifica se o bucket de storage existe e cria se necessário
   */
  static async ensureStorageBucket(): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar se bucket existe
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        return {
          success: false,
          error: 'Falha ao verificar buckets de storage'
        };
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.STORAGE_BUCKET);
      
      if (!bucketExists) {
        // Criar bucket
        const { error: createError } = await supabase.storage.createBucket(
          this.STORAGE_BUCKET,
          {
            public: true,
            allowedMimeTypes: this.ALLOWED_TYPES,
            fileSizeLimit: this.MAX_FILE_SIZE
          }
        );

        if (createError) {
          return {
            success: false,
            error: 'Falha ao criar bucket de storage'
          };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao verificar storage:', error);
      return {
        success: false,
        error: 'Erro interno ao verificar storage'
      };
    }
  }
}

export default ImageUploadService;