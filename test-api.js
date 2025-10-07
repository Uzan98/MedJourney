// Script de teste para a API de flashcards
const http = require('http');

function testFlashcardsAPI() {
  console.log('Testando API POST /api/groq/flashcards...');
  
  const postData = JSON.stringify({
    prompt: 'Teste de flashcards sobre medicina',
    type: 'text',
    source: 'manual'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/groq/flashcards',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token-123',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        if (res.statusCode === 401) {
          console.log('✅ Token inválido detectado corretamente - autenticação funcionando');
        } else if (res.statusCode === 200) {
          console.log('✅ API funcionando - job criado com sucesso');
        } else {
          console.log('❌ Resposta inesperada');
        }
      } catch (error) {
        console.log('Response (raw):', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Erro no teste:', error.message);
  });

  req.write(postData);
  req.end();
}

testFlashcardsAPI();