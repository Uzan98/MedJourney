"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Edit,
  Plus,
  Trash2,
  Filter,
  BookOpen,
  FileText,
  CheckCircle,
  ChevronDown,
  RefreshCw,
  Calendar,
  Eye,
  Search,
  Archive
} from 'lucide-react';

// Interfaces para os tipos de dados
interface BancoQuestoes {
  id: number;
  nome: string;
  descricao: string;
  disciplinas: string[];
  quantidade_questoes: number;
  is_publico: boolean;
  data_criacao: string;
}

interface Questao {
  id: number;
  conteudo: string;
  tipo: 'multipla_escolha' | 'verdadeiro_falso' | 'dissertativa';
  disciplina: string;
  dificuldade: 'baixa' | 'media' | 'alta';
  tags: string[];
  data_criacao: string;
}

// Componente principal
export default function BancoQuestoesDetalhes({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = params;
  
  // Estados
  const [banco, setBanco] = useState<BancoQuestoes | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [filteredQuestoes, setFilteredQuestoes] = useState<Questao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState<string | null>(null);
  const [selectedDificuldade, setSelectedDificuldade] = useState<string | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  
  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Aqui seria a chamada real para a API
        // Por enquanto usamos dados de exemplo
        const bancoMock: BancoQuestoes = {
          id: parseInt(id),
          nome: 'Banco de Cardiologia',
          descricao: 'Questões sobre cardiologia para residência médica, abrangendo temas como arritmias, insuficiência cardíaca, valvopatias e cardiopatias congênitas.',
          disciplinas: ['Cardiologia', 'Medicina Interna'],
          quantidade_questoes: 45,
          is_publico: false,
          data_criacao: '2025-04-28'
        };
        
        const questoesMock: Questao[] = [
          {
            id: 1,
            conteudo: 'Qual é o tratamento de primeira linha para hipertensão em pacientes com diabetes?',
            tipo: 'multipla_escolha',
            disciplina: 'Cardiologia',
            dificuldade: 'media',
            tags: ['hipertensão', 'diabetes'],
            data_criacao: '2025-04-30'
          },
          {
            id: 2,
            conteudo: 'Pacientes com fibrilação atrial devem sempre receber anticoagulação.',
            tipo: 'verdadeiro_falso',
            disciplina: 'Cardiologia',
            dificuldade: 'baixa',
            tags: ['fibrilação atrial', 'anticoagulação'],
            data_criacao: '2025-05-01'
          },
          {
            id: 3,
            conteudo: 'Descreva os mecanismos de insuficiência cardíaca com fração de ejeção preservada.',
            tipo: 'dissertativa',
            disciplina: 'Cardiologia',
            dificuldade: 'alta',
            tags: ['insuficiência cardíaca', 'fisiopatologia'],
            data_criacao: '2025-05-02'
          }
        ];
        
        setBanco(bancoMock);
        setQuestoes(questoesMock);
        setFilteredQuestoes(questoesMock);
        
        toast.success('Banco de questões carregado');
      } catch (error) {
        console.error('Erro ao carregar banco de questões:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id]);
  
  // Aplicar filtros às questões
  useEffect(() => {
    if (!questoes.length) return;
    
    let filtered = [...questoes];
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.conteudo.toLowerCase().includes(term) || 
        q.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    // Filtrar por disciplina
    if (selectedDisciplina) {
      filtered = filtered.filter(q => q.disciplina === selectedDisciplina);
    }
    
    // Filtrar por dificuldade
    if (selectedDificuldade) {
      filtered = filtered.filter(q => q.dificuldade === selectedDificuldade);
    }
    
    // Filtrar por tipo
    if (selectedTipo) {
      filtered = filtered.filter(q => q.tipo === selectedTipo);
    }
    
    setFilteredQuestoes(filtered);
  }, [questoes, searchTerm, selectedDisciplina, selectedDificuldade, selectedTipo]);
  
  // Formatar data
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return dateString;
    }
  };
  
  // Excluir banco de questões
  const handleExcluirBanco = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o banco "${banco?.nome}"? Esta ação não pode ser desfeita.`)) {
      try {
        // Aqui seria a chamada real para a API
        // Por enquanto apenas simulamos o sucesso
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast.success('Banco de questões excluído com sucesso');
        router.push('/banco-questoes');
      } catch (error) {
        console.error('Erro ao excluir banco:', error);
        toast.error('Erro ao excluir banco de questões');
      }
    }
  };
  
  // Limpar filtros
  const handleLimparFiltros = () => {
    setSearchTerm('');
    setSelectedDisciplina(null);
    setSelectedDificuldade(null);
    setSelectedTipo(null);
  };
  
  // Obter label para tipo de questão
  const getTipoQuestaoLabel = (tipo: string): string => {
    switch (tipo) {
      case 'multipla_escolha': return 'Múltipla Escolha';
      case 'verdadeiro_falso': return 'Verdadeiro/Falso';
      case 'dissertativa': return 'Dissertativa';
      default: return tipo;
    }
  };
  
  // Obter classe para dificuldade
  const getDificuldadeClass = (dificuldade: string): string => {
    switch (dificuldade) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (!banco) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Banco de Questões não Encontrado</h2>
          <p className="text-gray-600 mb-6">O banco de questões solicitado não existe ou foi removido.</p>
          <Link 
            href="/banco-questoes"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar para Bancos de Questões
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navegação */}
      <div className="mb-6">
        <Link 
          href="/banco-questoes"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para Bancos de Questões
        </Link>
      </div>
      
      {/* Cabeçalho do banco */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{banco.nome}</h1>
          
          <div className="flex space-x-2 mt-4 sm:mt-0">
            <Link 
              href={`/banco-questoes/${id}/editar`}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 inline-flex items-center text-sm"
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Editar Banco
            </Link>
            
            <button
              onClick={handleExcluirBanco}
              className="px-3 py-1.5 border border-red-300 rounded-md text-red-700 hover:bg-red-50 inline-flex items-center text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Excluir
            </button>
          </div>
        </div>
        
        {banco.descricao && (
          <p className="text-gray-600 mb-4">{banco.descricao}</p>
        )}
        
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm inline-flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Criado em: {formatDate(banco.data_criacao)}
          </div>
          
          <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm inline-flex items-center">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            {banco.quantidade_questoes} questões
          </div>
          
          {banco.is_publico ? (
            <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm inline-flex items-center">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Público
            </div>
          ) : (
            <div className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm inline-flex items-center">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Privado
            </div>
          )}
          
          {banco.disciplinas && banco.disciplinas.map((disciplina, index) => (
            <div key={index} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm inline-flex items-center">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              {disciplina}
            </div>
          ))}
        </div>
      </div>
      
      {/* Seção de questões */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Questões no Banco</h2>
          
          <Link 
            href={`/banco-questoes/${id}/nova-questao`}
            className="mt-2 sm:mt-0 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center text-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Questão
          </Link>
        </div>
        
        {/* Filtros e pesquisa */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar questões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              <button
                onClick={() => setFilteredQuestoes(questoes)}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                title="Atualizar"
              >
                <RefreshCw className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Filtros expandidos */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                  <select
                    value={selectedDisciplina || ''}
                    onChange={(e) => setSelectedDisciplina(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todas as disciplinas</option>
                    {banco.disciplinas.map((disciplina, index) => (
                      <option key={index} value={disciplina}>
                        {disciplina}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                  <select
                    value={selectedDificuldade || ''}
                    onChange={(e) => setSelectedDificuldade(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todas as dificuldades</option>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Questão</label>
                  <select
                    value={selectedTipo || ''}
                    onChange={(e) => setSelectedTipo(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos os tipos</option>
                    <option value="multipla_escolha">Múltipla Escolha</option>
                    <option value="verdadeiro_falso">Verdadeiro/Falso</option>
                    <option value="dissertativa">Dissertativa</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleLimparFiltros}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Lista de questões */}
        {filteredQuestoes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma questão encontrada</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedDisciplina || selectedDificuldade || selectedTipo
                ? 'Tente ajustar os filtros para encontrar questões.'
                : 'Este banco ainda não possui questões. Adicione sua primeira questão agora!'}
            </p>
            <Link 
              href={`/banco-questoes/${id}/nova-questao`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Questão
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Questão
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disciplina
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dificuldade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuestoes.map((questao) => (
                    <tr key={questao.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 line-clamp-2">{questao.conteudo}</div>
                        {questao.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {questao.tags.map((tag, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {getTipoQuestaoLabel(questao.tipo)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {questao.disciplina}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getDificuldadeClass(questao.dificuldade)}`}>
                          {questao.dificuldade === 'baixa' ? 'Baixa' : 
                           questao.dificuldade === 'media' ? 'Média' : 'Alta'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(questao.data_criacao)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/banco-questoes/${id}/questao/${questao.id}`}
                            className="text-blue-600 hover:text-blue-900 p-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver</span>
                          </Link>
                          <Link
                            href={`/banco-questoes/${id}/questao/${questao.id}/editar`}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Link>
                          <button
                            onClick={() => alert('Função de excluir questão')}
                            className="text-red-600 hover:text-red-900 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 