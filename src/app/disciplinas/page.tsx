"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Link from 'next/link';
import { 
  BookOpen, 
  PlusCircle, 
  Trash2, 
  Save,
  Search,
  Filter,
  Calendar,
  X,
  Star,
  AlertCircle,
  FileText,
  ChevronDown,
  Edit,
  Plus,
  Clock,
  RefreshCcw,
  BookCheck,
  Palette
} from 'lucide-react';

// Adicionar importação da API
import { getDisciplines, getDisciplineSubjects, createDiscipline, createSubject } from '../../lib/api';
import { toast } from '../../components/ui/Toast';
// Importar definições de tema
import { DISCIPLINE_THEMES, getThemesMap, getThemeById } from '../../constants/themes';
import { ThemePicker, ThemeBadge, ThemedCard, ThemeCircle } from '../../components/ui/ThemeComponents';
import SubjectCard from '../../components/ui/SubjectCard';

// Interfaces para tipos de dados
interface Assunto {
  id: number;
  nome: string;
  dificuldade: 'baixa' | 'média' | 'alta';
  importancia: 'baixa' | 'média' | 'alta';
  horasEstimadas: number;
}

interface Disciplina {
  id: number;
  nome: string;
  corTema?: string; // Esquema de cores da disciplina (renomeado de 'tema' para 'corTema' para clareza)
  assuntos: Assunto[];
}

// Adicionar interface para disciplina da API
interface ApiDisciplina {
  Id: string;
  Name: string;
  Description?: string;
  Theme?: string; // Cor tema na API
}

// CORES_DISCIPLINA é um mapeamento dos IDs de cores de tema para estilos CSS
// Agora usando a função auxiliar da constante de temas
const CORES_DISCIPLINA = getThemesMap();

// Componente para visualizar estrelas de dificuldade/importância
const DifficultyStars = ({ value, onChange, label, type }: { 
  value: 'baixa' | 'média' | 'alta', 
  onChange?: (val: 'baixa' | 'média' | 'alta') => void,
  label: string,
  type: 'dificuldade' | 'importancia'
}) => {
  // Mapeamento de valores para números
  const valueMap = {
    'baixa': 1,
    'média': 2,
    'alta': 3
  };
  
  // Cores baseadas no tipo (dificuldade ou importância)
  const colors = type === 'dificuldade' 
    ? {
        active: 'text-orange-500',
        hover: 'hover:text-orange-400',
        empty: 'text-gray-300',
        bg: 'bg-orange-50',
        border: 'border-orange-100'
      }
    : {
        active: 'text-blue-500',
        hover: 'hover:text-blue-400',
        empty: 'text-gray-300',
        bg: 'bg-blue-50',
        border: 'border-blue-100'
      };
  
  // Ícone baseado no tipo
  const Icon = type === 'dificuldade' ? AlertCircle : Star;
  
  // Rótulos para cada nível
  const labels = {
    'baixa': type === 'dificuldade' ? 'Fácil' : 'Baixa',
    'média': 'Média',
    'alta': type === 'dificuldade' ? 'Difícil' : 'Alta'
  };
  
  return (
    <div className={`rounded-lg ${colors.bg} ${colors.border} border p-3 w-full h-full flex flex-col`}>
      <label className="block text-xs text-gray-500 font-medium mb-2">{label}</label>
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-center flex-wrap">
          <div className="flex space-x-1 mr-2">
            {[1, 2, 3].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange && onChange(Object.keys(valueMap).find(
                  key => valueMap[key as keyof typeof valueMap] === star
                ) as 'baixa' | 'média' | 'alta')}
                className={`${star <= valueMap[value] ? colors.active : colors.empty} 
                  ${onChange ? colors.hover : ''} transition-colors p-1.5 rounded-full ${star <= valueMap[value] ? (type === 'dificuldade' ? 'bg-orange-100' : 'bg-blue-100') : ''}`}
                title={Object.keys(valueMap).find(
                  key => valueMap[key as keyof typeof valueMap] === star
                ) as string}
              >
                <Icon className="h-5 w-5 md:h-4 md:w-4" fill={star <= valueMap[value] ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <span className="text-sm md:text-xs font-medium" style={{color: type === 'dificuldade' ? '#f97316' : '#3b82f6'}}>
            {labels[value]}
          </span>
        </div>
        
        {onChange && (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value as 'baixa' | 'média' | 'alta')}
            className="mt-2 text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full"
            aria-label={`Selecionar ${type}`}
          >
            <option value="baixa">{labels['baixa']}</option>
            <option value="média">{labels['média']}</option>
            <option value="alta">{labels['alta']}</option>
          </select>
        )}
      </div>
    </div>
  );
};

// Componente para determinar a cor de fundo do card baseada na dificuldade e importância
const getBgGradient = (dificuldade: 'baixa' | 'média' | 'alta', importancia: 'baixa' | 'média' | 'alta') => {
  // Calcula o nível de prioridade (1-9) baseado na combinação de dificuldade e importância
  const nivelDificuldade = dificuldade === 'baixa' ? 1 : dificuldade === 'média' ? 2 : 3;
  const nivelImportancia = importancia === 'baixa' ? 1 : importancia === 'média' ? 2 : 3;
  
  // Combina os níveis para determinar a intensidade da cor
  const prioridade = nivelDificuldade + nivelImportancia;
  
  // Retorna um gradiente com uma única cor quente, mais escura à esquerda e mais suave à direita
  switch (prioridade) {
    case 2: // baixa + baixa
      return 'bg-gradient-to-r from-orange-100 to-white';
    case 3: // baixa + média ou média + baixa
      return 'bg-gradient-to-r from-orange-200 to-white';
    case 4: // média + média ou baixa + alta ou alta + baixa
      return 'bg-gradient-to-r from-orange-300 to-white';
    case 5: // média + alta ou alta + média
      return 'bg-gradient-to-r from-red-300 to-white';
    case 6: // alta + alta
      return 'bg-gradient-to-r from-red-400 to-white';
    default:
      return 'bg-white';
  }
};

// Componente para determinar a cor da borda lateral do card
const getBorderColor = (dificuldade: 'baixa' | 'média' | 'alta', importancia: 'baixa' | 'média' | 'alta') => {
  // Calcula o nível de prioridade (1-9) baseado na combinação de dificuldade e importância
  const nivelDificuldade = dificuldade === 'baixa' ? 1 : dificuldade === 'média' ? 2 : 3;
  const nivelImportancia = importancia === 'baixa' ? 1 : importancia === 'média' ? 2 : 3;
  
  // Combina os níveis para determinar a intensidade da cor
  const prioridade = nivelDificuldade + nivelImportancia;
  
  // Retorna uma classe de borda baseada na prioridade combinada
  switch (prioridade) {
    case 2: // baixa + baixa
      return 'border-l-4 border-l-orange-300';
    case 3: // baixa + média ou média + baixa
      return 'border-l-4 border-l-orange-400';
    case 4: // média + média ou baixa + alta ou alta + baixa
      return 'border-l-4 border-l-orange-500';
    case 5: // média + alta ou alta + média
      return 'border-l-4 border-l-red-400';
    case 6: // alta + alta
      return 'border-l-4 border-l-red-500';
    default:
      return 'border-l-4 border-l-gray-300';
  }
};

export default function DisciplinasPage() {
  // Estado para disciplinas
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroImportancia, setFiltroImportancia] = useState<string>('todas');
  const [filtroDificuldade, setFiltroDificuldade] = useState<string>('todas');
  const [disciplinaEmEdicao, setDisciplinaEmEdicao] = useState<number | null>(null);
  
  // Estado para o formulário de disciplina
  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [descricaoDisciplina, setDescricaoDisciplina] = useState('');
  
  // Estado para controle de UI
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estados para o modal de assuntos (anteriormente chamado de "temas")
  const [showAssuntoModal, setShowAssuntoModal] = useState(false);
  const [assuntoAtual, setAssuntoAtual] = useState<string>('');
  const [dificuldadeAtual, setDificuldadeAtual] = useState<'baixa' | 'média' | 'alta'>('média');
  const [importanciaAtual, setImportanciaAtual] = useState<'baixa' | 'média' | 'alta'>('média');
  const [corTemaAtual, setCorTemaAtual] = useState<string>('azul');
  const [horasEstimadas, setHorasEstimadas] = useState<number>(1);
  const [disciplinaAtualId, setDisciplinaAtualId] = useState<number | null>(null);
  
  // Carregar disciplinas do localStorage ao iniciar
  useEffect(() => {
    carregarDisciplinas();
  }, []);

  // Função para carregar disciplinas do localStorage e da API
  const carregarDisciplinas = async () => {
    setIsLoading(true);
    try {
      // Carregar disciplinas do localStorage para persistência offline
      const storedDisciplinas = localStorage.getItem('disciplinas');
      
      if (storedDisciplinas) {
        setDisciplinas(JSON.parse(storedDisciplinas));
      }
      
      // Tentar buscar disciplinas atualizadas da API
      const response = await getDisciplines(true);
      
      if (response.success && response.disciplines) {
        // Mapear os dados da API para o formato do cliente
        const disciplinasApi: Disciplina[] = response.disciplines
          .filter((d: ApiDisciplina) => d.Name.startsWith('User:'))
          .map((d: ApiDisciplina) => ({
            id: parseInt(d.Id),
            nome: d.Name.substring(5), // Remove o prefixo "User:"
            corTema: d.Theme || 'azul', // Use o tema da API ou o padrão 'azul'
            assuntos: [] // Serão carregados depois
          }));
        
        // Se tivermos disciplinas cadastradas, carregar assuntos para cada uma
        if (disciplinasApi.length > 0) {
          const disciplinasComAssuntos = await Promise.all(
            disciplinasApi.map(async (disciplina) => {
              try {
                const assuntosResponse = await getDisciplineSubjects(disciplina.id);
                
                if (assuntosResponse.success && assuntosResponse.subjects) {
                  // Mapear os assuntos
                  const assuntos: Assunto[] = assuntosResponse.subjects.map((s: any) => ({
                    id: s.Id,
                    nome: s.Name,
                    dificuldade: s.Difficulty as 'baixa' | 'média' | 'alta',
                    importancia: s.Importance as 'baixa' | 'média' | 'alta',
                    horasEstimadas: s.EstimatedHours || 0
                  }));
                  
                  return { ...disciplina, assuntos };
                }
                
                return disciplina;
              } catch (error) {
                console.error(`Erro ao carregar assuntos para a disciplina ${disciplina.id}:`, error);
                return disciplina;
              }
            })
          );
          
          setDisciplinas(disciplinasComAssuntos);
          
          // Atualizar localStorage com dados completos
          localStorage.setItem('disciplinas', JSON.stringify(disciplinasComAssuntos));
      } else {
          setDisciplinas([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Erro ao carregar disciplinas. Usando dados locais.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para adicionar disciplina com o modal
  const abrirModalNovaDisciplina = () => {
    setNovaDisciplina('');
    setDescricaoDisciplina('');
    setErrorMsg('');
    setShowModal(true);
  };
  
  // Função para salvar nova disciplina
  const salvarNovaDisciplina = async () => {
    if (!novaDisciplina.trim()) {
      setErrorMsg('O nome da disciplina é obrigatório');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      // Criar disciplina na API
      const response = await createDiscipline({
        name: novaDisciplina,
        description: descricaoDisciplina || undefined,
        theme: corTemaAtual // Enviar a cor do tema para a API
      });
      
      if (response.success) {
        // Gerar ID local
        const novaId = disciplinas.length > 0 
      ? Math.max(...disciplinas.map(d => d.id)) + 1 
      : 1;
      
        // Criar nova disciplina local
        const novaDisciplinaObj: Disciplina = {
          id: novaId,
          nome: novaDisciplina,
          corTema: corTemaAtual, // Salvar a cor escolhida
          assuntos: []
        };
        
        // Atualizar estado
        const novasDisciplinas = [...disciplinas, novaDisciplinaObj];
        setDisciplinas(novasDisciplinas);
        
        // Salvar no localStorage para persistência
        localStorage.setItem('disciplinas', JSON.stringify(novasDisciplinas));
        
        // Fechar modal e mostrar mensagem de sucesso
        setShowModal(false);
        toast.success(`Disciplina "${novaDisciplina}" adicionada com sucesso!`);
    
    // Colocar em modo de edição
    setDisciplinaEmEdicao(novaId);
      } else {
        throw new Error(response.error || 'Erro ao criar disciplina');
      }
    } catch (error) {
      console.error('Erro ao criar disciplina:', error);
      const mensagem = error instanceof Error ? error.message : 'Ocorreu um erro inesperado';
      setErrorMsg(mensagem);
      toast.error(mensagem);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Atualizar a função adicionarDisciplina para abrir o modal
  const adicionarDisciplina = () => {
    abrirModalNovaDisciplina();
  };
  
  // Função para abrir o modal de adicionar assunto
  const abrirModalNovoAssunto = (disciplinaId: number) => {
    setDisciplinaAtualId(disciplinaId);
    setAssuntoAtual('');
    setDificuldadeAtual('média');
    setImportanciaAtual('média');
    setHorasEstimadas(1);
    setShowAssuntoModal(true);
  };

  // Função para abrir o modal de editar assunto
  const abrirModalEditarAssunto = (disciplinaId: number, assunto: Assunto) => {
    setDisciplinaAtualId(disciplinaId);
    setAssuntoAtual(assunto.nome || '');
    setDificuldadeAtual(assunto.dificuldade);
    setImportanciaAtual(assunto.importancia);
    setHorasEstimadas(assunto.horasEstimadas);
    setShowAssuntoModal(true);
  };

  // Função para salvar assunto (novo ou editado)
  const salvarAssunto = async () => {
    if (!assuntoAtual.trim() || disciplinaAtualId === null) return;

    try {
      setIsLoading(true);
    
    // Verificar se é uma edição ou adição
      const isEdicao = disciplinas.some(d => 
        d.id === disciplinaAtualId && 
        d.assuntos.some(a => a.nome === assuntoAtual)
      );
    
      // Atualizar estado local primeiro para UI responsiva
    const novasDisciplinas = disciplinas.map(disciplina => {
      if (disciplina.id === disciplinaAtualId) {
        if (isEdicao) {
            // Editar assunto existente
        return {
          ...disciplina,
            assuntos: disciplina.assuntos.map(assunto => 
                assunto.nome === assuntoAtual ? { 
                  ...assunto, 
                  horasEstimadas,
                  dificuldade: dificuldadeAtual,
                  importancia: importanciaAtual 
                } : assunto
            )
          };
        } else {
            // Adicionar novo assunto
          const novaId = disciplina.assuntos.length > 0 
            ? Math.max(...disciplina.assuntos.map(a => a.id)) + 1 
            : 1;
          
            // Criar um novo objeto assunto com as propriedades necessárias
            const novoAssunto: Assunto = {
              id: novaId,
              nome: assuntoAtual,
              dificuldade: dificuldadeAtual,
              importancia: importanciaAtual,
              horasEstimadas: horasEstimadas
            };
          
          return {
            ...disciplina,
              assuntos: [...disciplina.assuntos, novoAssunto]
          };
        }
      }
      return disciplina;
    });
    
    // Atualizar estado
    setDisciplinas(novasDisciplinas);
    
    // Salvar no localStorage
    localStorage.setItem('disciplinas', JSON.stringify(novasDisciplinas));
      
      // Tentar salvar na API (se for um novo assunto)
      if (!isEdicao) {
        try {
          const response = await createSubject(disciplinaAtualId, {
            name: assuntoAtual,
            difficulty: dificuldadeAtual,
            importance: importanciaAtual,
            estimatedHours: horasEstimadas
          });
          
          if (!response.success) {
            console.error('Erro ao salvar assunto na API:', response.error);
            // Mesmo com erro na API, mantemos os dados locais
          }
        } catch (err) {
          console.error('Erro ao salvar assunto na API:', err);
          // Mesmo com erro na API, mantemos os dados locais
        }
      }
    
    // Fechar modal e mostrar mensagem de sucesso
      setShowAssuntoModal(false);
      toast.success(isEdicao ? 'Assunto atualizado com sucesso!' : 'Assunto adicionado com sucesso!', 1500);
    } catch (err) {
      console.error('Erro ao salvar assunto:', err);
      toast.error('Erro ao salvar assunto. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar a função adicionarAssunto para usar o modal
  const adicionarAssunto = (disciplinaId: number) => {
    abrirModalNovoAssunto(disciplinaId);
  };
  
  // Função para remover uma disciplina
  const removerDisciplina = (disciplinaId: number) => {
    if (confirm('Tem certeza que deseja remover esta disciplina?')) {
      // Criar novo estado com a disciplina removida
      const novasDisciplinas = disciplinas.filter(d => d.id !== disciplinaId);
      
      // Atualizar estado
      setDisciplinas(novasDisciplinas);
      
      // Salvar no localStorage para persistência imediata
      localStorage.setItem('disciplinas', JSON.stringify(novasDisciplinas));
      
      // Mostrar mensagem de confirmação
      toast.success('Disciplina removida com sucesso!', 1500);
    }
  };
  
  // Função para remover um assunto
  const removerAssunto = (disciplinaId: number, assuntoId: number) => {
    // Criar novo estado com o assunto removido
    const novasDisciplinas: Disciplina[] = disciplinas.map(disciplina => {
      if (disciplina.id === disciplinaId) {
        return {
          ...disciplina,
          assuntos: disciplina.assuntos.filter(a => a.id !== assuntoId)
        };
      }
      return disciplina;
    });
    
    // Atualizar estado
    setDisciplinas(novasDisciplinas);
    
    // Salvar no localStorage para persistência imediata
    localStorage.setItem('disciplinas', JSON.stringify(novasDisciplinas));
  };
  
  // Função para atualizar o nome de uma disciplina
  const atualizarDisciplina = (disciplinaId: number, novoNome: string) => {
    // Criar novo estado com a disciplina atualizada
    const novasDisciplinas = disciplinas.map(disciplina => {
      if (disciplina.id === disciplinaId) {
        return { ...disciplina, nome: novoNome };
      }
      return disciplina;
    });
    
    // Atualizar estado
    setDisciplinas(novasDisciplinas);
    
    // Salvar no localStorage para persistência imediata
    localStorage.setItem('disciplinas', JSON.stringify(novasDisciplinas));
  };

  // Função para atualizar um assunto
  const atualizarAssunto = (
    disciplinaId: number, 
    assuntoId: number, 
    campo: keyof Assunto, 
    valor: Assunto[keyof Assunto]
  ) => {
    // Criar novo estado com o assunto atualizado
    const novasDisciplinas: Disciplina[] = disciplinas.map(disciplina => {
      if (disciplina.id === disciplinaId) {
        return {
          ...disciplina,
          assuntos: disciplina.assuntos.map(assunto => {
            if (assunto.id === assuntoId) {
              return { ...assunto, [campo]: valor };
            }
            return assunto;
          })
        };
      }
      return disciplina;
    });
    
    // Atualizar estado
    setDisciplinas(novasDisciplinas);
    
    // Salvar no localStorage para persistência imediata
    localStorage.setItem('disciplinas', JSON.stringify(novasDisciplinas));
  };

  // Filtrar disciplinas baseado na busca
  const disciplinasFiltradas = disciplinas.filter(disciplina => {
    // Filtro por nome da disciplina
    const matchNome = disciplina.nome.toLowerCase().includes(busca.toLowerCase());
    
    // Filtro para assuntos
    const temAssuntosFiltrados = disciplina.assuntos.some(assunto => {
      const matchAssuntoNome = assunto.nome.toLowerCase().includes(busca.toLowerCase());
      const matchImportancia = filtroImportancia === 'todas' || assunto.importancia === filtroImportancia;
      const matchDificuldade = filtroDificuldade === 'todas' || assunto.dificuldade === filtroDificuldade;
      
      return matchAssuntoNome && matchImportancia && matchDificuldade;
    });
    
    return matchNome || temAssuntosFiltrados;
  });

  // Função para salvar todas as alterações (disciplinas e temas)
  const salvarAlteracoes = async () => {
    setIsLoading(true);
    try {
      // Salvar no localStorage
      localStorage.setItem('disciplinas', JSON.stringify(disciplinas));
      
      // Aqui começaria a sincronização com a API
      // Por enquanto, vamos apenas verificar se todas as disciplinas existem na API
      // e criar as que não existem
      
      for (const disciplina of disciplinas) {
        try {
          // Verificar se a disciplina já existe na API pelo nome
          const response = await getDisciplines(true);
          
          if (response.success && response.disciplines) {
            // Verificar se a disciplina já existe na API
            const disciplinaExistente = response.disciplines.find(
              (d: ApiDisciplina) => {
                const nomeApi = d.Name.startsWith('User:') ? d.Name.substring(5) : d.Name;
                return nomeApi.toLowerCase() === disciplina.nome.toLowerCase();
              }
            );
            
            // Se não existir, criar na API
            if (!disciplinaExistente) {
              await createDiscipline({
                name: disciplina.nome,
                description: `Disciplina com ${disciplina.assuntos.length} temas.`
              });
            }
            
            // Nota: A API atual não suporta salvar os temas diretamente,
            // então vamos garantir que pelo menos as disciplinas existam
          }
        } catch (err) {
          console.error(`Erro ao verificar/criar disciplina "${disciplina.nome}":`, err);
          // Continue mesmo com erro para tentar salvar as outras disciplinas
        }
      }
      
      toast.success('Disciplinas e temas salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar disciplinas:', error);
      toast.error('Erro ao salvar disciplinas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Componente do Modal
  const DisciplinaModal = () => {
    // Estado para seleção de cor do tema
    const [corSelecionada, setCorSelecionada] = useState('azul');

    // Resetar cor ao abrir modal
    useEffect(() => {
      if (showModal) {
        setCorSelecionada('azul');
      }
    }, [showModal]);

    // Atualizar o estado global quando o modal confirmar
    const confirmarNovaDisciplina = () => {
      setCorTemaAtual(corSelecionada);
      salvarNovaDisciplina();
    };

    // Não renderizar nada se o modal não estiver visível
    if (!showModal) return null;
    
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30"
      >
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                Nova Disciplina
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 p-2 rounded-full"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-red-700">{errorMsg}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Nome da Disciplina */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Disciplina *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="nome"
                    value={novaDisciplina}
                    onChange={(e) => {
                      e.preventDefault();
                      setNovaDisciplina(e.target.value);
                    }}
                    onBlur={(e) => e.preventDefault()}
                    className="w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    placeholder="Ex: Anatomia"
                    required
                    autoFocus
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Cor da Disciplina - Usando o componente ThemePicker */}
              <ThemePicker 
                value={corSelecionada} 
                onChange={setCorSelecionada}
                label="Cor da Disciplina"
              />

              {/* Descrição */}
              <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  <textarea
                    id="descricao"
                    value={descricaoDisciplina}
                    onChange={(e) => {
                      e.preventDefault();
                      setDescricaoDisciplina(e.target.value);
                    }}
                    onBlur={(e) => e.preventDefault()}
                    className="w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    rows={3}
                    placeholder="Descreva a disciplina e seus tópicos principais"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarNovaDisciplina}
                  disabled={isLoading || !novaDisciplina.trim()}
                  className="w-1/2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      <span>Salvando...</span>
                    </div>
                  ) : 'Adicionar Disciplina'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente do Modal de Assunto
  const AssuntoModal = () => {
    if (!showAssuntoModal) return null;
    
    const isEdicao = assuntoAtual.trim() !== '';
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                {isEdicao ? 'Editar Assunto' : 'Adicionar Novo Assunto'}
              </h2>
              <button 
                onClick={() => setShowAssuntoModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 p-2 rounded-full"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Nome do Assunto */}
              <div>
                <label htmlFor="nome-assunto" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Assunto *
                </label>
                <input
                  type="text"
                  id="nome-assunto"
                  value={assuntoAtual}
                  onChange={(e) => setAssuntoAtual(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  placeholder="Ex: Sistema Circulatório"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Dificuldade */}
                <div>
                  <DifficultyStars 
                    value={dificuldadeAtual} 
                    onChange={(val) => setDificuldadeAtual(val as 'baixa' | 'média' | 'alta')} 
                    label="Dificuldade"
                    type="dificuldade"
                  />
                </div>

                {/* Importância */}
                <div>
                  <DifficultyStars 
                    value={importanciaAtual} 
                    onChange={(val) => setImportanciaAtual(val as 'baixa' | 'média' | 'alta')} 
                    label="Importância"
                    type="importancia"
                  />
                </div>
              </div>

              {/* Horas Estimadas */}
              <div>
                <label htmlFor="horas-estimadas" className="block text-sm font-medium text-gray-700 mb-1">
                  Horas de Estudo Estimadas *
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    id="horas-estimadas"
                    value={horasEstimadas}
                    onChange={(e) => setHorasEstimadas(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                  />
                  <span className="ml-2 text-gray-500">horas</span>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssuntoModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarAssunto}
                  disabled={!assuntoAtual.trim() || isLoading}
                  className="flex-1 py-2.5 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    isEdicao ? 'Atualizar Assunto' : 'Adicionar Assunto'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente para estado de carregamento
  if (isLoading && disciplinas.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando disciplinas...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Disciplinas</h1>
              <p className="text-gray-600">
                Gerencie suas disciplinas e temas de estudo
              </p>
            </div>

            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link 
                href="/plano/configurar" 
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Criar Plano de Estudos
              </Link>
            </div>
          </div>
          
          {/* Barra de busca e filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar disciplinas ou assuntos..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex gap-3">
                <div className="relative">
                  <label className="block text-xs text-gray-500 mb-1">Importância</label>
                  <div className="flex items-center">
                  <select
                    value={filtroImportancia}
                    onChange={(e) => setFiltroImportancia(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todas">Todas</option>
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                    {filtroImportancia !== 'todas' && (
                      <DifficultyStars 
                        value={filtroImportancia as 'baixa' | 'média' | 'alta'} 
                        label=""
                        type="importancia"
                      />
                    )}
                  </div>
                </div>
                
                <div className="relative">
                  <label className="block text-xs text-gray-500 mb-1">Dificuldade</label>
                  <div className="flex items-center">
                  <select
                    value={filtroDificuldade}
                    onChange={(e) => setFiltroDificuldade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todas">Todas</option>
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                    {filtroDificuldade !== 'todas' && (
                      <DifficultyStars 
                        value={filtroDificuldade as 'baixa' | 'média' | 'alta'} 
                        label=""
                        type="dificuldade"
                      />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="self-end">
                <button 
                  onClick={adicionarDisciplina}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm flex items-center"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Nova Disciplina
                </button>
              </div>
            </div>
          </div>
          
          {/* Lista de disciplinas */}
          <div className="space-y-6">
            {disciplinasFiltradas.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <div className="bg-gray-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-gray-800 font-medium mb-2">Nenhuma disciplina encontrada</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
                  {disciplinas.length === 0 
                    ? "Adicione disciplinas para organizar seus estudos." 
                    : "Nenhuma disciplina corresponde aos critérios de busca."}
                </p>
                <button 
                  onClick={adicionarDisciplina}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm inline-flex items-center"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Adicionar Disciplina
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {disciplinasFiltradas.map(disciplina => (
                  <div 
                    key={disciplina.id} 
                    className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className={`px-5 py-4 flex justify-between items-center bg-gradient-to-r ${getThemeById(disciplina.corTema || 'azul').gradient} ${getThemeById(disciplina.corTema || 'azul').textColor}`}>
                      <input
                        type="text"
                        value={disciplina.nome}
                        onChange={(e) => atualizarDisciplina(disciplina.id, e.target.value)}
                        className={`text-lg font-medium bg-transparent border-b border-opacity-40 focus:border-opacity-100 focus:outline-none w-64 placeholder-white placeholder-opacity-75`}
                        placeholder="Nome da disciplina"
                      />
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => adicionarAssunto(disciplina.id)}
                          className={`text-sm bg-black bg-opacity-20 hover:bg-opacity-30 px-3 py-1.5 rounded-lg flex items-center shadow-sm`}
                        >
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Assunto
                        </button>
                        <button 
                          onClick={() => removerDisciplina(disciplina.id)}
                          className="text-sm bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-lg flex items-center shadow-sm"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-5">
                      {disciplina.assuntos.length === 0 ? (
                        <div className="text-center py-8 bg-gradient-to-b from-gray-50 to-white rounded-xl border border-dashed border-gray-300">
                          <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                          <p className="text-gray-500 mb-3">Nenhum tema adicionado ainda</p>
                          <button 
                            onClick={() => adicionarAssunto(disciplina.id)}
                            className="px-4 py-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            Adicionar primeiro tema
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-medium text-gray-500">
                              {disciplina.assuntos.length} {disciplina.assuntos.length === 1 ? 'tema' : 'temas'}
                            </h3>
                            <button 
                              onClick={() => adicionarAssunto(disciplina.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              <PlusCircle className="h-3 w-3 mr-1" />
                              Adicionar tema
                            </button>
                          </div>
                          
                          {/* Nova visualização de temas em grid usando SubjectCard */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {disciplina.assuntos.map(assunto => (
                              <SubjectCard 
                                key={assunto.id}
                                assunto={assunto}
                                onEdit={() => abrirModalEditarAssunto(disciplina.id, assunto)}
                                onDelete={() => removerAssunto(disciplina.id, assunto.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Botão de salvar no rodapé */}
          {disciplinas.length > 0 && (
            <div className="mt-8 flex justify-between items-center">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-2 text-sm font-medium transition-colors bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm hover:bg-gray-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Voltar ao topo
              </button>
              <button 
                onClick={salvarAlteracoes}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white py-2.5 px-5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              >
                <Save className="h-4 w-4" />
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Salvando...
                  </div>
                ) : 'Salvar Alterações'}
              </button>
            </div>
          )}
        </div>

        {/* Renderizar o modal */}
        <DisciplinaModal />
        <AssuntoModal />
      </div>
    </AppLayout>
  );
} 