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
    
    // Salas mockadas - Agora usando gen_random_uuid() no Supabase
    const mockRooms = [
      {
        // O id será gerado automaticamente pelo Supabase com gen_random_uuid()
        name: 'Cardiologia Avançada',
        description: 'Sala dedicada aos estudos de cardiologia e doenças cardiovasculares',
        capacity: 20,
        active_users: 0
      },
      {
        name: 'Neurologia e Neurociência',
        description: 'Para entusiastas do sistema nervoso e distúrbios neurológicos',
        capacity: 15,
        active_users: 0
      },
      {
        name: 'Técnicas Cirúrgicas',
        description: 'Discussão sobre procedimentos cirúrgicos e novas tecnologias',
        capacity: 12,
        active_users: 0
      },
      {
        name: 'Pediatria Geral',
        description: 'Estudos sobre saúde infantil e desenvolvimento',
        capacity: 15,
        active_users: 0
      },
      {
        name: 'Preparação para Residência',
        description: 'Grupo de estudos focado na preparação para provas de residência médica',
        capacity: 25,
        active_users: 0
      }
    ];
    
    // Inserir salas mockadas
    const { data, error: insertError } = await supabase
      .from('study_rooms')
      .insert(mockRooms)
      .select(); // Selecionamos os dados retornados para verificar os IDs gerados
    
    if (insertError) {
      console.error('Erro ao inserir salas mockadas:', insertError);
      return;
    }
    
    if (data) {
      console.log('Salas de estudo mockadas criadas com sucesso!', data.map(room => room.id));
    }
  } catch (error) {
    console.error('Erro ao configurar mocks de salas de estudo:', error);
  }
} 