'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  BarChart2, 
  ClipboardList, 
  Calendar, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  AlertCircle,
  Check,
  FileText,
  BookOpen,
  Medal,
  Award,
  Clock,
  Bell,
  Info,
  X,
  Flag,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Save,
  Loader2,
  Settings
} from 'lucide-react';
import { getDisciplines } from '@/lib/api';

// Importar o serviço de sincronização de dados
import { sincronizarDados } from '@/services/data-sync';

// Interface para o formulário de notas
interface NotaForm {
  disciplinaId: number;
  nome: string;
  tipo: 'prova' | 'trabalho' | 'exercicio' | 'seminario' | 'projeto' | 'outra';
  formato: 'numerica' | 'conceito' | 'aprovado_reprovado';
  valorNumerico?: number;
  valorConceito?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'S' | 'N' | 'O' | 'I';
  valorAprovacao?: 'aprovado' | 'reprovado';
  peso: number;
  data: string;
  observacoes?: string;
}

// Interface para o formulário de faltas
interface FaltaForm {
  disciplinaId: number;
  data: string;
  quantidade: number;
  justificada: boolean;
  observacoes?: string;
}

// Interface para configuração de frequência
interface ConfigFrequenciaForm {
  disciplinaId: number;
  modoCalculo: 'total' | 'periodo';  // Modo de cálculo: total direto ou por período
  totalAulas: number;
  aulasPorSemana: number;
  dataInicio: string;
  dataFim: string;
  frequenciaMinima: number;
}

// Interface para as disciplinas
interface Disciplina {
  id: number;
  nome: string;
  semestre: string;
  avaliacoes: Array<{nome: string, nota: number}>;
  media: number;
  status: 'aprovado' | 'reprovado' | 'em andamento';
}

export default function DesempenhoAcademicoPage() {
  const [activeTab, setActiveTab] = useState('notas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFaltaModalOpen, setIsFaltaModalOpen] = useState(false);
  const [isConfigFrequenciaModalOpen, setIsConfigFrequenciaModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Nota adicionada com sucesso!');
  const [updatedDisciplinaId, setUpdatedDisciplinaId] = useState<number | null>(null);
  const [disciplinasState, setDisciplinasState] = useState<Disciplina[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [avaliacaoEmEdicao, setAvaliacaoEmEdicao] = useState<{disciplinaId: number, indiceAvaliacao: number} | null>(null);
  const [formNota, setFormNota] = useState<NotaForm>({
    disciplinaId: 0,
    nome: '',
    tipo: 'prova',
    formato: 'numerica',
    valorNumerico: 0,
    peso: 1,
    data: new Date().toISOString().split('T')[0]
  });
  const [formFalta, setFormFalta] = useState<FaltaForm>({
    disciplinaId: 0,
    data: new Date().toISOString().split('T')[0],
    quantidade: 1,
    justificada: false,
    observacoes: ''
  });
  const [formConfigFrequencia, setFormConfigFrequencia] = useState<ConfigFrequenciaForm>({
    disciplinaId: 0,
    modoCalculo: 'total',
    totalAulas: 60,
    aulasPorSemana: 2,
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString().split('T')[0],
    frequenciaMinima: 75
  });
  
  // Função para determinar o semestre atual
  const obterSemestreAtual = (): string => {
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth() + 1; // Janeiro é 0
    
    // Define o semestre com base no mês
    // 1º semestre: janeiro a junho (1-6)
    // 2º semestre: julho a dezembro (7-12)
    const semestre = mes <= 6 ? '1º' : '2º';
    
    return `${semestre} Semestre - ${ano}`;
  };
  
  // Obter o semestre atual uma vez para uso em toda a página
  const semestreAtual = obterSemestreAtual();
  
  const [frequenciasState, setFrequenciasState] = useState([
    {
      id: 1,
      disciplina: 'Fisiologia',
      semestre: semestreAtual,
      totalAulas: 60,
      faltas: 8,
      limite: 15,
      porcentagem: 75,
      status: 'regular',
      registrosFaltas: [
        { data: '2023-03-15', quantidade: 2, justificada: false },
        { data: '2023-04-20', quantidade: 4, justificada: true },
        { data: '2023-05-10', quantidade: 2, justificada: false }
      ]
    },
    {
      id: 2,
      disciplina: 'Anatomia',
      semestre: semestreAtual,
      totalAulas: 80,
      faltas: 14,
      limite: 20,
      porcentagem: 82,
      status: 'atencao',
      registrosFaltas: [
        { data: '2023-03-17', quantidade: 6, justificada: true },
        { data: '2023-04-25', quantidade: 4, justificada: false },
        { data: '2023-05-18', quantidade: 4, justificada: false }
      ]
    },
    {
      id: 3,
      disciplina: 'Bioquímica',
      semestre: semestreAtual,
      totalAulas: 40,
      faltas: 3,
      limite: 10,
      porcentagem: 92,
      status: 'otimo',
      registrosFaltas: [
        { data: '2023-04-05', quantidade: 2, justificada: false },
        { data: '2023-05-20', quantidade: 1, justificada: true }
      ]
    }
  ]);
  
  // Buscar disciplinas ao carregar a página
  useEffect(() => {
    async function carregarDisciplinas() {
      try {
        setIsLoading(true);
        const response = await getDisciplines();
        console.log("Resposta da API de disciplinas:", response);
        
        let disciplinasCarregadas: Disciplina[] = [];
        
        if (response.success && response.disciplines && Array.isArray(response.disciplines) && response.disciplines.length > 0) {
          // Filtrar apenas disciplinas do usuário (que começam com "User:") e formatar os dados
          disciplinasCarregadas = response.disciplines
            .filter((disc: any) => {
              const name = disc.name || disc.Name || "";
              // Considerar apenas as disciplinas com nome que começa com "User:"
              return typeof name === 'string' && name.startsWith('User:');
            })
            .map((disc: any) => {
              console.log("Processando disciplina do usuário:", disc);
              // Remove o prefixo "User:" do nome
              const nomeDisciplina = (disc.name || disc.Name || "").replace('User:', '');
              
            return {
              id: disc.id || disc.Id,
                nome: nomeDisciplina,
              semestre: semestreAtual, // Usar o semestre atual calculado
            avaliacoes: [],
            media: 0,
            status: 'em andamento' as 'aprovado' | 'reprovado' | 'em andamento'
            };
          });
          
          console.log("Disciplinas do usuário formatadas:", disciplinasCarregadas);
          
          // Se não tiver disciplinas do usuário, usar as de exemplo
          if (disciplinasCarregadas.length === 0) {
            console.log("Nenhuma disciplina do usuário encontrada, usando dados de exemplo");
            usarDisciplinasExemplo();
          } else {
        setDisciplinasState(disciplinasCarregadas);
        
        // Se temos disciplinas, também atualizamos o formNota para ter
        // a primeira disciplina selecionada
        if (disciplinasCarregadas.length > 0) {
          setFormNota(prev => ({
            ...prev,
            disciplinaId: disciplinasCarregadas[0].id
          }));
            }
          }
        } else {
          console.log("Não foi possível carregar disciplinas da API ou lista vazia, usando dados de exemplo");
          usarDisciplinasExemplo();
        }
      } catch (error) {
        console.error("Erro ao carregar disciplinas:", error);
        usarDisciplinasExemplo();
      } finally {
        setIsLoading(false);
      }
    }
        
    function usarDisciplinasExemplo() {
      // Dados de exemplo em caso de erro ou sem disciplinas
        const disciplinasExemplo: Disciplina[] = [
          { 
            id: 1, 
            nome: 'Anatomia', 
            semestre: semestreAtual, // Usar o semestre atual calculado
            avaliacoes: [
              { nome: 'Prova 1', nota: 8.5 },
              { nome: 'Prova 2', nota: 7.0 },
              { nome: 'Trabalho Prático', nota: 9.0 }
            ],
            media: 8.2,
            status: 'aprovado'
          },
          { 
            id: 2, 
            nome: 'Fisiologia', 
            semestre: semestreAtual, // Usar o semestre atual calculado
            avaliacoes: [
              { nome: 'Prova 1', nota: 7.0 },
              { nome: 'Prova 2', nota: 6.8 },
              { nome: 'Seminário', nota: 8.5 }
            ],
            media: 7.4,
            status: 'aprovado'
          },
          { 
            id: 3, 
            nome: 'Bioquímica', 
            semestre: semestreAtual, // Usar o semestre atual calculado
            avaliacoes: [
              { nome: 'Prova 1', nota: 4.5 },
              { nome: 'Prova 2', nota: 7.0 },
              { nome: 'Laboratório', nota: 6.5 }
            ],
            media: 6.0,
            status: 'em andamento'
          }
        ];
        
      console.log("Usando disciplinas de exemplo:", disciplinasExemplo);
        setDisciplinasState(disciplinasExemplo);
        
        // Selecionar a primeira disciplina para o formulário
        setFormNota(prev => ({
          ...prev,
          disciplinaId: disciplinasExemplo[0].id
        }));
    }
    
    carregarDisciplinas();
  }, [semestreAtual]); // Adicionar semestreAtual como dependência
  
  // Função para abrir o modal
  const handleOpenModal = () => {
    // Verificar se há disciplinas disponíveis
    console.log("Abrindo modal, disciplinas disponíveis:", disciplinasState);
    
    if (disciplinasState.length === 0) {
      alert("Não há disciplinas disponíveis. Por favor, adicione disciplinas primeiro.");
      return;
    }
    
    // Escolher a primeira disciplina ou usar 0 se não houver nenhuma
    const primeiraDisc = disciplinasState.length > 0 ? disciplinasState[0].id : 0;
    console.log("Primeira disciplina ID:", primeiraDisc);
    
    // Resetar o formulário para o estado inicial limpo
    const formInicial: NotaForm = {
      disciplinaId: primeiraDisc,
      nome: '',
      tipo: 'prova',
      formato: 'numerica',
      valorNumerico: 0,
      peso: 1,
      data: new Date().toISOString().split('T')[0]
    };
    
    setIsEditMode(false);
    setAvaliacaoEmEdicao(null);
    console.log("Form inicial:", formInicial);
    setFormNota(formInicial);
    setIsModalOpen(true);
  };

  // Função para abrir o modal em modo de edição
  const handleEditAvaliacao = (disciplinaId: number, indiceAvaliacao: number) => {
    const disciplina = disciplinasState.find(d => d.id === disciplinaId);
    if (!disciplina) return;
    
    const avaliacao = disciplina.avaliacoes[indiceAvaliacao];
    if (!avaliacao) return;
    
    // Preparar o formulário com os dados da avaliação
    const formEdicao: NotaForm = {
      disciplinaId,
      nome: avaliacao.nome,
      tipo: 'prova', // Valor padrão pois não temos este dado no objeto avaliacao
      formato: 'numerica', // Valor padrão pois não temos este dado no objeto avaliacao
      valorNumerico: avaliacao.nota,
      peso: 1, // Valor padrão pois não temos este dado no objeto avaliacao
      data: new Date().toISOString().split('T')[0] // Data atual pois não temos este dado no objeto avaliacao
    };
    
    setIsEditMode(true);
    setAvaliacaoEmEdicao({ disciplinaId, indiceAvaliacao });
    setFormNota(formEdicao);
    setIsModalOpen(true);
  };

  // Função para excluir uma avaliação
  const handleDeleteAvaliacao = (disciplinaId: number, indiceAvaliacao: number) => {
    if (!confirm("Tem certeza que deseja excluir esta avaliação?")) {
      return;
    }
    
    const novasDisciplinas = [...disciplinasState];
    const disciplinaIndex = novasDisciplinas.findIndex(d => d.id === disciplinaId);
    
    if (disciplinaIndex !== -1) {
      // Remover a avaliação específica
      novasDisciplinas[disciplinaIndex].avaliacoes.splice(indiceAvaliacao, 1);
      
      // Recalcular média
      if (novasDisciplinas[disciplinaIndex].avaliacoes.length > 0) {
        const totalNotas = novasDisciplinas[disciplinaIndex].avaliacoes.reduce(
          (acc, aval) => acc + aval.nota, 0
        );
        
        novasDisciplinas[disciplinaIndex].media = 
          totalNotas / novasDisciplinas[disciplinaIndex].avaliacoes.length;
        
        // Atualizar o status com base na média calculada
        if (novasDisciplinas[disciplinaIndex].media >= 7) {
          novasDisciplinas[disciplinaIndex].status = 'aprovado';
        } else if (novasDisciplinas[disciplinaIndex].media < 5) {
          novasDisciplinas[disciplinaIndex].status = 'reprovado';
        } else {
          novasDisciplinas[disciplinaIndex].status = 'em andamento';
        }
      } else {
        // Se não houver mais avaliações, resetar a média
        novasDisciplinas[disciplinaIndex].media = 0;
        novasDisciplinas[disciplinaIndex].status = 'em andamento';
      }
      
      // Atualizar o estado das disciplinas
      setDisciplinasState([...novasDisciplinas]);
      
      // Definir qual disciplina foi atualizada para o efeito visual
      setUpdatedDisciplinaId(disciplinaId);
      
      // Resetar o ID da disciplina atualizada após 2 segundos
      setTimeout(() => {
        setUpdatedDisciplinaId(null);
      }, 2000);
      
      // Mostrar toast de sucesso
      setToastMessage('Avaliação excluída com sucesso!');
      setShowToast(true);
      
      // Esconder o toast depois de 3 segundos
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  };

  // Função para fechar o modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Função para atualizar o formulário
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Para campos numéricos, converter para number
    if (name === 'valorNumerico' || name === 'peso') {
      setFormNota({
        ...formNota,
        [name]: parseFloat(value)
      });
    } else if (name === 'disciplinaId') {
      const disciplinaId = parseInt(value, 10);
      console.log(`Alterando disciplina para ID: ${disciplinaId}`);
      
      // Garantir que o valor seja um número válido
      if (!isNaN(disciplinaId)) {
      setFormNota({
        ...formNota,
          disciplinaId: disciplinaId
      });
      } else {
        console.error('ID de disciplina inválido:', value);
      }
    } else if (name === 'formato') {
      // Resetar os valores específicos de formato quando mudar o formato
      let updatedForm: Partial<NotaForm> = {
        formato: value as 'numerica' | 'conceito' | 'aprovado_reprovado'
      };
      
      if (value === 'numerica') {
        updatedForm.valorNumerico = 0;
        updatedForm.valorConceito = undefined;
        updatedForm.valorAprovacao = undefined;
      } else if (value === 'conceito') {
        updatedForm.valorNumerico = undefined;
        updatedForm.valorConceito = 'A';
        updatedForm.valorAprovacao = undefined;
      } else if (value === 'aprovado_reprovado') {
        updatedForm.valorNumerico = undefined;
        updatedForm.valorConceito = undefined;
        updatedForm.valorAprovacao = 'aprovado';
      }
      
      setFormNota({
        ...formNota,
        ...updatedForm
      });
    } else {
      setFormNota({
        ...formNota,
        [name]: value
      });
    }
  };

  // Função para salvar a nota
  const handleSaveNota = () => {
    // Validar se há disciplina selecionada
    if (formNota.disciplinaId === 0) {
      alert('Por favor, selecione uma disciplina');
      return;
    }
    
    // Validar valor dependendo do formato
    if (formNota.formato === 'numerica' && (formNota.valorNumerico === undefined || formNota.valorNumerico < 0)) {
      alert('Por favor, informe um valor numérico válido para a nota');
      return;
    } else if (formNota.formato === 'conceito' && !formNota.valorConceito) {
      alert('Por favor, selecione um conceito');
      return;
    } else if (formNota.formato === 'aprovado_reprovado' && !formNota.valorAprovacao) {
      alert('Por favor, selecione aprovado ou reprovado');
      return;
    }
    
    // Buscar disciplina
    const disciplina = disciplinasState.find(d => d.id === formNota.disciplinaId);
    if (!disciplina) {
      alert('Disciplina não encontrada');
      return;
    }
    
    // Se estamos em modo de edição
    if (isEditMode && avaliacaoEmEdicao !== null) {
      // Clone do array de disciplinas
      const novasDisciplinas = [...disciplinasState];
      
      // Encontrar índice da disciplina
      const disciplinaIndex = novasDisciplinas.findIndex(d => d.id === avaliacaoEmEdicao.disciplinaId);
      
      if (disciplinaIndex !== -1) {
        // Substituir avaliação editada
        const avaliacoes = [...novasDisciplinas[disciplinaIndex].avaliacoes];
        
        // Determinar o valor da nota com base no formato
        let valorNota = 0;
        if (formNota.formato === 'numerica' && formNota.valorNumerico !== undefined) {
          valorNota = formNota.valorNumerico;
        } else if (formNota.formato === 'conceito' && formNota.valorConceito) {
          // Converter conceito para valor numérico equivalente
          const tabelaConceitos: Record<string, number> = {
            'A': 10.0, 'B': 8.0, 'C': 6.0, 'D': 4.0, 'E': 2.0, 'F': 0.0,
            'S': 7.0, 'N': 0.0,
            'O': 10.0, 'I': 0.0
          };
          valorNota = tabelaConceitos[formNota.valorConceito] || 0;
        } else if (formNota.formato === 'aprovado_reprovado' && formNota.valorAprovacao) {
          valorNota = formNota.valorAprovacao === 'aprovado' ? 10.0 : 0.0;
        }
        
        avaliacoes[avaliacaoEmEdicao.indiceAvaliacao] = {
          nome: formNota.nome,
          nota: valorNota
        };
        
        // Atualizar array de avaliações
        novasDisciplinas[disciplinaIndex].avaliacoes = avaliacoes;
        
        // Recalcular média
        const somaNotas = avaliacoes.reduce((soma, av) => soma + av.nota, 0);
        novasDisciplinas[disciplinaIndex].media = somaNotas / avaliacoes.length;
        
        // Atualizar estado
        setDisciplinasState(novasDisciplinas);
        
        // Salvar no localStorage
        localStorage.setItem('disciplinasState', JSON.stringify(novasDisciplinas));
        
        // Atualizar mensagem de sucesso
        setToastMessage('Avaliação atualizada com sucesso!');
      }
    } else {
      // Criar nova avaliação
      
      // Clone do array de disciplinas
      const novasDisciplinas = [...disciplinasState];
      
      // Encontrar índice da disciplina selecionada
      const disciplinaIndex = novasDisciplinas.findIndex(d => d.id === formNota.disciplinaId);
      
      if (disciplinaIndex !== -1) {
        // Determinar o valor da nota com base no formato
        let valorNota = 0;
        if (formNota.formato === 'numerica' && formNota.valorNumerico !== undefined) {
          valorNota = formNota.valorNumerico;
        } else if (formNota.formato === 'conceito' && formNota.valorConceito) {
          // Converter conceito para valor numérico equivalente
          const tabelaConceitos: Record<string, number> = {
            'A': 10.0, 'B': 8.0, 'C': 6.0, 'D': 4.0, 'E': 2.0, 'F': 0.0,
            'S': 7.0, 'N': 0.0,
            'O': 10.0, 'I': 0.0
          };
          valorNota = tabelaConceitos[formNota.valorConceito] || 0;
        } else if (formNota.formato === 'aprovado_reprovado' && formNota.valorAprovacao) {
          valorNota = formNota.valorAprovacao === 'aprovado' ? 10.0 : 0.0;
        }
        
        // Adicionar nova avaliação
        const novaAvaliacao = {
          nome: formNota.nome,
          nota: valorNota
        };
        
        // Clone do array de avaliações
        const avaliacoes = [...novasDisciplinas[disciplinaIndex].avaliacoes, novaAvaliacao];
        
        // Atualizar array de avaliações
        novasDisciplinas[disciplinaIndex].avaliacoes = avaliacoes;
        
        // Recalcular média
        const somaNotas = avaliacoes.reduce((soma, av) => soma + av.nota, 0);
        novasDisciplinas[disciplinaIndex].media = somaNotas / avaliacoes.length;
        
        // Atualizar status se média >= 7.0
        if (novasDisciplinas[disciplinaIndex].media >= 7.0) {
          novasDisciplinas[disciplinaIndex].status = 'aprovado';
        } else if (novasDisciplinas[disciplinaIndex].media < 5.0) {
          novasDisciplinas[disciplinaIndex].status = 'reprovado';
        } else {
          novasDisciplinas[disciplinaIndex].status = 'em andamento';
        }
        
        // Atualizar estado
        setDisciplinasState(novasDisciplinas);
        
        // Salvar no localStorage
        localStorage.setItem('disciplinasState', JSON.stringify(novasDisciplinas));
        
        // Atualizar mensagem de sucesso
        setToastMessage('Nota adicionada com sucesso!');
      }
    }
    
    // Fechar modal
    handleCloseModal();
    
    // Mostrar toast de sucesso
    setShowToast(true);
    
    // Esconder o toast depois de 3 segundos
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
    
    // Atualizar ID da disciplina que acabou de ser atualizada
    setUpdatedDisciplinaId(formNota.disciplinaId);
    
    // Sincronizar dados com o resto do sistema
    sincronizarDados()
      .then(() => console.log("Dados sincronizados após salvar nota"))
      .catch((error: Error) => console.error("Erro ao sincronizar após salvar nota:", error));
    
    // Mostrar toast de sucesso
    setShowToast(true);
    
    // Esconder o toast depois de 3 segundos
    setTimeout(() => {
      setShowToast(false);
      }, 3000);
  };
  
  const frequencias = [
    {
      id: 1,
      disciplina: 'Fisiologia',
      semestre: semestreAtual,
      totalAulas: 60,
      faltas: 8,
      limite: 15,
      porcentagem: 75,
      status: 'regular'
    },
    {
      id: 2,
      disciplina: 'Anatomia',
      semestre: semestreAtual,
      totalAulas: 80,
      faltas: 14,
      limite: 20,
      porcentagem: 82,
      status: 'atencao'
    },
    {
      id: 3,
      disciplina: 'Bioquímica',
      semestre: semestreAtual,
      totalAulas: 40,
      faltas: 3,
      limite: 10,
      porcentagem: 92,
      status: 'otimo'
    }
  ];

  const compromissos = [
    {
      id: 1,
      titulo: 'Entrega de Trabalho',
      disciplina: 'Anatomia',
      descricao: 'Trabalho Prático',
      data: '15/05/2023',
      hora: '23:59',
      detalhes: 'Entregar relatório sobre o sistema nervoso com os resultados da análise prática.',
      prioridade: 'alta',
      cor: 'yellow'
    },
    {
      id: 2,
      titulo: 'Prova Final',
      disciplina: 'Fisiologia',
      descricao: 'Avaliação somativa',
      data: '20/06/2023',
      hora: '09:00',
      detalhes: 'Prova abrangendo todo o conteúdo do semestre, com foco em sistema circulatório e respiratório.',
      prioridade: 'alta',
      cor: 'red'
    },
    {
      id: 3,
      titulo: 'Aula de Revisão',
      disciplina: 'Bioquímica',
      descricao: 'Preparação para prova',
      data: '12/06/2023',
      hora: '14:30',
      detalhes: 'Revisão dos principais tópicos que serão cobrados na prova final.',
      prioridade: 'média',
      cor: 'blue'
    }
  ];
  
  // Função para excluir disciplina
  const handleDeleteDisciplina = (disciplinaId: number) => {
    if (!confirm("Tem certeza que deseja excluir esta disciplina e todas as suas avaliações?")) {
      return;
    }
    
    const novasDisciplinas = disciplinasState.filter(d => d.id !== disciplinaId);
    setDisciplinasState(novasDisciplinas);
    
    // Mostrar toast de sucesso
    setToastMessage('Disciplina excluída com sucesso!');
    setShowToast(true);
    
    // Esconder o toast depois de 3 segundos
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };
  
  // Função para editar disciplina (a implementar)
  const handleEditDisciplina = (disciplinaId: number) => {
    alert("Função para editar disciplina ainda não implementada. Por favor, use a seção de Disciplinas para gerenciar suas disciplinas.");
  };
  
  // Função para abrir o modal de registrar faltas
  const handleOpenFaltaModal = () => {
    // Verificar se há disciplinas disponíveis
    if (disciplinasState.length === 0) {
      alert("Não há disciplinas disponíveis. Por favor, adicione disciplinas primeiro.");
      return;
    }
    
    // Escolher a primeira disciplina ou usar 0 se não houver nenhuma
    const primeiraDisc = disciplinasState.length > 0 ? disciplinasState[0].id : 0;
    
    // Resetar o formulário para o estado inicial limpo
    const formInicial: FaltaForm = {
      disciplinaId: primeiraDisc,
      data: new Date().toISOString().split('T')[0],
      quantidade: 1,
      justificada: false,
      observacoes: ''
    };
    
    setFormFalta(formInicial);
    setIsFaltaModalOpen(true);
  };

  // Função para fechar o modal de faltas
  const handleCloseFaltaModal = () => {
    setIsFaltaModalOpen(false);
  };

  // Função para atualizar o formulário de faltas
  const handleFormFaltaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormFalta({
        ...formFalta,
        [name]: checkbox.checked
      });
    } else if (name === 'disciplinaId') {
      const disciplinaId = parseInt(value, 10);
      
      // Garantir que o valor seja um número válido
      if (!isNaN(disciplinaId)) {
        setFormFalta({
          ...formFalta,
          disciplinaId: disciplinaId
        });
      }
    } else if (name === 'quantidade') {
      const quantidade = parseInt(value, 10);
      setFormFalta({
        ...formFalta,
        quantidade: isNaN(quantidade) ? 1 : Math.max(1, quantidade)
      });
    } else {
      setFormFalta({
        ...formFalta,
        [name]: value
      });
    }
  };

  // Função para salvar as faltas
  const handleSaveFalta = () => {
    // Validar se há disciplina selecionada
    if (formFalta.disciplinaId === 0) {
      alert('Por favor, selecione uma disciplina');
      return;
    }
    
    // Validar quantidade de faltas
    if (formFalta.quantidade <= 0) {
      alert('A quantidade de faltas deve ser maior que zero');
      return;
    }
    
    // Buscar a frequência correspondente à disciplina selecionada
    const disciplinaSelecionada = disciplinasState.find(d => d.id === formFalta.disciplinaId);
    if (!disciplinaSelecionada) {
      alert('Disciplina não encontrada');
      return;
    }
    
    const disciplinaNome = disciplinaSelecionada.nome;
    const frequenciaIndex = frequenciasState.findIndex(f => f.disciplina === disciplinaNome);
    
    if (frequenciaIndex === -1) {
      alert('Configuração de frequência não encontrada para esta disciplina');
      return;
    }
    
    // Criar novo registro de falta
    const novoRegistro = {
      data: formFalta.data,
      quantidade: formFalta.quantidade,
      justificada: formFalta.justificada,
      observacoes: formFalta.observacoes
    };
    
    // Atualizar o estado de frequências
    const novasFrequencias = [...frequenciasState];
    
    // Adicionar o registro
    novasFrequencias[frequenciaIndex].registrosFaltas = [
      ...novasFrequencias[frequenciaIndex].registrosFaltas,
      novoRegistro
    ];
    
    // Recalcular o total de faltas
    const totalFaltas = novasFrequencias[frequenciaIndex].registrosFaltas.reduce(
      (total, registro) => total + registro.quantidade, 0
    );
    
    novasFrequencias[frequenciaIndex].faltas = totalFaltas;
    
    // Recalcular a porcentagem de frequência
    const totalAulas = novasFrequencias[frequenciaIndex].totalAulas;
    const presencas = totalAulas - totalFaltas;
    const porcentagem = Math.round((presencas / totalAulas) * 100);
    
    novasFrequencias[frequenciaIndex].porcentagem = porcentagem;
    
    // Atualizar o status com base na porcentagem
    if (porcentagem >= 90) {
      novasFrequencias[frequenciaIndex].status = 'otimo';
    } else if (porcentagem >= 75) {
      novasFrequencias[frequenciaIndex].status = 'regular';
    } else if (porcentagem >= 70) {
      novasFrequencias[frequenciaIndex].status = 'atencao';
    } else {
      novasFrequencias[frequenciaIndex].status = 'critico';
    }
    
    // Atualizar o estado
    setFrequenciasState(novasFrequencias);
    
    // Salvar no localStorage
    localStorage.setItem('frequenciasState', JSON.stringify(novasFrequencias));
    
    // Sincronizar dados com o resto do sistema
    sincronizarDados()
      .then(() => console.log("Dados sincronizados após registrar faltas"))
      .catch((error: Error) => console.error("Erro ao sincronizar após registrar faltas:", error));
    
    // Fechar o modal
    handleCloseFaltaModal();
    
    // Mostrar toast de sucesso
    setToastMessage('Faltas registradas com sucesso!');
    setShowToast(true);
    
    // Esconder o toast depois de 3 segundos
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };
  
  // Função para abrir o modal de configuração de frequência
  const handleOpenConfigFrequenciaModal = (disciplinaId?: number) => {
    // Verificar se há disciplinas disponíveis
    if (disciplinasState.length === 0) {
      alert("Não há disciplinas disponíveis. Por favor, adicione disciplinas primeiro.");
      return;
    }
    
    // Se um ID de disciplina foi passado, use-o, caso contrário use a primeira disciplina
    const discId = disciplinaId || (disciplinasState.length > 0 ? disciplinasState[0].id : 0);
    
    // Encontrar a disciplina no estado de frequências
    const frequenciaItem = frequenciasState.find(f => 
      disciplinasState.find(d => d.id === discId)?.nome === f.disciplina
    );
    
    // Resetar o formulário com os dados da disciplina selecionada, se encontrada
    const formInicial: ConfigFrequenciaForm = {
      disciplinaId: discId,
      modoCalculo: 'total',
      totalAulas: frequenciaItem?.totalAulas || 60,
      aulasPorSemana: 2, // Valor padrão
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString().split('T')[0],
      frequenciaMinima: frequenciaItem?.limite ? (frequenciaItem.limite * 100) / (frequenciaItem.totalAulas) : 75
    };
    
    setFormConfigFrequencia(formInicial);
    setIsConfigFrequenciaModalOpen(true);
  };

  // Versão da função para uso em eventos de clique de botão
  const handleOpenConfigFrequenciaModalButton = (e: React.MouseEvent) => {
    e.preventDefault();
    handleOpenConfigFrequenciaModal();
  };

  // Função para fechar o modal de configuração de frequência
  const handleCloseConfigFrequenciaModal = () => {
    setIsConfigFrequenciaModalOpen(false);
  };

  // Função para atualizar o formulário de configuração de frequência
  const handleFormConfigFrequenciaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'disciplinaId') {
      const disciplinaId = parseInt(value, 10);
      
      // Garantir que o valor seja um número válido
      if (!isNaN(disciplinaId)) {
        setFormConfigFrequencia({
          ...formConfigFrequencia,
          disciplinaId: disciplinaId
        });
      }
    } else if (name === 'modoCalculo') {
      setFormConfigFrequencia({
        ...formConfigFrequencia,
        modoCalculo: value as 'total' | 'periodo'
      });
    } else if (name === 'totalAulas' || name === 'aulasPorSemana' || name === 'frequenciaMinima') {
      const num = parseInt(value, 10);
      setFormConfigFrequencia({
        ...formConfigFrequencia,
        [name]: isNaN(num) ? 0 : Math.max(0, num)
      });
    } else {
      setFormConfigFrequencia({
        ...formConfigFrequencia,
        [name]: value
      });
    }
  };

  // Função para calcular o número de aulas entre duas datas
  const calcularNumeroAulas = (inicio: string, fim: string, aulasPorSemana: number): number => {
    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);
    
    // Diferença em milissegundos
    const diffMilissegundos = dataFim.getTime() - dataInicio.getTime();
    
    // Diferença em semanas (arredondado para cima)
    const diffSemanas = Math.ceil(diffMilissegundos / (1000 * 60 * 60 * 24 * 7));
    
    return diffSemanas * aulasPorSemana;
  };

  // Função para salvar a configuração de frequência
  const handleSaveConfigFrequencia = () => {
    // Validar se disciplina está selecionada
    if (formConfigFrequencia.disciplinaId === 0) {
      alert('Por favor, selecione uma disciplina');
      return;
    }
    
    // Buscar disciplina pelo ID
    const disciplina = disciplinasState.find(d => d.id === formConfigFrequencia.disciplinaId);
    if (!disciplina) {
      alert('Disciplina não encontrada');
      return;
    }
    
    // Buscar ou criar configuração de frequência
    const frequenciaIndex = frequenciasState.findIndex(f => f.disciplina === disciplina.nome);
    
    let novaFrequencia;
    const novasFrequencias = [...frequenciasState];
    
    if (frequenciaIndex !== -1) {
      // Atualizar configuração existente
      novaFrequencia = {
        ...novasFrequencias[frequenciaIndex],
        totalAulas: formConfigFrequencia.modoCalculo === 'total' 
          ? formConfigFrequencia.totalAulas 
          : calcularNumeroAulas(formConfigFrequencia.dataInicio, formConfigFrequencia.dataFim, formConfigFrequencia.aulasPorSemana),
        limite: Math.floor((formConfigFrequencia.modoCalculo === 'total' 
          ? formConfigFrequencia.totalAulas 
          : calcularNumeroAulas(formConfigFrequencia.dataInicio, formConfigFrequencia.dataFim, formConfigFrequencia.aulasPorSemana)) * 
          (1 - formConfigFrequencia.frequenciaMinima / 100))
      };
      
      // Recalcular porcentagem
      const presencas = novaFrequencia.totalAulas - novaFrequencia.faltas;
      novaFrequencia.porcentagem = Math.round((presencas / novaFrequencia.totalAulas) * 100);
      
      // Atualizar status
      if (novaFrequencia.porcentagem > 85) {
        novaFrequencia.status = 'otimo';
      } else if (novaFrequencia.porcentagem > 75) {
        novaFrequencia.status = 'regular';
      } else if (novaFrequencia.faltas < novaFrequencia.limite) {
        novaFrequencia.status = 'atencao';
      } else {
        novaFrequencia.status = 'critico';
      }
      
      novasFrequencias[frequenciaIndex] = novaFrequencia;
    } else {
      // Criar nova configuração
      novaFrequencia = {
        id: disciplina.id,
        disciplina: disciplina.nome,
        semestre: disciplina.semestre,
        totalAulas: formConfigFrequencia.modoCalculo === 'total' 
          ? formConfigFrequencia.totalAulas 
          : calcularNumeroAulas(formConfigFrequencia.dataInicio, formConfigFrequencia.dataFim, formConfigFrequencia.aulasPorSemana),
        faltas: 0,
        limite: Math.floor((formConfigFrequencia.modoCalculo === 'total' 
          ? formConfigFrequencia.totalAulas 
          : calcularNumeroAulas(formConfigFrequencia.dataInicio, formConfigFrequencia.dataFim, formConfigFrequencia.aulasPorSemana)) * 
          (1 - formConfigFrequencia.frequenciaMinima / 100)),
        porcentagem: 100,
        status: 'otimo',
        registrosFaltas: []
      };
      
      novasFrequencias.push(novaFrequencia);
    }
    
    // Atualizar estado
    setFrequenciasState(novasFrequencias);
    
    // Salvar no localStorage
    localStorage.setItem('frequenciasState', JSON.stringify(novasFrequencias));
    
    // Sincronizar dados com o resto do sistema
    sincronizarDados()
      .then(() => console.log("Dados sincronizados após configurar frequência"))
      .catch((error: Error) => console.error("Erro ao sincronizar após configurar frequência:", error));
    
    // Mostrar toast de sucesso
    setToastMessage('Configuração de frequência salva com sucesso!');
    setShowToast(true);
    
    // Esconder toast após 3 segundos
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
    
    // Fechar modal
    handleCloseConfigFrequenciaModal();
  };
  
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Background decorativo */}
        <div className="absolute top-0 right-0 -z-10 w-full h-64 bg-gradient-to-br from-blue-50 via-indigo-50 to-white overflow-hidden">
          <div className="absolute top-12 right-12 w-64 h-64 rounded-full bg-blue-200/20 blur-3xl"></div>
          <div className="absolute top-20 left-1/4 w-48 h-48 rounded-full bg-indigo-200/20 blur-3xl"></div>
        </div>
        
        {/* Header com estatísticas gerais */}
        <div className="relative z-0 mb-12 pt-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg mr-5 relative">
                <GraduationCap className="h-8 w-8 text-white" />
                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Desempenho Acadêmico</h1>
                <p className="text-gray-500 mt-1 max-w-lg">Acompanhe, analise e melhore seu progresso em todas as disciplinas</p>
              </div>
            </div>
            
            <div className="hidden md:flex gap-3">
              <Button variant="outline" className="gap-2 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                <BarChart2 className="h-4 w-4 text-blue-600" /> Ver Relatório
              </Button>
              <Button className="gap-2 shadow-md hover:shadow-blue-100/50 hover:translate-y-[-2px] transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600">
                <Bell className="h-4 w-4" /> Configurar Alertas
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <Card className="rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden bg-white backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 z-0"></div>
              <CardContent className="pt-6 pb-4 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Média Geral</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-1">7.6</h3>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl shadow-inner ring-1 ring-blue-100">
                    <Award className="h-7 w-7 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600 font-medium">+0.4 pontos</span>
                  <span className="text-gray-500 ml-1">em relação ao último semestre</span>
                </div>
              </CardContent>
              <div className="w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 absolute bottom-0 left-0"></div>
            </Card>
            
            <Card className="rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden bg-white backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -translate-y-1/2 translate-x-1/2 z-0"></div>
              <CardContent className="pt-6 pb-4 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-green-700">Frequência Média</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-1">92%</h3>
                  </div>
                  <div className="bg-green-50 p-3 rounded-xl shadow-inner ring-1 ring-green-100">
                    <Check className="h-7 w-7 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600 font-medium">Excelente</span>
                  <span className="text-gray-500 ml-1">- acima do mínimo necessário</span>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-green-500" style={{ width: '92%' }}></div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>Mínimo: 75%</span>
                  <span>Meta: 95%</span>
                  </div>
                </div>
              </CardContent>
              <div className="w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500 absolute bottom-0 left-0"></div>
            </Card>
            
            <Card className="rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden bg-white backdrop-blur-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -translate-y-1/2 translate-x-1/2 z-0"></div>
              <CardContent className="pt-6 pb-4 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-orange-700">Compromissos Pendentes</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-1">5</h3>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-xl shadow-inner ring-1 ring-orange-100">
                    <Calendar className="h-7 w-7 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <Clock className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-orange-600 font-medium">Próximos</span>
                  <span className="text-gray-500 ml-1">- 2 compromissos esta semana</span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="bg-orange-100/50 text-orange-700 px-2 py-0.5 rounded text-[10px] font-medium min-w-[42px] text-center">HOJE</div>
                    <span className="text-gray-600 truncate">Entrega de Trabalho - Anatomia</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="bg-blue-100/50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-medium min-w-[42px] text-center">AMANHÃ</div>
                    <span className="text-gray-600 truncate">Aula de Revisão - Bioquímica</span>
                  </div>
                </div>
              </CardContent>
              <div className="w-full h-1 bg-gradient-to-r from-orange-400 to-amber-500 absolute bottom-0 left-0"></div>
            </Card>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <div className="flex justify-center mb-8">
            <TabsList className="grid grid-cols-3 w-full md:w-2/3 lg:w-1/2 mx-auto p-1 rounded-xl bg-gray-100/70 backdrop-blur-sm shadow-inner border border-gray-200">
              <TabsTrigger 
                value="notas" 
                className="flex items-center justify-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all data-[state=active]:text-blue-700"
              >
                <BarChart2 className="h-4 w-4" /> Notas
              </TabsTrigger>
              <TabsTrigger 
                value="frequencia" 
                className="flex items-center justify-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all data-[state=active]:text-blue-700"
              >
                <ClipboardList className="h-4 w-4" /> Frequência
              </TabsTrigger>
              <TabsTrigger 
                value="compromissos" 
                className="flex items-center justify-center gap-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all data-[state=active]:text-blue-700"
              >
                <Calendar className="h-4 w-4" /> Compromissos
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Conteúdo da aba Notas */}
          <TabsContent value="notas" className="space-y-6">
            <div className="flex justify-between items-center p-5 rounded-xl bg-white shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <BarChart2 className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Minhas Notas</h2>
              </div>
              <Button 
                className="shadow-sm hover:shadow-md transition-all gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleOpenModal}
                disabled={isLoading || disciplinasState.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </>
                ) : (
                  <>
                <PlusCircle className="h-4 w-4" /> Adicionar Nota
                  </>
                )}
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500">Carregando disciplinas...</p>
              </div>
            ) : disciplinasState.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                <FileText className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma disciplina encontrada</h3>
                <p className="text-gray-500 text-center max-w-md mb-6">
                  Você ainda não tem disciplinas cadastradas. Adicione disciplinas no menu de Disciplinas 
                  para começar a registrar notas.
                </p>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 gap-2"
                  onClick={() => window.location.href = '/disciplinas'}
                >
                  <PlusCircle className="h-4 w-4" /> Ir para Disciplinas
                </Button>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {disciplinasState.map(disciplina => (
                <Card 
                  key={disciplina.id} 
                  className={`rounded-xl border ${updatedDisciplinaId === disciplina.id ? 'border-blue-500 shadow-lg ring-2 ring-blue-200 transform scale-[1.02] transition-all duration-500' : 'border-gray-200 shadow-sm hover:shadow-md transition-all duration-300'} overflow-hidden group`}
                >
                  <div className={`h-1.5 w-full ${
                    disciplina.status === 'aprovado' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 
                    disciplina.status === 'reprovado' ? 'bg-gradient-to-r from-red-400 to-rose-500' : 
                    'bg-gradient-to-r from-blue-400 to-indigo-500'
                  }`}></div>
                  <CardHeader className="pb-2 pt-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center text-gray-800 font-bold">
                          {disciplina.nome}
                          {disciplina.status === 'aprovado' && (
                            <div className="ml-2 bg-green-100 p-1 rounded-full">
                              <Check className="h-3 w-3 text-green-600" />
                            </div>
                          )}
                        </CardTitle>
                        <CardDescription className="text-gray-500">{disciplina.semestre}</CardDescription>
                      </div>
                      <div className="flex space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 rounded-full hover:bg-gray-100"
                          onClick={() => handleEditDisciplina(disciplina.id)}
                        >
                          <Edit2 className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 rounded-full hover:bg-red-50"
                          onClick={() => handleDeleteDisciplina(disciplina.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                      {disciplina.avaliacoes.length === 0 ? (
                        <div className="py-6 flex flex-col items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-300 mb-2" />
                          <p className="text-gray-500 text-center text-sm">
                            Nenhuma avaliação registrada ainda
                          </p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-3 text-blue-600 hover:text-blue-700"
                            onClick={handleOpenModal}
                          >
                            <PlusCircle className="h-3 w-3 mr-1" /> Adicionar Avaliação
                          </Button>
                        </div>
                      ) : (
                    <div className="space-y-3">
                      {disciplina.avaliacoes.map((avaliacao, index) => (
                        <div key={`${disciplina.id}-avaliacao-${index}`} className="flex justify-between items-center hover:bg-gray-50 p-2 rounded-lg transition-colors">
                          <span className="font-medium text-gray-700">{avaliacao.nome}</span>
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center justify-center w-10 h-10 rounded-full font-medium ${
                              avaliacao.nota >= 8 ? 'bg-green-100 text-green-700' : 
                              avaliacao.nota >= 6 ? 'bg-blue-100 text-blue-700' :
                              avaliacao.nota >= 5 ? 'bg-orange-100 text-orange-700' : 
                              'bg-red-100 text-red-700'
                          }`}>{avaliacao.nota.toFixed(1)}</span>
                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 rounded-full hover:bg-gray-100"
                                onClick={() => handleEditAvaliacao(disciplina.id, index)}
                              >
                                <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 rounded-full hover:bg-red-50"
                                onClick={() => handleDeleteAvaliacao(disciplina.id, index)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="h-px bg-gray-200 my-3"></div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                        <span className="font-medium text-gray-700">Média Final</span>
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center justify-center w-11 h-11 rounded-full font-semibold text-lg ${
                            disciplina.media >= 8 ? 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 ring-1 ring-green-200' : 
                            disciplina.media >= 6 ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 ring-1 ring-blue-200' :
                            disciplina.media >= 5 ? 'bg-gradient-to-br from-orange-100 to-amber-100 text-orange-700 ring-1 ring-orange-200' : 
                            'bg-gradient-to-br from-red-100 to-rose-100 text-red-700 ring-1 ring-red-200'
                        }`}>{disciplina.media.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                      )}
                  </CardContent>
                  <CardFooter className="bg-gray-50 border-t px-6 py-3">
                    <div className="w-full flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">Status</span>
                      {disciplina.status === 'aprovado' && (
                        <span className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                          <Check className="h-3 w-3 mr-1" /> Aprovado
                        </span>
                      )}
                      {disciplina.status === 'reprovado' && (
                        <span className="inline-flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                          <X className="h-3 w-3 mr-1" /> Reprovado
                        </span>
                      )}
                      {disciplina.status === 'em andamento' && (
                        <span className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                          <Clock className="h-3 w-3 mr-1" /> Em Andamento
                        </span>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
            )}
          </TabsContent>
          
          {/* Conteúdo da aba Frequência */}
          <TabsContent value="frequencia" className="space-y-6">
            <div className="flex justify-between items-center p-5 rounded-xl bg-white shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <ClipboardList className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Controle de Frequência</h2>
              </div>
              <div className="flex space-x-2">
                <Button 
                  className="shadow-sm hover:shadow-md transition-all gap-2 bg-gradient-to-r from-blue-600 to-blue-700"
                  onClick={() => handleOpenConfigFrequenciaModal()}
                  disabled={isLoading || disciplinasState.length === 0}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                    </>
                  ) : (
                    <>
                    <Settings className="h-4 w-4" /> Configurar Frequência
                    </>
                  )}
                </Button>
              <Button 
                className="shadow-sm hover:shadow-md transition-all gap-2 bg-gradient-to-r from-green-600 to-emerald-600"
                onClick={handleOpenFaltaModal}
                disabled={isLoading || disciplinasState.length === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </>
                ) : (
                  <>
                <PlusCircle className="h-4 w-4" /> Registrar Faltas
                  </>
                )}
              </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {frequenciasState.map(item => (
                <Card key={item.id} className="rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
                  <div className={`h-1.5 w-full ${
                    item.status === 'otimo' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 
                    item.status === 'regular' ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 
                    item.status === 'atencao' ? 'bg-gradient-to-r from-orange-400 to-amber-500' : 
                    'bg-gradient-to-r from-red-400 to-rose-500'
                  }`}></div>
                  <CardHeader className="pb-2 pt-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center text-gray-800 font-bold">
                          {item.disciplina}
                          {item.status === 'otimo' && (
                            <div className="ml-2 bg-green-100 p-1 rounded-full">
                              <Check className="h-3 w-3 text-green-600" />
                            </div>
                          )}
                        </CardTitle>
                        <CardDescription className="text-gray-500">{item.semestre} • {item.totalAulas} aulas</CardDescription>
                      </div>
                      <div className="flex space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full hover:bg-gray-100">
                          <Edit2 className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="font-medium text-gray-700">Total de Faltas</span>
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center justify-center w-10 h-10 rounded-full font-medium ${
                            item.porcentagem > 85 ? 'bg-green-100 text-green-700' : 
                            item.porcentagem > 70 ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>{item.faltas}</span>
                        </div>
                      </div>
                      <div className="relative pt-1">
                        <div className="text-xs flex justify-between mb-1">
                          <span className="font-medium text-gray-700">Presença: </span>
                          <span className={`inline-block font-medium ${
                            item.porcentagem > 85 ? 'text-green-600' : 
                            item.porcentagem > 70 ? 'text-blue-600' : 'text-orange-600'
                          }`}>
                            {item.porcentagem}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-2.5 rounded-full ${
                              item.porcentagem > 85 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 
                              item.porcentagem > 70 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 
                              'bg-gradient-to-r from-orange-400 to-amber-500'
                            }`}
                            style={{ width: `${item.porcentagem}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0</span>
                          <span className="flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1 text-orange-500" />
                            Limite: {item.limite} faltas
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 border-t px-6 py-3">
                    <div className="w-full flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">Status</span>
                      {item.status === 'otimo' && (
                        <span className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                          <Check className="h-3 w-3 mr-1" /> Ótimo
                        </span>
                      )}
                      {item.status === 'regular' && (
                        <span className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                          <Check className="h-3 w-3 mr-1" /> Regular
                        </span>
                      )}
                      {item.status === 'atencao' && (
                        <span className="inline-flex items-center bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                          <AlertCircle className="h-3 w-3 mr-1" /> Atenção
                        </span>
                      )}
                      {item.status === 'critico' && (
                        <span className="inline-flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                          <AlertCircle className="h-3 w-3 mr-1" /> Crítico
                        </span>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Conteúdo da aba Compromissos */}
          <TabsContent value="compromissos" className="space-y-6">
            <div className="flex justify-between items-center p-5 rounded-xl bg-white shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Compromissos Acadêmicos</h2>
              </div>
              <Button className="shadow-sm hover:shadow-md transition-all gap-2 bg-gradient-to-r from-orange-600 to-amber-600">
                <PlusCircle className="h-4 w-4" /> Novo Compromisso
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {compromissos.map(item => {
                // Configurar cores baseadas na prioridade/tipo
                const colors: Record<string, {
                  bg: string;
                  border: string;
                  text: string;
                  textLight: string;
                  iconBg: string;
                  footerBg: string;
                  borderFooter: string;
                  gradient: string;
                }> = {
                  yellow: {
                    bg: "bg-gradient-to-br from-yellow-50 to-yellow-100",
                    border: "border-yellow-200",
                    text: "text-yellow-800",
                    textLight: "text-yellow-700",
                    iconBg: "bg-yellow-100",
                    footerBg: "bg-yellow-100", 
                    borderFooter: "border-yellow-200",
                    gradient: "bg-gradient-to-r from-yellow-400 to-amber-500"
                  },
                  red: {
                    bg: "bg-gradient-to-br from-red-50 to-red-100",
                    border: "border-red-200",
                    text: "text-red-800",
                    textLight: "text-red-700",
                    iconBg: "bg-red-100",
                    footerBg: "bg-red-100", 
                    borderFooter: "border-red-200",
                    gradient: "bg-gradient-to-r from-red-400 to-rose-500"
                  },
                  blue: {
                    bg: "bg-gradient-to-br from-blue-50 to-blue-100",
                    border: "border-blue-200",
                    text: "text-blue-800",
                    textLight: "text-blue-700",
                    iconBg: "bg-blue-100",
                    footerBg: "bg-blue-100", 
                    borderFooter: "border-blue-200",
                    gradient: "bg-gradient-to-r from-blue-400 to-indigo-500"
                  }
                };
                
                const color = colors[item.cor] || colors.blue;
                
                return (
                  <Card 
                    key={item.id} 
                    className={`${color.bg} ${color.border} hover:shadow-md transition-all duration-300 overflow-hidden group rounded-xl`}
                  >
                    <div className={`h-1.5 w-full ${color.gradient}`}></div>
                    <CardHeader className="pb-2 pt-5">
                      <div className="flex justify-between">
                        <div>
                          <CardTitle className={`flex items-center font-bold ${color.text}`}>
                            {item.titulo}
                          </CardTitle>
                          <CardDescription className={color.textLight}>{item.disciplina} - {item.descricao}</CardDescription>
                        </div>
                        <div className="flex space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className={`h-8 w-8 rounded-full hover:bg-white/30 ${color.textLight}`}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full hover:bg-red-50 text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="space-y-3">
                        <div className={`flex items-center p-2 rounded-lg bg-white/50 ${color.text}`}>
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="font-medium">{item.data} - {item.hora}</span>
                        </div>
                        <div className={`flex items-start ${color.text}`}>
                          <FileText className="h-4 w-4 mr-2 mt-1" />
                          <p className="flex-1">{item.detalhes}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className={`${color.footerBg} border-t ${color.borderFooter} px-6 py-3`}>
                      <div className="w-full flex justify-between items-center">
                        <span className={`text-sm font-medium ${color.textLight}`}>Prioridade</span>
                        {item.prioridade === 'alta' && (
                          <span className={`inline-flex items-center ${color.iconBg} ${color.text} px-3 py-1 rounded-full text-xs font-medium shadow-sm`}>
                            <AlertCircle className="h-3 w-3 mr-1" /> Alta
                          </span>
                        )}
                        {item.prioridade === 'média' && (
                          <span className={`inline-flex items-center ${color.iconBg} ${color.text} px-3 py-1 rounded-full text-xs font-medium shadow-sm`}>
                            <Info className="h-3 w-3 mr-1" /> Média
                          </span>
                        )}
                        {item.prioridade === 'baixa' && (
                          <span className={`inline-flex items-center ${color.iconBg} ${color.text} px-3 py-1 rounded-full text-xs font-medium shadow-sm`}>
                            <Flag className="h-3 w-3 mr-1" /> Baixa
                          </span>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* CTA para melhorar desempenho */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold">Quer melhorar seu desempenho?</h3>
              <p className="mt-2 text-blue-100">Utilize nossos recursos de estudo inteligente para otimizar seu aprendizado e alcançar melhores resultados.</p>
            </div>
            <Button variant="secondary" size="lg" className="whitespace-nowrap shadow-md hover:shadow-lg transition-all">
              Ir para Plano Inteligente <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Toast de notificação */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md">
            <div className="flex items-center">
              <Check className="h-5 w-5 mr-2" />
              <p>{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para adicionar nota */}
      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-gray-500/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-filter backdrop-blur-sm rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">
                  {isEditMode ? 'Editar Avaliação' : 'Adicionar Nova Nota'}
                </h3>
                <button 
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Seleção de Disciplina */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina {formNota.disciplinaId ? `(ID: ${formNota.disciplinaId})` : ''}
                </label>
                <div className="relative">
                  {disciplinasState.length > 0 ? (
                <select 
                  name="disciplinaId" 
                      value={formNota.disciplinaId === 0 ? disciplinasState[0].id.toString() : formNota.disciplinaId.toString()}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="0" disabled>Selecione uma disciplina</option>
                      {disciplinasState.map(disciplina => (
                        <option key={disciplina.id} value={disciplina.id.toString()}>
                      {disciplina.nome}
                    </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-700">
                      Nenhuma disciplina disponível
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {disciplinasState.length === 0 ? 
                      "Adicione disciplinas primeiro no menu 'Disciplinas'" : 
                      `${disciplinasState.length} disciplina(s) disponível(is)`}
                  </p>
                </div>
              </div>
              
              {/* Nome da Avaliação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Avaliação</label>
                <input 
                  type="text" 
                  name="nome" 
                  value={formNota.nome}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Prova 1, Trabalho Final, etc."
                  required
                />
              </div>
              
              {/* Tipo de Avaliação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Avaliação</label>
                <select 
                  name="tipo" 
                  value={formNota.tipo}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prova">Prova</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="exercicio">Exercício</option>
                  <option value="seminario">Seminário</option>
                  <option value="projeto">Projeto</option>
                  <option value="outra">Outra</option>
                </select>
              </div>
              
              {/* Formato da Nota */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formato da Nota</label>
                <select 
                  name="formato" 
                  value={formNota.formato}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="numerica">Numérica (0-10)</option>
                  <option value="conceito">Conceito (A, B, C, etc.)</option>
                  <option value="aprovado_reprovado">Aprovado/Reprovado</option>
                </select>
              </div>
              
              {/* Valor da Nota - Condicional baseado no formato */}
              {formNota.formato === 'numerica' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                  <input 
                    type="number" 
                    name="valorNumerico" 
                    value={formNota.valorNumerico}
                    onChange={handleFormChange}
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
              
              {formNota.formato === 'conceito' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conceito</label>
                  <select 
                    name="valorConceito" 
                    value={formNota.valorConceito}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <optgroup label="Sistema A-F">
                      <option value="A">A (Excelente)</option>
                      <option value="B">B (Muito Bom)</option>
                      <option value="C">C (Bom)</option>
                      <option value="D">D (Regular)</option>
                      <option value="E">E (Insuficiente)</option>
                      <option value="F">F (Reprovado)</option>
                    </optgroup>
                    <optgroup label="Sistema S/N">
                      <option value="S">S (Satisfatório)</option>
                      <option value="N">N (Não Satisfatório)</option>
                    </optgroup>
                    <optgroup label="Sistema O/I">
                      <option value="O">O (Ótimo)</option>
                      <option value="I">I (Insuficiente)</option>
                    </optgroup>
                  </select>
                </div>
              )}
              
              {formNota.formato === 'aprovado_reprovado' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input 
                        type="radio" 
                        name="valorAprovacao" 
                        value="aprovado"
                        checked={formNota.valorAprovacao === 'aprovado'}
                        onChange={handleFormChange}
                        className="form-radio h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700">Aprovado</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input 
                        type="radio" 
                        name="valorAprovacao" 
                        value="reprovado"
                        checked={formNota.valorAprovacao === 'reprovado'}
                        onChange={handleFormChange}
                        className="form-radio h-4 w-4 text-red-600"
                      />
                      <span className="ml-2 text-gray-700">Reprovado</span>
                    </label>
                  </div>
                </div>
              )}
              
              {/* Peso da Avaliação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso da Avaliação
                  <span className="text-xs text-gray-500 ml-1">(para cálculo da média)</span>
                </label>
                <input 
                  type="number" 
                  name="peso" 
                  value={formNota.peso}
                  onChange={handleFormChange}
                  min="0.1"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* Data da Avaliação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Avaliação</label>
                <input 
                  type="date" 
                  name="data" 
                  value={formNota.data}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                  <span className="text-xs text-gray-500 ml-1">(opcional)</span>
                </label>
                <textarea 
                  name="observacoes"
                  value={formNota.observacoes}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Comentários ou informações adicionais sobre a avaliação"
                ></textarea>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={handleCloseModal}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveNota}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Salvar Alterações' : 'Salvar Nota'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para registrar faltas */}
      {isFaltaModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-gray-500/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-filter backdrop-blur-sm rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">
                  Registrar Faltas
                </h3>
                <button 
                  onClick={handleCloseFaltaModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Seleção de Disciplina */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina
                </label>
                <div className="relative">
                  {disciplinasState.length > 0 ? (
                    <select 
                      name="disciplinaId" 
                      value={formFalta.disciplinaId === 0 ? disciplinasState[0].id.toString() : formFalta.disciplinaId.toString()}
                      onChange={handleFormFaltaChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="0" disabled>Selecione uma disciplina</option>
                      {disciplinasState.map(disciplina => (
                        <option key={disciplina.id} value={disciplina.id.toString()}>
                          {disciplina.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-700">
                      Nenhuma disciplina disponível
                    </div>
                  )}
                </div>
              </div>
              
              {/* Data da Falta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Falta</label>
                <input 
                  type="date" 
                  name="data" 
                  value={formFalta.data}
                  onChange={handleFormFaltaChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              
              {/* Quantidade de Faltas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade de Faltas
                </label>
                <input 
                  type="number" 
                  name="quantidade" 
                  value={formFalta.quantidade}
                  onChange={handleFormFaltaChange}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Insira o número de faltas contabilizadas nesta data
                </p>
              </div>
              
              {/* Falta Justificada */}
              <div>
                <div className="flex items-center mt-1">
                  <input 
                    type="checkbox" 
                    id="justificada"
                    name="justificada" 
                    checked={formFalta.justificada}
                    onChange={handleFormFaltaChange}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="justificada" className="ml-2 block text-sm text-gray-700">
                    Falta Justificada
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Marque esta opção se a falta foi justificada com atestado ou outro documento aceito pela instituição
                </p>
              </div>
              
              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                  <span className="text-xs text-gray-500 ml-1">(opcional)</span>
                </label>
                <textarea 
                  name="observacoes"
                  value={formFalta.observacoes}
                  onChange={handleFormFaltaChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Informações adicionais sobre a falta (ex: motivo, documentos apresentados)"
                ></textarea>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={handleCloseFaltaModal}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveFalta}
                className="bg-gradient-to-r from-green-600 to-emerald-600"
              >
                <Save className="h-4 w-4 mr-2" />
                Registrar Faltas
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para configurar frequência */}
      {isConfigFrequenciaModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-gray-500/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-filter backdrop-blur-sm rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">
                  Configurar Frequência
                </h3>
                <button 
                  onClick={handleCloseConfigFrequenciaModal}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Seleção de Disciplina */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina
                </label>
                <div className="relative">
                  {disciplinasState.length > 0 ? (
                    <select 
                      name="disciplinaId" 
                      value={formConfigFrequencia.disciplinaId === 0 ? disciplinasState[0].id.toString() : formConfigFrequencia.disciplinaId.toString()}
                      onChange={handleFormConfigFrequenciaChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="0" disabled>Selecione uma disciplina</option>
                      {disciplinasState.map(disciplina => (
                        <option key={disciplina.id} value={disciplina.id.toString()}>
                          {disciplina.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-700">
                      Nenhuma disciplina disponível
                    </div>
                  )}
                </div>
              </div>
              
              {/* Modo de Cálculo */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Método de cálculo</label>
                <div className="flex space-x-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="modoCalculo"
                      value="total"
                      checked={formConfigFrequencia.modoCalculo === 'total'}
                      onChange={handleFormConfigFrequenciaChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Informar total de aulas</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="modoCalculo"
                      value="periodo"
                      checked={formConfigFrequencia.modoCalculo === 'periodo'}
                      onChange={handleFormConfigFrequenciaChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Calcular por período</span>
                  </label>
                </div>
              </div>
              
              {/* Total de Aulas - exibido apenas quando modoCalculo é 'total' */}
              {formConfigFrequencia.modoCalculo === 'total' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total de Aulas no Semestre
                </label>
                <input 
                  type="number" 
                  name="totalAulas" 
                  value={formConfigFrequencia.totalAulas}
                  onChange={handleFormConfigFrequenciaChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Informe o número total de aulas da disciplina no semestre
                </p>
              </div>
              )}
              
              {/* Campos de Cálculo por Período - exibidos apenas quando modoCalculo é 'periodo' */}
              {formConfigFrequencia.modoCalculo === 'periodo' && (
                <>
              {/* Aulas por Semana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade de Aulas por Semana
                </label>
                <input 
                  type="number" 
                  name="aulasPorSemana" 
                  value={formConfigFrequencia.aulasPorSemana}
                  onChange={handleFormConfigFrequenciaChange}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                />
              </div>
              
              {/* Data de Início e Fim */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
                  <input 
                    type="date" 
                    name="dataInicio" 
                    value={formConfigFrequencia.dataInicio}
                    onChange={handleFormConfigFrequenciaChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data de Término</label>
                  <input 
                    type="date" 
                    name="dataFim" 
                    value={formConfigFrequencia.dataFim}
                    onChange={handleFormConfigFrequenciaChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                  />
                </div>
              </div>
                </>
              )}
              
              {/* Frequência Mínima */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequência Mínima Exigida (%)
                </label>
                <input 
                  type="number" 
                  name="frequenciaMinima" 
                  value={formConfigFrequencia.frequenciaMinima}
                  onChange={handleFormConfigFrequenciaChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Geralmente 75% para cursos presenciais (definido pela instituição)
                </p>
              </div>
              
              {/* Resumo */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                  <Info className="h-4 w-4 mr-1" /> Resumo do Cálculo
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">Total de aulas:</span>{' '}
                    {formConfigFrequencia.modoCalculo === 'total' 
                      ? formConfigFrequencia.totalAulas 
                      : calcularNumeroAulas(formConfigFrequencia.dataInicio, formConfigFrequencia.dataFim, formConfigFrequencia.aulasPorSemana)}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Limite de faltas:</span>{' '}
                    {Math.floor((formConfigFrequencia.modoCalculo === 'total' 
                      ? formConfigFrequencia.totalAulas 
                      : calcularNumeroAulas(formConfigFrequencia.dataInicio, formConfigFrequencia.dataFim, formConfigFrequencia.aulasPorSemana)) * 
                      (1 - formConfigFrequencia.frequenciaMinima / 100))} aulas
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Presenças necessárias:</span>{' '}
                    {Math.ceil((formConfigFrequencia.modoCalculo === 'total' 
                      ? formConfigFrequencia.totalAulas 
                      : calcularNumeroAulas(formConfigFrequencia.dataInicio, formConfigFrequencia.dataFim, formConfigFrequencia.aulasPorSemana)) * 
                      (formConfigFrequencia.frequenciaMinima / 100))} aulas
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={handleCloseConfigFrequenciaModal}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveConfigFrequencia}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
