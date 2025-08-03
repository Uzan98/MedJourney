import { useState, useEffect } from 'react';
import { FacultyService } from '@/services/faculty.service';
import { FacultyMember } from '@/types/faculty';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, UserPlus, Shield, User, Ban, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyId: number;
  currentUserId: string;
  isOwner: boolean;
}

export function ManageMembersModal({
  isOpen,
  onClose,
  facultyId,
  currentUserId,
  isOwner
}: ManageMembersModalProps) {
  const [members, setMembers] = useState<FacultyMember[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('members');
  const [banReason, setBanReason] = useState('');
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [userToBan, setUserToBan] = useState<FacultyMember | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, facultyId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Carregar membros
      const facultyMembers = await FacultyService.getFacultyMembers(facultyId);
      setMembers(facultyMembers);
      
      // Carregar usuários banidos
      const bannedUsersList = await FacultyService.getBannedUsers(facultyId);
      setBannedUsers(bannedUsersList);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!isOwner && newRole === 'admin') {
      toast({
        title: 'Permissão negada',
        description: 'Apenas o proprietário pode promover membros a administradores.',
        variant: 'destructive'
      });
      return;
    }

    setProcessingMemberId(memberId);
    try {
      await FacultyService.updateMemberRole(facultyId, memberId, newRole as 'admin' | 'moderator' | 'member');
      
      // Atualizar a lista localmente
      setMembers(members.map(member => 
        member.user_id === memberId ? { ...member, role: newRole as 'admin' | 'moderator' | 'member' } : member
      ));
      
      toast({
        title: 'Função atualizada',
        description: 'A função do membro foi atualizada com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao atualizar função:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a função do membro.',
        variant: 'destructive'
      });
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    // Não permitir remover a si mesmo
    if (memberId === currentUserId) {
      toast({
        title: 'Operação não permitida',
        description: 'Você não pode remover a si mesmo do ambiente.',
        variant: 'destructive'
      });
      return;
    }

    // Verificar se o membro é proprietário
    const member = members.find(m => m.user_id === memberId);
    if (member && member.role === 'admin' && !isOwner) {
      toast({
        title: 'Permissão negada',
        description: 'Apenas o proprietário pode remover administradores.',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm('Tem certeza que deseja remover este membro?')) {
      return;
    }

    setProcessingMemberId(memberId);
    try {
      await FacultyService.removeMember(facultyId, memberId);
      
      // Atualizar a lista localmente
      setMembers(members.filter(member => member.user_id !== memberId));
      
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro.',
        variant: 'destructive'
      });
    } finally {
      setProcessingMemberId(null);
    }
  };

  const openBanDialog = (member: FacultyMember) => {
    setUserToBan(member);
    setBanReason('');
    setShowBanDialog(true);
  };

  const handleBanUser = async () => {
    if (!userToBan) return;
    
    setProcessingMemberId(userToBan.user_id);
    try {
      await FacultyService.banUser(facultyId, userToBan.user_id, banReason);
      
      // Atualizar listas localmente
      setMembers(members.filter(member => member.user_id !== userToBan.user_id));
      
      // Recarregar a lista de banidos
      const bannedUsersList = await FacultyService.getBannedUsers(facultyId);
      setBannedUsers(bannedUsersList);
      
      toast({
        title: 'Usuário banido',
        description: 'O usuário foi banido com sucesso e não poderá mais entrar neste ambiente.'
      });
      
      setShowBanDialog(false);
    } catch (error) {
      console.error('Erro ao banir usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível banir o usuário.',
        variant: 'destructive'
      });
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja desbanir este usuário?')) {
      return;
    }
    
    setProcessingMemberId(userId);
    try {
      await FacultyService.unbanUser(facultyId, userId);
      
      // Atualizar a lista localmente
      setBannedUsers(bannedUsers.filter(user => user.user_id !== userId));
      
      toast({
        title: 'Usuário desbanido',
        description: 'O usuário foi desbanido com sucesso e poderá entrar novamente neste ambiente.'
      });
    } catch (error) {
      console.error('Erro ao desbanir usuário:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desbanir o usuário.',
        variant: 'destructive'
      });
    } finally {
      setProcessingMemberId(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Membros</DialogTitle>
            <DialogDescription>
              Gerencie os membros deste ambiente de estudos. Você pode alterar funções, remover ou banir membros.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="members">Membros</TabsTrigger>
              <TabsTrigger value="banned">Banidos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
                  {members.length > 0 ? (
                    members.map((member) => {
                      const userName = member.user?.name || member.user?.email?.split('@')[0] || 'Usuário';
                      const userInitial = userName.charAt(0).toUpperCase();
                      const isCurrentUser = member.user_id === currentUserId;
                      const isProcessing = processingMemberId === member.user_id;
                      
                      return (
                        <div key={member.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-md hover:bg-muted gap-2">
                          <div className="flex items-center min-w-0 flex-1">
                            <Avatar className={`h-8 w-8 mr-2 flex-shrink-0 ${member.role === 'admin' ? 'border-2 border-blue-500' : ''}`}>
                              <AvatarImage src={member.user?.avatar_url} />
                              <AvatarFallback className={member.role === 'admin' ? 'bg-blue-100 text-blue-800' : ''}>
                                {userInitial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {userName}
                                {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(Você)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            {isProcessing ? (
                              <Spinner size="sm" />
                            ) : (
                              <>
                                <Select
                                  value={member.role}
                                  onValueChange={(value) => handleRoleChange(member.user_id, value)}
                                  disabled={!isOwner && member.role === 'admin'}
                                >
                                  <SelectTrigger className="w-20 sm:w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">
                                      <div className="flex items-center">
                                        <Shield className="w-4 h-4 mr-1" />
                                        <span>Admin</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="moderator">
                                      <div className="flex items-center">
                                        <UserPlus className="w-4 h-4 mr-1" />
                                        <span>Moderador</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="member">
                                      <div className="flex items-center">
                                        <User className="w-4 h-4 mr-1" />
                                        <span>Membro</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveMember(member.user_id)}
                                  disabled={isCurrentUser || (!isOwner && member.role === 'admin')}
                                  title="Remover membro"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openBanDialog(member)}
                                  disabled={isCurrentUser || (!isOwner && member.role === 'admin')}
                                  title="Banir usuário"
                                >
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum membro encontrado</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="banned">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4">
                  {bannedUsers.length > 0 ? (
                    bannedUsers.map((bannedUser) => {
                      const userName = bannedUser.user?.name || 'Usuário';
                      const userInitial = userName.charAt(0).toUpperCase();
                      const isProcessing = processingMemberId === bannedUser.user_id;
                      const bannedDate = new Date(bannedUser.banned_at).toLocaleDateString('pt-BR');
                      
                      return (
                        <div key={bannedUser.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-md hover:bg-muted gap-2">
                          <div className="flex items-center min-w-0 flex-1">
                            <Avatar className="h-8 w-8 mr-2 border-2 border-red-500 flex-shrink-0">
                              <AvatarImage src={bannedUser.user?.avatar_url} />
                              <AvatarFallback className="bg-red-100 text-red-800">
                                {userInitial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {userName}
                                <Badge variant="destructive" className="ml-2 text-xs">Banido</Badge>
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{bannedUser.user?.email}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                Banido em {bannedDate} por {bannedUser.banned_by_user?.name || 'Administrador'}
                              </p>
                              {bannedUser.reason && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  <strong>Motivo:</strong> {bannedUser.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center flex-shrink-0">
                            {isProcessing ? (
                              <Spinner size="sm" />
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnbanUser(bannedUser.user_id)}
                                className="flex items-center gap-1 text-xs sm:text-sm"
                              >
                                <UserCheck className="h-4 w-4" />
                                <span className="hidden sm:inline">Desbanir</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum usuário banido</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Fechar
            </Button>
            <Button onClick={loadData} disabled={isLoading} className="w-full sm:w-auto">
              Atualizar lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de banimento */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Banir Usuário</DialogTitle>
            <DialogDescription>
              O usuário será removido do ambiente e não poderá mais entrar. Você poderá reverter esta ação depois.
            </DialogDescription>
          </DialogHeader>
          
          {userToBan && (
            <div className="space-y-4 py-4">
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={userToBan.user?.avatar_url} />
                  <AvatarFallback>
                    {userToBan.user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{userToBan.user?.name || userToBan.user?.email?.split('@')[0] || 'Usuário'}</p>
                  <p className="text-sm text-muted-foreground">{userToBan.user?.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo do banimento (opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Descreva o motivo do banimento..."
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBanUser}
              disabled={processingMemberId === userToBan?.user_id}
            >
              {processingMemberId === userToBan?.user_id ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}
              Banir Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}