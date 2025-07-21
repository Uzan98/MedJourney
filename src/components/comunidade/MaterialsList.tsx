'use client';

import { useState, useEffect } from 'react';
import { FacultyMaterial } from '@/types/faculty';
import { FacultyService } from '@/services/faculty.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { FileText, Download, File, Trash2, ExternalLink, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MaterialsListProps {
  facultyId: number;
  isAdmin: boolean;
}

export function MaterialsList({ facultyId, isAdmin }: MaterialsListProps) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<FacultyMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [materialToDelete, setMaterialToDelete] = useState<FacultyMaterial | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState<{[key: string]: boolean}>({});
  const [expandedDisciplinas, setExpandedDisciplinas] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    loadMaterials();
  }, [facultyId]);

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      const data = await FacultyService.getFacultyMaterials(facultyId);
      console.log("Materiais carregados:", data);
      
      // Verificar valores de período e disciplina
      data.forEach(material => {
        console.log(`Material ${material.id} - ${material.title}:`, {
          periodo: material.periodo,
          disciplina: material.disciplina,
          tipo_periodo: typeof material.periodo,
          tipo_disciplina: typeof material.disciplina,
          raw: JSON.stringify(material)
        });
      });
      
      setMaterials(data);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      toast({
        title: "Erro ao carregar materiais",
        description: "Não foi possível carregar os materiais de estudo. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadMaterials();
      toast({
        title: "Lista atualizada",
        description: "A lista de materiais foi atualizada com sucesso.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownload = async (material: FacultyMaterial) => {
    try {
      // Incrementar o contador de downloads
      await FacultyService.incrementMaterialDownloadCount(material.id);
      
      // Verificar se a URL é válida
      if (!material.file_url) {
        throw new Error('URL do arquivo inválida');
      }
      
      // Tentar abrir o arquivo em uma nova aba
      window.open(material.file_url, '_blank');
      
      // Atualizar o contador de downloads na interface
      setMaterials(prevMaterials => 
        prevMaterials.map(m => 
          m.id === material.id 
            ? { ...m, download_count: (m.download_count || 0) + 1 } 
            : m
        )
      );
      
      // Verificar se a URL é uma URL assinada (contém token de acesso)
      if (!material.file_url.includes('token=')) {
        toast({
          title: "Aviso",
          description: "Se o arquivo não abrir, entre em contato com o administrador do sistema.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Erro ao baixar material:', error);
      toast({
        title: "Erro ao baixar arquivo",
        description: "Não foi possível baixar o arquivo. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (material: FacultyMaterial) => {
    try {
      // Extrair o caminho do arquivo da URL
      // A URL pode ser uma URL assinada (com token) ou uma URL pública
      let filePath;
      
      if (material.file_url.includes('token=')) {
        // Para URLs assinadas, o caminho está antes do token
        const urlWithoutQuery = material.file_url.split('?')[0];
        // Remover o domínio e o nome do bucket
        filePath = urlWithoutQuery.split('/storage/v1/object/public/faculty_materials/')[1];
      } else {
        // Para URLs públicas
        const url = new URL(material.file_url);
        const pathParts = url.pathname.split('/');
        // Encontrar o índice onde começa o caminho após o nome do bucket
        const bucketIndex = pathParts.findIndex(part => part === 'faculty_materials');
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          filePath = pathParts.slice(bucketIndex + 1).join('/');
        } else {
          throw new Error('Não foi possível extrair o caminho do arquivo');
        }
      }
      
      console.log('Caminho do arquivo para exclusão:', filePath);
      
      const success = await FacultyService.deleteFacultyMaterial(material.id, filePath);
      
      if (success) {
        toast({
          title: "Material excluído",
          description: "O material foi excluído com sucesso.",
        });
        
        // Recarregar a lista completa para garantir sincronização com o banco
        loadMaterials();
      } else {
        throw new Error('Falha ao excluir material');
      }
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      toast({
        title: "Erro ao excluir material",
        description: "Não foi possível excluir o material. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setMaterialToDelete(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="h-10 w-10 text-red-500" />;
    } else if (fileType.includes('word') || fileType.includes('doc')) {
      return <FileText className="h-10 w-10 text-blue-500" />;
    } else if (fileType.includes('excel') || fileType.includes('sheet')) {
      return <FileText className="h-10 w-10 text-green-500" />;
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return <FileText className="h-10 w-10 text-orange-500" />;
    } else if (fileType.includes('image')) {
      return <FileText className="h-10 w-10 text-purple-500" />;
    } else {
      return <File className="h-10 w-10 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para agrupar materiais por período
  const getMaterialsByPeriodo = () => {
    console.log("Agrupando materiais por período:", materials);
    
    // Ordenar materiais por período (null no final) e depois por disciplina
    const sortedMaterials = [...materials].sort((a, b) => {
      console.log("Comparando materiais:", {
        materialA: { id: a.id, periodo: a.periodo, disciplina: a.disciplina },
        materialB: { id: b.id, periodo: b.periodo, disciplina: b.disciplina }
      });
      
      // Ordenar por período (null no final)
      if (a.periodo === null && b.periodo !== null) return 1;
      if (a.periodo !== null && b.periodo === null) return -1;
      if (a.periodo !== b.periodo) return (a.periodo || 0) - (b.periodo || 0);
      
      // Se o período for igual, ordenar por disciplina
      if (!a.disciplina && b.disciplina) return 1;
      if (a.disciplina && !b.disciplina) return -1;
      if (a.disciplina && b.disciplina) return a.disciplina.localeCompare(b.disciplina);
      
      return 0;
    });
    
    // Agrupar por período
    const byPeriodo: { [key: string]: FacultyMaterial[] } = {};
    
    sortedMaterials.forEach(material => {
      // Garantir que período nulo ou undefined seja tratado corretamente
      let periodoKey = 'sem-periodo';
      
      if (material.periodo !== null && material.periodo !== undefined) {
        periodoKey = `${material.periodo}`;
      }
      
      console.log(`Material ${material.id} agrupado no período:`, {
        periodoKey,
        periodo: material.periodo,
        disciplina: material.disciplina
      });
      
      if (!byPeriodo[periodoKey]) {
        byPeriodo[periodoKey] = [];
      }
      byPeriodo[periodoKey].push(material);
    });
    
    console.log("Materiais agrupados por período:", byPeriodo);
    return byPeriodo;
  };
  
  // Função para agrupar materiais por disciplina dentro de um período
  const getMaterialsByDisciplina = (materialsInPeriodo: FacultyMaterial[]) => {
    const byDisciplina: { [key: string]: FacultyMaterial[] } = {};
    
    materialsInPeriodo.forEach(material => {
      // Garantir que disciplina nula ou vazia seja tratada corretamente
      let disciplinaKey = 'sem-disciplina';
      
      if (material.disciplina && material.disciplina.trim() !== '') {
        disciplinaKey = material.disciplina;
      }
      
      if (!byDisciplina[disciplinaKey]) {
        byDisciplina[disciplinaKey] = [];
      }
      byDisciplina[disciplinaKey].push(material);
    });
    
    return byDisciplina;
  };
  
  const togglePeriodo = (periodoKey: string) => {
    setExpandedPeriods(prev => ({
      ...prev,
      [periodoKey]: !prev[periodoKey]
    }));
  };
  
  const toggleDisciplina = (disciplinaKey: string) => {
    setExpandedDisciplinas(prev => ({
      ...prev,
      [disciplinaKey]: !prev[disciplinaKey]
    }));
  };
  
  const getPeriodoLabel = (periodoKey: string) => {
    return periodoKey === 'sem-periodo' ? 'Sem período definido' : `${periodoKey}º Período`;
  };
  
  const getDisciplinaLabel = (disciplinaKey: string) => {
    return disciplinaKey === 'sem-disciplina' ? 'Sem disciplina definida' : disciplinaKey;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  const materialsByPeriodo = getMaterialsByPeriodo();
  const periodoKeys = Object.keys(materialsByPeriodo).sort((a, b) => {
    if (a === 'sem-periodo') return 1;
    if (b === 'sem-periodo') return -1;
    return parseInt(a) - parseInt(b);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Materiais de Estudo</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {materials.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Nenhum material disponível</h3>
          <p className="text-muted-foreground mt-2">
            Compartilhe materiais de estudo com seus colegas
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {periodoKeys.map(periodoKey => {
            const materialsInPeriodo = materialsByPeriodo[periodoKey];
            const isPeriodoExpanded = expandedPeriods[periodoKey] !== false; // Por padrão expandido
            const materialsByDisciplina = getMaterialsByDisciplina(materialsInPeriodo);
            const disciplinaKeys = Object.keys(materialsByDisciplina).sort((a, b) => {
              if (a === 'sem-disciplina') return 1;
              if (b === 'sem-disciplina') return -1;
              return a.localeCompare(b);
            });
            
            return (
              <Card key={periodoKey} className="overflow-hidden">
                <CardHeader 
                  className="p-4 cursor-pointer bg-slate-50" 
                  onClick={() => togglePeriodo(periodoKey)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      {isPeriodoExpanded ? <ChevronDown className="h-5 w-5 mr-2" /> : <ChevronRight className="h-5 w-5 mr-2" />}
                      {getPeriodoLabel(periodoKey)}
                      <Badge className="ml-3 bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {materialsInPeriodo.length} {materialsInPeriodo.length === 1 ? 'material' : 'materiais'}
                      </Badge>
                    </CardTitle>
                  </div>
                </CardHeader>
                
                {isPeriodoExpanded && (
                  <CardContent className="p-0">
                    <div className="space-y-1">
                      {disciplinaKeys.map(disciplinaKey => {
                        const materialsInDisciplina = materialsByDisciplina[disciplinaKey];
                        const isDisciplinaExpanded = expandedDisciplinas[disciplinaKey] !== false; // Por padrão expandido
                        
                        return (
                          <div key={disciplinaKey} className="border-t first:border-t-0">
                            <div 
                              className="p-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
                              onClick={() => toggleDisciplina(disciplinaKey)}
                            >
                              <div className="flex items-center">
                                {isDisciplinaExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                <span className="font-medium">{getDisciplinaLabel(disciplinaKey)}</span>
                                <Badge className="ml-3 bg-green-100 text-green-800 hover:bg-green-200">
                                  {materialsInDisciplina.length} {materialsInDisciplina.length === 1 ? 'material' : 'materiais'}
                                </Badge>
                              </div>
                            </div>
                            
                            {isDisciplinaExpanded && (
                              <div className="space-y-2 p-3 pt-0">
                                {materialsInDisciplina.map(material => (
                                  <Card key={material.id} className="overflow-hidden border-l-4 border-l-blue-500">
                                    <CardContent className="p-3">
                                      <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0">
                                          {getFileIcon(material.file_type)}
                                        </div>
                                        <div className="flex-grow">
                                          <h3 className="font-medium">{material.title}</h3>
                                          
                                          {material.description && (
                                            <p className="text-sm text-muted-foreground mt-1">{material.description}</p>
                                          )}
                                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                            <span>Tamanho: {formatFileSize(material.file_size)}</span>
                                            <span>Enviado em: {formatDate(material.created_at)}</span>
                                            <span>Por: {material.user?.name || 'Usuário'}</span>
                                            <span>Downloads: {material.download_count}</span>
                                          </div>
                                        </div>
                                        <div className="flex-shrink-0 flex gap-2">
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="flex items-center gap-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownload(material);
                                            }}
                                          >
                                            <Download className="h-4 w-4" />
                                            <span className="hidden sm:inline">Baixar</span>
                                          </Button>
                                          
                                          {(isAdmin || user?.id === material.user_id) && (
                                            <Button 
                                              variant="outline" 
                                              size="sm" 
                                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setMaterialToDelete(material);
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                              <span className="hidden sm:inline">Excluir</span>
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
      
      <AlertDialog open={!!materialToDelete} onOpenChange={() => setMaterialToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir material</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o material "{materialToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => materialToDelete && handleDelete(materialToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 