'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Upload, X, File, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { toast } from '@/components/ui/use-toast';
import { FacultyService } from '@/services/faculty.service';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UploadMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyId: number;
  onMaterialUploaded: () => void;
}

export function UploadMaterialModal({ isOpen, onClose, facultyId, onMaterialUploaded }: UploadMaterialModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<string>("none");
  const [disciplina, setDisciplina] = useState<string>('');
  const [disciplinaType, setDisciplinaType] = useState<string>('existing');
  const [disciplinasList, setDisciplinasList] = useState<string[]>([]);
  const [isLoadingDisciplinas, setIsLoadingDisciplinas] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal is opened
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setFile(null);
      setPeriodo("none");
      setDisciplina('');
      setDisciplinaType('existing');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  // Carregar disciplinas existentes quando o modal for aberto
  useEffect(() => {
    if (isOpen && facultyId) {
      loadDisciplinas();
    }
  }, [isOpen, facultyId]);

  const loadDisciplinas = async () => {
    if (!facultyId) return;
    
    setIsLoadingDisciplinas(true);
    try {
      const disciplinasData = await FacultyService.getFacultyDisciplines(facultyId);
      setDisciplinasList(disciplinasData || []);
      
      // Se tiver disciplinas, selecionar a primeira por padrão
      if (disciplinasData && disciplinasData.length > 0) {
        setDisciplina(disciplinasData[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    } finally {
      setIsLoadingDisciplinas(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Verificar tamanho do arquivo (limite de 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('O arquivo é muito grande. O tamanho máximo é 50MB.');
        return;
      }
      
      // Verificar se o nome do arquivo contém caracteres especiais ou acentos
      const hasSpecialChars = /[^\w\s.-]/g.test(selectedFile.name);
      const hasAccents = /[áàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/g.test(selectedFile.name);
      
      if (hasSpecialChars || hasAccents) {
        // Alertar, mas ainda permitir o upload (será sanitizado)
        toast({
          title: "Atenção",
          description: "O nome do arquivo contém caracteres especiais ou acentos que serão removidos durante o upload.",
          variant: "warning"
        });
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Se o título estiver vazio, usar o nome do arquivo como título
      if (!title) {
        // Remover extensão do arquivo para o título
        const fileName = selectedFile.name.split('.').slice(0, -1).join('.');
        setTitle(fileName);
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-6 w-6 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="h-6 w-6 text-green-500" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="h-6 w-6 text-orange-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const getFileType = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
      case 'docx':
        return 'application/msword';
      case 'xls':
      case 'xlsx':
        return 'application/vnd.ms-excel';
      case 'ppt':
      case 'pptx':
        return 'application/vnd.ms-powerpoint';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para enviar materiais.",
        variant: "destructive"
      });
      return;
    }
    
    if (!title.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    
    if (!file) {
      setError('Selecione um arquivo para enviar.');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    // Preparar os valores de período e disciplina
    const periodoValue = periodo !== "none" ? parseInt(periodo) : null;
    
    // Determinar qual disciplina usar baseado no tipo selecionado
    const disciplinaValue = disciplinaType === 'custom' ? 
      (disciplina && disciplina.trim() !== "" ? disciplina.trim() : null) : 
      (disciplina || null);
    
    try {
      // 1. Fazer upload do arquivo
      const fileUrl = await FacultyService.uploadMaterialFile(facultyId, user.id, file);
      
      if (!fileUrl) {
        throw new Error('Falha ao fazer upload do arquivo.');
      }
      
      // 2. Criar o registro do material
      const materialId = await FacultyService.createFacultyMaterial(
        facultyId,
        title,
        description,
        fileUrl,
        getFileType(file.name),
        file.size,
        periodoValue,
        disciplinaValue
      );
      
      if (!materialId) {
        throw new Error('Falha ao registrar o material.');
      }
      
      toast({
        title: "Material enviado com sucesso!",
        description: "Seu material de estudo foi compartilhado.",
      });
      
      // Limpar formulário
      setTitle('');
      setDescription('');
      setFile(null);
      setPeriodo("none");
      setDisciplina('');
      setDisciplinaType('existing');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Fechar modal e atualizar lista
      onClose();
      onMaterialUploaded();
      
    } catch (error: any) {
      console.error('Erro ao enviar material:', error);
      
      // Tratamento específico para diferentes tipos de erros
      if (error.message?.includes('InvalidKey')) {
        setError('O nome do arquivo contém caracteres inválidos. Renomeie o arquivo removendo acentos e caracteres especiais antes de fazer upload.');
      } else if (error.message?.includes('storage')) {
        setError('Erro no armazenamento: verifique se o arquivo não excede o tamanho máximo permitido.');
      } else if (error.message?.includes('auth')) {
        setError('Erro de autenticação: você precisa estar logado para enviar materiais.');
      } else if (error.message?.includes('faculty')) {
        setError('Erro de permissão: você não tem permissão para adicionar materiais nesta faculdade.');
      } else {
        setError(`Ocorreu um erro ao enviar o material: ${error.message || 'Tente novamente mais tarde.'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Material de Estudo</DialogTitle>
          <DialogDescription>
            Compartilhe documentos, slides, resumos e outros materiais com seus colegas.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Título
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do material"
              disabled={isUploading}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="periodo" className="text-sm font-medium">
                Período
              </label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger>
                  <SelectValue>
                    {periodo === "none" ? "Não especificado" : `${periodo}º Período`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-scroll scrollbar-visible">
                  <div className="pb-2">
                  <SelectItem value="none">Não especificado</SelectItem>
                  {Array.from({length: 12}, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}º Período
                    </SelectItem>
                  ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="disciplina-type" className="text-sm font-medium">
                Disciplina
              </label>
              
              {/* Seleção do tipo de disciplina */}
              <Select 
                value={disciplinaType} 
                onValueChange={(value) => {
                  setDisciplinaType(value);
                  if (value === 'existing' && disciplinasList.length > 0) {
                    setDisciplina(disciplinasList[0]);
                  } else if (value === 'custom') {
                    setDisciplina('');
                  }
                }}
              >
                <SelectTrigger id="disciplina-type">
                  <SelectValue>
                    {disciplinaType === 'existing' ? 'Disciplina existente' : 'Nova disciplina'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Disciplina existente</SelectItem>
                  <SelectItem value="custom">Nova disciplina</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Disciplina existente */}
              {disciplinaType === 'existing' && (
                <div className="mt-2">
                  {isLoadingDisciplinas ? (
                    <div className="flex justify-center p-2">
                      <Spinner size="sm" />
                    </div>
                  ) : disciplinasList.length > 0 ? (
                    <Select 
                      value={disciplina || ''} 
                      onValueChange={setDisciplina}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {disciplina || 'Selecione uma disciplina'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-scroll scrollbar-visible">
                        {disciplinasList.map((disc) => (
                          <SelectItem key={disc} value={disc}>
                            {disc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm text-gray-500 italic p-2 border rounded-md">
                      Nenhuma disciplina encontrada
                    </div>
                  )}
                </div>
              )}
              
              {/* Nova disciplina */}
              {disciplinaType === 'custom' && (
                <Input
                  className="mt-2"
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  placeholder="Digite o nome da disciplina"
                  disabled={isUploading}
                />
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Descrição (opcional)
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva brevemente o conteúdo deste material"
              disabled={isUploading}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="file" className="text-sm font-medium">
              Arquivo (máx. 50MB)
            </label>
            
            {!file ? (
              <div 
                className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Clique para selecionar ou arraste um arquivo
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, Word, Excel, PowerPoint, imagens e outros formatos
                </p>
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
            ) : (
              <div className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-[250px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleRemoveFile}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading || !file} className="w-full sm:w-auto">
              {isUploading ? <Spinner size="sm" className="mr-2" /> : null}
              {isUploading ? 'Enviando...' : 'Enviar Material'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}