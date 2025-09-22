'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, BookOpen, Users, Clock, Filter, Stethoscope, FileText, GraduationCap, Building2 } from 'lucide-react';
import { ExamsService, Exam } from '@/services/exams.service';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface ExamType {
  id: number;
  name: string;
  description: string;
}

interface CategoryStats {
  category: string;
  count: number;
  description: string;
}

const CATEGORY_ICONS = {
  residencia: Stethoscope,
  concursos: FileText,
  enem: GraduationCap,
  vestibulares: Building2
};

const CATEGORY_COLORS = {
  residencia: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-800',
  concursos: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 text-purple-800',
  enem: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-800',
  vestibulares: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-800'
};

const CATEGORY_GRADIENTS = {
  residencia: 'from-blue-500 to-blue-600',
  concursos: 'from-purple-500 to-purple-600',
  enem: 'from-green-500 to-green-600',
  vestibulares: 'from-orange-500 to-orange-600'
};

// IDs dos usuários administradores
const ADMIN_USER_IDS = [
  '9e959500-f290-4457-a5d7-2a81c496d123',
  'e6c41b94-f25c-4ef4-b723-c4a2d480cf43'
];

export default function ProvasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingExams, setLoadingExams] = useState(false);

  // Verificar se o usuário é administrador
  const isAdmin = user && ADMIN_USER_IDS.includes(user.id);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCategory !== 'all') {
      loadExamsByCategory(selectedCategory);
    } else {
      loadAllPublicExams();
    }
  }, [selectedCategory]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [typesData, statsData] = await Promise.all([
        ExamsService.getExamTypes(),
        ExamsService.getExamStatsByCategory()
      ]);
      
      setExamTypes(typesData);
      setCategoryStats(statsData);
      
      // Carregar provas públicas iniciais
      await loadAllPublicExams();
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      toast.error('Erro ao carregar dados das provas');
    } finally {
      setLoading(false);
    }
  };

  const loadAllPublicExams = async () => {
    try {
      setLoadingExams(true);
      const examsData = await ExamsService.getPublicExams();
      setExams(examsData);
    } catch (error) {
      console.error('Erro ao carregar provas:', error);
      toast.error('Erro ao carregar provas');
    } finally {
      setLoadingExams(false);
    }
  };

  const loadExamsByCategory = async (categoryName: string) => {
    try {
      setLoadingExams(true);
      const examsData = await ExamsService.getExamsByCategory(categoryName);
      setExams(examsData);
    } catch (error) {
      console.error('Erro ao carregar provas da categoria:', error);
      toast.error('Erro ao carregar provas da categoria');
    } finally {
      setLoadingExams(false);
    }
  };

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (categoryName: string) => {
    const IconComponent = CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS] || BookOpen;
    return IconComponent;
  };

  const getCategoryColor = (categoryName: string) => {
    return CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS] || 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const getCategoryGradient = (categoryName: string) => {
    return CATEGORY_GRADIENTS[categoryName as keyof typeof CATEGORY_GRADIENTS] || 'from-gray-500 to-gray-600';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 mb-6 md:mb-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div className="text-white">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Provas e Simulados
              </h1>
              <p className="text-blue-100 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed">
                Acesse uma vasta coleção de provas de residência médica, ENEM, concursos públicos e vestibulares. 
                Prepare-se com qualidade e conquiste seus objetivos.
              </p>
            </div>
            
            {isAdmin && (
              <Link 
                href="/provas/upload"
                className="group inline-flex items-center px-4 sm:px-6 md:px-8 py-3 md:py-4 bg-white text-blue-600 font-bold rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out text-sm md:text-base"
              >
                <Plus className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5 group-hover:rotate-90 transition-transform duration-300" /> 
                <span className="hidden sm:inline">Adicionar Prova</span>
                <span className="sm:hidden">Adicionar</span>
              </Link>
            )}
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        {/* Estatísticas por Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
          {categoryStats.map((stat, index) => (
            <Card 
              key={stat.category}
              className={`group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border-0 bg-white/80 backdrop-blur-sm ${
                selectedCategory === stat.category 
                  ? 'ring-2 ring-blue-500 shadow-xl scale-105' 
                  : 'hover:bg-white'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => setSelectedCategory(stat.category)}
            >
              <CardContent className="p-4 md:p-6 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.category === 'residencia' ? 'from-blue-100 to-blue-200' : stat.category === 'concursos' ? 'from-purple-100 to-purple-200' : stat.category === 'enem' ? 'from-green-100 to-green-200' : 'from-orange-100 to-orange-200'} rounded-full -translate-y-10 translate-x-10 opacity-50 group-hover:opacity-70 transition-opacity`}></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br ${CATEGORY_GRADIENTS[stat.category] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                      {(() => {
                        const IconComponent = getCategoryIcon(stat.category);
                        return <IconComponent className="h-5 w-5 md:h-6 md:w-6" />;
                      })()}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base md:text-lg">
                      {stat.category === 'residencia' ? 'Residência' : 
                       stat.category === 'concursos' ? 'Concursos' :
                       stat.category === 'enem' ? 'ENEM' : 'Vestibulares'}
                    </h3>
                  </div>
                  
                  <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4 leading-relaxed">{stat.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <Badge className={`px-3 py-1 bg-gradient-to-r ${getCategoryGradient(stat.category)} text-white border-0 font-semibold shadow-md`}>
                      {stat.count} provas
                    </Badge>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <span className="text-blue-600 text-sm">→</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border border-white/20 mb-6 md:mb-8">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 md:h-5 md:w-5" />
                <Input
                  placeholder="Buscar provas por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 md:pl-12 h-10 md:h-12 border-0 bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl shadow-sm focus:shadow-md transition-shadow text-gray-700 placeholder:text-gray-400 text-sm md:text-base"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className={`whitespace-nowrap h-9 md:h-12 px-3 md:px-6 rounded-lg md:rounded-xl font-semibold transition-all duration-300 text-sm md:text-base ${
                  selectedCategory === 'all' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-white hover:shadow-md'
                }`}
              >
                <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Todas
              </Button>
              {isAdmin && (
                <Link href="/simulados/novo">
                  <Button className="whitespace-nowrap h-9 md:h-12 px-3 md:px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg md:rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm md:text-base">
                    <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Nova Prova</span>
                    <span className="sm:hidden">Nova</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

      {/* Lista de Provas */}
      <div className="space-y-3 md:space-y-4">
        {loadingExams ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-40 md:h-48 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : filteredExams.length === 0 ? (
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Nenhuma prova encontrada
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                {selectedCategory === 'all' 
                  ? 'Não há provas disponíveis no momento. Que tal criar a primeira?'
                  : `Não há provas disponíveis para a categoria ${selectedCategory}. Seja o primeiro a contribuir!`
                }
              </p>
              {isAdmin && (
                <Link href="/simulados/novo">
                  <Button className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                    <Plus className="h-5 w-5 mr-3" />
                    Criar Nova Prova
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {filteredExams.map((exam, index) => (
              <Card 
                key={exam.id} 
                className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 md:hover:-translate-y-3 border-0 bg-white/90 backdrop-blur-sm overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${exam.exam_type ? (exam.exam_type.name === 'residencia' ? 'from-blue-50 via-white to-blue-100' : exam.exam_type.name === 'concursos' ? 'from-purple-50 via-white to-purple-100' : exam.exam_type.name === 'enem' ? 'from-green-50 via-white to-green-100' : 'from-orange-50 via-white to-orange-100') : 'from-gray-50 via-white to-gray-100'} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                <CardHeader className="relative z-10 pb-3 md:pb-4 p-4 md:p-6">
                  <div className="flex items-start justify-between mb-2 md:mb-3">
                    <div className="flex-1">
                      <CardTitle className="text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-3 group-hover:text-blue-700 transition-colors line-clamp-2">
                        {exam.title}
                      </CardTitle>
                      {exam.exam_type && (
                        <div className={`inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-full bg-gradient-to-r ${CATEGORY_GRADIENTS[exam.exam_type.name] || 'from-gray-500 to-gray-600'} text-white text-xs md:text-sm font-semibold shadow-md`}>
                          {(() => {
                            const IconComponent = getCategoryIcon(exam.exam_type.name);
                            return <IconComponent className="h-3 w-3 md:h-4 md:w-4" />;
                          })()}
                          {exam.exam_type.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {exam.description && (
                    <CardDescription className="text-gray-600 leading-relaxed line-clamp-3 text-sm md:text-base">
                      {exam.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="relative z-10 pt-0 p-4 md:p-6">
                  <div className="flex items-center gap-3 md:gap-6 text-xs md:text-sm text-gray-500 mb-4 md:mb-6 flex-wrap">
                    {exam.time_limit && (
                      <div className="flex items-center gap-1 md:gap-2 bg-gray-50 px-2 md:px-3 py-1 rounded-lg">
                        <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
                        <span className="font-medium">{exam.time_limit} min</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 md:gap-2 bg-gray-50 px-2 md:px-3 py-1 rounded-lg">
                      <Users className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                      <span className="font-medium">{exam.creator_name || 'Anônimo'}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 md:gap-3">
                    <Button 
                      className="flex-1 h-9 md:h-11 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg md:rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm md:text-base"
                      onClick={() => router.push(`/simulados/${exam.id}/iniciar`)}
                    >
                      Iniciar Prova
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-9 md:h-11 px-3 md:px-4 border-gray-200 text-gray-700 rounded-lg md:rounded-xl hover:bg-gray-50 hover:shadow-md transition-all duration-300 text-sm md:text-base"
                      onClick={() => router.push(`/simulados/${exam.id}`)}
                    >
                      Detalhes
                    </Button>
                  </div>
                </CardContent>
                
                {/* Decorative gradient overlay */}
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${exam.exam_type ? (exam.exam_type.name === 'residencia' ? 'from-blue-100 to-blue-200' : exam.exam_type.name === 'concursos' ? 'from-purple-100 to-purple-200' : exam.exam_type.name === 'enem' ? 'from-green-100 to-green-200' : 'from-orange-100 to-orange-200') : 'from-gray-100 to-gray-200'} rounded-full -translate-y-12 translate-x-12 opacity-20 group-hover:opacity-40 transition-opacity duration-500`}></div>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}