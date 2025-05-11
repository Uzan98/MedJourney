import { supabase } from '@/lib/supabase';

/**
 * Cria salas de estudo mockadas no Supabase se elas não existirem
 */
export async function setupMockStudyRooms() {
  try {
    // Verificar se já existem salas
    const { count, error } = await supabase
      .from('study_rooms')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Erro ao verificar salas existentes:', error);
      return;
    }
    
    // Se já existirem salas, não fazer nada
    if (count && count > 0) {
      console.log('Salas já existem, não é necessário criar mocks');
      return;
    }
    
    console.log('Criando salas de estudo mockadas...');
    
    // Salas mockadas
    const mockRooms = [
      {
        id: 'cardiologia',
        name: 'Cardiologia Avançada',
        description: 'Sala dedicada aos estudos de cardiologia e doenças cardiovasculares',
        capacity: 20,
        active_users: 0
      },
      {
        id: 'neurologia',
        name: 'Neurologia e Neurociência',
        description: 'Para entusiastas do sistema nervoso e distúrbios neurológicos',
        capacity: 15,
        active_users: 0
      },
      {
        id: 'cirurgia',
        name: 'Técnicas Cirúrgicas',
        description: 'Discussão sobre procedimentos cirúrgicos e novas tecnologias',
        capacity: 12,
        active_users: 0
      },
      {
        id: 'pediatria',
        name: 'Pediatria Geral',
        description: 'Estudos sobre saúde infantil e desenvolvimento',
        capacity: 15,
        active_users: 0
      },
      {
        id: 'residencia',
        name: 'Preparação para Residência',
        description: 'Grupo de estudos focado na preparação para provas de residência médica',
        capacity: 25,
        active_users: 0
      }
    ];
    
    // Inserir salas mockadas
    const { error: insertError } = await supabase
      .from('study_rooms')
      .insert(mockRooms);
    
    if (insertError) {
      console.error('Erro ao inserir salas mockadas:', insertError);
      return;
    }
    
    console.log('Salas de estudo mockadas criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao configurar mocks de salas de estudo:', error);
  }
} 