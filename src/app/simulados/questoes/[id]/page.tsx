"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '../../../../components/layout/AppLayout';
import { Card } from '../../../../components/ui/Card';
import { 
  ArrowLeft, 
  Search,
  Database,
  Edit,
  Trash2,
  Plus,
  Filter,
  CheckCircle,
  AlertTriangle,
  Save,
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  Questao,
  BancoQuestoes, 
  carregarBancoQuestoes, 
  atualizarBancoQuestoes,
  atualizarQuestaoBanco,
  adicionarQuestaoBanco,
  removerQuestaoBanco,
  deletarBancoQuestoes
} from '../../../../services/simulados';
import QuestaoModal from '../../../../components/simulados/QuestaoModal';
import { v4 as uuidv4 } from 'uuid';

interface PageProps {
  params: {
    id: string;
  };
}

export default function VisualizarBancoQuestoesPage({ params }: PageProps) {
  const router = useRouter();
  const [banco, setBanco] = useState<BancoQuestoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nomeBanco, setNomeBanco] = useState('');
  const [questoesVisiveis, setQuestoesVisiveis] = useState<Record<string, boolean>>({});
  const [questaoModalAberto, setQuestaoModalAberto] = useState(false);
  const [questaoEmEdicao, setQuestaoEmEdicao] = useState<Questao | null>(null);
  const [buscaQuestao, setBuscaQuestao] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState('');
  const [filtroDificuldade, setFiltroDificuldade] = useState<'facil' | 'media' | 'dificil' | ''>('');
  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [modoEdicao, setModoEdicao] = useState(false);

  // Carregar o banco de questões
  useEffect(() => {
    fetchBanco();
  }, [params.id]);

    const fetchBanco = async () => {
      try {
      setLoading(true);
      const bancoCarregado = await carregarBancoQuestoes(params.id);
      
      if (bancoCarregado) {
        setBanco(bancoCarregado);
        setNomeBanco(bancoCarregado.nome);
        
        // Inicializar visibilidade das questões
        const visiveis: Record<string, boolean> = {};
        bancoCarregado.questoes.forEach(questao => {
          visiveis[questao.id] = false; // Todas as questões iniciam fechadas
        });
        setQuestoesVisiveis(visiveis);
        } else {
          router.push('/simulados/questoes');
        }
      } catch (error) {
        console.error('Erro ao carregar banco de questões:', error);
      } finally {
        setLoading(false);
      }
    };
    
  // Filtrar questões com base na busca e filtros
  const questoesFiltradas = banco?.questoes.filter(questao => {
    const matchBusca = buscaQuestao
      ? questao.enunciado.toLowerCase().includes(buscaQuestao.toLowerCase()) ||
        questao.assunto.toLowerCase().includes(buscaQuestao.toLowerCase())
      : true;
    
    const matchDisciplina = filtroDisciplina
      ? questao.disciplina === filtroDisciplina
      : true;
    
    const matchDificuldade = filtroDificuldade
      ? questao.dificuldade === filtroDificuldade
      : true;
    
    return matchBusca && matchDisciplina && matchDificuldade;
  }) || [];
  
  // Funções para manipular visibilidade
  const toggleQuestaoVisivel = (id: string) => {
    setQuestoesVisiveis(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Abrir modal para editar questão
  const editarQuestao = (questao: Questao) => {
    setQuestaoEmEdicao(questao);
    setQuestaoModalAberto(true);
  };
  
  // Adicionar nova disciplina
  const addDisciplina = () => {
    if (!novaDisciplina.trim()) return;
    
    if (banco && !banco.disciplinas.includes(novaDisciplina.trim())) {
      const novasDisciplinas = [...banco.disciplinas, novaDisciplina.trim()];
      setBanco({
        ...banco,
        disciplinas: novasDisciplinas
      });
      setNovaDisciplina('');
    }
  };
  
  // Remover disciplina
  const removeDisciplina = (disciplina: string) => {
    if (!banco) return;
    
    // Verificar se a disciplina está sendo usada
    const emUso = banco.questoes.some(q => q.disciplina === disciplina);
    
    if (emUso) {
      alert(`Não é possível remover a disciplina "${disciplina}" pois ela está sendo usada em questões.`);
      return;
    }
    
    const novasDisciplinas = banco.disciplinas.filter(d => d !== disciplina);
    setBanco({
      ...banco,
      disciplinas: novasDisciplinas
    });
    
    // Se esta disciplina estava selecionada no filtro, limpar o filtro
    if (filtroDisciplina === disciplina) {
      setFiltroDisciplina('');
    }
  };
  
  // Atualizar nome do banco
  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNomeBanco(e.target.value);
  };

  // Salvar ou atualizar questão
  const salvarQuestao = async (questaoData: Omit<Questao, 'id'> & { id?: string }) => {
    if (!banco) return;
    
    try {
      let questaoAtualizada: Questao;
      
      if (questaoData.id) {
        // Atualizar questão existente
        questaoAtualizada = {
          ...questaoData,
          id: questaoData.id
        } as Questao;
        
        await atualizarQuestaoBanco(banco.id, questaoAtualizada);
        
        // Atualizar estado local
        setBanco({
          ...banco,
          questoes: banco.questoes.map(q => 
            q.id === questaoAtualizada.id ? questaoAtualizada : q
          ),
          disciplinas: !banco.disciplinas.includes(questaoAtualizada.disciplina)
            ? [...banco.disciplinas, questaoAtualizada.disciplina]
            : banco.disciplinas
        });
    } else {
      // Adicionar nova questão
        const novaQuestao = await adicionarQuestaoBanco(banco.id, questaoData);
        
        // Atualizar estado local
        setBanco({
          ...banco,
          questoes: [...banco.questoes, novaQuestao],
          disciplinas: !banco.disciplinas.includes(novaQuestao.disciplina)
            ? [...banco.disciplinas, novaQuestao.disciplina]
            : banco.disciplinas
        });
        
        // Inicializar visibilidade
        setQuestoesVisiveis(prev => ({
        ...prev,
          [novaQuestao.id]: true // Nova questão inicia aberta
      }));
    }
    
      setQuestaoModalAberto(false);
    setQuestaoEmEdicao(null);
    } catch (error) {
      console.error('Erro ao salvar questão:', error);
      alert('Erro ao salvar questão. Tente novamente.');
    }
  };
  
  // Adicionar nova questão
  const adicionarQuestao = () => {
    if (!banco || banco.disciplinas.length === 0) {
      alert('Adicione pelo menos uma disciplina antes de criar questões.');
      return;
    }
    
    setQuestaoEmEdicao(null);
    setQuestaoModalAberto(true);
  };
  
  // Excluir questão
  const excluirQuestao = async (questaoId: string) => {
    if (!banco) return;
    
    if (confirm('Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.')) {
      try {
        await removerQuestaoBanco(banco.id, questaoId);
        
        // Atualizar estado local
        const questoesAtualizadas = banco.questoes.filter(q => q.id !== questaoId);
        setBanco({
          ...banco,
          questoes: questoesAtualizadas
        });
      } catch (error) {
        console.error('Erro ao excluir questão:', error);
        alert('Erro ao excluir questão. Tente novamente.');
      }
    }
  };

  // Salvar todas as alterações do banco
  const salvarBanco = async () => {
    if (!banco) return;
    
    try {
      setSalvando(true);
      
      const bancoAtualizado: BancoQuestoes = {
        ...banco,
        nome: nomeBanco.trim() || 'Banco de Questões',
        ultimaAtualizacao: new Date().toISOString()
      };
      
      await atualizarBancoQuestoes(banco.id, bancoAtualizado);
      setBanco(bancoAtualizado);
      alert('Banco de questões salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar banco de questões:', error);
      alert('Erro ao salvar banco de questões. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };
  
  // Excluir banco de questões
  const excluirBanco = async () => {
    if (!banco) return;
    
    if (confirm(`Tem certeza que deseja excluir o banco "${banco.nome}"? Esta ação não pode ser desfeita e todas as questões serão perdidas.`)) {
      try {
        await deletarBancoQuestoes(banco.id);
        router.push('/simulados/questoes');
      } catch (error) {
        console.error('Erro ao excluir banco de questões:', error);
        alert('Erro ao excluir banco de questões. Tente novamente.');
      }
    }
  };
  
  // Cancelar edição e recarregar banco
  const cancelarEdicao = () => {
    fetchBanco();
    setModoEdicao(false);
  };

  // Formatar dificuldade para exibição
  const formatarDificuldade = (dificuldade: 'facil' | 'media' | 'dificil') => {
    switch (dificuldade) {
      case 'facil': return 'Fácil';
      case 'media': return 'Média';
      case 'dificil': return 'Difícil';
      default: return dificuldade;
    }
  };

  // Classes CSS para cor da dificuldade
  const corDificuldade = (dificuldade: 'facil' | 'media' | 'dificil') => {
    switch (dificuldade) {
      case 'facil': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'dificil': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando banco de questões...</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  if (!banco) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Banco não encontrado</h2>
            <p className="text-gray-600 mb-6">O banco de questões que você está procurando não existe ou foi removido.</p>
            <Link 
              href="/simulados/questoes" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para Bancos de Questões</span>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-6">
          <Link 
            href="/simulados/questoes" 
            className="group flex items-center text-gray-600 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar para Bancos de Questões</span>
          </Link>
          
          {/* Título e Ações */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              {modoEdicao ? (
                <input
                  type="text"
                  value={nomeBanco}
                  onChange={handleNomeChange}
                  className="text-2xl font-bold text-gray-800 px-2 py-1 border-b-2 border-blue-500 focus:outline-none w-full max-w-lg"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-800">{banco.nome}</h1>
              )}
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <span>{banco.questoes.length} questões</span>
                <span className="mx-2">•</span>
                <span>Criado em: {new Date(banco.dataCriacao).toLocaleDateString('pt-BR')}</span>
                {banco.ultimaAtualizacao && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Última atualização: {new Date(banco.ultimaAtualizacao).toLocaleDateString('pt-BR')}</span>
                </>
              )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {modoEdicao ? (
                <>
                <button
                    onClick={cancelarEdicao}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-1.5"
                >
                    <X className="h-4 w-4" />
                    <span>Cancelar</span>
                </button>
                <button
                  onClick={salvarBanco}
                    disabled={salvando}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                    <span>{salvando ? 'Salvando...' : 'Salvar'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setModoEdicao(true)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-1.5"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Editar</span>
                </button>
                <button
                  onClick={excluirBanco}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                    <span>Excluir</span>
                </button>
                </>
            )}
            </div>
          </div>
        </div>
        
        {/* Conteúdo principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Disciplinas e informações do banco */}
          <div className="md:col-span-1">
            <Card className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-800">Disciplinas</h2>
                {modoEdicao && (
                  <span className="text-sm text-gray-500">{banco.disciplinas.length} disciplinas</span>
                )}
              </div>
              
              {modoEdicao && (
                <div className="mb-4">
                  <div className="flex gap-2">
                <input
                  type="text"
                      value={novaDisciplina}
                      onChange={(e) => setNovaDisciplina(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nova disciplina"
                      onKeyDown={(e) => e.key === 'Enter' && addDisciplina()}
                    />
                    <button
                      onClick={addDisciplina}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex-shrink-0"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
              
              {banco.disciplinas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {banco.disciplinas.map((disciplina, index) => (
                        <div
                          key={index}
                      className={`px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full inline-flex items-center gap-1 ${
                        filtroDisciplina === disciplina ? 'ring-2 ring-blue-400' : ''
                      }`}
                    >
                      <button
                        onClick={() => setFiltroDisciplina(prev => prev === disciplina ? '' : disciplina)}
                        className="hover:underline"
                      >
                        {disciplina}
                      </button>
                      {modoEdicao && (
                          <button
                            onClick={() => removeDisciplina(disciplina)}
                          className="ml-1 text-blue-800 hover:text-blue-900"
                          >
                          <X className="h-3 w-3" />
                          </button>
                      )}
                        </div>
                      ))}
                    </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  {modoEdicao 
                    ? 'Adicione disciplinas para organizar suas questões'
                    : 'Nenhuma disciplina adicionada'}
                </p>
              )}
            </Card>
            
            <Card>
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-800 mb-2">Filtrar Questões</h2>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                    value={buscaQuestao}
                    onChange={(e) => setBuscaQuestao(e.target.value)}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Pesquisar questões..."
                    />
                </div>
                  </div>
                  
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Filtrar por Dificuldade</h3>
                <div className="flex flex-wrap gap-2">
                  {(['facil', 'media', 'dificil'] as const).map((dificuldade) => (
                    <button
                      key={dificuldade}
                      onClick={() => setFiltroDificuldade(prev => prev === dificuldade ? '' : dificuldade)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        filtroDificuldade === dificuldade 
                          ? 'ring-2 ring-opacity-50 ' : ''
                      } ${corDificuldade(dificuldade)}`}
                    >
                      {formatarDificuldade(dificuldade)}
                    </button>
                  ))}
                  {filtroDificuldade || filtroDisciplina ? (
                    <button
                      onClick={() => {
                        setFiltroDificuldade('');
                        setFiltroDisciplina('');
                      }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200"
                    >
                      Limpar filtros
                    </button>
                  ) : null}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">Estatísticas</h3>
                </div>
                
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total de Questões:</span>
                    <span className="font-medium">{banco.questoes.length}</span>
                  </div>
                  
                  {(['facil', 'media', 'dificil'] as const).map((dificuldade) => {
                    const count = banco.questoes.filter(q => q.dificuldade === dificuldade).length;
                    const percentage = banco.questoes.length > 0 
                      ? Math.round((count / banco.questoes.length) * 100) 
                      : 0;
                    
                    return (
                      <div key={dificuldade} className="flex justify-between text-sm">
                        <span className="text-gray-600">{formatarDificuldade(dificuldade)}:</span>
                        <span className="font-medium">{count} ({percentage}%)</span>
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Disciplinas:</span>
                    <span className="font-medium">{banco.disciplinas.length}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Lista de Questões */}
          <div className="md:col-span-2">
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-800">
                  Questões
                  {questoesFiltradas.length !== banco.questoes.length && (
                    <span className="ml-2 text-sm text-gray-500">
                      (mostrando {questoesFiltradas.length} de {banco.questoes.length})
                    </span>
                  )}
                </h2>
                
                <button
                  onClick={adicionarQuestao}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Questão
                </button>
                </div>
                
              {questoesFiltradas.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  {banco.questoes.length === 0 ? (
                    <>
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma questão adicionada</h3>
                      <p className="text-gray-500 mb-6">
                        Adicione questões para começar a usar este banco.
                      </p>
                      <button
                        onClick={adicionarQuestao}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Adicionar Questão</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma questão encontrada</h3>
                      <p className="text-gray-500 mb-4">
                        Não foram encontradas questões para os filtros atuais.
                      </p>
                      <button
                        onClick={() => {
                          setBuscaQuestao('');
                          setFiltroDisciplina('');
                          setFiltroDificuldade('');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        <span>Limpar Filtros</span>
                      </button>
                    </>
                  )}
                </div>
              ) : (
                  <div className="space-y-4">
                    {questoesFiltradas.map((questao, index) => (
                    <div
                      key={questao.id}
                      className="border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
                    >
                      {/* Cabeçalho da questão */}
                      <div 
                        className={`p-4 cursor-pointer ${questoesVisiveis[questao.id] ? 'border-b border-gray-200' : ''}`}
                          onClick={() => toggleQuestaoVisivel(questao.id)}
                        >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${corDificuldade(questao.dificuldade)}`}>
                                {formatarDificuldade(questao.dificuldade)}
                            </span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  {questao.disciplina}
                                </span>
                                {questao.assunto && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                                    {questao.assunto}
                                  </span>
                                )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                editarQuestao(questao);
                              }}
                              className="p-1 text-gray-500 hover:text-blue-600 rounded"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                excluirQuestao(questao.id);
                              }}
                              className="p-1 text-gray-500 hover:text-red-600 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleQuestaoVisivel(questao.id);
                              }}
                              className="p-1 text-gray-500 hover:text-blue-600 rounded"
                            >
                              {questoesVisiveis[questao.id] ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-gray-800 mt-2">
                          <span className="font-medium mr-1">Q{index + 1}.</span> 
                          {questao.enunciado}
                        </p>
                              </div>
                              
                      {/* Corpo expandido */}
                      {questoesVisiveis[questao.id] && (
                        <div className="p-4 bg-gray-50">
                          <div className="space-y-2 ml-4">
                            {questao.alternativas.map((alt, idx) => (
                              <div key={alt.id} className="flex items-start">
                                <div className={`mt-0.5 mr-2 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  alt.correta 
                                    ? 'bg-green-100 text-green-800 border border-green-300' 
                                    : 'bg-gray-100 text-gray-700 border border-gray-300'
                                }`}>
                                  {alt.correta ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <span className="text-xs font-medium">{String.fromCharCode(65 + idx)}</span>
                                  )}
                                </div>
                                <p className={`text-sm ${alt.correta ? 'font-medium text-green-800' : 'text-gray-700'}`}>
                                  {alt.texto}
                                </p>
                                    </div>
                                  ))}
                              </div>
                              
                              {questao.explicacao && (
                            <div className="mt-4 pt-3 border-t border-gray-200">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium text-gray-700">Explicação:</span> {questao.explicacao}
                              </p>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
              )}
            </Card>
                  </div>
              </div>
      </div>
      
      {/* Modal de Questão */}
      <QuestaoModal 
        isOpen={questaoModalAberto}
        onClose={() => {
          setQuestaoModalAberto(false);
          setQuestaoEmEdicao(null);
        }}
        onSave={salvarQuestao}
        questao={questaoEmEdicao || undefined}
        disciplinas={banco.disciplinas}
        novaDisciplina={novaDisciplina}
        onAddDisciplina={(disciplina) => {
          if (!banco.disciplinas.includes(disciplina)) {
            setBanco({
              ...banco,
              disciplinas: [...banco.disciplinas, disciplina]
            });
          }
          setNovaDisciplina('');
        }}
      />
    </AppLayout>
  );
} 