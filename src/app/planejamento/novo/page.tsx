'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { ArrowLeft, Save, Plus, Trash, BookOpen, Heart, BarChart2, Filter, BookCheck, AlertCircle, Search, CheckCircle2, Clock8, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { criarPlanoEstudo, getDisciplines, convertToPlanDisciplines } from '@/services';
import { StudyPlanCreate, PlanDiscipline, Priority } from '@/lib/types/planning';

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
  }[];
}

// Função para identificar se é uma disciplina do usuário
const isUserDiscipline = (id: number): boolean => {
  // Disciplinas predefinidas têm IDs de 1 a 8, se for maior que isso
  // ou não estiver nesse intervalo, provavelmente é uma disciplina do usuário
  return id > 8 || (id < 1);
};

export default function NovoPlanoPage() {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disciplinasCarregando, setDisciplinasCarregando] = useState(true);
  
  // Dados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Disciplinas disponíveis
  const [disciplinas, setDisciplinas] = useState<DisciplineOption[]>([]);
  
  // Carregar disciplinas
  useEffect(() => {
    async function carregarDisciplinas() {
      setDisciplinasCarregando(true);
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
            hours: 4
          }))
        }));
        
        setDisciplinas(options);
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        toast.error('Não foi possível carregar as disciplinas disponíveis');
      } finally {
        setDisciplinasCarregando(false);
      }
    }

    carregarDisciplinas();
  }, []);

  // Alternar seleção de disciplina
  const toggleDiscipline = (disciplineId: number) => {
    setDisciplinas(prev => 
      prev.map(d => {
        if (d.id === disciplineId) {
          const selected = !d.selected;
          
          // Se selecionar a disciplina, seleciona todos os assuntos também
          // Se deselecionar, desmarca todos os assuntos
          return {
            ...d,
            selected,
            subjects: d.subjects.map(s => ({
              ...s,
              selected: selected ? true : false
            }))
          };
        }
        return d;
      })
    );
  };
  
  // Alternar seleção de assunto
  const toggleSubject = (disciplineId: number, subjectId: number) => {
    setDisciplinas(prev => 
      prev.map(d => {
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
    );
  };
  
  // Atualizar prioridade de assunto
  const updateSubjectPriority = (disciplineId: number, subjectId: number, priority: Priority) => {
    setDisciplinas(prev => 
      prev.map(d => {
        if (d.id === disciplineId) {
          return {
            ...d,
            subjects: d.subjects.map(s => {
              if (s.id === subjectId) {
                return { ...s, priority };
              }
              return s;
            })
          };
        }
        return d;
      })
    );
  };
  
  // Atualizar horas estimadas de assunto
  const updateSubjectHours = (disciplineId: number, subjectId: number, hours: number) => {
    setDisciplinas(prev => 
      prev.map(d => {
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
    );
  };

  // Validar formulário
  const validarFormulario = (): boolean => {
    if (!nome.trim()) {
      toast.error('O nome do plano é obrigatório');
      return false;
    }
    
    const disciplinasSelecionadas = disciplinas.filter(d => d.selected);
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
  };
  
  // Criar plano
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Preparar disciplinas selecionadas
      const selectedDisciplines = disciplinas
        .filter(d => d.selected)
        .map(d => ({
          id: d.id,
          subjects: d.subjects
            .filter(s => s.selected)
            .map(s => ({
              id: s.id,
              priority: s.priority,
              hours: s.hours
            }))
        }));

      // Criar plano
      const planData: StudyPlanCreate = {
        name: nome,
        description: descricao,
        startDate: dataInicio || undefined,
        endDate: dataFim || undefined,
        status: 'ativo',
        disciplines: selectedDisciplines
      };

      const novoPlanejamento = await criarPlanoEstudo(planData);
      
      if (novoPlanejamento) {
        toast.success('Plano de estudo criado com sucesso');
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
          <h1 className="text-2xl font-bold">Novo Plano de Estudo</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna de informações gerais */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Plano *
                      </label>
                      <input
                      id="nome"
                        type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
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
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descreva o objetivo do seu plano de estudos"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                      <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Início
                        </label>
                        <input
                        id="dataInicio"
                          type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                      <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-1">
                          Data de Término
                        </label>
                        <input
                        id="dataFim"
                          type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                </CardContent>
                <CardFooter>
                      <Button
                        type="submit"
                        className="w-full"
                    disabled={isSubmitting || disciplinasCarregando}
                  >
                    {isSubmitting ? 'Criando...' : 'Criar Plano de Estudo'}
                      </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Coluna de seleção de disciplinas */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Disciplinas e Assuntos</CardTitle>
                </CardHeader>
                <CardContent>
                  {disciplinasCarregando ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="ml-2">Carregando disciplinas...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {disciplinas.map((disciplina) => (
                        <div key={disciplina.id} className="border border-gray-200 rounded-md overflow-hidden">
                          <div 
                            className={`flex items-center justify-between px-4 py-3 ${
                              disciplina.selected ? `bg-blue-50` : 'bg-gray-50'
                            }`}
                          >
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`disciplina-${disciplina.id}`}
                                    checked={disciplina.selected}
                                    onChange={() => toggleDiscipline(disciplina.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <div className={`ml-2 flex items-center ${
                                    disciplina.selected ? 'text-blue-700' : 'text-gray-700'
                                  }`}>
                                    <span className={`mr-2 p-1 rounded-full ${
                                      isUserDiscipline(disciplina.id) 
                                        ? 'bg-teal-100 text-teal-600' 
                                        : (disciplinasColors[disciplina.id]?.bg || 'bg-gray-100')
                                    }`}>
                                      {isUserDiscipline(disciplina.id) 
                                        ? <FileText className="h-5 w-5" /> 
                                        : getDisciplineIcon(disciplina.id)}
                                    </span>
                                    <label
                                      htmlFor={`disciplina-${disciplina.id}`} 
                                      className="font-medium"
                                    >
                                      {disciplina.name}
                                    </label>
                                  </div>
                                </div>
                              <div className="text-sm text-gray-500">
                                {disciplina.subjects.filter(s => s.selected).length} / {disciplina.subjects.length} assuntos
                              </div>
                            </div>
                            
                          {disciplina.selected && (
                            <div className="px-4 py-2 divide-y divide-gray-100">
                              {disciplina.subjects.map((assunto) => (
                                <div key={assunto.id} className="py-3">
                                  <div className="flex items-start">
                                    <div className="flex items-center mt-1">
                                            <input
                                              type="checkbox"
                                        id={`assunto-${assunto.id}`}
                                        checked={assunto.selected}
                                        onChange={() => toggleSubject(disciplina.id, assunto.id)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                    </div>
                                    <div className="ml-3 flex-1">
                                            <label
                                        htmlFor={`assunto-${assunto.id}`} 
                                        className={`text-sm font-medium ${
                                          assunto.selected ? 'text-blue-700' : 'text-gray-700'
                                        }`}
                                      >
                                        {assunto.name}
                                            </label>
                                      
                                      {assunto.selected && (
                                        <div className="mt-2 grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="block text-xs text-gray-500">
                                              Prioridade
                                            </label>
                                                <select
                                              value={assunto.priority}
                                              onChange={(e) => updateSubjectPriority(
                                                disciplina.id, 
                                                assunto.id, 
                                                e.target.value as Priority
                                              )}
                                              className="mt-1 block w-full pl-3 pr-10 py-1 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                                            >
                                              <option value="baixa">Baixa</option>
                                              <option value="média">Média</option>
                                              <option value="alta">Alta</option>
                                                </select>
                                              </div>
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
                                        </div>
                                      </div>
                                    ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
} 