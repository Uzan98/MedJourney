'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { ArrowLeft, ArrowRight, Save, Plus, Check, Clock, Calendar, BookOpen, Heart, BarChart2, Filter, BookCheck, AlertCircle, Search, CheckCircle2, Clock8, Trash, BookmarkCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { criarPlanoEstudo, getDisciplines, convertToPlanDisciplines, adicionarSessaoEstudo } from '@/services';
import { StudyPlanCreate, PlanDiscipline, Priority, TimeAvailability } from '@/lib/types/planning';
import { gerarSessoesAutomaticas } from '@/utils/session-scheduler';

// Função para obter ícone baseado no ID da disciplina
const getDisciplineIcon = (id: number) => {
  switch (id) {
    case 1: return <Heart className="h-5 w-5" />; // Anatomia
    case 2: return <BarChart2 className="h-5 w-5" />; // Fisiologia
    case 3: return <Filter className="h-5 w-5" />; // Bioquímica
    case 4: return <BookCheck className="h-5 w-5" />; // Farmacologia
    case 5: return <AlertCircle className="h-5 w-5" />; // Patologia
    case 6: return <Search className="h-5 w-5" />; // Microbiologia
    case 7: return <CheckCircle2 className="h-5 w-5" />; // Semiologia
    case 8: return <Clock8 className="h-5 w-5" />; // Clínica Médica
    default: return <BookOpen className="h-5 w-5" />;
  }
};

// Cores para as disciplinas
const disciplinasColors: Record<number, { bg: string, text: string }> = {
  1: { bg: 'bg-red-100', text: 'text-red-600' }, // Anatomia
  2: { bg: 'bg-blue-100', text: 'text-blue-600' }, // Fisiologia
  3: { bg: 'bg-green-100', text: 'text-green-600' }, // Bioquímica
  4: { bg: 'bg-orange-100', text: 'text-orange-600' }, // Farmacologia
  5: { bg: 'bg-purple-100', text: 'text-purple-600' }, // Patologia
  6: { bg: 'bg-yellow-100', text: 'text-yellow-600' }, // Microbiologia
  7: { bg: 'bg-teal-100', text: 'text-teal-600' }, // Semiologia
  8: { bg: 'bg-indigo-100', text: 'text-indigo-600' }, // Clínica Médica
};

// Valor de dificuldade
const dificuldadeOptions = [
  { value: 'baixa', label: 'Baixa', color: 'bg-green-100 text-green-600' },
  { value: 'média', label: 'Média', color: 'bg-yellow-100 text-yellow-600' },
  { value: 'alta', label: 'Alta', color: 'bg-red-100 text-red-600' },
];

// Valor de importância
const importanciaOptions = [
  { value: 'baixa', label: 'Baixa', color: 'bg-gray-100 text-gray-600' },
  { value: 'média', label: 'Média', color: 'bg-blue-100 text-blue-600' },
  { value: 'alta', label: 'Alta', color: 'bg-purple-100 text-purple-600' },
];

// Dias da semana para disponibilidade
const diasDaSemana = [
  { id: 0, nome: 'Domingo' },
  { id: 1, nome: 'Segunda' },
  { id: 2, nome: 'Terça' },
  { id: 3, nome: 'Quarta' },
  { id: 4, nome: 'Quinta' },
  { id: 5, nome: 'Sexta' },
  { id: 6, nome: 'Sábado' },
];

// Tipo para disciplina na interface de seleção
interface DisciplineOption {
  id: number;
  name: string;
  selected: boolean;
  subjects: {
    id: number;
    name: string;
    selected: boolean;
    priority: Priority;
    hours: number;
    difficulty: string;
    importance: string;
  }[];
}

// Tipo para armazenar os dados do formulário entre etapas
interface FormData {
  // Etapa 1 - Informações básicas
  nome: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  
  // Etapa 2 - Disciplinas e assuntos
  disciplinas: DisciplineOption[];
  
  // Etapa 3 - Disponibilidade
  disponibilidade: TimeAvailability[];
  
  // Etapa 4 - Cronograma gerado
  cronogramaGerado: boolean;
}

export default function PlanejamentoInteligenteWizard() {
  const router = useRouter();
  
  // Estado para controlar a etapa atual do wizard
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para armazenar os dados do formulário
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    descricao: '',
    dataInicio: '',
    dataFim: '',
    disciplinas: [],
    disponibilidade: [],
    cronogramaGerado: false
  });
  
  // Carregar disciplinas quando o componente for montado
  useEffect(() => {
    async function carregarDisciplinas() {
      setIsLoading(true);
      try {
        const disciplinasAPI = await getDisciplines();
        
        // Converter para formato de opções
        const options: DisciplineOption[] = disciplinasAPI.map(d => ({
          id: d.id,
          name: d.name,
          selected: false,
          subjects: d.subjects.map(s => ({
            id: s.id,
            name: s.name,
            selected: false,
            priority: 'média' as Priority,
            hours: 4,
            difficulty: 'média',
            importance: 'média'
          }))
        }));
        
        setFormData(prev => ({
          ...prev,
          disciplinas: options
        }));
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        toast.error('Não foi possível carregar as disciplinas disponíveis');
      } finally {
        setIsLoading(false);
      }
    }

    if (etapaAtual === 2 && formData.disciplinas.length === 0) {
      carregarDisciplinas();
    }
  }, [etapaAtual, formData.disciplinas.length]);
  
  // Handlers de navegação entre etapas
  const avancarEtapa = () => {
    if (validarEtapaAtual()) {
      setEtapaAtual(prev => Math.min(prev + 1, 4));
    }
  };
  
  const voltarEtapa = () => {
    setEtapaAtual(prev => Math.max(prev - 1, 1));
  };
  
  // Validação de cada etapa
  const validarEtapaAtual = (): boolean => {
    switch (etapaAtual) {
      case 1:
        if (!formData.nome.trim()) {
          toast.error('O nome do plano é obrigatório');
          return false;
        }
        if (!formData.dataInicio || !formData.dataFim) {
          toast.error('As datas de início e término são obrigatórias');
          return false;
        }
        return true;
        
      case 2:
        const disciplinasSelecionadas = formData.disciplinas.filter(d => d.selected);
        if (disciplinasSelecionadas.length === 0) {
          toast.error('Selecione pelo menos uma disciplina');
          return false;
        }
        
        const disciplinasSemAssuntos = disciplinasSelecionadas.filter(
          d => !d.subjects.some(s => s.selected)
        );
        
        if (disciplinasSemAssuntos.length > 0) {
          toast.error(`Selecione pelo menos um assunto para ${disciplinasSemAssuntos[0].name}`);
          return false;
        }
        return true;
        
      case 3:
        if (formData.disponibilidade.length === 0) {
          toast.error('Adicione pelo menos um horário disponível para estudos');
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  // Função para renderizar o conteúdo baseado na etapa atual
  const renderEtapaAtual = () => {
    switch (etapaAtual) {
      case 1:
        return renderEtapa1();
      case 2:
        return renderEtapa2();
      case 3:
        return renderEtapa3();
      case 4:
        return renderEtapa4();
      default:
        return null;
    }
  };
  
  // Etapa 1: Informações básicas do plano
  const renderEtapa1 = () => {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas do Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Plano *
              </label>
              <input
                id="nome"
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Preparação para Residência 2024"
                required
              />
            </div>
            
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva o objetivo do seu plano de estudos"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Início *
                </label>
                <input
                  id="dataInicio"
                  type="date"
                  value={formData.dataInicio}
                  onChange={(e) => setFormData({...formData, dataInicio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Término *
                </label>
                <input
                  id="dataFim"
                  type="date"
                  value={formData.dataFim}
                  onChange={(e) => setFormData({...formData, dataFim: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/planejamento">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button onClick={avancarEtapa}>
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };
  
  // Etapa 2: Seleção de disciplinas e assuntos
  const renderEtapa2 = () => {
    if (isLoading) {
      return (
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Disciplinas e Assuntos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-8">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="ml-3 text-gray-500">Carregando disciplinas...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Funções para gerenciar a seleção de disciplinas e assuntos
    const toggleDiscipline = (disciplineId: number) => {
      setFormData(prev => ({
        ...prev,
        disciplinas: prev.disciplinas.map(d => {
          if (d.id === disciplineId) {
            const selected = !d.selected;
            
            // Se selecionar a disciplina, não seleciona todos os assuntos automaticamente
            return {
              ...d,
              selected
            };
          }
          return d;
        })
      }));
    };
    
    const toggleSubject = (disciplineId: number, subjectId: number) => {
      setFormData(prev => ({
        ...prev,
        disciplinas: prev.disciplinas.map(d => {
          if (d.id === disciplineId) {
            // Alterna seleção do assunto
            const subjects = d.subjects.map(s => {
              if (s.id === subjectId) {
                return { ...s, selected: !s.selected };
              }
              return s;
            });
            
            // Se pelo menos um assunto estiver selecionado, a disciplina deve estar selecionada
            const anySubjectSelected = subjects.some(s => s.selected);
            
            return {
              ...d,
              selected: anySubjectSelected,
              subjects
            };
          }
          return d;
        })
      }));
    };
    
    const updateSubjectDifficulty = (disciplineId: number, subjectId: number, difficulty: string) => {
      setFormData(prev => ({
        ...prev,
        disciplinas: prev.disciplinas.map(d => {
          if (d.id === disciplineId) {
            return {
              ...d,
              subjects: d.subjects.map(s => {
                if (s.id === subjectId) {
                  return { ...s, difficulty };
                }
                return s;
              })
            };
          }
          return d;
        })
      }));
    };
    
    const updateSubjectImportance = (disciplineId: number, subjectId: number, importance: string) => {
      setFormData(prev => ({
        ...prev,
        disciplinas: prev.disciplinas.map(d => {
          if (d.id === disciplineId) {
            return {
              ...d,
              subjects: d.subjects.map(s => {
                if (s.id === subjectId) {
                  return { ...s, importance };
                }
                return s;
              })
            };
          }
          return d;
        })
      }));
    };
    
    const updateSubjectHours = (disciplineId: number, subjectId: number, hours: number) => {
      setFormData(prev => ({
        ...prev,
        disciplinas: prev.disciplinas.map(d => {
          if (d.id === disciplineId) {
            return {
              ...d,
              subjects: d.subjects.map(s => {
                if (s.id === subjectId) {
                  return { ...s, hours: Math.max(1, hours) }; // Mínimo de 1 hora
                }
                return s;
              })
            };
          }
          return d;
        })
      }));
    };

    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Selecione Disciplinas e Assuntos</CardTitle>
            <p className="text-sm text-gray-500">
              Selecione as disciplinas e assuntos que deseja incluir no seu plano de estudos. Classifique cada assunto quanto à dificuldade e importância para que o planejamento seja mais eficiente.
            </p>
          </CardHeader>
          <CardContent>
            {formData.disciplinas.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">Nenhuma disciplina disponível</p>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.disciplinas.map((disciplina) => (
                  <div key={disciplina.id} className="border border-gray-200 rounded-md overflow-hidden">
                    {/* Cabeçalho da disciplina */}
                    <div 
                      className={`flex items-center justify-between p-4 cursor-pointer ${
                        disciplina.selected 
                          ? 'bg-blue-50 border-b border-blue-100' 
                          : 'bg-gray-50 border-b border-gray-100'
                      }`}
                      onClick={() => toggleDiscipline(disciplina.id)}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={disciplina.selected}
                          onChange={() => toggleDiscipline(disciplina.id)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <div className={`ml-3 flex items-center ${disciplinasColors[disciplina.id]?.text || 'text-blue-600'}`}>
                          <div className={`p-2 rounded-full ${disciplinasColors[disciplina.id]?.bg || 'bg-blue-100'}`}>
                            {getDisciplineIcon(disciplina.id)}
                          </div>
                          <span className="ml-2 font-medium">{disciplina.name}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Lista de assuntos */}
                    <div className={disciplina.selected ? 'p-4' : 'hidden'}>
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Assuntos:</h4>
                        <div className="space-y-4">
                          {disciplina.subjects.map((assunto) => (
                            <div key={assunto.id} className="py-3">
                              <div className="flex items-center mb-2">
                                <input
                                  type="checkbox"
                                  checked={assunto.selected}
                                  onChange={() => toggleSubject(disciplina.id, assunto.id)}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                                <span className="ml-2 font-medium">{assunto.name}</span>
                              </div>
                              
                              {assunto.selected && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-6 pt-2">
                                  {/* Dificuldade */}
                                  <div>
                                    <label className="block text-xs text-gray-500">
                                      Dificuldade
                                    </label>
                                    <div className="flex space-x-2 mt-1">
                                      {dificuldadeOptions.map(option => (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => updateSubjectDifficulty(
                                            disciplina.id,
                                            assunto.id,
                                            option.value
                                          )}
                                          className={`px-2 py-1 rounded-full text-xs font-medium
                                            ${assunto.difficulty === option.value
                                              ? option.color
                                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                          {option.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Importância */}
                                  <div>
                                    <label className="block text-xs text-gray-500">
                                      Importância
                                    </label>
                                    <div className="flex space-x-2 mt-1">
                                      {importanciaOptions.map(option => (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => updateSubjectImportance(
                                            disciplina.id,
                                            assunto.id,
                                            option.value
                                          )}
                                          className={`px-2 py-1 rounded-full text-xs font-medium
                                            ${assunto.importance === option.value
                                              ? option.color
                                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                          {option.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Horas estimadas */}
      <div>
                                    <label className="block text-xs text-gray-500">
                                      Horas estimadas
                                    </label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                      <input
                                        type="number"
                                        min="1"
                                        value={assunto.hours}
                                        onChange={(e) => updateSubjectHours(
                                          disciplina.id,
                                          assunto.id,
                                          parseInt(e.target.value) || 1
                                        )}
                                        className="block w-full flex-1 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 pl-3 pr-2 py-1 text-sm"
                                      />
                                      <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-2 text-gray-500 text-sm">
                                        horas
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={voltarEtapa}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button onClick={avancarEtapa}>
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };
  
  // Etapa 3: Definição de disponibilidade
  const renderEtapa3 = () => {
    // Funções para gerenciar a disponibilidade de horário
    const adicionarDisponibilidade = () => {
      // Adicionar um novo período de disponibilidade com valores padrão
      const novaDisponibilidade: TimeAvailability = {
        dayOfWeek: 1, // Segunda-feira
        startTime: "08:00",
        endTime: "10:00",
        durationMinutes: 120 // 2 horas
      };
      
      setFormData(prev => ({
        ...prev,
        disponibilidade: [...prev.disponibilidade, novaDisponibilidade]
      }));
    };
    
    const removerDisponibilidade = (index: number) => {
      setFormData(prev => ({
        ...prev,
        disponibilidade: prev.disponibilidade.filter((_, i) => i !== index)
      }));
    };
    
    const atualizarDisponibilidade = (index: number, campo: keyof TimeAvailability, valor: any) => {
      setFormData(prev => {
        const novaDisponibilidade = [...prev.disponibilidade];
        novaDisponibilidade[index] = {
          ...novaDisponibilidade[index],
          [campo]: valor
        };
        
        // Se atualizar o horário de início ou fim, recalcular a duração
        if (campo === 'startTime' || campo === 'endTime') {
          const start = new Date(`2000-01-01T${novaDisponibilidade[index].startTime}`);
          const end = new Date(`2000-01-01T${novaDisponibilidade[index].endTime}`);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            // Calcular duração em minutos
            let durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            
            // Se a duração for negativa (horário de fim antes do início), ajustar considerando 24h
            if (durationMinutes < 0) {
              durationMinutes += 24 * 60;
            }
            
            novaDisponibilidade[index].durationMinutes = durationMinutes;
          }
        }
        
        return {
          ...prev,
          disponibilidade: novaDisponibilidade
        };
      });
    };
    
    const calcularHorasSemanais = (): number => {
      return formData.disponibilidade.reduce((total, periodo) => {
        return total + periodo.durationMinutes / 60;
      }, 0);
    };

    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Disponibilidade de Horários</CardTitle>
            <p className="text-sm text-gray-500">
              Defina os períodos em que você estará disponível para estudar. Isso ajudará a distribuir as sessões de estudo de forma otimizada.
            </p>
          </CardHeader>
          <CardContent>
            {formData.disponibilidade.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-gray-300 rounded-lg">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 mb-4">Você ainda não adicionou períodos de disponibilidade</p>
                <Button onClick={adicionarDisponibilidade}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Horário
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-md font-medium">Seus horários disponíveis</h3>
                    <p className="text-sm text-gray-500">Total: {calcularHorasSemanais().toFixed(1)} horas semanais</p>
                  </div>
                  <Button onClick={adicionarDisponibilidade} size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Adicionar
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {formData.disponibilidade.map((periodo, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap items-center gap-4">
                      {/* Dia da semana */}
                      <div className="flex-grow min-w-[150px]">
                        <label className="block text-xs text-gray-500 mb-1">Dia da Semana</label>
                        <select 
                          value={periodo.dayOfWeek}
                          onChange={(e) => atualizarDisponibilidade(index, 'dayOfWeek', parseInt(e.target.value))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          {diasDaSemana.map(dia => (
                            <option key={dia.id} value={dia.id}>
                              {dia.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Horário de início */}
                      <div className="flex-grow min-w-[120px]">
                        <label className="block text-xs text-gray-500 mb-1">Horário de Início</label>
                        <input
                          type="time"
                          value={periodo.startTime}
                          onChange={(e) => atualizarDisponibilidade(index, 'startTime', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Horário de fim */}
                      <div className="flex-grow min-w-[120px]">
                        <label className="block text-xs text-gray-500 mb-1">Horário de Término</label>
                        <input
                          type="time"
                          value={periodo.endTime}
                          onChange={(e) => atualizarDisponibilidade(index, 'endTime', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      
                      {/* Duração calculada */}
                      <div className="flex-grow min-w-[120px]">
                        <label className="block text-xs text-gray-500 mb-1">Duração</label>
                        <div className="text-sm py-2 px-3 bg-white border border-gray-300 rounded-md">
                          {Math.floor(periodo.durationMinutes / 60)}h {periodo.durationMinutes % 60}min
                        </div>
                      </div>
                      
                      {/* Botão de remover */}
                      <div className="flex justify-end items-end">
                        <button
                          type="button"
                          onClick={() => removerDisponibilidade(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          aria-label="Remover horário"
                        >
                          <Trash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
      <div>
                      <h4 className="font-medium text-blue-800">Dica de planejamento</h4>
                      <p className="text-sm text-blue-600 mt-1">
                        Para um estudo eficiente, recomenda-se pelo menos 2 horas diárias em períodos contínuos. 
                        Distribua o tempo ao longo da semana, incluindo finais de semana para revisão de conteúdo.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={voltarEtapa}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button onClick={avancarEtapa}>
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };
  
  // Função para gerar o cronograma de estudo baseado nas informações fornecidas
  const gerarCronograma = () => {
    setIsSubmitting(true);
    
    setTimeout(() => {
      // Simulação da geração de cronograma
      // Em uma implementação real, aqui seria feita uma chamada à API ou algoritmo
      // que distribui os assuntos baseado na dificuldade, importância e disponibilidade
      
      setFormData(prev => ({
        ...prev,
        cronogramaGerado: true
      }));
      
      setIsSubmitting(false);
    }, 2000);
  };
  
  // Função para criar o plano de estudo com o cronograma gerado
  const finalizarPlano = async () => {
    setIsSubmitting(true);
    
    try {
      // Preparar disciplinas selecionadas
      const selectedDisciplines = formData.disciplinas
        .filter(d => d.selected)
        .map(d => ({
          id: d.id,
          name: d.name,
          subjects: d.subjects
            .filter(s => s.selected)
            .map(s => ({
              id: s.id,
              name: s.name,
              priority: s.priority,
              hours: s.hours,
              difficulty: s.difficulty,
              importance: s.importance
            }))
        }));

      if (selectedDisciplines.length === 0) {
        toast.error('Selecione pelo menos uma disciplina para criar o plano');
        setIsSubmitting(false);
        return;
      }

      // Verificar se há assuntos selecionados
      const temAssuntos = selectedDisciplines.some(d => d.subjects.length > 0);
      if (!temAssuntos) {
        toast.error('Selecione pelo menos um assunto para criar o plano');
        setIsSubmitting(false);
        return;
      }

      // Criar plano
      const planData: StudyPlanCreate = {
        name: formData.nome,
        description: formData.descricao,
        startDate: formData.dataInicio || undefined,
        endDate: formData.dataFim || undefined,
        status: 'ativo',
        disciplines: selectedDisciplines
      };

      console.log("Criando plano de estudos:", JSON.stringify(planData));
      const novoPlanejamento = await criarPlanoEstudo(planData);
      
      if (novoPlanejamento) {
        toast.success('Plano de estudo inteligente criado com sucesso');
        
        // Gerar e adicionar sessões de estudo automaticamente
        if (formData.disponibilidade.length > 0) {
          try {
            console.log("Iniciando geração de sessões automáticas...");

            // Criar sessões de estudo com base na disponibilidade
            const sessoes = gerarSessoesAutomaticas(
              novoPlanejamento.id,
              novoPlanejamento.disciplines,
              formData.disponibilidade as TimeAvailability[],
              formData.dataInicio,
              formData.dataFim
            );
            
            console.log(`${sessoes.length} sessões geradas.`);
            
            if (sessoes.length > 0) {
              // Adicionar cada sessão ao plano
              const sessoesPromises = sessoes.map(sessao => adicionarSessaoEstudo(sessao));
              await Promise.all(sessoesPromises);
              
              toast.success(`${sessoes.length} sessões de estudo foram agendadas automaticamente`);
            } else {
              console.log("Nenhuma sessão foi gerada");
              toast.warning('Não foi possível gerar sessões automaticamente. Verifique sua disponibilidade.');
            }
          } catch (error) {
            console.error('Erro ao gerar sessões automáticas:', error);
            toast.error('Não foi possível gerar sessões automáticas. Você pode adicioná-las manualmente.');
          }
        } else {
          toast.info('Nenhuma disponibilidade definida. Você pode adicionar sessões manualmente.');
        }
        
        router.push('/planejamento');
      } else {
        toast.error('Erro ao criar plano de estudo');
      }
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      toast.error('Não foi possível criar o plano de estudo');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Etapa 4: Revisão e geração do cronograma
  const renderEtapa4 = () => {
    // Calcular estatísticas do plano
    const totalDisciplinas = formData.disciplinas.filter(d => d.selected).length;
    const totalAssuntos = formData.disciplinas
      .filter(d => d.selected)
      .reduce((total, d) => total + d.subjects.filter(s => s.selected).length, 0);
    
    const totalHorasEstudo = formData.disciplinas
      .filter(d => d.selected)
      .reduce((total, d) => {
        return total + d.subjects
          .filter(s => s.selected)
          .reduce((subTotal, s) => subTotal + s.hours, 0);
      }, 0);
    
    const horasDisponiveis = calcularHorasSemanais();
    const semanasNecessarias = totalHorasEstudo / horasDisponiveis;
    
    // Verificar se o cronograma foi gerado
    const cronogramaGerado = formData.cronogramaGerado;
    
    // Calcular estimativa de sessões que serão geradas
    const estimativaSessoesEstudo = Math.ceil(totalHorasEstudo); // Cada sessão de estudo é 1h
    const estimativaSessoesRevisao = Math.ceil(totalHorasEstudo * 1.5); // Cada assunto tem ~1-2 revisões em média
    const totalSessoes = estimativaSessoesEstudo + estimativaSessoesRevisao;
    
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Revisão e Geração do Cronograma</CardTitle>
            <p className="text-sm text-gray-500">
              Revise as informações do seu plano e gere o cronograma de estudos otimizado.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Informações gerais */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-md font-medium mb-3">Informações Gerais</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Nome do Plano:</span>
                    <span className="text-sm font-medium">{formData.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Data de Início:</span>
                    <span className="text-sm font-medium">{formData.dataInicio || 'Não definida'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Data de Término:</span>
                    <span className="text-sm font-medium">{formData.dataFim || 'Não definida'}</span>
                  </div>
                </div>
              </div>
              
              {/* Estatísticas */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="text-md font-medium mb-3 text-blue-800">Estatísticas do Plano</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-600">Disciplinas:</span>
                    <span className="text-sm font-medium">{totalDisciplinas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-600">Assuntos:</span>
                    <span className="text-sm font-medium">{totalAssuntos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-600">Total de horas:</span>
                    <span className="text-sm font-medium">{totalHorasEstudo} horas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-600">Disponibilidade semanal:</span>
                    <span className="text-sm font-medium">{horasDisponiveis.toFixed(1)} horas</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-600">Tempo estimado:</span>
                    <span className="text-sm font-medium">
                      {semanasNecessarias.toFixed(1)} semanas
                      {semanasNecessarias > 0 && (
                        <span className="text-xs text-gray-500"> (~{Math.ceil(semanasNecessarias / 4)} meses)</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Visão geral das disciplinas e assuntos */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3">Disciplinas e Assuntos</h3>
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Disciplina
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assuntos
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.disciplinas.filter(d => d.selected).map(disciplina => {
                      const assuntosSelecionados = disciplina.subjects.filter(s => s.selected);
                      const horasTotais = assuntosSelecionados.reduce((total, s) => total + s.hours, 0);
                      
                      return (
                        <tr key={disciplina.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-full ${disciplinasColors[disciplina.id]?.bg || 'bg-blue-100'}`}>
                                {getDisciplineIcon(disciplina.id)}
                              </div>
                              <span className="ml-2 font-medium">{disciplina.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {assuntosSelecionados.length} assuntos selecionados
                            </div>
                            <div className="text-xs text-gray-500">
                              {assuntosSelecionados.map(s => s.name).join(', ')}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                            {horasTotais} horas
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Disponibilidade */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3">Disponibilidade de Horários</h3>
              {formData.disponibilidade.length === 0 ? (
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                  <p>Nenhum horário de disponibilidade definido. O cronograma será gerado sem considerar horários específicos.</p>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.disponibilidade.map((periodo, index) => {
                    const dia = diasDaSemana.find(d => d.id === periodo.dayOfWeek)?.nome || '';
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
      <div>
                          <div className="font-medium text-sm">{dia}</div>
                          <div className="text-xs text-gray-500">
                            {periodo.startTime} - {periodo.endTime} ({Math.floor(periodo.durationMinutes / 60)}h {periodo.durationMinutes % 60}min)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                  
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-start">
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <Calendar className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-green-800">Agendamento automático de sessões</h4>
                        <p className="text-sm text-green-600 mt-1">
                          Com base nos seus horários disponíveis, aproximadamente {totalSessoes} sessões 
                          serão agendadas automaticamente após finalizar o plano:
                        </p>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center bg-white bg-opacity-50 p-2 rounded">
                            <Clock className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm">
                              {estimativaSessoesEstudo} sessões de <strong>estudo</strong> (1h cada)
                            </span>
                          </div>
                          <div className="flex items-center bg-white bg-opacity-50 p-2 rounded">
                            <BookmarkCheck className="h-4 w-4 text-purple-600 mr-2" />
                            <span className="text-sm">
                              {estimativaSessoesRevisao} sessões de <strong>revisão</strong> (30min cada)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Resultado do cronograma */}
            {cronogramaGerado ? (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start">
                  <div className="bg-green-100 p-2 rounded-full mr-3">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800">Cronograma gerado com sucesso!</h4>
                    <p className="text-sm text-green-600 mt-1">
                      Seu plano de estudos foi otimizado considerando a dificuldade e importância dos assuntos,
                      bem como sua disponibilidade de horários. O sistema criará automaticamente sessões de 
                      estudo (1h) e revisão (30min) para maximizar sua aprendizagem. 
                      Clique em "Finalizar" para salvar o plano e criar as sessões de estudo automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Button
                  onClick={gerarCronograma}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Gerando cronograma...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Gerar Cronograma
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-3">
                  O cronograma será otimizado com base na dificuldade e importância dos assuntos,
                  distribuindo o conteúdo de acordo com sua disponibilidade de tempo.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={voltarEtapa}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            {cronogramaGerado ? (
              <Button 
                onClick={finalizarPlano} 
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Finalizar Plano
                  </>
                )}
              </Button>
            ) : (
              <Button disabled>
                Finalizar Plano
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  };

  // Função para calcular horas semanais disponíveis
  const calcularHorasSemanais = (): number => {
    return formData.disponibilidade.reduce((total, periodo) => {
      return total + periodo.durationMinutes / 60;
    }, 0);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Cabeçalho */}
        <div className="flex items-center mb-6">
          <Link href="/planejamento" className="mr-4">
            <Button variant="ghost" className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Plano de Estudo Inteligente</h1>
        </div>
        
        {/* Indicador de progresso */}
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 
                    ${etapaAtual >= step 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-500'}`}
                >
                  {step}
                </div>
                <span className="text-sm font-medium">
                  {step === 1 && "Informações"}
                  {step === 2 && "Disciplinas"}
                  {step === 3 && "Horários"}
                  {step === 4 && "Cronograma"}
                </span>
              </div>
            ))}
          </div>
          <div className="relative mt-2">
            <div className="absolute top-0 h-1 bg-gray-200 w-full"></div>
            <div 
              className="absolute top-0 h-1 bg-blue-500 transition-all duration-300"
              style={{ width: `${(etapaAtual - 1) * 33.33}%` }}
            ></div>
          </div>
        </div>
        
        {/* Conteúdo da etapa atual */}
        {renderEtapaAtual()}
      </div>
    </AppLayout>
  );
} 