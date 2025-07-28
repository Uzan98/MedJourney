/**
 * Script de teste para verificar a correção do problema de subscription_usage
 * Execute este script no console do navegador na página da aplicação
 */

(async function testSubscriptionFix() {
  console.log('🔍 Iniciando teste da correção do subscription_usage...');
  
  try {
    // Verificar se o usuário está autenticado
    const { data: { user } } = await window.supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }
    
    console.log('✅ Usuário autenticado:', user.id);
    
    // Verificar se existe registro de subscription_usage
    const { data: usageData, error: usageError } = await window.supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (usageError && usageError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar subscription_usage:', usageError);
      return;
    }
    
    if (usageData) {
      console.log('✅ Registro de subscription_usage encontrado:', usageData);
    } else {
      console.log('⚠️ Registro de subscription_usage não encontrado');
      
      // Tentar inicializar via API
      console.log('🔧 Tentando inicializar via API...');
      
      const { data: { session } } = await window.supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('❌ Token de acesso não encontrado');
        return;
      }
      
      const response = await fetch('/api/subscription/initialize-usage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Subscription usage inicializado via API:', result);
      } else {
        console.error('❌ Erro ao inicializar via API:', result);
        return;
      }
    }
    
    // Verificar subscription do usuário
    const { data: subscriptionData, error: subError } = await window.supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();
    
    if (subError) {
      console.error('❌ Erro ao verificar subscription:', subError);
      return;
    }
    
    console.log('✅ Subscription ativa encontrada:', subscriptionData);
    
    // Testar adição de uma questão simples
    console.log('🧪 Testando adição de questão...');
    
    const testQuestion = {
      content: 'Questão de teste para verificar correção do erro 406',
      question_type: 'multiple_choice',
      difficulty: 'baixa',
      explanation: 'Esta é uma questão de teste criada automaticamente.',
      discipline_id: 1, // Assumindo que existe disciplina com ID 1
      subject_id: 1     // Assumindo que existe matéria com ID 1
    };
    
    const testAnswers = [
      { text: 'Opção A', is_correct: true },
      { text: 'Opção B', is_correct: false },
      { text: 'Opção C', is_correct: false },
      { text: 'Opção D', is_correct: false }
    ];
    
    // Tentar inserir questão diretamente
    const { data: questionData, error: questionError } = await window.supabase
      .from('questions')
      .insert([{
        ...testQuestion,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id')
      .single();
    
    if (questionError) {
      console.error('❌ Erro ao inserir questão de teste:', questionError);
      
      if (questionError.message.includes('406') || 
          questionError.message.includes('limit') ||
          questionError.code === 'P0001') {
        console.log('⚠️ Erro 406 detectado - o trigger ainda está causando problemas');
        console.log('💡 Recomendação: Execute a migração SQL fornecida no banco de dados');
      }
      
      return;
    }
    
    console.log('✅ Questão de teste inserida com sucesso:', questionData);
    
    // Inserir opções de resposta
    const optionsWithQuestionId = testAnswers.map(option => ({
      ...option,
      question_id: questionData.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { error: optionsError } = await window.supabase
      .from('answer_options')
      .insert(optionsWithQuestionId);
    
    if (optionsError) {
      console.error('❌ Erro ao inserir opções de resposta:', optionsError);
    } else {
      console.log('✅ Opções de resposta inseridas com sucesso');
    }
    
    // Limpar questão de teste
    console.log('🧹 Removendo questão de teste...');
    
    await window.supabase
      .from('answer_options')
      .delete()
      .eq('question_id', questionData.id);
    
    await window.supabase
      .from('questions')
      .delete()
      .eq('id', questionData.id);
    
    console.log('✅ Questão de teste removida');
    
    console.log('🎉 Teste concluído com sucesso! O problema foi corrigido.');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
})();

console.log('📋 Para executar o teste, cole este código no console do navegador na página da aplicação.');
console.log('🔧 Certifique-se de que window.supabase está disponível.');