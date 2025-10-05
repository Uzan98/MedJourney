import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.genomastudy.com.br';

// Rotas estáticas principais da aplicação
const staticRoutes = [
  '',
  '/auth/login',
  '/auth/signup',
  '/dashboard',
  '/banco-questoes',
  '/comunidade',
  '/desempenho',
  '/disciplinas',
  '/estatisticas',
  '/estudos',
  '/faltas',
  '/flashcards',
  '/hub-estudos',
  '/mais',
  '/materias',
  '/minha-faculdade',
  '/perfil',
  '/planejamento',
  '/planner',
  '/simulados',
  '/tarefas',
  '/perfil/configuracoes',
  '/perfil/assinatura',
  '/banco-questoes/praticar',
  '/banco-questoes/nova-questao',
  '/flashcards/study',
  '/simulados/novo',
  '/simulados/meus-resultados',
  '/planejamento/inteligente',
  '/planejamento/nova-sessao',
  '/minha-faculdade/criar',
  '/minha-faculdade/entrar'
];

function generateSitemapXML(routes: string[]): string {
  const urlEntries = routes.map(route => {
    const url = `${BASE_URL}${route}`;
    const lastmod = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Definir prioridade baseada na importância da página
    let priority = '0.5';
    let changefreq = 'weekly';
    
    if (route === '') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (route.includes('/dashboard') || route.includes('/estudos')) {
      priority = '0.9';
      changefreq = 'daily';
    } else if (route.includes('/banco-questoes') || route.includes('/simulados') || route.includes('/flashcards')) {
      priority = '0.8';
      changefreq = 'daily';
    } else if (route.includes('/auth/')) {
      priority = '0.6';
      changefreq = 'monthly';
    } else if (route.includes('/perfil/') || route.includes('/configuracoes')) {
      priority = '0.4';
      changefreq = 'monthly';
    }
    
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

export async function GET() {
  try {
    const sitemap = generateSitemapXML(staticRoutes);
    
    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache por 1 hora
      },
    });
  } catch (error) {
    console.error('Erro ao gerar sitemap:', error);
    return new NextResponse('Erro interno do servidor', { status: 500 });
  }
}