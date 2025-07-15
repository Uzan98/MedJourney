import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/Spinner';
import { ForumTag } from '@/types/faculty';
import { FacultyService } from '@/services/faculty.service';
import { toast } from '@/components/ui/use-toast';

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTopic: (title: string, content: string, selectedTags: number[]) => Promise<void>;
  facultyId: number | null;
  availableTags: ForumTag[];
}

export function CreateTopicModal({
  isOpen,
  onClose,
  onCreateTopic,
  facultyId,
  availableTags
}: CreateTopicModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [showTagCreator, setShowTagCreator] = useState(false);
  
  // Adicionar log para depuração
  useEffect(() => {
    console.log('CreateTopicModal - isOpen:', isOpen);
    console.log('CreateTopicModal - facultyId:', facultyId);
    console.log('CreateTopicModal - availableTags:', availableTags?.length || 0);
  }, [isOpen, facultyId, availableTags]);
  
  // Limpar o formulário quando o modal é fechado
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setContent('');
      setSelectedTags([]);
      setShowTagCreator(false);
      setNewTagName('');
    }
  }, [isOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, forneça um título para o tópico.",
        variant: "destructive"
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Conteúdo obrigatório",
        description: "Por favor, descreva sua dúvida no conteúdo do tópico.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onCreateTopic(title, content, selectedTags);
      onClose();
    } catch (error) {
      console.error('Erro ao criar tópico:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };
  
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTagName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, forneça um nome para a tag.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingTag(true);
    try {
      const tagId = await FacultyService.createForumTag(facultyId!, newTagName, newTagColor);
      
      if (tagId) {
        toast({
          title: "Tag criada",
          description: "A tag foi criada com sucesso!",
        });
        
        // Adicionar a nova tag à lista e selecioná-la
        const newTag: ForumTag = {
          id: tagId,
          faculty_id: facultyId!,
          name: newTagName,
          color: newTagColor,
          created_at: new Date().toISOString(),
          topic_count: 0
        };
        
        availableTags.push(newTag);
        setSelectedTags(prev => [...prev, tagId]);
        
        // Limpar o formulário de criação de tag
        setNewTagName('');
        setNewTagColor('#3b82f6');
        setShowTagCreator(false);
      } else {
        throw new Error('Erro ao criar tag');
      }
    } catch (error) {
      console.error('Erro ao criar tag:', error);
      toast({
        title: "Erro ao criar tag",
        description: "Não foi possível criar a tag. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTag(false);
    }
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        console.log('Dialog onOpenChange:', open);
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Dúvida</DialogTitle>
          <DialogDescription>
            Crie um novo tópico no fórum de dúvidas. Seja específico para facilitar as respostas.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adicionar log para depuração */}
          <div className="text-xs text-muted-foreground mb-2">
            Modal aberto: {isOpen ? 'Sim' : 'Não'} | Faculty ID: {facultyId || 'N/A'}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Digite um título claro e objetivo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">Descrição da dúvida</Label>
            <Textarea
              id="content"
              placeholder="Descreva sua dúvida com detalhes..."
              className="min-h-[150px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Tags</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowTagCreator(!showTagCreator)}
              >
                {showTagCreator ? 'Cancelar' : 'Criar nova tag'}
              </Button>
            </div>
            
            {showTagCreator && (
              <div className="border rounded-md p-3 space-y-3">
                <h4 className="text-sm font-medium">Nova Tag</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="tagName" className="text-xs">Nome</Label>
                    <Input
                      id="tagName"
                      placeholder="Nome da tag"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      disabled={isCreatingTag}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tagColor" className="text-xs">Cor</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="tagColor"
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        disabled={isCreatingTag}
                        className="h-8 w-12"
                      />
                      <div 
                        className="w-6 h-6 rounded-full border"
                        style={{ backgroundColor: newTagColor }}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateTag}
                  disabled={isCreatingTag}
                  className="w-full"
                >
                  {isCreatingTag ? (
                    <>
                      <Spinner className="mr-2" size="sm" />
                      Criando...
                    </>
                  ) : (
                    'Criar Tag'
                  )}
                </Button>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mt-2">
              {availableTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tag disponível</p>
              ) : (
                availableTags.map(tag => (
                  <Badge 
                    key={tag.id} 
                    style={{ 
                      backgroundColor: selectedTags.includes(tag.id) ? tag.color : tag.color + '20', 
                      color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                      borderColor: tag.color
                    }}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagToggle(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2" size="sm" />
                  Criando...
                </>
              ) : (
                'Publicar Dúvida'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 