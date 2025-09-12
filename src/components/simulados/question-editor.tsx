'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageUpload } from '@/components/ui/image-upload';
import { 
  Edit3, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  AlertCircle,
  Check,
  ArrowUp,
  ArrowDown,
  BookOpen,
  Target
} from 'lucide-react';
import { ParsedQuestion } from '@/services/text-parser.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { toast } from 'sonner';

// Interfaces para disciplinas e assuntos
interface Discipline {
  id: number;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  description?: string;
  is_system: boolean;
  theme?: string;
}

interface Subject {
  id: number;
  name: string;
  discipline_id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  description?: string;
  difficulty?: number;
  importance?: number;
  estimated_hours?: number;
}

interface QuestionEditorProps {
  question: ParsedQuestion;
  onSave: (updatedQuestion: ParsedQuestion) => void;
  onCancel: () => void;
  isEditing: boolean;
  onToggleEdit: () => void;
}

export function QuestionEditor({ 
  question, 
  onSave, 
  onCancel, 
  isEditing, 
  onToggleEdit 
}: QuestionEditorProps) {
  const [editedQuestion, setEditedQuestion] = useState<ParsedQuestion>({
    ...question,
    options: [...question.options]
  });
  const [errors, setErrors] = useState<string[]>([]);
  
  // Estados para disciplinas e assuntos
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | null>(question.disciplineId || null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(question.subjectId || null);

  // Carregar disciplinas quando o componente for montado
  useEffect(() => {
    loadDisciplines();
  }, []);

  // Carregar assuntos quando a disciplina for selecionada
  useEffect(() => {
    if (selectedDisciplineId) {
      loadSubjects(selectedDisciplineId);
    } else {
      setSubjects([]);
      setSelectedSubjectId(null);
    }
  }, [selectedDisciplineId]);

  // Atualizar questão editada quando disciplina ou assunto mudarem
  useEffect(() => {
    setEditedQuestion(prev => ({
      ...prev,
      disciplineId: selectedDisciplineId || undefined,
      subjectId: selectedSubjectId || undefined
    }));
  }, [selectedDisciplineId, selectedSubjectId]);

  // Função para carregar disciplinas
  const loadDisciplines = async () => {
    try {
      setLoadingDisciplines(true);
      const disciplinesData = await DisciplinesRestService.getDisciplines(true);
      setDisciplines(disciplinesData || []);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Erro ao carregar disciplinas');
    } finally {
      setLoadingDisciplines(false);
    }
  };

  // Função para carregar assuntos
  const loadSubjects = async (disciplineId: number) => {
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

  // Função para lidar com mudança de disciplina
  const handleDisciplineChange = (disciplineId: string) => {
    const id = disciplineId ? parseInt(disciplineId) : null;
    setSelectedDisciplineId(id);
    setSelectedSubjectId(null); // Reset subject when discipline changes
  };

  // Função para lidar com mudança de assunto
  const handleSubjectChange = (subjectId: string) => {
    const id = subjectId ? parseInt(subjectId) : null;
    setSelectedSubjectId(id);
  };

  const validateQuestion = (): boolean => {
    const newErrors: string[] = [];
    
    if (!editedQuestion.statement?.trim()) {
      newErrors.push('Enunciado é obrigatório');
    }
    
    if (editedQuestion.options.length < 2) {
      newErrors.push('Pelo menos 2 alternativas são necessárias');
    }
    
    if (editedQuestion.options.some(opt => !opt.trim())) {
      newErrors.push('Todas as alternativas devem ter conteúdo');
    }
    
    if (editedQuestion.correctAnswer && 
        !['A', 'B', 'C', 'D', 'E'].slice(0, editedQuestion.options.length)
          .includes(editedQuestion.correctAnswer.toUpperCase())) {
      newErrors.push('Resposta correta deve ser uma alternativa válida');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validateQuestion()) {
      onSave(editedQuestion);
    }
  };

  const handleCancel = () => {
    setEditedQuestion({
      ...question,
      options: [...question.options]
    });
    setErrors([]);
    onCancel();
  };

  const addOption = () => {
    if (editedQuestion.options.length < 5) {
      setEditedQuestion({
        ...editedQuestion,
        options: [...editedQuestion.options, '']
      });
    }
  };

  const removeOption = (index: number) => {
    if (editedQuestion.options.length > 2) {
      const newOptions = editedQuestion.options.filter((_, i) => i !== index);
      setEditedQuestion({
        ...editedQuestion,
        options: newOptions
      });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...editedQuestion.options];
    newOptions[index] = value;
    setEditedQuestion({
      ...editedQuestion,
      options: newOptions
    });
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    const newOptions = [...editedQuestion.options];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOptions.length) {
      [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];
      setEditedQuestion({
        ...editedQuestion,
        options: newOptions
      });
    }
  };

  const hasIssues = !question.statement || question.options.length < 2;

  if (!isEditing) {
    return (
      <Card className={hasIssues ? 'border-orange-200 bg-orange-50' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Questão {question.number}
              {hasIssues && (
                <Badge variant="destructive" className="text-xs">
                  Atenção
                </Badge>
              )}
              {question.hasImage && (
                <Badge variant="secondary" className="text-xs">
                  Com Imagem
                </Badge>
              )}
              {question.correctAnswer && (
                <Badge variant="outline" className="text-xs">
                  Gabarito: {question.correctAnswer}
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onToggleEdit}>
              <Edit3 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Enunciado */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Enunciado:</h4>
              <p className="text-sm bg-gray-50 p-3 rounded border">
                {question.statement || (
                  <span className="text-red-500 italic">Enunciado não encontrado</span>
                )}
              </p>
            </div>
            
            {/* Alternativas */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Alternativas:</h4>
              {question.options.length > 0 ? (
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex items-start gap-2">
                      <Badge 
                        variant={question.correctAnswer === String.fromCharCode(65 + optIndex) ? "default" : "outline"} 
                        className="text-xs mt-0.5"
                      >
                        {String.fromCharCode(65 + optIndex)}
                        {question.correctAnswer === String.fromCharCode(65 + optIndex) && (
                          <Check className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                      <p className="text-sm flex-1">{option}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-red-500 italic text-sm">Nenhuma alternativa encontrada</p>
              )}
            </div>
            
            {/* Informações adicionais */}
            {question.explanation && (
              <div className="pt-2 border-t">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Explicação:</h4>
                <p className="text-sm bg-blue-50 p-3 rounded border">{question.explanation}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-blue-600" />
            Editando Questão
            <Badge variant="secondary" className="text-xs">
              Modo Edição
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Erros de validação */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Número da questão */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número da Questão
            </label>
            <Input
              type="number"
              value={editedQuestion.number}
              onChange={(e) => setEditedQuestion({
                ...editedQuestion,
                number: parseInt(e.target.value) || 1
              })}
              className="w-32"
              min="1"
            />
          </div>

          {/* Seleção de Disciplina e Assunto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Disciplina */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="h-4 w-4 inline mr-1" />
                Disciplina
              </label>
              <select
                value={selectedDisciplineId || ''}
                onChange={(e) => handleDisciplineChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingDisciplines}
              >
                <option value="">Selecione uma disciplina</option>
                {disciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
              {loadingDisciplines && (
                <p className="text-xs text-gray-500 mt-1">Carregando disciplinas...</p>
              )}
            </div>

            {/* Assunto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Target className="h-4 w-4 inline mr-1" />
                Assunto
              </label>
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!selectedDisciplineId || loadingSubjects}
              >
                <option value="">Selecione um assunto</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {loadingSubjects && (
                <p className="text-xs text-gray-500 mt-1">Carregando assuntos...</p>
              )}
              {!selectedDisciplineId && (
                <p className="text-xs text-gray-500 mt-1">Selecione uma disciplina primeiro</p>
              )}
            </div>
          </div>
          
          {/* Enunciado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enunciado *
            </label>
            <Textarea
              value={editedQuestion.statement || ''}
              onChange={(e) => setEditedQuestion({
                ...editedQuestion,
                statement: e.target.value
              })}
              placeholder="Digite o enunciado da questão..."
              rows={4}
              className="resize-none"
            />
          </div>
          
          {/* Upload de Imagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagem da Questão (Opcional)
            </label>
            <ImageUpload
              onImageUploaded={(imageUrl) => {
                setEditedQuestion({
                  ...editedQuestion,
                  imageUrl: imageUrl,
                  hasImage: true
                });
              }}
              onImageRemoved={() => {
                setEditedQuestion({
                  ...editedQuestion,
                  imageUrl: undefined,
                  hasImage: false
                });
              }}
              currentImageUrl={editedQuestion.imageUrl}
              maxFiles={1}
              acceptedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
              maxSize={10 * 1024 * 1024} // 10MB
            />
          </div>
          
          {/* Alternativas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Alternativas *
              </label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addOption}
                disabled={editedQuestion.options.length >= 5}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
            
            <div className="space-y-3">
              {editedQuestion.options.map((option, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs mt-2 min-w-[24px] justify-center">
                    {String.fromCharCode(65 + index)}
                  </Badge>
                  
                  <Textarea
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Alternativa ${String.fromCharCode(65 + index)}...`}
                    rows={2}
                    className="flex-1 resize-none"
                  />
                  
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveOption(index, 'up')}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveOption(index, 'down')}
                      disabled={index === editedQuestion.options.length - 1}
                      className="h-8 w-8 p-0"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                      disabled={editedQuestion.options.length <= 2}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Resposta correta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resposta Correta (Gabarito)
            </label>
            <div className="flex gap-2">
              {editedQuestion.options.map((_, index) => {
                const letter = String.fromCharCode(65 + index);
                const isSelected = editedQuestion.correctAnswer === letter;
                
                return (
                  <Button
                    key={index}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditedQuestion({
                      ...editedQuestion,
                      correctAnswer: isSelected ? '' : letter
                    })}
                    className="w-12 h-12"
                  >
                    {letter}
                    {isSelected && <Check className="h-3 w-3 ml-1" />}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditedQuestion({
                  ...editedQuestion,
                  correctAnswer: ''
                })}
                className="px-3"
              >
                Limpar
              </Button>
            </div>
          </div>
          
          {/* Explicação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Explicação (Opcional)
            </label>
            <Textarea
              value={editedQuestion.explanation || ''}
              onChange={(e) => setEditedQuestion({
                ...editedQuestion,
                explanation: e.target.value
              })}
              placeholder="Digite uma explicação para a resposta..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}