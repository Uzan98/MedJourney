'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FacultyService } from '@/services/faculty.service';
import { Faculty, FacultyMember } from '@/types/faculty';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/Spinner';
import { Share2, Users, FileText, MessageSquare, Settings, Plus } from 'lucide-react';
import { ManageMembersModal } from '@/components/comunidade/ManageMembersModal';

export default function FacultyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [members, setMembers] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [manageMembersModalOpen, setManageMembersModalOpen] = useState(false);

  useEffect(() => {
    const facultyId = Number(params.id);
    if (isNaN(facultyId) || !user) {
      router.push('/minha-faculdade');
      return;
    }

    const loadFacultyDetails = async () => {
      setIsLoading(true);
      try {
        // Carregar detalhes do ambiente
        const facultyDetails = await FacultyService.getFacultyDetails(facultyId);
        if (!facultyDetails) {
          router.push('/minha-faculdade');
          return;
        }
        setFaculty(facultyDetails);

        // Verificar se o usuário é membro
        const membership = await FacultyService.checkMembership(facultyId, user.id);
        if (!membership) {
          router.push('/minha-faculdade');
          return;
        }

        // Verificar se é administrador ou proprietário
        const isUserAdmin = membership.role === 'admin';
        const isUserOwner = facultyDetails.owner_id === user.id;
        setIsAdmin(isUserAdmin || isUserOwner);
        setIsOwner(isUserOwner);

        // Carregar membros
        try {
          const facultyMembers = await FacultyService.getFacultyMembers(facultyId);
          console.log('Membros carregados:', facultyMembers.length);
          setMembers(facultyMembers);
        } catch (membersError) {
          console.error('Erro ao carregar membros:', membersError);
        }

        // Depurar metadados dos usuários
        if (process.env.NODE_ENV === 'development') {
          try {
            const userMetadata = await FacultyService.debugUserMetadata(facultyId);
            console.log('Metadados dos usuários:', userMetadata);
          } catch (metadataError) {
            console.error('Erro ao buscar metadados:', metadataError);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do ambiente:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFacultyDetails();
  }, [params.id, user, router]);

  const handleMembersUpdated = async () => {
    if (!faculty) return;
    
    try {
      const facultyMembers = await FacultyService.getFacultyMembers(faculty.id);
      setMembers(facultyMembers);
      
      // Atualizar também os detalhes da faculdade para obter o contador atualizado
      const facultyDetails = await FacultyService.getFacultyDetails(faculty.id);
      if (facultyDetails) {
        setFaculty(facultyDetails);
      }
    } catch (error) {
      console.error('Erro ao atualizar membros:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!faculty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Ambiente não encontrado</h1>
        <Button onClick={() => router.push('/minha-faculdade')}>Voltar</Button>
      </div>
    );
  }

  const handleShareCode = () => {
    navigator.clipboard.writeText(faculty.code);
    alert('Código copiado para a área de transferência!');
  };

  const openManageMembersModal = () => {
    setManageMembersModalOpen(true);
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        {/* Cabeçalho e informações principais */}
        <div className="w-full md:w-2/3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">{faculty.name}</h1>
              <p className="text-muted-foreground">{faculty.institution} • {faculty.course} • {faculty.semester}º Semestre</p>
            </div>
            <Button variant="outline" onClick={handleShareCode}>
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sobre este ambiente</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{faculty.description}</p>
              <div className="flex items-center mt-4">
                <Badge variant={faculty.is_public ? "default" : "outline"}>
                  {faculty.is_public ? 'Público' : 'Privado'}
                </Badge>
                <Badge variant="outline" className="ml-2">
                  Código: {faculty.code}
                </Badge>
                <Badge variant="secondary" className="ml-2">
                  <Users className="mr-1 h-4 w-4" /> {faculty.member_count} membros
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="materials">Materiais</TabsTrigger>
              <TabsTrigger value="forum">Fórum</TabsTrigger>
              <TabsTrigger value="exams">Provas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Gerais</CardTitle>
                  <CardDescription>Detalhes sobre este ambiente de estudos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-medium">Instituição</h3>
                      <p className="text-sm text-muted-foreground">{faculty.institution || 'Não informado'}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Curso</h3>
                      <p className="text-sm text-muted-foreground">{faculty.course || 'Não informado'}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Semestre</h3>
                      <p className="text-sm text-muted-foreground">{faculty.semester || 'Não informado'}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Criado em</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(faculty.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Materiais de Estudo</CardTitle>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Material
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Nenhum material disponível</h3>
                    <p className="text-muted-foreground mt-2">
                      Compartilhe materiais de estudo com seus colegas
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="forum">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Fórum de Discussão</CardTitle>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Discussão
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Nenhuma discussão iniciada</h3>
                    <p className="text-muted-foreground mt-2">
                      Inicie uma discussão para tirar dúvidas com seus colegas
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="exams">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Provas e Exercícios</CardTitle>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Prova
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Nenhuma prova disponível</h3>
                    <p className="text-muted-foreground mt-2">
                      Compartilhe provas antigas e listas de exercícios
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Barra lateral */}
        <div className="w-full md:w-1/3">
          {/* Card de membros */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Membros</CardTitle>
                {isAdmin && (
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Convidar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.length > 0 ? (
                  members.slice(0, 5).map((member) => {
                    const userName = member.user?.name || member.user?.email?.split('@')[0] || 'Usuário';
                    const userInitial = userName.charAt(0).toUpperCase();
                    const isAdmin = member.role === 'admin';
                    
                    return (
                      <div key={member.user_id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Avatar className={`h-8 w-8 mr-2 ${isAdmin ? 'border-2 border-blue-500' : ''}`}>
                            <AvatarImage src={member.user?.avatar_url} />
                            <AvatarFallback className={isAdmin ? 'bg-blue-100 text-blue-800' : ''}>
                              {userInitial}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{userName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                        {isAdmin && (
                          <Badge variant="secondary" className="text-xs">Admin</Badge>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Nenhum membro encontrado</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full" onClick={openManageMembersModal}>
                Ver todos ({faculty.member_count})
              </Button>
            </CardFooter>
          </Card>

          {/* Configurações (apenas para administradores) */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
                <CardDescription>Gerencie este ambiente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Editar informações
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={openManageMembersModal}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar membros
                  </Button>
                  <Separator className="my-2" />
                  <Button variant="destructive" className="w-full">
                    Excluir ambiente
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de gerenciamento de membros */}
      {faculty && user && (
        <ManageMembersModal
          isOpen={manageMembersModalOpen}
          onClose={() => {
            setManageMembersModalOpen(false);
            handleMembersUpdated();
          }}
          facultyId={faculty.id}
          currentUserId={user.id}
          isOwner={isOwner}
        />
      )}
    </div>
  );
} 