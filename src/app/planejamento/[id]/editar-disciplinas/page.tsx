'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { ArrowLeft, Save, Plus, X, Check, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { obterPlanosLocais, atualizarPlano } from '@/services';
import { StudyPlan, StudyPlanUpdate, PlanDiscipline, PlanSubject, Priority } from '@/lib/types/planning';

export default function EditarDisciplinasPage() {
  const params = useParams();
  const router = useRouter();
  const planoId = params.id as string;
  
  const [plano, setPlano] = useState<StudyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [disciplinas, setDisciplinas] = useState<PlanDiscipline[]>([]);
  const [availableDisciplines, setAvailableDisciplines] = useState<string[]>([]);
  
  // Para adicionar nova disciplina
  const [newDiscipline, setNewDiscipline] = useState('');
  const [expandedDisciplines, setExpandedDisciplines] = useState<Record<number, boolean>>({});
  
  // Carregar o plano e disciplinas disponíveis
  useEffect(() => {
    if (!planoId) return;
    
    async function carregarDados() {
      try {
        // Carregar o plano
        const planosLocais = obterPlanosLocais();
        const planoEncontrado = planosLocais.find(p => p.id === planoId);
        
        if (!planoEncontrado) {
          toast.error('Plano não encontrado');
          router.push('/planejamento');
          return;
        }
        
        setPlano(planoEncontrado);
        
        // Inicializar disciplinas
        if (planoEncontrado.disciplines && planoEncontrado.disciplines.length > 0) {
          setDisciplinas([...planoEncontrado.disciplines]);
          
          // Inicializar disciplinas expandidas
          const expanded: Record<number, boolean> = {};
          planoEncontrado.disciplines.forEach(disc => {
            expanded[disc.id] = true; // Expandir todas inicialmente
          });
          setExpandedDisciplines(expanded);
        }
        
        // Carregar disciplinas disponíveis (simulação - em uma implementação real, viria da API)
        setAvailableDisciplines([
          'Anatomia', 'Fisiologia', 'Bioquímica', 'Farmacologia', 'Patologia',
          'Microbiologia', 'Imunologia', 'Parasitologia', 'Semiologia',
          'Clínica Médica', 'Cirurgia', 'Pediatria', 'Ginecologia e Obstetrícia',
          'Medicina Preventiva', 'Psiquiatria', 'Radiologia'
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Não foi possível carregar os dados do plano');
      } finally {
        setIsLoading(false);
      }
    }

    carregarDados();
  }, [planoId, router]);

  // Alternar expansão de disciplina
  const toggleDisciplineExpand = (disciplineId: number) => {
    setExpandedDisciplines(prev => ({
      ...prev,
      [disciplineId]: !prev[disciplineId]
    }));
  };

  // Adicionar nova disciplina
  const handleAddDiscipline = () => {
    if (!newDiscipline) {
      toast.error('Selecione uma disciplina');
      return;
    }
    
    const alreadyExists = disciplinas.some(d => d.name === newDiscipline);
    if (alreadyExists) {
      toast.error('Esta disciplina já está no plano');
      return;
    }
    
    const newDisciplineObj: PlanDiscipline = {
      id: Date.now(),
      name: newDiscipline,
      priority: 'média',
      subjects: []
    };
    
    setDisciplinas(prev => [...prev, newDisciplineObj]);
    setExpandedDisciplines(prev => ({
      ...prev,
      [newDisciplineObj.id]: true
    }));
    setNewDiscipline('');
  };

  // Remover disciplina
  const handleRemoveDiscipline = (disciplineId: number) => {
    if (window.confirm('Tem certeza que deseja remover esta disciplina?')) {
      setDisciplinas(prev => prev.filter(d => d.id !== disciplineId));
    }
  };

  // Adicionar novo assunto
  const handleAddSubject = (disciplineId: number) => {
    setDisciplinas(prev => 
      prev.map(d => {
        if (d.id === disciplineId) {
          return {
            ...d,
            subjects: [
              ...d.subjects,
              {
                id: Date.now(),
                name: 'Novo Assunto',
                priority: 'média' as Priority,
                hours: 3,
                progress: 0,
                completed: false
              }
            ]
          };
        }
        return d;
      })
    );
  };

  // Atualizar assunto
  const handleUpdateSubject = (
    disciplineId: number,
    subjectId: number,
    field: string,
    value: string | number | boolean
  ) => {
    setDisciplinas(prev => prev.map(d => {
      if (d.id === disciplineId) {
        return {
          ...d,
          subjects: d.subjects.map((s: PlanSubject) => {
            if (s.id === subjectId) {
              return { ...s, [field]: value };
            }
            return s;
          })
        };
      }
      return d;
    }));
  };

  // Remover assunto
  const handleRemoveSubject = (disciplineId: number, subjectId: number) => {
    setDisciplinas(prev => prev.map(d => {
      if (d.id === disciplineId) {
        return {
          ...d,
          subjects: d.subjects.filter((s: PlanSubject) => s.id !== subjectId)
        };
      }
      return d;
    }));
  };

  // Atualizar prioridade da disciplina
  const handleUpdatePriority = (disciplineId: number, priority: string) => {
    setDisciplinas(prev => prev.map(d => {
      if (d.id === disciplineId) {
        return {
          ...d,
          priority: priority as Priority
        };
      }
      return d;
    }));
  };

  // Salvar alterações
  const handleSave = async () => {
    if (!plano) return;
    
    setIsSubmitting(true);
    
    try {
      const planData: StudyPlanUpdate = {
        id: plano.id,
        disciplines: disciplinas
      };
      
      const updatedPlan = atualizarPlano(planData);
      
      if (updatedPlan) {
        toast.success('Disciplinas atualizadas com sucesso');
        setPlano(updatedPlan);
        router.push(`/planejamento/${planoId}`);
      } else {
        toast.error('Erro ao atualizar disciplinas');
      }
    } catch (error) {
      console.error('Erro ao salvar disciplinas:', error);
      toast.error('Não foi possível salvar as alterações');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderização condicional para estado de carregamento
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2">Carregando plano...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Caso o plano não seja encontrado
  if (!plano) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700">Plano não encontrado</h2>
            <p className="text-gray-500 mt-2">O plano que você está procurando não existe ou foi removido.</p>
            <Link href="/planejamento">
              <Button className="mt-4">Voltar para Planejamento</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Cabeçalho da página */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link href={`/planejamento/${planoId}`} className="mr-4">
              <Button variant="ghost" className="p-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Editar Disciplinas e Assuntos</h1>
              <p className="text-gray-500">Plano: {plano.name}</p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        {/* Adicionar nova disciplina */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adicionar Disciplina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <select
                value={newDiscipline}
                onChange={(e) => setNewDiscipline(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma disciplina...</option>
                {availableDisciplines.map((discipline) => (
                  <option key={discipline} value={discipline}>
                    {discipline}
                  </option>
                ))}
              </select>
              <Button onClick={handleAddDiscipline}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de disciplinas */}
        <div className="space-y-4">
          {disciplinas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <h3 className="text-xl font-medium text-gray-600 mb-2">Nenhuma disciplina adicionada</h3>
              <p className="text-gray-500 mb-6">Adicione disciplinas para compor seu plano de estudos.</p>
            </div>
          ) : (
            disciplinas.map((disciplina) => (
              <Card key={disciplina.id} className="overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b border-gray-200">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleDisciplineExpand(disciplina.id)}
                      className="p-1 mr-2 text-gray-500 hover:text-gray-700"
                    >
                      {expandedDisciplines[disciplina.id] ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                    <h3 className="font-medium text-lg">{disciplina.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={disciplina.priority}
                      onChange={(e) => handleUpdatePriority(disciplina.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="baixa">Prioridade: Baixa</option>
                      <option value="média">Prioridade: Média</option>
                      <option value="alta">Prioridade: Alta</option>
                    </select>
                    <Button variant="outline" size="sm" onClick={() => handleRemoveDiscipline(disciplina.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {expandedDisciplines[disciplina.id] && (
                  <div className="px-6 py-4">
                    {/* Assuntos da disciplina */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Assuntos</h4>
                      <div className="space-y-2">
                        {(!disciplina.subjects || disciplina.subjects.length === 0) && (
                          <p className="text-gray-500 text-sm italic">Nenhum assunto adicionado</p>
                        )}
                        
                        {disciplina.subjects && disciplina.subjects.map((assunto: PlanSubject) => (
                          <div 
                            key={assunto.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                          >
                            <div className="flex-1 mr-4">
                              <input
                                type="text"
                                value={assunto.name}
                                onChange={(e) => handleUpdateSubject(disciplina.id, assunto.id, 'name', e.target.value)}
                                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nome do assunto"
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <select
                                value={assunto.priority}
                                onChange={(e) => handleUpdateSubject(disciplina.id, assunto.id, 'priority', e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                              >
                                <option value="baixa">Baixa</option>
                                <option value="média">Média</option>
                                <option value="alta">Alta</option>
                              </select>
                              
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={assunto.hours}
                                  onChange={(e) => handleUpdateSubject(disciplina.id, assunto.id, 'hours', parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="ml-1 text-sm text-gray-500">horas</span>
                              </div>
                              
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={assunto.completed}
                                  onChange={(e) => handleUpdateSubject(disciplina.id, assunto.id, 'completed', e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-1 text-sm text-gray-700">Concluído</span>
                              </div>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleRemoveSubject(disciplina.id, assunto.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" onClick={() => handleAddSubject(disciplina.id)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Assunto
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
        
        {/* Botões de ação */}
        <div className="flex justify-between mt-6">
          <Link href={`/planejamento/${planoId}`}>
            <Button variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
} 