"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '../../../components/layout/AppLayout';
import { Card } from '../../../components/ui/Card';
import { carregarSimulado, atualizarStatusSimulado, Simulado, Questao } from '../../../services/simulados';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '../../../components/ui/Toast';
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Play,
  ListChecks,
  FileText
} from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
}

export default function VisualizarSimuladoPage({ params }: PageProps) {
  const router = useRouter();
  const [simulado, setSimulado] = useState<Simulado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDadosSimulado();
  }, [params.id]);

  const carregarDadosSimulado = async () => {
    setLoading(true);
    setError(null);

    try {
      const simuladoCarregado = carregarSimulado(params.id);
      
      if (!simuladoCarregado) {
        setError('Simulado não encontrado');
        return;
      }
      
      setSimulado(simuladoCarregado);
    } catch (err) {
      console.error('Erro ao carregar simulado:', err);
      setError('Falha ao carregar o simulado. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    return format(new Date(data), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  };

  const iniciarSimulado = () => {
    if (!simulado) return;
    
    try {
      // Atualizar o status para "em-andamento"
      atualizarStatusSimulado(simulado.id, 'em-andamento');
      
      // Redirecionar para a página de realizar o simulado
      router.push(`/simulados/realizar/${simulado.id}`);
    } catch (error) {
      console.error('Erro ao iniciar simulado:', error);
      toast.error('Não foi possível iniciar o simulado');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando simulado...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !simulado) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link 
            href="/simulados" 
            className="group flex items-center text-gray-600 hover:text-blue-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar para Simulados</span>
          </Link>
          
          <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-red-600 font-medium">Erro</p>
                <p className="text-sm text-red-500">{error || 'Simulado não encontrado'}</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

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
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{simulado.titulo}</h1>
          {simulado.descricao && (
            <p className="text-gray-600 mb-4">{simulado.descricao}</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{simulado.duracao} minutos</span>
            </div>
            <div className="flex items-center">
              <ListChecks className="h-4 w-4 mr-1" />
              <span>{simulado.quantidadeQuestoes} questões</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Criado em {formatarData(simulado.dataCriacao)}</span>
            </div>
            {simulado.status === 'agendado' && simulado.dataAgendada && (
              <div className="flex items-center text-blue-600">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Agendado para {formatarData(simulado.dataAgendada)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Status e ações */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-1">Status do Simulado</h3>
              <div className="flex items-center">
                {simulado.status === 'criado' && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    Criado
                  </span>
                )}
                {simulado.status === 'agendado' && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    Agendado
                  </span>
                )}
                {simulado.status === 'em-andamento' && (
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    Em andamento
                  </span>
                )}
                {simulado.status === 'concluido' && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Concluído
                  </span>
                )}
              </div>
            </div>
            
            <div>
              {(simulado.status === 'criado' || simulado.status === 'agendado') && (
                <button
                  onClick={iniciarSimulado}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Iniciar Simulado</span>
                </button>
              )}
              {simulado.status === 'em-andamento' && (
                <button
                  onClick={() => router.push(`/simulados/realizar/${simulado.id}`)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  <span>Continuar Simulado</span>
                </button>
              )}
              {simulado.status === 'concluido' && (
                <button
                  onClick={() => router.push(`/simulados/resultado/${simulado.id}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Ver Resultados</span>
                </button>
              )}
            </div>
          </div>
        </Card>
        
        {/* Disciplinas */}
        <Card 
          title="Disciplinas" 
          icon={<BookOpen className="h-5 w-5" />}
          className="mb-6"
        >
          <div className="flex flex-wrap gap-2">
            {simulado.disciplinas.map((disciplina, index) => (
              <div key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm">
                {disciplina}
              </div>
            ))}
          </div>
        </Card>
        
        {/* Informações adicionais */}
        <Card title="Informações do Simulado" icon={<FileText className="h-5 w-5" />}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Duração</h4>
                <p className="text-gray-600">{simulado.duracao} minutos</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Quantidade de Questões</h4>
                <p className="text-gray-600">{simulado.quantidadeQuestoes} questões</p>
              </div>
            </div>
            
            {simulado.status === 'concluido' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Acertos</h4>
                  <p className="text-green-600 font-medium">{simulado.acertos || 0} de {simulado.quantidadeQuestoes} ({Math.round(((simulado.acertos || 0) / simulado.quantidadeQuestoes) * 100)}%)</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Tempo Gasto</h4>
                  <p className="text-gray-600">{simulado.tempoGasto || "N/A"} minutos</p>
                </div>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Instruções</h4>
              <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p>
                  Este simulado contém {simulado.quantidadeQuestoes} questões e deve ser completado em {simulado.duracao} minutos.
                  {simulado.status === 'criado' && (
                    " O simulado estará disponível para realização assim que você clicar em 'Iniciar'."
                  )}
                  {simulado.status === 'agendado' && simulado.dataAgendada && (
                    ` O simulado está agendado para ${formatarData(simulado.dataAgendada)}.`
                  )}
                </p>
                <p className="mt-2">
                  Após iniciar, leia atentamente cada questão e selecione a alternativa que considerar correta. 
                  Você pode navegar entre as questões livremente durante o tempo disponível.
                </p>
                <p className="mt-2">
                  Ao finalizar, seus resultados serão exibidos imediatamente, mostrando seu desempenho geral e por disciplina.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
} 