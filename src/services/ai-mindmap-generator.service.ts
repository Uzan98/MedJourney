import { getAccessToken } from '@/lib/auth-utils';
import { MindMapData, MindMapNode, MindMapConnection } from '@/components/mind-map/native-mind-map';

export interface AIMindMapGeneratorParams {
  topic: string;
  detailLevel?: 'basic' | 'intermediate' | 'detailed';
  maxLevels?: number;
  focusArea?: string;
  additionalContext?: string;
}

export interface AIGeneratedMindMap {
  mindMapData: MindMapData;
  metadata: {
    topic: string;
    nodesCount: number;
    levelsCount: number;
  };
}

interface AINodeStructure {
  id: string;
  text: string;
  level: number;
  parentId?: string;
  children: string[];
  suggestedColor?: string;
}

interface AIResponse {
  title: string;
  nodes: AINodeStructure[];
  description?: string;
}

export class AIMindMapGeneratorService {
  // Chama a rota interna protegida do Groq com retry automático
  private static async callGroqAPI(prompt: string, retryCount = 0): Promise<string> {
    const maxRetries = 2;
    
    try {
      // Obter token de acesso para autenticação
      const accessToken = await getAccessToken();
      
      if (!accessToken) {
        throw new Error('Você precisa estar logado para gerar mapas mentais com IA');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      };

      const response = await fetch('/api/groq/mindmap', {
        method: 'POST',
        headers,
        credentials: 'include', // Importante para enviar cookies de sessão
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        
        // Se for timeout (504) e ainda temos tentativas, retry automaticamente
        if (response.status === 504 && retryCount < maxRetries) {
          console.log(`Timeout na tentativa ${retryCount + 1}, tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1 segundo
          return this.callGroqAPI(prompt, retryCount + 1);
        }
        
        // Tratar erros específicos de permissão e limite
        if (response.status === 401) {
          throw new Error('Você precisa estar logado para gerar mapas mentais com IA.');
        }
        
        if (response.status === 403) {
          if (errorData.requiresUpgrade) {
            throw new Error('A geração de mapas mentais por IA é exclusiva para usuários Pro e Pro+. Faça upgrade do seu plano para acessar este recurso.');
          }
          throw new Error('Você não tem permissão para acessar este recurso.');
        }
        
        if (response.status === 429) {
          if (errorData.limitReached) {
            throw new Error('Você atingiu o limite diário de mapas mentais. Tente novamente amanhã ou faça upgrade para o plano Pro+ para mapas ilimitados.');
          }
          throw new Error('Muitas requisições. Tente novamente em alguns minutos.');
        }
        
        if (response.status === 504) {
          throw new Error('A requisição demorou demais para ser processada. Tente novamente.');
        }
        
        throw new Error(errorData.error || `Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return data.result;
    } catch (error: any) {
      // Se for erro de rede/timeout e ainda temos tentativas, retry automaticamente
      if ((error.name === 'TypeError' || error.message?.includes('fetch')) && retryCount < maxRetries) {
        console.log(`Erro de rede na tentativa ${retryCount + 1}, tentando novamente...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1 segundo
        return this.callGroqAPI(prompt, retryCount + 1);
      }
      
      console.error('Erro ao chamar a API Groq para mapa mental:', error);
      throw error;
    }
  }

  // Gera o prompt estruturado para a IA
  private static generatePrompt(params: AIMindMapGeneratorParams): string {
    const { topic, detailLevel = 'intermediate', maxLevels = 5, focusArea, additionalContext } = params;
    
    const detailInstructions = {
      basic: 'Crie um mapa mental educativo com subtópicos principais bem explicados para estudantes.',
      intermediate: 'Crie um mapa mental educativo detalhado com múltiplos níveis, explicações claras e exemplos práticos para facilitar o aprendizado.',
      detailed: 'Crie um mapa mental educativo muito detalhado com múltiplos níveis hierárquicos, explicações completas, exemplos, aplicações práticas e dicas de estudo.'
    };

    let prompt = `Você é um especialista em mapas mentais educativos para estudantes. Crie um mapa mental estruturado e muito educativo sobre o tópico: "${topic}".

INSTRUÇÕES OBRIGATÓRIAS PARA UM MAPA MENTAL EDUCATIVO:
- ${detailInstructions[detailLevel]}
- Máximo de ${maxLevels} níveis hierárquicos (use TODOS os níveis disponíveis)
- OBRIGATÓRIO: Crie EXATAMENTE entre 15-25 nós no total (incluindo o nó raiz)
- OBRIGATÓRIO: Crie pelo menos 5-7 ramos principais no nível 1
- OBRIGATÓRIO: Cada ramo principal deve ter pelo menos 2-4 subnós
- OBRIGATÓRIO: Use pelo menos 3 níveis de profundidade
- Organize as informações de forma lógica e pedagógica
- Use linguagem clara, educativa e adequada para estudantes
- Cada nó deve ser explicativo e informativo
- Inclua conceitos, definições, exemplos, aplicações práticas
- Distribua o conteúdo equilibradamente entre os ramos principais
- Use cores diferentes para facilitar a visualização e memorização`;

    if (focusArea) {
      prompt += `\n- Foque especialmente em: ${focusArea} (mas mantenha o mapa completo e educativo)`;
    }

    if (additionalContext) {
      prompt += `\n- Contexto educacional adicional: ${additionalContext}`;
    }

    prompt += `

FORMATO DE RESPOSTA (JSON) - ESTRUTURA HIERÁRQUICA OBRIGATÓRIA:
{
  "title": "Título principal do mapa mental educativo",
  "nodes": [
    {
      "id": "root",
      "text": "Tópico Principal",
      "level": 0,
      "children": ["node1", "node2", "node3", "node4", "node5"],
      "suggestedColor": "#3B82F6"
    },
    {
      "id": "node1",
      "text": "Conceito Fundamental A",
      "level": 1,
      "parentId": "root",
      "children": ["node1_1", "node1_2", "node1_3"],
      "suggestedColor": "#10B981"
    },
    {
      "id": "node1_1",
      "text": "Definição e Características",
      "level": 2,
      "parentId": "node1",
      "children": ["node1_1_1", "node1_1_2"],
      "suggestedColor": "#F59E0B"
    },
    {
      "id": "node1_1_1",
      "text": "Exemplo Prático 1",
      "level": 3,
      "parentId": "node1_1",
      "children": [],
      "suggestedColor": "#EF4444"
    },
    {
      "id": "node1_1_2",
      "text": "Exemplo Prático 2",
      "level": 3,
      "parentId": "node1_1",
      "children": [],
      "suggestedColor": "#EF4444"
    },
    {
      "id": "node1_2",
      "text": "Aplicações Práticas",
      "level": 2,
      "parentId": "node1",
      "children": ["node1_2_1"],
      "suggestedColor": "#F59E0B"
    },
    {
      "id": "node1_2_1",
      "text": "Caso de Uso Real",
      "level": 3,
      "parentId": "node1_2",
      "children": [],
      "suggestedColor": "#EF4444"
    },
    {
      "id": "node1_3",
      "text": "Vantagens e Desvantagens",
      "level": 2,
      "parentId": "node1",
      "children": [],
      "suggestedColor": "#F59E0B"
    },
    {
      "id": "node2",
      "text": "Conceito Fundamental B",
      "level": 1,
      "parentId": "root",
      "children": ["node2_1", "node2_2"],
      "suggestedColor": "#8B5CF6"
    },
    {
      "id": "node2_1",
      "text": "Teoria e Fundamentos",
      "level": 2,
      "parentId": "node2",
      "children": ["node2_1_1"],
      "suggestedColor": "#F59E0B"
    },
    {
      "id": "node2_1_1",
      "text": "Princípios Básicos",
      "level": 3,
      "parentId": "node2_1",
      "children": [],
      "suggestedColor": "#EF4444"
    },
    {
      "id": "node2_2",
      "text": "Implementação Prática",
      "level": 2,
      "parentId": "node2",
      "children": [],
      "suggestedColor": "#F59E0B"
    },
    {
      "id": "node3",
      "text": "Conceito Fundamental C",
      "level": 1,
      "parentId": "root",
      "children": ["node3_1"],
      "suggestedColor": "#8B5CF6"
    },
    {
      "id": "node3_1",
      "text": "Metodologia",
      "level": 2,
      "parentId": "node3",
      "children": [],
      "suggestedColor": "#F59E0B"
    }
  ]
}

REGRAS CRÍTICAS PARA HIERARQUIA:
1. SEMPRE defina "parentId" para todos os nós exceto o root
2. SEMPRE liste os IDs dos filhos no array "children" do nó pai
3. SEMPRE incremente o "level" conforme a profundidade (root=0, filhos=1, netos=2, etc.)
4. SEMPRE crie pelo menos 3 níveis de profundidade (0, 1, 2)
5. SEMPRE distribua os nós principais (level 1) equilibradamente
6. SEMPRE crie subnós (level 2 e 3) para cada nó principal

IMPORTANTE - VALIDAÇÃO OBRIGATÓRIA: 
- Crie um mapa mental COMPLETO e EDUCATIVO com EXATAMENTE entre 15-25 nós
- Use todos os níveis hierárquicos disponíveis (até nível ${maxLevels})
- Distribua equilibradamente entre lado esquerdo e direito
- Seja muito detalhado e explicativo
- Se você criar menos de 15 nós, sua resposta será rejeitada
- Retorne APENAS o JSON válido, sem texto adicional antes ou depois.`;

    return prompt;
  }

  // Converte a resposta da IA para o formato MindMapData
  private static convertToMindMapData(aiResponse: AIResponse): MindMapData {
    const nodes: MindMapNode[] = [];
    const connections: MindMapConnection[] = [];
    
    // Cores padrão por nível
    const defaultColors = [
      '#3B82F6', // Azul - Nível 0 (root)
      '#10B981', // Verde - Nível 1
      '#F59E0B', // Amarelo - Nível 2
      '#EF4444', // Vermelho - Nível 3
      '#8B5CF6', // Roxo - Nível 4
      '#F97316', // Laranja - Nível 5+
    ];

    // Função para calcular posição baseada no nível e índice (distribuição esquerda/direita)
    const calculatePosition = (level: number, index: number, totalAtLevel: number, parentId?: string) => {
      const centerX = 400; // Centro horizontal
      const centerY = 300; // Centro vertical
      const levelSpacing = 280; // Espaçamento horizontal entre níveis
      const nodeSpacing = 100; // Espaçamento vertical entre nós do mesmo nível
      
      if (level === 0) {
        return { x: centerX, y: centerY };
      }
      
      // Para nível 1, distribuir metade à esquerda e metade à direita
      if (level === 1) {
        const isLeftSide = index < Math.ceil(totalAtLevel / 2);
        const sideIndex = isLeftSide ? index : index - Math.ceil(totalAtLevel / 2);
        const sideTotal = isLeftSide ? Math.ceil(totalAtLevel / 2) : Math.floor(totalAtLevel / 2);
        
        const x = isLeftSide ? centerX - levelSpacing : centerX + levelSpacing;
        
        // Calcular posição Y para o lado
        const totalHeight = (sideTotal - 1) * nodeSpacing;
        const startYForSide = centerY - (totalHeight / 2);
        const y = startYForSide + (sideIndex * nodeSpacing);
        
        return { x, y };
      }
      
      // Para níveis superiores, seguir a direção do nó pai
      const parentNode = aiResponse.nodes.find(n => n.id === parentId);
      if (parentNode) {
        const parentPosition = nodePositions[parentNode.id];
        if (parentPosition) {
          const isLeftSide = parentPosition.x < centerX;
          const direction = isLeftSide ? -1 : 1;
          const x = centerX + (direction * level * levelSpacing);
          
          // Calcular posição Y
          const totalHeight = (totalAtLevel - 1) * nodeSpacing;
          const startYForLevel = centerY - (totalHeight / 2);
          const y = startYForLevel + (index * nodeSpacing);
          
          return { x, y };
        }
      }
      
      // Fallback: continuar à direita
      const x = centerX + (level * levelSpacing);
      const totalHeight = (totalAtLevel - 1) * nodeSpacing;
      const startYForLevel = centerY - (totalHeight / 2);
      const y = startYForLevel + (index * nodeSpacing);
      
      return { x, y };
    };

    // Agrupar nós por nível para calcular posições
    const nodesByLevel: { [level: number]: AINodeStructure[] } = {};
    aiResponse.nodes.forEach(node => {
      if (!nodesByLevel[node.level]) {
        nodesByLevel[node.level] = [];
      }
      nodesByLevel[node.level].push(node);
    });

    // Mapeamento de posições dos nós para referência
    const nodePositions: { [nodeId: string]: { x: number; y: number } } = {};

    // Converter nós (processar por nível para garantir que os pais sejam processados primeiro)
    const sortedLevels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b);
    
    sortedLevels.forEach(level => {
      const nodesAtLevel = nodesByLevel[level];
      
      nodesAtLevel.forEach((aiNode, index) => {
        const indexAtLevel = index;
        const position = calculatePosition(aiNode.level, indexAtLevel, nodesAtLevel.length, aiNode.parentId);
        
        // Armazenar posição para referência
        nodePositions[aiNode.id] = position;
        
        const node: MindMapNode = {
          id: aiNode.id,
          text: aiNode.text,
          x: position.x,
          y: position.y,
          width: Math.max(120, aiNode.text.length * 8 + 40), // Largura baseada no texto
          height: 60,
          color: aiNode.suggestedColor || defaultColors[aiNode.level] || defaultColors[defaultColors.length - 1],
          level: aiNode.level,
          parentId: aiNode.parentId,
          isExpanded: true,
          children: aiNode.children
        };
        
        nodes.push(node);

        // Criar conexões com o nó pai
        if (aiNode.parentId) {
          const connection: MindMapConnection = {
            id: `${aiNode.parentId}-${aiNode.id}`,
            fromNodeId: aiNode.parentId,
            toNodeId: aiNode.id,
            color: '#6B7280',
            width: 2
          };
          connections.push(connection);
        }
      });
    });

    // Encontrar o nó root
    const rootNode = nodes.find(node => node.level === 0);
    if (!rootNode) {
      throw new Error('Nó raiz não encontrado na resposta da IA');
    }

    return {
      nodes,
      connections,
      rootNodeId: rootNode.id
    };
  }

  // Método principal para gerar mapa mental
  public static async generateMindMap(params: AIMindMapGeneratorParams): Promise<AIGeneratedMindMap> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Gerar prompt
        const prompt = this.generatePrompt(params);
        
        // Chamar API Groq
        const aiResponseText = await this.callGroqAPI(prompt);
        
        // Parse da resposta JSON
        let aiResponse: AIResponse;
        try {
          // Limpar possível texto extra antes/depois do JSON
          const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
          const jsonText = jsonMatch ? jsonMatch[0] : aiResponseText;
          aiResponse = JSON.parse(jsonText);
        } catch (parseError) {
          console.error('Erro ao fazer parse da resposta da IA:', parseError);
          console.error('Resposta recebida:', aiResponseText);
          throw new Error('Resposta da IA não está em formato JSON válido');
        }

        // Validar estrutura da resposta
        if (!aiResponse.nodes || !Array.isArray(aiResponse.nodes) || aiResponse.nodes.length === 0) {
          throw new Error('Resposta da IA não contém nós válidos');
        }

        // VALIDAÇÃO CRÍTICA: Verificar se há nós suficientes
        const nodeCount = aiResponse.nodes.length;
        if (nodeCount < 15) {
          const errorMsg = `IA gerou apenas ${nodeCount} nós (mínimo: 15). Tentativa ${attempt}/${maxRetries}`;
          console.warn(errorMsg);
          
          if (attempt < maxRetries) {
            lastError = new Error(errorMsg);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Aguarda 1 segundo antes de tentar novamente
            continue; // Tenta novamente
          } else {
            throw new Error(`Após ${maxRetries} tentativas, a IA não conseguiu gerar um mapa mental com pelo menos 15 nós. Última tentativa gerou ${nodeCount} nós.`);
          }
        }

        // Converter para formato MindMapData
        const mindMapData = this.convertToMindMapData(aiResponse);
        
        console.log(`✅ Mapa mental gerado com sucesso na tentativa ${attempt}: ${nodeCount} nós`);
        
        return {
          mindMapData,
          metadata: {
            topic: params.topic,
            nodesCount: mindMapData.nodes.length,
            levelsCount: Math.max(...mindMapData.nodes.map(n => n.level)) + 1
          }
        };
      } catch (error: any) {
        lastError = error;
        
        // Se não é erro de poucos nós, não tenta novamente
        if (!error.message?.includes('nós')) {
          console.error('Erro ao gerar mapa mental com IA:', error);
          throw error;
        }
        
        // Se é a última tentativa, lança o erro
        if (attempt === maxRetries) {
          console.error('Erro ao gerar mapa mental com IA após todas as tentativas:', error);
          throw error;
        }
      }
    }

    // Fallback (não deveria chegar aqui)
    throw lastError || new Error('Erro desconhecido na geração do mapa mental');
  }
}