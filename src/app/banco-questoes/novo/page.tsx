"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Save, 
  Book, 
  X,
  Check,
  FileText
} from 'lucide-react';

export default function NovoBancoQuestoesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [isPublico, setIsPublico] = useState(false);
  
  // Carregar disciplinas na inicialização
  useEffect(() => {
    const loadDisciplines = async () => {
      try {
        const disciplinesData = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(disciplinesData || []);
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        toast.error('Erro ao carregar disciplinas');
      }
    };
    
    loadDisciplines();
  }, []);
  
  // Função para alternar a seleção de uma disciplina
  const handleDisciplinaToggle = (disciplineName: string) => {
    if (selectedDisciplines.includes(disciplineName)) {
      setSelectedDisciplines(selectedDisciplines.filter(d => d !== disciplineName));
    } else {
      setSelectedDisciplines([...selectedDisciplines, disciplineName]);
    }
  };
  
  // Função para salvar o banco de questões
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error('O nome do banco de questões é obrigatório');
      return;
    }
    
    setLoading(true);
    
    try {
      // Aqui faremos a chamada à API para salvar o banco de questões
      // Por enquanto, apenas simulamos um sucesso após um pequeno delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Banco de questões criado com sucesso!');
      router.push('/banco-questoes');
    } catch (error) {
      console.error('Erro ao criar banco de questões:', error);
      toast.error('Ocorreu um erro ao criar o banco de questões.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/banco-questoes"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para Bancos de Questões
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <FileText className="h-6 w-6 mr-2 text-blue-600" />
          Novo Banco de Questões
        </h1>
        
        <form onSubmit={handleSalvar}>
          <div className="space-y-6">
          {/* Nome do banco */}
            <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Banco <span className="text-red-500">*</span>
            </label>
            <input
                id="nome"
              type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Banco de Cardiologia"
                required
              />
          </div>
          
          {/* Descrição */}
            <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              id="descricao"
                rows={4}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva o objetivo deste banco de questões..."
              />
          </div>
          
          {/* Disciplinas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
              Disciplinas Relacionadas
            </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {disciplines.map((disciplina) => (
                  <div 
                    key={disciplina.id} 
                    onClick={() => handleDisciplinaToggle(disciplina.name)}
                    className={`px-4 py-3 rounded-lg border cursor-pointer flex items-center transition-colors ${
                      selectedDisciplines.includes(disciplina.name)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Book className={`h-4 w-4 mr-2 ${
                      selectedDisciplines.includes(disciplina.name) ? 'text-blue-500' : 'text-gray-500'
                    }`} />
                    <span className="flex-grow text-sm">{disciplina.name}</span>
                    {selectedDisciplines.includes(disciplina.name) ? (
                      <Check className="h-5 w-5 text-blue-500" />
                    ) : null}
                </div>
              ))}
            </div>
          </div>
          
            {/* Visibilidade */}
            <div>
            <div className="flex items-center">
              <input
                  id="isPublico"
                type="checkbox"
                  checked={isPublico}
                  onChange={(e) => setIsPublico(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublico" className="ml-2 block text-sm text-gray-700">
                  Tornar este banco público para outros usuários
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
                Bancos públicos podem ser acessados por outros usuários, mas somente você poderá editar.
            </p>
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end">
            <Link
              href="/banco-questoes"
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Criar Banco
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 