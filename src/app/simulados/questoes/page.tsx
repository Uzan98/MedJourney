"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../components/layout/AppLayout';
import { Card } from '../../../components/ui/Card';
import Link from 'next/link';
import { 
  BookOpen, 
  Database, 
  Edit2,
  Trash2, 
  Search, 
  Plus,
  ArrowLeft,
  X
} from 'lucide-react';
import { 
  Questao,
  BancoQuestoes,
  carregarBancoQuestoes,
  atualizarBancoQuestoes,
  adicionarQuestaoBanco,
  removerQuestaoBanco,
  salvarBancoQuestoes
} from '../../../services/simulados';
import { toast } from 'react-hot-toast';
import QuestaoFormModal from '../../../components/simulados/QuestaoFormModal';

// ID fixo para o banco único de questões
const BANCO_UNICO_ID = 'banco_unico_global';

export default function BancoQuestoesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [banco, setBanco] = useState<BancoQuestoes | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  
  // Estados para filtros e pesquisa
  const [filtro, setFiltro] = useState('');
  const [disciplinaFiltro, setDisciplinaFiltro] = useState<string>('todas');
  const [dificuldadeFiltro, setDificuldadeFiltro] = useState<'todas' | 'facil' | 'media' | 'dificil'>('todas');
  
  // Estados para adição de disciplinas
  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [mostrarAdicionarDisciplina, setMostrarAdicionarDisciplina] = useState(false);
  
  // Estado para o modal de questões
  const [mostrarModalQuestao, setMostrarModalQuestao] = useState(false);
  const [questaoParaEditar, setQuestaoParaEditar] = useState<Questao | undefined>(undefined);
  
  // Carregar o banco único de questões
  useEffect(() => {
    const fetchBanco = async () => {
      try {
        setLoading(true);
        
        // Verificar se o banco único já existe
        let bancoDados = await carregarBancoQuestoes(BANCO_UNICO_ID);
        
        if (!bancoDados) {
          // Se não existir, criar o banco único
          const novoBanco: BancoQuestoes = {
            id: BANCO_UNICO_ID,
            nome: 'Banco de Questões',
            questoes: [],
            disciplinas: [],
            dataCriacao: new Date().toISOString()
          };
          
          salvarBancoQuestoes(novoBanco);
          bancoDados = novoBanco;
        }
        
        setBanco(bancoDados);
        setQuestoes(bancoDados.questoes);
        setDisciplinas(bancoDados.disciplinas);
      } catch (error) {
        console.error('Erro ao carregar banco de questões:', error);
        toast.error('Erro ao carregar banco de questões');
      } finally {
        setLoading(false);
      }
    };

    fetchBanco();
  }, []);
  
  // Filtrar questões
  const questoesFiltradas = questoes.filter(questao => {
    const matchesPesquisa = filtro ? 
      questao.enunciado.toLowerCase().includes(filtro.toLowerCase()) || 
      questao.assunto.toLowerCase().includes(filtro.toLowerCase()) : 
      true;
      
    const matchesDisciplina = disciplinaFiltro === 'todas' ? 
      true : 
      questao.disciplina === disciplinaFiltro;
      
    const matchesDificuldade = dificuldadeFiltro === 'todas' ? 
      true : 
      questao.dificuldade === dificuldadeFiltro;
      
    return matchesPesquisa && matchesDisciplina && matchesDificuldade;
  });
  
  // Adicionar nova disciplina
  const adicionarDisciplina = () => {
    if (!novaDisciplina.trim()) {
      toast.error('O nome da disciplina não pode estar vazio');
      return;
    }
    
    if (disciplinas.includes(novaDisciplina)) {
      toast.error('Esta disciplina já existe');
      return;
    }
    
    try {
      const novasDisciplinas = [...disciplinas, novaDisciplina];
      
      if (banco) {
        const bancoAtualizado: BancoQuestoes = {
          ...banco,
          disciplinas: novasDisciplinas,
          ultimaAtualizacao: new Date().toISOString()
        };
        
        atualizarBancoQuestoes(BANCO_UNICO_ID, bancoAtualizado);
        setBanco(bancoAtualizado);
        setDisciplinas(novasDisciplinas);
        setNovaDisciplina('');
        setMostrarAdicionarDisciplina(false);
        
        toast.success('Disciplina adicionada com sucesso');
      }
    } catch (error) {
      console.error('Erro ao adicionar disciplina:', error);
      toast.error('Erro ao adicionar disciplina');
    }
  };
  
  // Remover disciplina
  const removerDisciplina = (disciplina: string) => {
    if (confirm(`Tem certeza que deseja remover a disciplina "${disciplina}"? Isso também removerá todas as questões associadas a ela.`)) {
      try {
        const novasDisciplinas = disciplinas.filter(d => d !== disciplina);
        const novasQuestoes = questoes.filter(q => q.disciplina !== disciplina);
        
        if (banco) {
          const bancoAtualizado: BancoQuestoes = {
            ...banco,
            disciplinas: novasDisciplinas,
            questoes: novasQuestoes,
            ultimaAtualizacao: new Date().toISOString()
          };
          
          atualizarBancoQuestoes(BANCO_UNICO_ID, bancoAtualizado);
          setBanco(bancoAtualizado);
          setDisciplinas(novasDisciplinas);
          setQuestoes(novasQuestoes);
          
          toast.success('Disciplina removida com sucesso');
        }
      } catch (error) {
        console.error('Erro ao remover disciplina:', error);
        toast.error('Erro ao remover disciplina');
      }
    }
  };
  
  // Abrir modal para adicionar nova questão
  const adicionarQuestao = () => {
    if (disciplinas.length === 0) {
      toast.error('Adicione pelo menos uma disciplina antes de criar questões');
      return;
    }
    
    setQuestaoParaEditar(undefined); // Garantir que estamos criando uma nova questão
    setMostrarModalQuestao(true);
  };
  
  // Função para formatar a exibição da dificuldade
  const formatarDificuldade = (dificuldade: 'facil' | 'media' | 'dificil') => {
    switch (dificuldade) {
      case 'facil': return 'Fácil';
      case 'media': return 'Média';
      case 'dificil': return 'Difícil';
    }
  };
  
  // Classes para cor de fundo conforme dificuldade
  const corDificuldade = (dificuldade: 'facil' | 'media' | 'dificil') => {
    switch (dificuldade) {
      case 'facil': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'dificil': return 'bg-red-100 text-red-800';
    }
  };
  
  // Editar questão
  const editarQuestao = (id: string) => {
    const questao = questoes.find(q => q.id === id);
    if (questao) {
      setQuestaoParaEditar(questao);
      setMostrarModalQuestao(true);
    }
  };
  
  // Callback após salvar questão
  const aposOperacaoQuestao = async () => {
    try {
      // Recarregar dados do banco
      const bancoDados = await carregarBancoQuestoes(BANCO_UNICO_ID);
      if (bancoDados) {
        setBanco(bancoDados);
        setQuestoes(bancoDados.questoes);
      }
    } catch (error) {
      console.error('Erro ao recarregar banco de questões:', error);
    }
  };
  
  // Remover questão
  const removerQuestao = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta questão?')) {
      try {
        await removerQuestaoBanco(BANCO_UNICO_ID, id);
        
        // Atualizar estado local
        const novasQuestoes = questoes.filter(q => q.id !== id);
        setQuestoes(novasQuestoes);
        
        if (banco) {
          setBanco({
            ...banco,
            questoes: novasQuestoes
          });
        }
        
        toast.success('Questão removida com sucesso');
      } catch (error) {
        console.error('Erro ao remover questão:', error);
        toast.error('Erro ao remover questão');
      }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-6">
          <Link 
            href="/simulados" 
            className="group flex items-center text-gray-600 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar para Simulados</span>
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Banco de Questões</h1>
              <p className="text-gray-600">
                Gerencie todas as suas questões para uso nos simulados
              </p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setMostrarAdicionarDisciplina(true)}
                className="px-4 py-2 border border-blue-600 text-blue-600 bg-white rounded-md hover:bg-blue-50 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Disciplina</span>
              </button>
              
              <button 
                onClick={adicionarQuestao}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Questão</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Seção de disciplinas */}
        <Card 
          title="Disciplinas" 
          icon={<BookOpen className="h-5 w-5" />}
          className="mb-6"
        >
          {disciplinas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Nenhuma disciplina cadastrada</p>
              <button
                onClick={() => setMostrarAdicionarDisciplina(true)}
                className="px-4 py-2 border border-blue-600 text-blue-600 bg-white rounded-md hover:bg-blue-50 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Disciplina</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {disciplinas.map((disciplina, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <span className="text-blue-700">{disciplina}</span>
                  <button
                    onClick={() => removerDisciplina(disciplina)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setMostrarAdicionarDisciplina(true)}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar</span>
              </button>
            </div>
          )}
        </Card>
        
        {/* Modal para adicionar disciplina */}
        {mostrarAdicionarDisciplina && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Nova Disciplina</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Disciplina
                </label>
                <input
                  type="text"
                  value={novaDisciplina}
                  onChange={(e) => setNovaDisciplina(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Anatomia"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setMostrarAdicionarDisciplina(false);
                    setNovaDisciplina('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarDisciplina}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Filtros e pesquisa */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Pesquisar questões..."
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Disciplina
                </label>
                <select
                  value={disciplinaFiltro}
                  onChange={(e) => setDisciplinaFiltro(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todas">Todas</option>
                  {disciplinas.map((disciplina, index) => (
                    <option key={index} value={disciplina}>
                      {disciplina}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Dificuldade
                </label>
                <select
                  value={dificuldadeFiltro}
                  onChange={(e) => setDificuldadeFiltro(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todas">Todas</option>
                  <option value="facil">Fácil</option>
                  <option value="media">Média</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lista de questões */}
        <Card 
          title={`Questões (${questoesFiltradas.length})`} 
          icon={<Database className="h-5 w-5" />}
          action={
            <button 
              onClick={adicionarQuestao}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Questão</span>
            </button>
          }
        >
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-gray-600">Carregando questões...</span>
            </div>
          ) : questoesFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filtro || disciplinaFiltro !== 'todas' || dificuldadeFiltro !== 'todas' 
                  ? 'Nenhuma questão encontrada com os filtros atuais' 
                  : 'Nenhuma questão cadastrada'}
              </h3>
              <p className="text-gray-500 mb-6">
                {filtro || disciplinaFiltro !== 'todas' || dificuldadeFiltro !== 'todas'
                  ? 'Tente ajustar os filtros para encontrar mais resultados.'
                  : 'Adicione questões ao seu banco para utilizá-las em simulados.'}
              </p>
              {disciplinas.length > 0 && (
                <button 
                  onClick={adicionarQuestao}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar Questão</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {questoesFiltradas.map((questao) => (
                <div key={questao.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${corDificuldade(questao.dificuldade)}`}>
                        {formatarDificuldade(questao.dificuldade)}
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {questao.disciplina}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {questao.assunto}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => editarQuestao(questao.id)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removerQuestao(questao.id)}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-800 mb-3">{questao.enunciado}</p>
                  
                  <div className="space-y-2">
                    {questao.alternativas.map((alternativa, index) => (
                      <div 
                        key={alternativa.id} 
                        className={`p-2 rounded ${alternativa.correta ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}
                      >
                        <div className="flex items-start">
                          <div className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center mr-2 ${
                            alternativa.correta ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <p className="text-sm">{alternativa.texto}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {questao.explicacao && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700">Explicação:</p>
                      <p className="text-sm text-gray-600">{questao.explicacao}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
        
        {/* Modal para adicionar/editar questão */}
        {mostrarModalQuestao && (
          <QuestaoFormModal
            isOpen={mostrarModalQuestao}
            onClose={() => setMostrarModalQuestao(false)}
            onSuccess={aposOperacaoQuestao}
            disciplinas={disciplinas}
            questaoParaEditar={questaoParaEditar}
          />
        )}
      </div>
    </AppLayout>
  );
} 