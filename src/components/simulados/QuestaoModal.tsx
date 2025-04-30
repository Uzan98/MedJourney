"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Questao } from '../../services/simulados';

interface QuestaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (questao: Omit<Questao, 'id'> & { id?: string }) => void;
  questao?: Questao;
  disciplinas: string[];
  novaDisciplina?: string;
  onAddDisciplina?: (disciplina: string) => void;
}

const QuestaoModal: React.FC<QuestaoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  questao,
  disciplinas,
  novaDisciplina,
  onAddDisciplina
}) => {
  const [formData, setFormData] = useState<Omit<Questao, 'id'> & { id?: string }>({
    disciplina: '',
    assunto: '',
    enunciado: '',
    dificuldade: 'media',
    alternativas: [
      { id: '1', texto: '', correta: true },
      { id: '2', texto: '', correta: false },
      { id: '3', texto: '', correta: false },
      { id: '4', texto: '', correta: false },
      { id: '5', texto: '', correta: false }
    ],
    explicacao: ''
  });
  
  const [novaDisciplinaInput, setNovaDisciplinaInput] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});

  // Inicializar formulário com dados da questão caso esteja editando
  useEffect(() => {
    if (questao) {
      setFormData({
        ...questao
      });
    } else {
      // Resetar para valores padrão
      setFormData({
        disciplina: disciplinas.length > 0 ? disciplinas[0] : '',
        assunto: '',
        enunciado: '',
        dificuldade: 'media',
        alternativas: [
          { id: '1', texto: '', correta: true },
          { id: '2', texto: '', correta: false },
          { id: '3', texto: '', correta: false },
          { id: '4', texto: '', correta: false },
          { id: '5', texto: '', correta: false }
        ],
        explicacao: ''
      });
    }
    setErros({});
  }, [questao, disciplinas, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erro ao editar o campo
    if (erros[name]) {
      setErros((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAlternativaChange = (id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      alternativas: prev.alternativas.map((alt) =>
        alt.id === id ? { ...alt, texto: value } : alt
      )
    }));
    
    // Limpar erro de alternativas
    if (erros.alternativas) {
      setErros((prev) => ({
        ...prev,
        alternativas: ''
      }));
    }
  };

  const handleAlternativaCorretaChange = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      alternativas: prev.alternativas.map((alt) => ({
        ...alt,
        correta: alt.id === id
      }))
    }));
  };

  const validateForm = (): boolean => {
    const newErros: Record<string, string> = {};
    
    if (!formData.disciplina) {
      newErros.disciplina = 'Selecione uma disciplina';
    }
    
    if (!formData.enunciado.trim()) {
      newErros.enunciado = 'Digite o enunciado da questão';
    }
    
    // Verificar se todas as alternativas têm texto
    const alternativasVazias = formData.alternativas.some(alt => !alt.texto.trim());
    if (alternativasVazias) {
      newErros.alternativas = 'Preencha o texto de todas as alternativas';
    }
    
    // Verificar se pelo menos uma alternativa está marcada como correta
    const temAlternativaCorreta = formData.alternativas.some(alt => alt.correta);
    if (!temAlternativaCorreta) {
      newErros.alternativaCorreta = 'Selecione uma alternativa correta';
    }
    
    setErros(newErros);
    return Object.keys(newErros).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleAddDisciplina = () => {
    if (novaDisciplinaInput.trim() && onAddDisciplina) {
      onAddDisciplina(novaDisciplinaInput);
      setFormData(prev => ({
        ...prev,
        disciplina: novaDisciplinaInput
      }));
      setNovaDisciplinaInput('');
    }
  };

  // Renderizar letra da alternativa (A, B, C, D, E)
  const renderLetraAlternativa = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-800 bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {questao ? 'Editar Questão' : 'Nova Questão'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {/* Disciplina */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disciplina *
              </label>
              <div className="flex gap-2">
                <select
                  name="disciplina"
                  value={formData.disciplina}
                  onChange={handleChange}
                  className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    erros.disciplina ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Selecione uma disciplina</option>
                  {disciplinas.map((disc, index) => (
                    <option key={index} value={disc}>
                      {disc}
                    </option>
                  ))}
                  {novaDisciplina && <option value={novaDisciplina}>{novaDisciplina}</option>}
                </select>
                
                {onAddDisciplina && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={novaDisciplinaInput}
                      onChange={(e) => setNovaDisciplinaInput(e.target.value)}
                      placeholder="Nova disciplina"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddDisciplina}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
              {erros.disciplina && (
                <p className="mt-1 text-xs text-red-600">{erros.disciplina}</p>
              )}
            </div>
            
            {/* Assunto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assunto (opcional)
              </label>
              <input
                type="text"
                name="assunto"
                value={formData.assunto}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Sistema Cardiovascular"
              />
            </div>
            
            {/* Dificuldade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dificuldade *
              </label>
              <div className="flex gap-4">
                {(['facil', 'media', 'dificil'] as const).map((nivel) => (
                  <label key={nivel} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="dificuldade"
                      value={nivel}
                      checked={formData.dificuldade === nivel}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full mr-2 ${
                      formData.dificuldade === nivel
                        ? nivel === 'facil' 
                          ? 'bg-green-500' 
                          : nivel === 'media' 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                        : 'bg-gray-300'
                    }`}></div>
                    <span className="text-sm">
                      {nivel === 'facil' 
                        ? 'Fácil' 
                        : nivel === 'media' 
                          ? 'Média' 
                          : 'Difícil'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Enunciado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enunciado da Questão *
              </label>
              <textarea
                name="enunciado"
                value={formData.enunciado}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                  erros.enunciado ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Digite o enunciado da questão..."
              />
              {erros.enunciado && (
                <p className="mt-1 text-xs text-red-600">{erros.enunciado}</p>
              )}
            </div>
            
            {/* Alternativas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Alternativas *
              </label>
              <div className="space-y-3">
                {formData.alternativas.map((alternativa, index) => (
                  <div key={alternativa.id} className="flex items-start">
                    <div className="pt-2 mr-3">
                      <input
                        type="radio"
                        checked={alternativa.correta}
                        onChange={() => handleAlternativaCorretaChange(alternativa.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 mr-2">
                          {renderLetraAlternativa(index)})
                        </span>
                        {alternativa.correta && (
                          <span className="text-xs text-green-600 font-medium">
                            Resposta correta
                          </span>
                        )}
                      </div>
                      <textarea
                        value={alternativa.texto}
                        onChange={(e) => handleAlternativaChange(alternativa.id, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] ${
                          erros.alternativas ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder={`Digite a alternativa ${renderLetraAlternativa(index)}...`}
                      />
                    </div>
                  </div>
                ))}
                {(erros.alternativas || erros.alternativaCorreta) && (
                  <p className="mt-1 text-xs text-red-600">
                    {erros.alternativas || erros.alternativaCorreta}
                  </p>
                )}
              </div>
            </div>
            
            {/* Explicação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Explicação (opcional)
              </label>
              <textarea
                name="explicacao"
                value={formData.explicacao || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="Explique a resposta correta (opcional)..."
              />
            </div>
          </div>
          
          <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {questao ? 'Atualizar Questão' : 'Adicionar Questão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestaoModal; 