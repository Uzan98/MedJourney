'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { ArrowLeft, Save, Clock, Calendar, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { obterPlanosLocais, adicionarSessaoEstudo } from '@/services';
import { StudyPlan, StudySessionCreate } from '@/lib/types/planning';

export default function NovaSessaoPage() {
  const params = useParams();
  const router = useRouter();
  const planoId = params.id as string;
  
  const [plano, setPlano] = useState<StudyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<StudySessionCreate>({
    studyPlanId: planoId,
    title: '',
    disciplineName: '',
    subjectName: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    duration: 60,
    completed: false,
    notes: ''
  });
  
  const [disciplinas, setDisciplinas] = useState<{id: number, name: string}[]>([]);
  const [assuntos, setAssuntos] = useState<{id: number, name: string}[]>([]);

  useEffect(() => {
    if (!planoId) return;
    
    function carregarPlano() {
      try {
        const planosLocais = obterPlanosLocais();
        const planoEncontrado = planosLocais.find(p => p.id === planoId);
        
        if (planoEncontrado) {
          setPlano(planoEncontrado);
          
          const disciplines: {id: number, name: string}[] = [];
          
          planoEncontrado.disciplines.forEach(discipline => {
            disciplines.push({
              id: discipline.id,
              name: discipline.name
            });
          });
          
          setDisciplinas(disciplines);
          
          if (disciplines.length > 0) {
            const primeiraDisciplina = disciplines[0];
            setFormData(prev => ({
              ...prev,
              disciplineName: primeiraDisciplina.name
            }));
            
            const disciplinaEncontrada = planoEncontrado.disciplines.find(d => d.id === primeiraDisciplina.id);
            if (disciplinaEncontrada) {
              const subjectsData = disciplinaEncontrada.subjects.map(s => ({
                id: s.id,
                name: s.name
              }));
              setAssuntos(subjectsData);
            }
          }
        } else {
          toast.error('Plano não encontrado');
          router.push('/planejamento');
        }
      } catch (error) {
        console.error('Erro ao carregar plano:', error);
        toast.error('Não foi possível carregar o plano de estudo');
      } finally {
        setIsLoading(false);
      }
    }

    carregarPlano();
  }, [planoId, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDisciplinaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const disciplinaNome = e.target.value;
    setFormData(prev => ({
      ...prev,
      disciplineName: disciplinaNome,
      subjectName: ''
    }));
    
    if (plano) {
      const disciplinaEncontrada = plano.disciplines.find(d => d.name === disciplinaNome);
      if (disciplinaEncontrada) {
        const subjectsData = disciplinaEncontrada.subjects.map(s => ({
          id: s.id,
          name: s.name
        }));
        setAssuntos(subjectsData);
      } else {
        setAssuntos([]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error('O título da sessão é obrigatório');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let dataAgendada = formData.scheduledDate;
      if (dataAgendada && !dataAgendada.includes('T')) {
        dataAgendada = `${dataAgendada}T${new Date().toISOString().split('T')[1]}`;
      }
      
      const novaSessao: StudySessionCreate = {
        ...formData,
        scheduledDate: dataAgendada
      };
      
      const resultado = await adicionarSessaoEstudo(novaSessao);
      
      if (resultado) {
        toast.success('Sessão de estudo agendada com sucesso');
        router.push(`/planejamento/${planoId}/sessoes`);
      } else {
        toast.error('Erro ao agendar sessão de estudo');
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      toast.error('Não foi possível agendar a sessão de estudo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2">Carregando...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

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
        <div className="flex items-center mb-6">
          <Link href={`/planejamento/${planoId}/sessoes`} className="mr-4">
            <Button variant="ghost" className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Nova Sessão de Estudo</h1>
            <p className="text-gray-600">Plano: {plano.name}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agendar Sessão de Estudo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título da Sessão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Revisão de Anatomia"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Disciplina
                    </label>
                    <select
                      name="disciplineName"
                      value={formData.disciplineName}
                      onChange={handleDisciplinaChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma disciplina</option>
                      {disciplinas.map(disciplina => (
                        <option key={disciplina.id} value={disciplina.name}>
                          {disciplina.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assunto
                    </label>
                    <select
                      name="subjectName"
                      value={formData.subjectName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!formData.disciplineName}
                    >
                      <option value="">Selecione um assunto</option>
                      {assuntos.map(assunto => (
                        <option key={assunto.id} value={assunto.name}>
                          {assunto.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Agendada
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                        <Calendar className="h-4 w-4" />
                      </span>
                      <input
                        type="date"
                        name="scheduledDate"
                        value={formData.scheduledDate ? formData.scheduledDate.toString().split('T')[0] : ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duração Estimada (minutos)
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                        <Clock className="h-4 w-4" />
                      </span>
                      <input
                        type="number"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        min="15"
                        step="15"
                        className="w-full px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas/Objetivos
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descreva os objetivos desta sessão de estudo..."
                  />
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <Link href={`/planejamento/${planoId}/sessoes`}>
                  <Button type="button" variant="outline" className="mr-2">
                    Cancelar
                  </Button>
                </Link>
                <Button 
                  type="submit"
                  disabled={isSubmitting || !formData.title}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Agendar Sessão
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 