// Script para configurar a chave da API Groq no localStorage
// Apenas execute este script uma vez no console do navegador

// Chave da API Groq
const GROQ_API_KEY = "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";

// Armazenar a chave no localStorage
localStorage.setItem('groq_api_key', GROQ_API_KEY);

console.log('Chave da API Groq configurada com sucesso!');
console.log('Você pode agora usar a funcionalidade "Criar com IA".');

// Também configurar no ambiente (para a sessão atual)
if (typeof window !== 'undefined') {
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  window.process.env.NEXT_PUBLIC_GROQ_API_KEY = GROQ_API_KEY;
} 