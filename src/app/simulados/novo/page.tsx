"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../components/layout/AppLayout';
import { getDisciplines } from '../../../lib/api';
import { gerarSimulado, carregarBancosQuestoes, Questao, BancoQuestoes } from '../../../services/simulados';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '../../../components/ui/Toast';
import { 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Clock, 
  Calendar, 
  HelpCircle, 
  ArrowLeft, 
  ListChecks,
  Search,
  Filter,
  Check,
  Plus,
  X
} from 'lucide-react';
import Link from 'next/link';

interface FormData {
  titulo: string;
  descricao: string;
  disciplinas: string[];
  quantidadeQuestoes: number;
  duracao: number;
  agendado: boolean;
  dataAgendada: string;
  selecaoManual: boolean;
  questoesSelecionadas: Questao[];
}

// Duração padrão (em minutos) por questão
const DURACAO_POR_QUESTAO = 3;

export default function NovoSimuladoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<{id: string, nome: string}[]>([]);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);

  // Novos estados para gerenciar o banco de questões
  const [bancosQuestoes, setBancosQuestoes] = useState<BancoQuestoes[]>([]);
  const [questoesDisponiveis, setQuestoesDisponiveis] = useState<Questao[]>([]);
  const [questoesFiltradas, setQuestoesFiltradas] = useState<Questao[]>([]);
  const [loadingQuestoes, setLoadingQuestoes] = useState(false);
  const [filtroPesquisa, setFiltroPesquisa] = useState('');
  const [filtroDisciplina, setFiltroDisciplina] = useState<string>('todas');
  const [filtroDificuldade, setFiltroDificuldade] = useState<'todas' | 'facil' | 'media' | 'dificil'>('todas');
  const [mostrarSelecaoQuestoes, setMostrarSelecaoQuestoes] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    titulo: '',
    descricao: '',
    disciplinas: [],
    quantidadeQuestoes: 20,
    duracao: 60,
    agendado: false,
    dataAgendada: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
    selecaoManual: false,
    questoesSelecionadas: []
  });

  // Efeito para carregar disciplinas disponíveis
  useEffect(() => {
    carregarDisciplinas();
    carregarBancosDeQuestoes();
  }, []);

  // Efeito para atualizar a duração com base na quantidade de questões
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      duracao: prev.quantidadeQuestoes * DURACAO_POR_QUESTAO
    }));
  }, [formData.quantidadeQuestoes]);

  const carregarDisciplinas = async () => {
    try {
      setLoadingDisciplinas(true);
      
      // 1. Carregar disciplinas da API
      const response = await getDisciplines();
      let disciplinasAPI: {id: string, nome: string}[] = [];
      
      if (response.success && response.disciplines) {
        // Formatar disciplinas para exibição
        disciplinasAPI = response.disciplines.map((d: any) => ({
          id: String(d.Id),
          nome: d.Name.startsWith('User:') ? d.Name.substring(5) : d.Name
        }));
      }
      
      // 2. Carregar disciplinas dos bancos de questões
      const bancos = carregarBancosQuestoes();
      const disciplinasBanco: {id: string, nome: string}[] = [];
      
      // Extrair todas as disciplinas únicas dos bancos de questões
      const disciplinasNomesBanco = new Set<string>();
      bancos.forEach(banco => {
        banco.disciplinas.forEach(nomeDisciplina => {
          disciplinasNomesBanco.add(nomeDisciplina);
        });
      });
      
      // Criar objetos de disciplina para cada nome único
      disciplinasNomesBanco.forEach(nomeDisciplina => {
        disciplinasBanco.push({
          id: `banco_${nomeDisciplina.replace(/\s+/g, '_').toLowerCase()}`,
          nome: nomeDisciplina
        });
      });
      
      // 3. Mesclar as disciplinas, removendo duplicatas pelo nome
      const disciplinasUnicas = new Map<string, {id: string, nome: string}>();
      
      // Primeiro adicionar disciplinas da API
      disciplinasAPI.forEach(disciplina => {
        disciplinasUnicas.set(disciplina.nome.toLowerCase(), disciplina);
      });
      
      // Depois adicionar disciplinas dos bancos que ainda não existem
      disciplinasBanco.forEach(disciplina => {
        if (!disciplinasUnicas.has(disciplina.nome.toLowerCase())) {
          disciplinasUnicas.set(disciplina.nome.toLowerCase(), disciplina);
        }
      });
      
      // Converter o Map para um array
      const todasDisciplinas = Array.from(disciplinasUnicas.values());
      
      // Ordenar por nome
      todasDisciplinas.sort((a, b) => a.nome.localeCompare(b.nome));
      
      setDisciplinasDisponiveis(todasDisciplinas);
      
      if (todasDisciplinas.length === 0) {
        toast.warning('Nenhuma disciplina encontrada. Considere criar algumas disciplinas primeiro.');
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Falha ao carregar disciplinas');
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  // Função para carregar bancos de questões
  const carregarBancosDeQuestoes = async () => {
    try {
      setLoadingQuestoes(true);
      const bancos = carregarBancosQuestoes();
      
      if (bancos.length > 0) {
        setBancosQuestoes(bancos);
        
        // Extrair todas as questões dos bancos
        const todasQuestoes: Questao[] = [];
        bancos.forEach(banco => {
          todasQuestoes.push(...banco.questoes);
        });
        
        setQuestoesDisponiveis(todasQuestoes);
        setQuestoesFiltradas(todasQuestoes);
      } else {
        toast.error('Nenhum banco de questões encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar bancos de questões:', error);
      toast.error('Falha ao carregar questões');
    } finally {
      setLoadingQuestoes(false);
    }
  };
  
  // Função para filtrar questões
  const filtrarQuestoes = () => {
    if (questoesDisponiveis.length === 0) return;
    
    let questoes = [...questoesDisponiveis];
    
    // Filtrar por texto de pesquisa
    if (filtroPesquisa) {
      const termoPesquisa = filtroPesquisa.toLowerCase();
      questoes = questoes.filter(questao => 
        questao.enunciado.toLowerCase().includes(termoPesquisa) || 
        questao.assunto.toLowerCase().includes(termoPesquisa)
      );
    }
    
    // Filtrar por disciplina
    if (filtroDisciplina !== 'todas') {
      questoes = questoes.filter(questao => questao.disciplina === filtroDisciplina);
    }
    
    // Filtrar por dificuldade
    if (filtroDificuldade !== 'todas') {
      questoes = questoes.filter(questao => questao.dificuldade === filtroDificuldade);
    }
    
    // Filtrar por disciplinas selecionadas no formulário, se não estiver filtrando por uma disciplina específica
    if (filtroDisciplina === 'todas' && formData.disciplinas.length > 0) {
      const disciplinasNomes = formData.disciplinas.map(id => {
        const disciplina = disciplinasDisponiveis.find(d => d.id === id);
        return disciplina ? disciplina.nome : '';
      }).filter(Boolean);
      
      if (disciplinasNomes.length > 0) {
        questoes = questoes.filter(questao => disciplinasNomes.includes(questao.disciplina));
      }
    }
    
    setQuestoesFiltradas(questoes);
  };
  
  // Efeito para atualizar questões filtradas quando os filtros mudam
  useEffect(() => {
    filtrarQuestoes();
  }, [filtroPesquisa, filtroDisciplina, filtroDificuldade, formData.disciplinas, questoesDisponiveis]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>, min: number, max: number) => {
    const { name, value } = e.target;
    const numValue = parseInt(value);
    
    if (isNaN(numValue)) return;
    
    const limitedValue = Math.min(Math.max(numValue, min), max);
    
    setFormData(prev => ({
      ...prev,
      [name]: limitedValue
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleDisciplinaToggle = (disciplinaId: string) => {
    setFormData(prev => {
      const disciplinas = prev.disciplinas.includes(disciplinaId)
        ? prev.disciplinas.filter(id => id !== disciplinaId)
        : [...prev.disciplinas, disciplinaId];
      
      return {
        ...prev,
        disciplinas
      };
    });
  };

  const handleNext = () => {
    if (step === 1) {
      // Validar campos da primeira etapa
      if (!formData.titulo.trim()) {
        toast.error('Por favor, insira um título para o simulado');
        return;
      }
      
      if (formData.disciplinas.length === 0) {
        toast.error('Selecione pelo menos uma disciplina');
        return;
      }
    }
    
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validar campos obrigatórios
      if (!formData.titulo.trim()) {
        throw new Error('Por favor, insira um título para o simulado');
      }
      
      if (formData.disciplinas.length === 0) {
        throw new Error('Selecione pelo menos uma disciplina');
      }
      
      if (formData.selecaoManual && formData.questoesSelecionadas.length === 0) {
        throw new Error('Selecione pelo menos uma questão para o simulado');
      }
      
      if (!formData.selecaoManual && formData.quantidadeQuestoes <= 0) {
        throw new Error('A quantidade de questões deve ser maior que zero');
      }
      
      if (formData.duracao <= 0) {
        throw new Error('A duração do simulado deve ser maior que zero');
      }
      
      // Se for agendado, validar data
      if (formData.agendado) {
        const dataAgendada = new Date(formData.dataAgendada);
        const agora = new Date();
        
        if (dataAgendada <= agora) {
          throw new Error('A data agendada deve ser futura');
        }
      }
      
      // Mapear IDs de disciplinas para nomes
      const disciplinasNomes = formData.disciplinas.map(id => {
        const disciplina = disciplinasDisponiveis.find(d => d.id === id);
        if (disciplina) {
          // Para disciplinas do banco, já temos o nome diretamente
          if (String(disciplina.id).startsWith('banco_')) {
            return disciplina.nome;
          }
          // Para disciplinas da API, retornamos o nome
          return disciplina.nome;
        }
        return '';
      }).filter(Boolean);
      
      // Gerar simulado
      const simulado = gerarSimulado(
        formData.titulo,
        disciplinasNomes,
        formData.selecaoManual ? formData.questoesSelecionadas.length : formData.quantidadeQuestoes,
        formData.duracao,
        formData.agendado ? formData.dataAgendada : undefined,
        formData.descricao || undefined,
        formData.selecaoManual ? formData.questoesSelecionadas : undefined // Passar questões selecionadas manualmente
      );
      
      if (simulado) {
        toast.success('Simulado criado com sucesso!');
        
        // Redirecionar para a página do simulado criado
        setTimeout(() => {
          router.push(`/simulados/${simulado.id}`);
        }, 1500);
      } else {
        throw new Error('Erro ao criar simulado');
      }
    } catch (error) {
      console.error('Erro ao criar simulado:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar simulado');
    } finally {
      setLoading(false);
    }
  };

  // Função para alternar entre seleção manual e aleatória
  const toggleSelecaoManual = () => {
    setFormData(prev => ({
      ...prev,
      selecaoManual: !prev.selecaoManual,
      // Se desativar a seleção manual, limpar as questões selecionadas
      questoesSelecionadas: !prev.selecaoManual ? prev.questoesSelecionadas : []
    }));
  };
  
  // Função para alternar seleção de uma questão
  const toggleQuestaoSelecionada = (questao: Questao) => {
    setFormData(prev => {
      // Verificar se a questão já está selecionada
      const jaEstaSelecionada = prev.questoesSelecionadas.some(q => q.id === questao.id);
      
      // Se já está selecionada, remover
      if (jaEstaSelecionada) {
        return {
          ...prev,
          questoesSelecionadas: prev.questoesSelecionadas.filter(q => q.id !== questao.id),
          // Atualizar quantidade de questões
          quantidadeQuestoes: prev.questoesSelecionadas.length - 1
        };
      }
      
      // Se não está selecionada, adicionar
      return {
        ...prev,
        questoesSelecionadas: [...prev.questoesSelecionadas, questao],
        // Atualizar quantidade de questões
        quantidadeQuestoes: prev.questoesSelecionadas.length + 1
      };
    });
  };
  
  // Função para verificar se uma questão está selecionada
  const isQuestaoSelecionada = (questaoId: string) => {
    return formData.questoesSelecionadas.some(q => q.id === questaoId);
  };
  
  // Função para formatar a exibição da dificuldade
  const formatarDificuldade = (dificuldade: 'facil' | 'media' | 'dificil') => {
    switch (dificuldade) {
      case 'facil': return 'Fácil';
      case 'media': return 'Média';
      case 'dificil': return 'Difícil';
    }
  };
  
  // Função para obter classes de cor com base na dificuldade
  const corDificuldade = (dificuldade: 'facil' | 'media' | 'dificil') => {
    switch (dificuldade) {
      case 'facil': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'dificil': return 'bg-red-100 text-red-800';
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-6">
          <Link 
            href="/simulados" 
            className="group flex items-center text-gray-600 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar para Simulados</span>
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Criar Novo Simulado</h1>
          <p className="text-gray-600">Configure seu simulado personalizado para avaliar seu conhecimento</p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                1
              </div>
              <div className="ml-2">
                <p className={`font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-600'}`}>Configuração Básica</p>
              </div>
            </div>
            
            <div className="flex-1 mx-4">
              <div className={`h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            </div>
            
            <div className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                2
              </div>
              <div className="ml-2">
                <p className={`font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-600'}`}>Revisar e Criar</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-md">
                <ListChecks className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-semibold text-gray-800">
                {step === 1 ? 'Informações do Simulado' : 'Revisar e Confirmar'}
              </h2>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              {/* Etapa 1: Configuração básica */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Título */}
                  <div>
                    <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                      Título do Simulado *
                    </label>
                    <input
                      type="text"
                      id="titulo"
                      name="titulo"
                      value={formData.titulo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Simulado de Anatomia - Módulo 2"
                      required
                    />
                  </div>
                  
                  {/* Descrição */}
                  <div>
                    <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição (opcional)
                    </label>
                    <textarea
                      id="descricao"
                      name="descricao"
                      value={formData.descricao}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Uma breve descrição sobre o conteúdo do simulado..."
                    />
                  </div>
                  
                  {/* Disciplinas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Disciplinas *
                    </label>
                    
                    {loadingDisciplinas ? (
                      <div className="flex justify-center">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="ml-2 text-sm text-gray-500">Carregando disciplinas...</span>
                      </div>
                    ) : disciplinasDisponiveis.length > 0 ? (
                      <>
                        <div className="flex justify-between mb-3">
                          <div className="flex space-x-4 text-xs text-gray-500">
                            <span>
                              Total: {disciplinasDisponiveis.length} disciplina(s)
                            </span>
                            <span>
                              Da API: {disciplinasDisponiveis.filter(d => !String(d.id).startsWith('banco_')).length}
                            </span>
                            <span>
                              Dos bancos: {disciplinasDisponiveis.filter(d => String(d.id).startsWith('banco_')).length}
                            </span>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => window.open('/simulados/questoes', '_blank')}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Gerenciar bancos de questões
                            </button>
                          </div>
                        </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {disciplinasDisponiveis.map(disciplina => (
                          <div
                            key={disciplina.id}
                            className={`
                              p-3 rounded-lg border cursor-pointer transition-all
                              ${formData.disciplinas.includes(disciplina.id)
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                            onClick={() => handleDisciplinaToggle(disciplina.id)}
                          >
                            <div className="flex items-center">
                              <div className={`
                                h-5 w-5 rounded-full flex items-center justify-center mr-2
                                ${formData.disciplinas.includes(disciplina.id)
                                  ? 'bg-blue-500 text-white'
                                  : 'border border-gray-300'
                                }
                              `}>
                                {formData.disciplinas.includes(disciplina.id) && (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                              <span className="text-sm">
                                {disciplina.nome}
                                </span>
                                {String(disciplina.id).startsWith('banco_') && (
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                      Banco de questões
                              </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      </>
                    ) : (
                      <div className="text-center py-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 mb-2">Nenhuma disciplina disponível</p>
                        <Link href="/disciplinas" className="text-blue-600 hover:underline">
                          Adicionar disciplinas
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  {/* Quantidade de questões */}
                  <div>
                    <label htmlFor="quantidadeQuestoes" className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade de Questões *
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        id="quantidadeQuestoes"
                        name="quantidadeQuestoes"
                        value={formData.quantidadeQuestoes}
                        onChange={(e) => handleNumberChange(e, 5, 100)}
                        min="5"
                        max="100"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={formData.selecaoManual}
                      />
                      <div className="ml-4 bg-blue-50 px-3 py-1 rounded-md">
                        <span className="text-sm text-blue-700">Duração estimada: {formData.duracao} minutos</span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Recomendamos de 20 a 50 questões para um simulado eficaz
                    </p>
                  </div>
                  
                  {/* Seleção manual de questões */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="selecaoManual"
                          checked={formData.selecaoManual}
                          onChange={toggleSelecaoManual}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="selecaoManual" className="ml-2 block text-sm font-medium text-gray-700">
                          Selecionar questões manualmente
                        </label>
                      </div>
                      
                      {formData.selecaoManual && (
                        <span className="text-sm text-blue-600 font-medium">
                          {formData.questoesSelecionadas.length} questões selecionadas
                        </span>
                      )}
                    </div>
                    
                    {formData.selecaoManual && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setMostrarSelecaoQuestoes(true)}
                          className="w-full py-3 px-4 border border-dashed border-blue-400 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 flex items-center justify-center"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          <span>Selecionar questões do banco</span>
                        </button>
                        
                        {formData.questoesSelecionadas.length > 0 && (
                          <div className="mt-3 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Questões selecionadas:</h4>
                            <div className="space-y-2">
                              {formData.questoesSelecionadas.map((questao, index) => (
                                <div key={questao.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                                  <div className="flex items-center space-x-2">
                                    <div className="bg-blue-100 text-blue-800 rounded-full h-6 w-6 flex items-center justify-center text-xs font-medium">
                                      {index + 1}
                                    </div>
                                    <div className="text-sm text-gray-700 truncate max-w-xs">{questao.enunciado}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleQuestaoSelecionada(questao)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Duração */}
                  <div>
                    <label htmlFor="duracao" className="block text-sm font-medium text-gray-700 mb-1">
                      Duração (minutos) *
                    </label>
                    <input
                      type="number"
                      id="duracao"
                      name="duracao"
                      value={formData.duracao}
                      onChange={(e) => handleNumberChange(e, 10, 240)}
                      min="10"
                      max="240"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Tempo recomendado: {DURACAO_POR_QUESTAO} minutos por questão
                    </p>
                  </div>
                  
                  {/* Agendar */}
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="agendado"
                        name="agendado"
                        checked={formData.agendado}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="agendado" className="ml-2 block text-sm font-medium text-gray-700">
                        Agendar para uma data específica
                      </label>
                    </div>
                    
                    {formData.agendado && (
                      <div className="mt-3">
                        <label htmlFor="dataAgendada" className="block text-sm font-medium text-gray-700 mb-1">
                          Data e Hora *
                        </label>
                        <input
                          type="datetime-local"
                          id="dataAgendada"
                          name="dataAgendada"
                          value={formData.dataAgendada}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required={formData.agendado}
                          min={format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Etapa 2: Revisão e Confirmação */}
              {step === 2 && (
                <div>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <div className="flex">
                      <HelpCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-700">
                          Confira as informações do seu simulado antes de criá-lo. Após a criação, você poderá iniciá-lo imediatamente ou na data agendada.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Resumo do Simulado */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo do Simulado</h3>
                      
                      <div className="space-y-4">
                        <div className="flex">
                          <span className="text-gray-500 w-1/3">Título:</span>
                          <span className="text-gray-800 font-medium">{formData.titulo}</span>
                        </div>
                        
                        {formData.descricao && (
                          <div className="flex">
                            <span className="text-gray-500 w-1/3">Descrição:</span>
                            <span className="text-gray-800">{formData.descricao}</span>
                          </div>
                        )}
                        
                        <div className="flex">
                          <span className="text-gray-500 w-1/3">Disciplinas:</span>
                          <div className="flex flex-wrap gap-2">
                            {formData.disciplinas.map(id => {
                              const disciplina = disciplinasDisponiveis.find(d => d.id === id);
                              return disciplina ? (
                                <span 
                                  key={id} 
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                                >
                                  {disciplina.nome}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                        
                        <div className="flex">
                          <span className="text-gray-500 w-1/3">Questões:</span>
                          <div className="flex items-center">
                            <span className="text-gray-800 font-medium">{formData.quantidadeQuestoes}</span>
                            <span className="text-gray-500 mx-2">•</span>
                            <Clock className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-gray-800">{formData.duracao} minutos</span>
                          </div>
                        </div>
                        
                        <div className="flex">
                          <span className="text-gray-500 w-1/3">Data:</span>
                          <div>
                            {formData.agendado ? (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-blue-600 mr-1" />
                                <span className="text-blue-800 font-medium">
                                  {format(new Date(formData.dataAgendada), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-green-600 font-medium">Disponível imediatamente após a criação</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Alertas */}
                    {formData.quantidadeQuestoes > 50 && (
                      <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                        <div className="flex">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-amber-700">
                              Você selecionou uma quantidade grande de questões ({formData.quantidadeQuestoes}). 
                              Certifique-se de que terá tempo suficiente para completar o simulado.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Botões de navegação */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Voltar
                </button>
              ) : (
                <div></div>
              )}
              
              {step < 2 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 flex items-center"
                >
                  {loading && (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  )}
                  Criar Simulado
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      
      {/* Modal para seleção de questões */}
      {mostrarSelecaoQuestoes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Selecionar Questões
              </h2>
              <button
                onClick={() => setMostrarSelecaoQuestoes(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Filtros */}
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={filtroPesquisa}
                      onChange={(e) => setFiltroPesquisa(e.target.value)}
                      placeholder="Pesquisar questões..."
                      className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="sm:w-40">
                  <select
                    value={filtroDisciplina}
                    onChange={(e) => setFiltroDisciplina(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todas">Todas disciplinas</option>
                    {/* Extrair disciplinas únicas de todos os bancos de questões */}
                    {Array.from(
                      new Set(
                        questoesDisponiveis.map(q => q.disciplina)
                      )
                    ).sort().map(disciplina => (
                      <option key={disciplina} value={disciplina}>
                        {disciplina}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="sm:w-40">
                  <select
                    value={filtroDificuldade}
                    onChange={(e) => setFiltroDificuldade(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todas">Todas dificuldades</option>
                    <option value="facil">Fácil</option>
                    <option value="media">Média</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Lista de questões */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingQuestoes ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="ml-3 text-gray-600">Carregando questões...</span>
                </div>
              ) : questoesFiltradas.length > 0 ? (
                <div className="space-y-4">
                  {questoesFiltradas.map((questao) => (
                    <div 
                      key={questao.id} 
                      className={`
                        border rounded-lg p-4 transition-colors cursor-pointer
                        ${isQuestaoSelecionada(questao.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'}
                      `}
                      onClick={() => toggleQuestaoSelecionada(questao)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
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
                          
                          <p className="text-gray-800 mb-3">{questao.enunciado}</p>
                          
                          <div className="space-y-2 mt-2">
                            {questao.alternativas.map((alternativa, index) => (
                              <div 
                                key={alternativa.id} 
                                className={`p-2 rounded text-sm ${alternativa.correta ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}
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
                        </div>
                        
                        <div className="ml-4">
                          <div 
                            className={`
                              h-6 w-6 rounded-full flex items-center justify-center
                              ${isQuestaoSelecionada(questao.id) 
                                ? 'bg-blue-500 text-white' 
                                : 'border border-gray-300'}
                            `}
                          >
                            {isQuestaoSelecionada(questao.id) && <Check className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Filter className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-gray-800 font-medium mb-2">Nenhuma questão encontrada</h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto">
                    Tente ajustar os filtros ou adicione novas questões ao banco de questões.
                  </p>
                  <Link
                    href="/simulados/questoes"
                    className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span>Gerenciar banco de questões</span>
                  </Link>
                </div>
              )}
            </div>
            
            {/* Rodapé com contadores e botões */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
              <div className="text-gray-600">
                {questoesFiltradas.length} questões disponíveis &middot; {formData.questoesSelecionadas.length} selecionadas
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarSelecaoQuestoes(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarSelecaoQuestoes(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Confirmar Seleção
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
} 