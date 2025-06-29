"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Brain, 
  Calendar, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  BookOpen,
  Clock,
  BarChart2,
  ChevronRight,
  Lightbulb,
  Target,
  CheckCircle2
} from 'lucide-react';
import SmartPlanningService, { SmartPlan } from '@/services/smart-planning.service';
import { toast } from 'react-hot-toast';

export default function SmartPlanningPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activePlans, setActivePlans] = useState<SmartPlan[]>([]);
  const [completedPlans, setCompletedPlans] = useState<SmartPlan[]>([]);
  const router = useRouter();
  
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const { data: plans, error } = await SmartPlanningService.getPlans();
      
      if (error) {
        throw error;
      }
      
      if (plans) {
        const active = plans.filter(plan => ['active', 'draft'].includes(plan.status));
        const completed = plans.filter(plan => ['completed', 'archived'].includes(plan.status));
        
        setActivePlans(active);
        setCompletedPlans(completed);
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Não foi possível carregar os planos.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-blue-700 to-purple-800 rounded-3xl overflow-hidden mb-10 shadow-xl mx-4">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        <div className="relative px-8 py-16 md:px-16 md:py-20 text-white z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-8 md:mb-0 md:w-3/5">
              <div className="flex items-center space-x-4 mb-4">
                <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg p-3 rounded-xl shadow-lg">
                  <Brain className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight">Planejamento Inteligente</h1>
              </div>
              <p className="text-xl text-indigo-100 mb-8 max-w-2xl">
                O <span className="font-semibold">poder da inteligência artificial</span> ao seu serviço para otimizar seus estudos e maximizar seu aprendizado
              </p>
              <Button 
                onClick={() => router.push('/planejamento/inteligente/criar')}
                className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg transition-all duration-300 rounded-full px-8 py-6 text-lg font-semibold"
              >
                Criar Novo Plano <Plus className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 mb-10">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-md">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-indigo-600">{activePlans.length}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Planos Ativos</h3>
            <p className="text-sm text-gray-500 mt-1">Planejamentos em andamento</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-3 rounded-xl shadow-md">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-teal-600">{completedPlans.length}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Planos Concluídos</h3>
            <p className="text-sm text-gray-500 mt-1">Metas alcançadas</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-3 rounded-xl shadow-md">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-orange-600">48</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Sessões Planejadas</h3>
            <p className="text-sm text-gray-500 mt-1">Estudos programados</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-3 rounded-xl shadow-md">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-pink-600">12</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Disciplinas</h3>
            <p className="text-sm text-gray-500 mt-1">Em andamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Section */}
      <div className="px-4 mb-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Seus Planos de Estudo</h2>
            <p className="text-gray-500 mt-1">Gerencie todos os seus planos personalizados</p>
          </div>
          <Button onClick={() => router.push('/planejamento/inteligente/criar')} className="bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all duration-300 rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
            <p className="text-gray-500">Carregando seus planos...</p>
          </div>
        ) : (
          <>
            {/* Active Plans */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Planos Ativos</h3>
              </div>
              
              {activePlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activePlans.map((plan, index) => (
                    <Card 
                      key={plan.id} 
                      className="overflow-hidden hover:shadow-xl transition-all duration-300 group rounded-xl border-0 shadow-lg relative"
                    >
                      <div 
                        className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white opacity-60 group-hover:opacity-80 transition-opacity"
                      ></div>
                      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-green-400 to-emerald-500 transform origin-left group-hover:scale-x-110 transition-transform duration-300"></div>
                      <div 
                        className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-green-200 to-transparent opacity-40 rounded-full -mr-10 -mb-10 group-hover:scale-110 transition-transform duration-500"
                      ></div>
                      <div 
                        className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-indigo-200 to-transparent opacity-30 rounded-full -ml-5 -mt-5 group-hover:scale-110 transition-transform duration-500"
                      ></div>
                      
                      <div className="relative">
                        <CardHeader className="pb-3 pt-6 px-6">
                        <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-3">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white mt-0.5 shadow-sm ${
                                index % 3 === 0 ? 'bg-gradient-to-br from-indigo-500 to-blue-600' :
                                index % 3 === 1 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' :
                                'bg-gradient-to-br from-purple-500 to-fuchsia-600'
                              }`}>
                                <span className="text-sm font-bold">{index + 1}</span>
                              </div>
                              <CardTitle className="text-lg font-bold group-hover:text-indigo-700 transition-colors duration-300">{plan.name}</CardTitle>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full shadow-sm flex items-center space-x-1 ${
                              plan.status === 'active' 
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200' 
                                : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${plan.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                              <span>{plan.status === 'active' ? 'Ativo' : 'Rascunho'}</span>
                          </span>
                        </div>
                          <CardDescription className="text-gray-600 line-clamp-2 mt-4 ml-11">{plan.description || 'Sem descrição'}</CardDescription>
                      </CardHeader>
                        <CardContent className="pb-4 px-6">
                          <div className="flex flex-col space-y-4 ml-11">
                            <div className="flex items-center text-sm text-gray-700">
                              <div className="p-1.5 bg-blue-100 rounded-md mr-3">
                                <Calendar className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="font-medium">{formatDate(plan.start_date)} - {formatDate(plan.end_date)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-700">
                              <div className="p-1.5 bg-indigo-100 rounded-md mr-3">
                                <Clock className="h-4 w-4 text-indigo-600" />
                              </div>
                              <span className="font-medium">{plan.sessions_per_day || 0} sessões por dia</span>
                            </div>
                            <div className="flex items-center mt-1">
                              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    index % 3 === 0 ? 'bg-gradient-to-r from-indigo-500 to-blue-600' :
                                    index % 3 === 1 ? 'bg-gradient-to-r from-emerald-500 to-teal-600' :
                                    'bg-gradient-to-r from-purple-500 to-fuchsia-600'
                                  }`}
                                  style={{ width: `${65 - (index * 11)}%` }}
                                ></div>
                          </div>
                              <span className="text-xs ml-2 text-gray-500 font-medium">
                                {65 - (index * 11)}%
                              </span>
                          </div>
                        </div>
                      </CardContent>
                        <CardFooter className="pt-4 pb-4 border-t border-gray-100 bg-gray-50 bg-opacity-80 relative px-6">
                        <Link href={`/planejamento/visualizar-plano/${plan.id}`} className="w-full">
                            <Button 
                              variant="ghost" 
                              className="w-full text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 justify-between group-hover:bg-indigo-50 transition-colors"
                            >
                              <span className="font-medium">Ver plano</span>
                              <div className="p-1 bg-indigo-100 rounded-full">
                            <ArrowRight className="h-4 w-4 group-hover:transform group-hover:translate-x-1 transition-transform" />
                              </div>
                          </Button>
                        </Link>
                      </CardFooter>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <div className="p-4 bg-gray-100 rounded-full inline-block mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-4">Você ainda não tem planos ativos.</p>
                  <Button 
                    onClick={() => router.push('/planejamento/inteligente/criar')} 
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-md"
                  >
                    Criar Novo Plano
                  </Button>
                </div>
              )}
            </div>

            {/* Completed Plans */}
            {completedPlans.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">Planos Concluídos</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedPlans.map(plan => (
                    <Card key={plan.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 group">
                      <div className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-500"></div>
                      <CardHeader className="pb-3 pt-6 px-6">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg font-bold group-hover:text-indigo-600 transition-colors duration-300">{plan.name}</CardTitle>
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            plan.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {plan.status === 'completed' ? 'Concluído' : 'Arquivado'}
                          </span>
                        </div>
                        <CardDescription className="text-gray-600 line-clamp-2 mt-2">{plan.description || 'Sem descrição'}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4 px-6">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-gray-600 font-medium">{formatDate(plan.start_date)} - {formatDate(plan.end_date)}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-4 pb-4 border-t border-gray-100 bg-gray-50 px-6">
                        <Link href={`/planejamento/visualizar-plano/${plan.id}`} className="w-full">
                          <Button variant="ghost" className="w-full text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 justify-between">
                            Ver detalhes
                            <ArrowRight className="h-4 w-4 group-hover:transform group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* About Smart Planning */}
      <div className="mx-4 mb-12">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl overflow-hidden shadow-lg relative">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.3\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 bg-opacity-40 rounded-full filter blur-3xl transform translate-x-1/3 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 bg-opacity-30 rounded-full filter blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
          <div className="p-8 md:p-12 text-white relative z-10">
            <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
              <div className="mb-6 md:mb-0 md:w-3/5">
              <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-lg">
                    <Brain className="h-8 w-8 text-white" />
                </div>
                  <h3 className="text-3xl font-bold">Como funciona o Planejamento Inteligente?</h3>
              </div>
              <p className="text-indigo-100 mb-6 text-lg">
                Nosso sistema de Planejamento Inteligente utiliza algoritmos avançados para criar planos de estudo personalizados 
                  que se adaptam às suas necessidades específicas.
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <div className="p-1 bg-indigo-300 bg-opacity-30 rounded-full mt-1 mr-3">
                      <CheckCircle2 className="h-5 w-5 text-indigo-200" />
                    </div>
                    <p className="text-white">Combinando técnicas de revisão espaçada cientificamente provadas</p>
                  </li>
                  <li className="flex items-start">
                    <div className="p-1 bg-indigo-300 bg-opacity-30 rounded-full mt-1 mr-3">
                      <CheckCircle2 className="h-5 w-5 text-indigo-200" />
                    </div>
                    <p className="text-white">Distribuição inteligente do conteúdo para maximizar a retenção</p>
                  </li>
                  <li className="flex items-start">
                    <div className="p-1 bg-indigo-300 bg-opacity-30 rounded-full mt-1 mr-3">
                      <CheckCircle2 className="h-5 w-5 text-indigo-200" />
                    </div>
                    <p className="text-white">Ajustes dinâmicos baseados no seu desempenho e feedback</p>
                  </li>
                </ul>
                <Button className="bg-white hover:bg-indigo-50 text-indigo-700 shadow-md rounded-lg px-6 py-5 font-semibold">
                Saiba mais sobre a tecnologia
              </Button>
            </div>
              <div className="hidden md:block md:w-2/5 relative">
                <div className="relative bg-white bg-opacity-10 backdrop-filter backdrop-blur-xl rounded-2xl p-6 border border-white border-opacity-20 shadow-xl">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-2 bg-indigo-600 rounded-lg">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-bold">Seu Plano Inteligente</span>
                  </div>
                  <div className="space-y-4 mb-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                        <div className="flex-1 h-3 bg-white bg-opacity-30 rounded-full"></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-white border-opacity-20 flex justify-between items-center">
                    <div className="flex space-x-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-white"></div>
                      ))}
                    </div>
                    <span className="text-sm">AI Powered</span>
                  </div>
                </div>
              </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
