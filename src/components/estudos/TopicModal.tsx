'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { toast } from 'react-hot-toast';

interface Subject {
  id: number;
  name: string;
  title: string;
}

interface Topic {
  id: number;
  name: string;
  description?: string;
  subject_id: number;
}

interface TopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  disciplineId: number;
  disciplineName: string;
  onSuccess?: () => void;
}

export default function TopicModal({ 
  isOpen, 
  onClose, 
  disciplineId, 
  disciplineName,
  onSuccess 
}: TopicModalProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Carregar assuntos quando o modal abrir
  useEffect(() => {
    if (isOpen && disciplineId) {
      loadSubjects();
    }
  }, [isOpen, disciplineId]);

  // Carregar tópicos quando um assunto for selecionado
  useEffect(() => {
    if (selectedSubjectId) {
      loadTopics();
    } else {
      setTopics([]);
    }
  }, [selectedSubjectId]);

  const loadSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const subjectsData = await DisciplinesRestService.getSubjects(disciplineId, true);
      setSubjects(subjectsData || []);
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
      toast.error('Erro ao carregar assuntos');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const loadTopics = async () => {
    if (!selectedSubjectId) return;
    
    try {
      setLoadingTopics(true);
      // Buscar tópicos do assunto selecionado
      const response = await fetch(`/api/subjects/${selectedSubjectId}/topics`);
      if (response.ok) {
        const topicsData = await response.json();
        setTopics(topicsData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tópicos:', error);
      toast.error('Erro ao carregar tópicos');
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleAddTopic = async () => {
    if (!selectedSubjectId || !newTopicName.trim()) {
      toast.error('Selecione um assunto e digite o nome do tópico');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTopicName.trim(),
          description: newTopicDescription.trim() || null,
          subject_id: selectedSubjectId,
          discipline_id: disciplineId,
        }),
      });

      if (response.ok) {
        toast.success('Tópico adicionado com sucesso!');
        setNewTopicName('');
        setNewTopicDescription('');
        await loadTopics(); // Recarregar tópicos
        onSuccess?.();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao adicionar tópico');
      }
    } catch (error) {
      console.error('Erro ao adicionar tópico:', error);
      toast.error('Erro ao adicionar tópico');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId: number) => {
    if (!confirm('Tem certeza que deseja excluir este tópico?')) return;

    try {
      const response = await fetch(`/api/topics/${topicId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Tópico excluído com sucesso!');
        await loadTopics(); // Recarregar tópicos
        onSuccess?.();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao excluir tópico');
      }
    } catch (error) {
      console.error('Erro ao excluir tópico:', error);
      toast.error('Erro ao excluir tópico');
    }
  };

  const handleClose = () => {
    setSelectedSubjectId(null);
    setTopics([]);
    setNewTopicName('');
    setNewTopicDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Gerenciar Tópicos</h2>
            <p className="text-sm text-gray-600">{disciplineName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Seleção de Assunto */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Assunto
            </label>
            {loadingSubjects ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Carregando assuntos...</span>
              </div>
            ) : (
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => setSelectedSubjectId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um assunto</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name || subject.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Formulário para Adicionar Tópico */}
          {selectedSubjectId && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Adicionar Novo Tópico</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Tópico *
                  </label>
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="Ex: Anatomia do Sistema Cardiovascular"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={newTopicDescription}
                    onChange={(e) => setNewTopicDescription(e.target.value)}
                    placeholder="Descrição detalhada do tópico..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  onClick={handleAddTopic}
                  disabled={loading || !newTopicName.trim()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar Tópico
                </button>
              </div>
            </div>
          )}

          {/* Lista de Tópicos Existentes */}
          {selectedSubjectId && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Tópicos Existentes</h3>
              
              {loadingTopics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Carregando tópicos...</span>
                </div>
              ) : topics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Nenhum tópico encontrado para este assunto.</p>
                  <p className="text-sm">Adicione o primeiro tópico acima!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{topic.name}</h4>
                        {topic.description && (
                          <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir tópico"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}