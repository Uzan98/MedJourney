import { supabase } from '@/lib/supabase';

export interface CompleteExamQuestionImage {
  id?: string;
  complete_exam_question_id: number;
  image_url: string;
  position?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export class CompleteExamImageUploadService {
  /**
   * Upload de uma imagem para o bucket do Supabase
   */
  static async uploadImage(file: File, fileName: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Erro no upload da imagem:', error);
        return null;
      }

      // Obter a URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload da imagem:', error);
      return null;
    }
  }

  /**
   * Salvar informações da imagem no banco de dados
   */
  static async saveImageInfo(imageData: Omit<CompleteExamQuestionImage, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('complete_exam_images')
        .insert(imageData)
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao salvar informações da imagem:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Erro ao salvar informações da imagem:', error);
      return null;
    }
  }

  /**
   * Upload completo: arquivo + informações no banco
   */
  static async uploadCompleteExamQuestionImage(
    file: File,
    completeExamQuestionId: number,
    position: number = 1,
    description?: string
  ): Promise<CompleteExamQuestionImage | null> {
    try {
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `complete-exam-question-${completeExamQuestionId}-${timestamp}.${fileExtension}`;

      // Upload do arquivo
      const imageUrl = await this.uploadImage(file, fileName);
      if (!imageUrl) {
        return null;
      }

      // Salvar informações no banco
      const imageData = {
        complete_exam_question_id: completeExamQuestionId,
        image_url: imageUrl,
        position,
        description
      };

      const imageId = await this.saveImageInfo(imageData);
      if (!imageId) {
        // Se falhar ao salvar no banco, tentar remover a imagem do storage
        await this.deleteImageFromStorage(fileName);
        return null;
      }

      return {
        id: imageId,
        ...imageData
      };
    } catch (error) {
      console.error('Erro no upload completo da imagem:', error);
      return null;
    }
  }

  /**
   * Buscar imagens de uma questão de prova completa
   */
  static async getCompleteExamQuestionImages(completeExamQuestionId: number): Promise<CompleteExamQuestionImage[]> {
    try {
      const { data, error } = await supabase
        .from('complete_exam_images')
        .select('*')
        .eq('complete_exam_question_id', completeExamQuestionId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Erro ao buscar imagens da questão:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar imagens da questão:', error);
      return [];
    }
  }

  /**
   * Buscar imagens de múltiplas questões de prova completa
   */
  static async getMultipleCompleteExamQuestionImages(completeExamQuestionIds: number[]): Promise<Record<number, CompleteExamQuestionImage[]>> {
    try {
      if (completeExamQuestionIds.length === 0) {
        return {};
      }

      const { data, error } = await supabase
        .from('complete_exam_images')
        .select('*')
        .in('complete_exam_question_id', completeExamQuestionIds)
        .order('position', { ascending: true });

      if (error) {
        console.error('Erro ao buscar imagens das questões:', error);
        return {};
      }

      // Agrupar por question_id
      const groupedImages: Record<number, CompleteExamQuestionImage[]> = {};
      (data || []).forEach(image => {
        if (!groupedImages[image.complete_exam_question_id]) {
          groupedImages[image.complete_exam_question_id] = [];
        }
        groupedImages[image.complete_exam_question_id].push(image);
      });

      return groupedImages;
    } catch (error) {
      console.error('Erro ao buscar imagens das questões:', error);
      return {};
    }
  }

  /**
   * Remover imagem do storage
   */
  static async deleteImageFromStorage(fileName: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('question-images')
        .remove([fileName]);

      if (error) {
        console.error('Erro ao remover imagem do storage:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao remover imagem do storage:', error);
      return false;
    }
  }

  /**
   * Remover imagem completamente (banco + storage)
   */
  static async deleteCompleteExamQuestionImage(imageId: string): Promise<boolean> {
    try {
      // Buscar informações da imagem para obter o nome do arquivo
      const { data: imageInfo, error: fetchError } = await supabase
        .from('complete_exam_images')
        .select('image_url')
        .eq('id', imageId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar informações da imagem:', fetchError);
        return false;
      }

      // Extrair nome do arquivo da URL
      const fileName = imageInfo.image_url.split('/').pop();
      if (!fileName) {
        console.error('Não foi possível extrair o nome do arquivo da URL');
        return false;
      }

      // Remover do banco de dados
      const { error: dbError } = await supabase
        .from('complete_exam_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        console.error('Erro ao remover imagem do banco:', dbError);
        return false;
      }

      // Remover do storage
      await this.deleteImageFromStorage(fileName);

      return true;
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      return false;
    }
  }

  /**
   * Atualizar posição de uma imagem
   */
  static async updateImagePosition(imageId: string, newPosition: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('complete_exam_images')
        .update({ position: newPosition })
        .eq('id', imageId);

      if (error) {
        console.error('Erro ao atualizar posição da imagem:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar posição da imagem:', error);
      return false;
    }
  }

  /**
   * Atualizar descrição de uma imagem
   */
  static async updateImageDescription(imageId: string, description: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('complete_exam_images')
        .update({ description })
        .eq('id', imageId);

      if (error) {
        console.error('Erro ao atualizar descrição da imagem:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar descrição da imagem:', error);
      return false;
    }
  }
}