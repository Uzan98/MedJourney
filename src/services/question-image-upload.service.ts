import { supabase } from '@/lib/supabase';
import { QuestionImage } from './questions-bank.service';

export interface QuestionImageUploadResult {
  success: boolean;
  imageId?: string;
  publicUrl?: string;
  error?: string;
}

export interface QuestionImageValidation {
  isValid: boolean;
  errors: string[];
}

export class QuestionImageUploadService {
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
  static validateImage(file: File): QuestionImageValidation {
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
    questionId: number,
    position: number = 1
  ): Promise<QuestionImageUploadResult> {
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
      const fileName = `questions/${questionId}/image-${position}-${Date.now()}.${fileExtension}`;

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
    questionId: number
  ): Promise<QuestionImageUploadResult[]> {
    const results: QuestionImageUploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadImage(files[i], questionId, i + 1);
      results.push(result);
    }

    return results;
  }

  /**
   * Salva informações da imagem no banco de dados
   */
  static async saveImageRecord(
    questionId: number,
    imageUrl: string,
    position: number,
    imageName?: string,
    imageSize?: number,
    mimeType?: string,
    description?: string
  ): Promise<{ success: boolean; imageId?: number; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        return {
          success: false,
          error: 'Usuário não autenticado'
        };
      }

      const { data, error } = await supabase
        .from('question_images')
        .insert({
          question_id: questionId,
          image_url: imageUrl,
          image_name: imageName,
          image_size: imageSize,
          mime_type: mimeType,
          position,
          description,
          uploaded_by: userData.user.id
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
  static async getQuestionImages(questionId: number): Promise<QuestionImage[]> {
    try {
      const { data, error } = await supabase
        .from('question_images')
        .select('*')
        .eq('question_id', questionId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Erro ao buscar imagens:', error);
        return [];
      }

      return data.map(item => ({
        id: item.id,
        question_id: item.question_id,
        image_url: item.image_url,
        image_name: item.image_name,
        image_size: item.image_size,
        mime_type: item.mime_type,
        position: item.position,
        description: item.description,
        uploaded_by: item.uploaded_by,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
      return [];
    }
  }

  /**
   * Remove uma imagem do storage e do banco de dados
   */
  static async deleteImage(imageId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Buscar informações da imagem
      const { data: imageData, error: fetchError } = await supabase
        .from('question_images')
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
      const pathSegments = url.pathname.split('/');
      const filePath = pathSegments.slice(-3).join('/'); // questions/questionId/filename

      // Remover do storage
      const { error: storageError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .remove([filePath]);

      if (storageError) {
        console.error('Erro ao remover do storage:', storageError);
      }

      // Remover do banco de dados
      const { error: dbError } = await supabase
        .from('question_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        console.error('Erro ao remover do banco:', dbError);
        return {
          success: false,
          error: 'Falha ao remover registro da imagem'
        };
      }

      return {
        success: true
      };
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
    imageId: number, 
    newPosition: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('question_images')
        .update({ position: newPosition })
        .eq('id', imageId);

      if (error) {
        console.error('Erro ao atualizar posição:', error);
        return {
          success: false,
          error: 'Falha ao atualizar posição da imagem'
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Erro ao atualizar posição:', error);
      return {
        success: false,
        error: 'Erro interno ao atualizar posição'
      };
    }
  }

  /**
   * Upload completo: faz upload do arquivo e salva no banco
   */
  static async uploadAndSaveImage(
    file: File,
    questionId: number,
    position: number = 1,
    description?: string
  ): Promise<{ success: boolean; imageData?: QuestionImage; error?: string }> {
    try {
      // Upload do arquivo
      const uploadResult = await this.uploadImage(file, questionId, position);
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error
        };
      }

      // Salvar no banco
      const saveResult = await this.saveImageRecord(
        questionId,
        uploadResult.publicUrl!,
        position,
        file.name,
        file.size,
        file.type,
        description
      );

      if (!saveResult.success) {
        // Se falhou ao salvar, tentar remover do storage
        await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([uploadResult.imageId!]);
        
        return {
          success: false,
          error: saveResult.error
        };
      }

      // Buscar dados completos da imagem
      const images = await this.getQuestionImages(questionId);
      const imageData = images.find(img => img.id === saveResult.imageId);

      return {
        success: true,
        imageData
      };
    } catch (error) {
      console.error('Erro no upload completo:', error);
      return {
        success: false,
        error: 'Erro interno no upload'
      };
    }
  }
}