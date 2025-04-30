"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '../../../../components/layout/AppLayout';
import { ArrowLeft, Plus, X, BookOpen, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { salvarBancoQuestoes } from '../../../../services/simulados';
import { Card } from '../../../../components/ui/Card';

export default function NovoBancoQuestoesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nomeBanco, setNomeBanco] = useState('');
  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [questoes, setQuestoes] = useState<Array<{
    id: string;
    disciplina: string;
    assunto: string;
    enunciado: string;
    dificuldade: 'facil' | 'media' | 'dificil';
    alternativas: Array<{
      id: string;
      texto: string;
      correta: boolean;
    }>;
    explicacao?: string;
  }>>([]);
  
  // Valor atual da questão que está sendo editada
  const [questaoAtual, setQuestaoAtual] = useState({
    disciplina: '',
    assunto: '',
    enunciado: '',
    dificuldade: 'media' as 'facil' | 'media' | 'dificil',
    alternativas: [
      { id: '1', texto: '', correta: true },
      { id: '2', texto: '', correta: false },
      { id: '3', texto: '', correta: false },
      { id: '4', texto: '', correta: false },
      { id: '5', texto: '', correta: false }
    ],
    explicacao: ''
  });
  
  // Estado para controlar a exibição do formulário de questão
  const [mostrarFormQuestao, setMostrarFormQuestao] = useState(false);
  // Estado para controlar se estamos editando uma questão existente
  const [editandoQuestaoIndex, setEditandoQuestaoIndex] = useState<number | null>(null);
  
  // Adicionar nova disciplina
  const adicionarDisciplina = () => {
    if (!novaDisciplina.trim()) {
      toast.error('Digite o nome da disciplina');
      return;
    }
    
    if (disciplinas.includes(novaDisciplina.trim())) {
      toast.error('Esta disciplina já foi adicionada');
      return;
    }
    
    setDisciplinas([...disciplinas, novaDisciplina.trim()]);
    setNovaDisciplina('');
  };
  
  // Remover disciplina
  const removerDisciplina = (index: number) => {
    const novasDisciplinas = [...disciplinas];
    novasDisciplinas.splice(index, 1);
    setDisciplinas(novasDisciplinas);
  };
  
  // Limpar o formulário de questão
  const limparFormularioQuestao = () => {
    setQuestaoAtual({
      disciplina: disciplinas.length > 0 ? disciplinas[0] : '',
      assunto: '',
      enunciado: '',
      dificuldade: 'media',
      alternativas: [
        { id: '1', texto: '', correta: true },
        { id: '2', texto: '', correta: false },
        { id: '3', texto: '', correta: false },
        { id: '4', texto: '', correta: false },
        { id: '5', texto: '', correta: false }
      ],
      explicacao: ''
    });
    setEditandoQuestaoIndex(null);
  };
  
  // Mostrar formulário para adicionar questão
  const mostrarAdicionarQuestao = () => {
    if (disciplinas.length === 0) {
      toast.error('Adicione pelo menos uma disciplina antes de criar questões');
      return;
    }
    
    limparFormularioQuestao();
    setMostrarFormQuestao(true);
  };
  
  // Mostrar formulário para editar questão
  const editarQuestao = (index: number) => {
    setQuestaoAtual({...questoes[index]});
    setEditandoQuestaoIndex(index);
    setMostrarFormQuestao(true);
  };
  
  // Remover questão
  const removerQuestao = (index: number) => {
    if (confirm('Tem certeza que deseja remover esta questão?')) {
      const novasQuestoes = [...questoes];
      novasQuestoes.splice(index, 1);
      setQuestoes(novasQuestoes);
    }
  };
  
  // Atualizar alternativa
  const atualizarAlternativa = (index: number, campo: 'texto' | 'correta', valor: string | boolean) => {
    const novasAlternativas = [...questaoAtual.alternativas];
    
    // Se estiver marcando como correta, desmarcar as outras
    if (campo === 'correta' && valor === true) {
      novasAlternativas.forEach((alt, i) => {
        if (i !== index) {
          alt.correta = false;
        }
      });
    }
    
    novasAlternativas[index] = {
      ...novasAlternativas[index],
      [campo]: valor
    };
    
    setQuestaoAtual({
      ...questaoAtual,
      alternativas: novasAlternativas
    });
  };
  
  // Salvar questão atual (adicionar nova ou atualizar existente)
  const salvarQuestao = () => {
    // Validações
    if (!questaoAtual.disciplina) {
      toast.error('Selecione uma disciplina');
      return;
    }
    
    if (!questaoAtual.enunciado.trim()) {
      toast.error('Digite o enunciado da questão');
      return;
    }
    
    if (questaoAtual.alternativas.some(alt => !alt.texto.trim())) {
      toast.error('Preencha o texto de todas as alternativas');
      return;
    }
    
    if (!questaoAtual.alternativas.some(alt => alt.correta)) {
      toast.error('Selecione pelo menos uma alternativa correta');
      return;
    }
    
    const novaQuestao = {
      ...questaoAtual,
      id: editandoQuestaoIndex !== null ? questoes[editandoQuestaoIndex].id : crypto.randomUUID()
    };
    
    if (editandoQuestaoIndex !== null) {
      // Atualizar questão existente
      const novasQuestoes = [...questoes];
      novasQuestoes[editandoQuestaoIndex] = novaQuestao;
      setQuestoes(novasQuestoes);
      toast.success('Questão atualizada com sucesso');
    } else {
      // Adicionar nova questão
      setQuestoes([...questoes, novaQuestao]);
      toast.success('Questão adicionada com sucesso');
    }
    
    setMostrarFormQuestao(false);
  };
  
  // Salvar banco de questões
  const salvarBanco = async () => {
    if (!nomeBanco.trim()) {
      toast.error('Digite um nome para o banco de questões');
      return;
    }
    
    if (disciplinas.length === 0) {
      toast.error('Adicione pelo menos uma disciplina');
      return;
    }
    
    if (questoes.length === 0) {
      toast.error('Adicione pelo menos uma questão');
        return;
      }
      
    try {
      setLoading(true);
      
      const novoBanco = {
        id: crypto.randomUUID(),
        nome: nomeBanco.trim(),
        disciplinas,
        questoes,
        dataCriacao: new Date().toISOString(),
        ultimaAtualizacao: new Date().toISOString()
      };
      
      await salvarBancoQuestoes(novoBanco);
      
      toast.success('Banco de questões criado com sucesso');
      router.push('/simulados/questoes');
    } catch (error) {
      console.error('Erro ao salvar banco de questões:', error);
      toast.error('Erro ao salvar banco de questões');
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizar letra da alternativa
  const renderizarLetraAlternativa = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D, E
  };
  
    return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <Link 
            href="/simulados/questoes" 
            className="group flex items-center text-gray-600 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar para Bancos de Questões</span>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Novo Banco de Questões</h1>
            
            <button
              onClick={salvarBanco}
              disabled={loading}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Banco'}</span>
            </button>
          </div>
        </div>
        
        {/* Formulário principal */}
        <div className="grid grid-cols-1 gap-8">
          {/* Nome do banco */}
          <Card>
            <h2 className="text-lg font-medium text-gray-800 mb-4">Informações Básicas</h2>
            
            <div className="mb-4">
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Banco de Questões
          </label>
          <input
            type="text"
            id="nome"
                value={nomeBanco}
                onChange={(e) => setNomeBanco(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Banco de Fisiologia Humana"
              />
            </div>
          </Card>
          
          {/* Disciplinas */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800">Disciplinas</h2>
              <span className="text-sm text-gray-500">{disciplinas.length} disciplinas</span>
        </div>

            <div className="mb-4">
              <div className="flex gap-2">
            <input
              type="text"
                  value={novaDisciplina}
                  onChange={(e) => setNovaDisciplina(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nova disciplina"
                  onKeyDown={(e) => e.key === 'Enter' && adicionarDisciplina()}
            />
            <button
                  onClick={adicionarDisciplina}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
            </div>
            
            {disciplinas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {disciplinas.map((disciplina, index) => (
                <div
                  key={index}
                    className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full inline-flex items-center gap-1"
                >
                  <span>{disciplina}</span>
                  <button
                      onClick={() => removerDisciplina(index)}
                      className="ml-1 text-blue-800 hover:text-blue-900"
                  >
                      <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma disciplina adicionada</p>
            )}
          </Card>
          
          {/* Questões */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800">Questões</h2>
              
              <button
                onClick={mostrarAdicionarQuestao}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 inline-flex items-center gap-1.5 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Adicionar Questão
              </button>
            </div>
            
            {questoes.length > 0 ? (
              <div className="space-y-6">
                {questoes.map((questao, index) => (
                  <div 
                    key={questao.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            questao.dificuldade === 'facil' 
                              ? 'bg-green-100 text-green-800' 
                              : questao.dificuldade === 'media'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {questao.dificuldade === 'facil' 
                              ? 'Fácil' 
                              : questao.dificuldade === 'media' 
                                ? 'Média' 
                                : 'Difícil'}
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
                          onClick={() => editarQuestao(index)}
                          className="p-1 text-gray-500 hover:text-blue-600 rounded"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removerQuestao(index)}
                          className="p-1 text-gray-500 hover:text-red-600 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-800 mb-3">
                      <span className="font-medium mr-1">Q{index + 1}.</span> 
                      {questao.enunciado}
                    </p>
                    
                    <div className="space-y-1.5 ml-4">
                      {questao.alternativas.map((alt, altIndex) => (
                        <div key={alt.id} className="flex items-start">
                          <div className={`mt-0.5 mr-2 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            alt.correta 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-gray-100 text-gray-600 border border-gray-300'
                          }`}>
                            <span className="text-xs font-medium">
                              {renderizarLetraAlternativa(altIndex)}
                            </span>
                          </div>
                          <p className={`text-sm ${alt.correta ? 'font-medium' : ''}`}>
                            {alt.texto}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {questao.explicacao && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Explicação:</span> {questao.explicacao}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Nenhuma questão adicionada</p>
                <button
                  onClick={mostrarAdicionarQuestao}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Questão
                </button>
              </div>
            )}
          </Card>
        </div>
        
        {/* Modal para adicionar/editar questão */}
        {mostrarFormQuestao && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editandoQuestaoIndex !== null ? 'Editar Questão' : 'Nova Questão'}
                  </h3>
                  <button
                    onClick={() => setMostrarFormQuestao(false)}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                {/* Disciplina */}
        <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disciplina
          </label>
          <select
            value={questaoAtual.disciplina}
                    onChange={(e) => setQuestaoAtual({...questaoAtual, disciplina: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma disciplina</option>
                    {disciplinas.map((disciplina, index) => (
              <option key={index} value={disciplina}>
                {disciplina}
              </option>
            ))}
          </select>
        </div>

                {/* Assunto */}
        <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assunto (opcional)
          </label>
          <input
            type="text"
            value={questaoAtual.assunto}
                    onChange={(e) => setQuestaoAtual({...questaoAtual, assunto: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Sistema Cardiovascular"
          />
        </div>

                {/* Dificuldade */}
        <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
            Dificuldade
          </label>
                  <div className="flex gap-4">
                    {(['facil', 'media', 'dificil'] as const).map((nivel) => (
                      <label key={nivel} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          className="sr-only"
                          checked={questaoAtual.dificuldade === nivel}
                          onChange={() => setQuestaoAtual({...questaoAtual, dificuldade: nivel})}
                        />
                        <div className={`w-4 h-4 rounded-full mr-2 ${
                          questaoAtual.dificuldade === nivel
                            ? nivel === 'facil' 
                              ? 'bg-green-500' 
                              : nivel === 'media' 
                                ? 'bg-yellow-500' 
                                : 'bg-red-500'
                            : 'bg-gray-300'
                        }`}></div>
                        <span className="text-sm">
                          {nivel === 'facil' 
                            ? 'Fácil' 
                            : nivel === 'media' 
                              ? 'Média' 
                              : 'Difícil'}
                        </span>
                      </label>
                    ))}
                  </div>
        </div>

                {/* Enunciado */}
        <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enunciado da Questão
          </label>
          <textarea
            value={questaoAtual.enunciado}
                    onChange={(e) => setQuestaoAtual({...questaoAtual, enunciado: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            placeholder="Digite o enunciado da questão..."
          />
        </div>

                {/* Alternativas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
                    Alternativas
          </label>
          <div className="space-y-3">
            {questaoAtual.alternativas.map((alternativa, index) => (
              <div key={alternativa.id} className="flex items-start">
                        <div className="pt-2 mr-3">
                          <input
                            type="radio"
                            checked={alternativa.correta}
                            onChange={() => atualizarAlternativa(index, 'correta', true)}
                            className="w-4 h-4 text-blue-600"
                          />
                        </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                            <span className="text-sm font-medium text-gray-700 mr-2">
                              {renderizarLetraAlternativa(index)})
                    </span>
                            {alternativa.correta && (
                              <span className="text-xs text-green-600 font-medium">
                                Resposta correta
                    </span>
                            )}
                  </div>
                          <textarea
                    value={alternativa.texto}
                            onChange={(e) => atualizarAlternativa(index, 'texto', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                            placeholder={`Digite a alternativa ${renderizarLetraAlternativa(index)}...`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

                {/* Explicação */}
        <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
            Explicação (opcional)
          </label>
          <textarea
            value={questaoAtual.explicacao}
                    onChange={(e) => setQuestaoAtual({...questaoAtual, explicacao: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Explique a resposta correta (opcional)..."
          />
        </div>
      </div>
              
              <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setMostrarFormQuestao(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                  <button
                  onClick={salvarQuestao}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                  {editandoQuestaoIndex !== null ? 'Atualizar' : 'Adicionar'} Questão
                    </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
} 