"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '../../../../components/layout/AppLayout';
import { ArrowLeft, Plus, X, BookOpen, Save, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  carregarBancoQuestoes, 
  atualizarBancoQuestoes, 
  adicionarQuestaoBanco 
} from '../../../../services/simulados';
import { Card } from '../../../../components/ui/Card';

// ID fixo para o banco único de questões
const BANCO_UNICO_ID = 'banco_unico_global';

export default function NovaQuestaoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [mostrarAdicionarDisciplina, setMostrarAdicionarDisciplina] = useState(false);
  
  // Valor da questão que está sendo criada
  const [questao, setQuestao] = useState({
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
  
  // Carregar disciplinas do banco único
  useEffect(() => {
    const carregarDisciplinas = async () => {
      try {
        setLoading(true);
        
        // Carregar o banco único de questões
        const banco = await carregarBancoQuestoes(BANCO_UNICO_ID);
        
        if (banco) {
          setDisciplinas(banco.disciplinas);
          
          // Se houver disciplinas, selecionar a primeira por padrão
          if (banco.disciplinas.length > 0) {
            setQuestao(prev => ({
              ...prev,
              disciplina: banco.disciplinas[0]
            }));
          }
        } else {
          // Se o banco não existir, redirecionar para a página do banco de questões
          toast.error('Banco de questões não encontrado');
          router.push('/simulados/questoes');
        }
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        toast.error('Erro ao carregar disciplinas');
      } finally {
        setLoading(false);
      }
    };
    
    carregarDisciplinas();
  }, [router]);
  
  // Atualizar campo da questão
  const atualizarCampoQuestao = (campo: string, valor: any) => {
    setQuestao(prev => ({
      ...prev,
      [campo]: valor
    }));
  };
  
  // Atualizar alternativa
  const atualizarAlternativa = (index: number, campo: 'texto' | 'correta', valor: string | boolean) => {
    const novasAlternativas = [...questao.alternativas];
    
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
    
    setQuestao({
      ...questao,
      alternativas: novasAlternativas
    });
  };
  
  // Adicionar nova disciplina
  const adicionarDisciplina = async () => {
    if (!novaDisciplina.trim()) {
      toast.error('O nome da disciplina não pode estar vazio');
      return;
    }
    
    if (disciplinas.includes(novaDisciplina.trim())) {
      toast.error('Esta disciplina já existe');
      return;
    }
    
    try {
      const novasDisciplinas = [...disciplinas, novaDisciplina.trim()];
      
      // Carregar o banco atual
      const banco = await carregarBancoQuestoes(BANCO_UNICO_ID);
      
      if (banco) {
        // Atualizar o banco com a nova disciplina
        await atualizarBancoQuestoes(BANCO_UNICO_ID, {
          ...banco,
          disciplinas: novasDisciplinas,
          ultimaAtualizacao: new Date().toISOString()
        });
        
        setDisciplinas(novasDisciplinas);
        setQuestao(prev => ({
          ...prev,
          disciplina: novaDisciplina.trim()
        }));
        setNovaDisciplina('');
        setMostrarAdicionarDisciplina(false);
        
        toast.success('Disciplina adicionada com sucesso');
      }
    } catch (error) {
      console.error('Erro ao adicionar disciplina:', error);
      toast.error('Erro ao adicionar disciplina');
    }
  };
  
  // Renderizar letra da alternativa (A, B, C, etc.)
  const renderizarLetraAlternativa = (index: number) => {
    return String.fromCharCode(65 + index); // A = 65, B = 66, etc.
  };
  
  // Salvar questão
  const salvarQuestao = async () => {
    // Validações
    if (!questao.disciplina) {
      toast.error('Selecione uma disciplina');
      return;
    }
    
    if (!questao.assunto.trim()) {
      toast.error('Digite o assunto da questão');
      return;
    }
    
    if (!questao.enunciado.trim()) {
      toast.error('Digite o enunciado da questão');
      return;
    }
    
    if (questao.alternativas.some(alt => !alt.texto.trim())) {
      toast.error('Preencha o texto de todas as alternativas');
      return;
    }
    
    if (!questao.alternativas.some(alt => alt.correta)) {
      toast.error('Selecione pelo menos uma alternativa correta');
      return;
    }
    
    try {
      setSalvando(true);
      
      // Adicionar a questão ao banco único
      await adicionarQuestaoBanco(BANCO_UNICO_ID, {
        disciplina: questao.disciplina,
        assunto: questao.assunto,
        enunciado: questao.enunciado,
        dificuldade: questao.dificuldade,
        alternativas: questao.alternativas,
        explicacao: questao.explicacao.trim() !== '' ? questao.explicacao : undefined
      });
      
      toast.success('Questão adicionada com sucesso');
      
      // Redirecionar para a página do banco de questões
      router.push('/simulados/questoes');
    } catch (error) {
      console.error('Erro ao salvar questão:', error);
      toast.error('Erro ao salvar questão');
      setSalvando(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="mb-6">
          <Link 
            href="/simulados/questoes" 
            className="group flex items-center text-gray-600 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar para o Banco de Questões</span>
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Nova Questão</h1>
          <p className="text-gray-600">
            Adicione uma nova questão ao banco de questões
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-gray-600">Carregando...</span>
          </div>
        ) : (
          <Card>
            {/* Formulário da questão */}
            <div className="space-y-6">
              {/* Disciplina */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={questao.disciplina}
                    onChange={(e) => atualizarCampoQuestao('disciplina', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={disciplinas.length === 0}
                  >
                    {disciplinas.length === 0 ? (
                      <option value="">Nenhuma disciplina disponível</option>
                    ) : (
                      disciplinas.map((disciplina, index) => (
                        <option key={index} value={disciplina}>
                          {disciplina}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    onClick={() => setMostrarAdicionarDisciplina(true)}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex-shrink-0"
                    type="button"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Assunto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={questao.assunto}
                  onChange={(e) => atualizarCampoQuestao('assunto', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Sistema respiratório"
                />
              </div>
              
              {/* Dificuldade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dificuldade <span className="text-red-500">*</span>
                </label>
                <select
                  value={questao.dificuldade}
                  onChange={(e) => atualizarCampoQuestao('dificuldade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="facil">Fácil</option>
                  <option value="media">Média</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
              
              {/* Enunciado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enunciado <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={questao.enunciado}
                  onChange={(e) => atualizarCampoQuestao('enunciado', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o enunciado da questão"
                />
              </div>
              
              {/* Alternativas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alternativas <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {questao.alternativas.map((alternativa, index) => (
                    <div key={alternativa.id} className="flex items-start gap-2">
                      <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center ${
                        alternativa.correta ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {renderizarLetraAlternativa(index)}
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={alternativa.texto}
                          onChange={(e) => atualizarAlternativa(index, 'texto', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Digite a alternativa ${renderizarLetraAlternativa(index)}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => atualizarAlternativa(index, 'correta', true)}
                        className={`px-3 py-2 border rounded-md flex items-center justify-center ${
                          alternativa.correta
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Check className="h-5 w-5" />
                      </button>
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
                  value={questao.explicacao}
                  onChange={(e) => atualizarCampoQuestao('explicacao', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite uma explicação sobre a resposta correta (opcional)"
                />
              </div>
              
              {/* Botões de ação */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Link
                  href="/simulados/questoes"
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </Link>
                <button
                  onClick={salvarQuestao}
                  disabled={salvando}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 ${
                    salvando ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {salvando ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Salvar Questão</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Modal para adicionar disciplina */}
            {mostrarAdicionarDisciplina && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-medium mb-4">Nova Disciplina</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Disciplina
                    </label>
                    <input
                      type="text"
                      value={novaDisciplina}
                      onChange={(e) => setNovaDisciplina(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Anatomia"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setMostrarAdicionarDisciplina(false);
                        setNovaDisciplina('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={adicionarDisciplina}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppLayout>
  );
} 