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
    const { topic, detailLevel = 'intermediate', maxLevels = 4, focusArea, additionalContext } = params;
    
    const detailInstructions = {
      basic: 'Crie um mapa mental básico com poucos subtópicos principais.',
      intermediate: 'Crie um mapa mental com nível intermediário de detalhamento, incluindo subtópicos e alguns detalhes importantes.',
      detailed: 'Crie um mapa mental detalhado com múltiplos níveis de subtópicos e informações específicas.'
    };

    let prompt = `Crie um mapa mental estruturado sobre o tópico: "${topic}".

INSTRUÇÕES IMPORTANTES:
- ${detailInstructions[detailLevel]}
- Máximo de ${maxLevels} níveis hierárquicos
- Organize as informações de forma lógica e hierárquica
- Use linguagem clara e concisa
- Cada nó deve ter no máximo 3-4 palavras`;

    if (focusArea) {
      prompt += `\n- Foque especialmente em: ${focusArea}`;
    }

    if (additionalContext) {
      prompt += `\n- Contexto adicional: ${additionalContext}`;
    }

    prompt += `

FORMATO DE RESPOSTA (JSON):
{
  "title": "Título principal do mapa mental",
  "nodes": [
    {
      "id": "root",
      "text": "Tópico Principal",
      "level": 0,
      "children": ["node1", "node2", "node3"],
      "suggestedColor": "#3B82F6"
    },
    {
      "id": "node1",
      "text": "Subtópico 1",
      "level": 1,
      "parentId": "root",
      "children": ["node1_1", "node1_2"],
      "suggestedColor": "#10B981"
    },
    {
      "id": "node1_1",
      "text": "Detalhe 1.1",
      "level": 2,
      "parentId": "node1",
      "children": [],
      "suggestedColor": "#F59E0B"
    }
  ]
}

IMPORTANTE: Retorne APENAS o JSON válido, sem texto adicional antes ou depois.`;

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

    // Função para calcular posição baseada no nível e índice
    const calculatePosition = (level: number, index: number, totalAtLevel: number) => {
      const centerX = 400; // Centro horizontal
      const centerY = 300; // Centro vertical
      const levelRadius = 150 + (level * 120); // Raio aumenta com o nível
      
      if (level === 0) {
        return { x: centerX, y: centerY };
      }
      
      // Distribuir nós em círculo ao redor do centro
      const angle = (2 * Math.PI * index) / totalAtLevel;
      const x = centerX + levelRadius * Math.cos(angle);
      const y = centerY + levelRadius * Math.sin(angle);
      
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

    // Converter nós
    aiResponse.nodes.forEach((aiNode, index) => {
      const nodesAtLevel = nodesByLevel[aiNode.level];
      const indexAtLevel = nodesAtLevel.findIndex(n => n.id === aiNode.id);
      const position = calculatePosition(aiNode.level, indexAtLevel, nodesAtLevel.length);
      
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

      // Converter para formato MindMapData
      const mindMapData = this.convertToMindMapData(aiResponse);
      
      return {
        mindMapData,
        metadata: {
          topic: params.topic,
          nodesCount: mindMapData.nodes.length,
          levelsCount: Math.max(...mindMapData.nodes.map(n => n.level)) + 1
        }
      };
    } catch (error: any) {
      console.error('Erro ao gerar mapa mental com IA:', error);
      throw error;
    }
  }
}