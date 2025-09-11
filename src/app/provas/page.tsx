'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, BookOpen, Users, Clock, Filter } from 'lucide-react';
import { ExamsService, Exam } from '@/services/exams.service';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

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
  residencia: '🏥',
  concursos: '📋',
  enem: '🎓',
  vestibulares: '🏛️'
};

const CATEGORY_COLORS = {
  residencia: 'bg-red-50 border-red-200 text-red-800',
  concursos: 'bg-blue-50 border-blue-200 text-blue-800',
  enem: 'bg-green-50 border-green-200 text-green-800',
  vestibulares: 'bg-purple-50 border-purple-200 text-purple-800'
};

export default function ProvasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [exams, setExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingExams, setLoadingExams] = useState(false);

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
    return CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS] || '📚';
  };

  const getCategoryColor = (categoryName: string) => {
    return CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS] || 'bg-gray-50 border-gray-200 text-gray-800';
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
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl p-8 mb-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Provas e Simulados
              </h1>
              <p className="text-blue-100 text-lg max-w-2xl">
                Acesse uma vasta coleção de provas de residência médica, ENEM, concursos públicos e vestibulares. 
                Prepare-se com qualidade e conquiste seus objetivos.
              </p>
            </div>
            
            <Link
              href="/provas/upload"
              className="group inline-flex items-center px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out"
            >
              <Plus className="mr-3 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" /> 
              Adicionar Prova
            </Link>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        {/* Estatísticas por Categoria */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
              <CardContent className="p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full -translate-y-10 translate-x-10 opacity-50 group-hover:opacity-70 transition-opacity"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                      {getCategoryIcon(stat.category)}
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {stat.category === 'residencia' ? 'Residência' : 
                       stat.category === 'concursos' ? 'Concursos' :
                       stat.category === 'enem' ? 'ENEM' : 'Vestibulares'}
                    </h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">{stat.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <Badge className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 font-semibold">
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
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Buscar provas por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-0 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm focus:shadow-md transition-shadow text-gray-700 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className={`whitespace-nowrap h-12 px-6 rounded-xl font-semibold transition-all duration-300 ${
                  selectedCategory === 'all' 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-white/80 border-gray-200 text-gray-700 hover:bg-white hover:shadow-md'
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Todas
              </Button>
              <Link href="/simulados/novo">
                <Button className="whitespace-nowrap h-12 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Prova
                </Button>
              </Link>
            </div>
          </div>
        </div>

      {/* Lista de Provas */}
      <div className="space-y-4">
        {loadingExams ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
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
              <Link href="/simulados/novo">
                <Button className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                  <Plus className="h-5 w-5 mr-3" />
                  Criar Nova Prova
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredExams.map((exam, index) => (
              <Card 
                key={exam.id} 
                className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 border-0 bg-white/90 backdrop-blur-sm overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <CardHeader className="relative z-10 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors line-clamp-2">
                        {exam.title}
                      </CardTitle>
                      {exam.exam_type && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold shadow-md">
                          <span className="text-base">{getCategoryIcon(exam.exam_type.name)}</span>
                          {exam.exam_type.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {exam.description && (
                    <CardDescription className="text-gray-600 leading-relaxed line-clamp-3">
                      {exam.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="relative z-10 pt-0">
                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-6">
                    {exam.time_limit && (
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{exam.time_limit} min</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{exam.creator_name || 'Anônimo'}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                      onClick={() => router.push(`/simulados/${exam.id}/iniciar`)}
                    >
                      Iniciar Prova
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-11 px-4 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all duration-300"
                      onClick={() => router.push(`/simulados/${exam.id}`)}
                    >
                      Detalhes
                    </Button>
                  </div>
                </CardContent>
                
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full -translate-y-12 translate-x-12 opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}