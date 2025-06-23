"use client";

import React, { useState, useEffect } from 'react';
import { Check, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Questao, adicionarQuestaoBanco, atualizarQuestaoBanco } from '../../services/simulados';

// ID fixo para o banco único de questões
const BANCO_UNICO_ID = 'banco_unico_global';

interface QuestaoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  disciplinas: string[];
  questaoParaEditar?: Questao;
}

const QuestaoFormModal: React.FC<QuestaoFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  disciplinas,
  questaoParaEditar
}) => {
  const [salvando, setSalvando] = useState(false);
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

  // Inicializar o formulário com a questão para editar, se fornecido
  useEffect(() => {
    if (questaoParaEditar) {
      setQuestao({
        disciplina: questaoParaEditar.disciplina,
        assunto: questaoParaEditar.assunto,
        enunciado: questaoParaEditar.enunciado,
        dificuldade: questaoParaEditar.dificuldade,
        alternativas: questaoParaEditar.alternativas,
        explicacao: questaoParaEditar.explicacao || ''
      });
    } else if (disciplinas.length > 0) {
      // Se não estiver editando, mas tiver disciplinas disponíveis
      setQuestao(prev => ({
        ...prev,
        disciplina: disciplinas[0]
      }));
    }
  }, [questaoParaEditar, disciplinas]);

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
      
      if (questaoParaEditar) {
        // Editar questão existente
        await atualizarQuestaoBanco(BANCO_UNICO_ID, {
          ...questaoParaEditar,
          disciplina: questao.disciplina,
          assunto: questao.assunto,
          enunciado: questao.enunciado,
          dificuldade: questao.dificuldade,
          alternativas: questao.alternativas,
          explicacao: questao.explicacao.trim() !== '' ? questao.explicacao : undefined
        });
        
        toast.success('Questão atualizada com sucesso');
      } else {
        // Adicionar nova questão
        await adicionarQuestaoBanco(BANCO_UNICO_ID, {
          disciplina: questao.disciplina,
          assunto: questao.assunto,
          enunciado: questao.enunciado,
          dificuldade: questao.dificuldade,
          alternativas: questao.alternativas,
          explicacao: questao.explicacao.trim() !== '' ? questao.explicacao : undefined
        });
        
        toast.success('Questão adicionada com sucesso');
      }
      
      // Chamar callback de sucesso
      onSuccess();
      
      // Fechar o modal
      onClose();
    } catch (error) {
      console.error('Erro ao salvar questão:', error);
      toast.error('Erro ao salvar questão');
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {questaoParaEditar ? 'Editar Questão' : 'Nova Questão'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Disciplina */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Disciplina <span className="text-red-500">*</span>
            </label>
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
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
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
    </div>
  );
};

export default QuestaoFormModal; 
