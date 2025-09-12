'use client';

import React, { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Settings, Volume2, VolumeX, Smartphone, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { settings, updateSettings } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (key: string, value: boolean) => {
    setIsLoading(true);
    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Permissão para notificações concedida!');
      } else {
        toast.error('Permissão para notificações negada');
      }
    } else {
      toast.error('Seu navegador não suporta notificações');
    }
  };

  const getBrowserPermissionStatus = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'not-supported';
    }
    try {
      return Notification.permission;
    } catch (error) {
      return 'not-supported';
    }
  };

  const permissionStatus = getBrowserPermissionStatus();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Notificações
          </CardTitle>
          <CardDescription>
            Personalize como e quando você deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status das permissões do navegador */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Permissões do Navegador</Label>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {permissionStatus === 'granted' ? (
                  <Bell className="h-4 w-4 text-green-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    Notificações do Navegador
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {permissionStatus === 'granted' && 'Permitidas'}
                    {permissionStatus === 'denied' && 'Bloqueadas'}
                    {permissionStatus === 'default' && 'Não configuradas'}
                    {permissionStatus === 'not-supported' && 'Não suportadas'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={permissionStatus === 'granted' ? 'default' : 'secondary'}
                  className={permissionStatus === 'granted' ? 'bg-green-100 text-green-800' : ''}
                >
                  {permissionStatus === 'granted' && 'Ativas'}
                  {permissionStatus === 'denied' && 'Bloqueadas'}
                  {permissionStatus === 'default' && 'Pendente'}
                  {permissionStatus === 'not-supported' && 'Indisponível'}
                </Badge>
                {permissionStatus !== 'granted' && permissionStatus !== 'not-supported' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={requestBrowserPermission}
                  >
                    Permitir
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Configurações gerais */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Configurações Gerais</Label>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="enabled" className="text-sm font-medium">
                    Receber Notificações
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ativar ou desativar todas as notificações
                  </p>
                </div>
              </div>
              <Switch
                id="enabled"
                checked={settings?.enabled ?? true}
                onCheckedChange={(checked) => handleToggle('enabled', checked)}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="sound_enabled" className="text-sm font-medium">
                    Som das Notificações
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Reproduzir som ao receber notificações
                  </p>
                </div>
              </div>
              <Switch
                id="sound_enabled"
                checked={settings?.sound_enabled ?? true}
                onCheckedChange={(checked) => handleToggle('sound_enabled', checked)}
                disabled={isLoading || !settings?.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="browser_enabled" className="text-sm font-medium">
                    Notificações do Navegador
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Mostrar notificações na área de trabalho
                  </p>
                </div>
              </div>
              <Switch
                id="browser_enabled"
                checked={settings?.browser_enabled ?? true}
                onCheckedChange={(checked) => handleToggle('browser_enabled', checked)}
                disabled={isLoading || !settings?.enabled || permissionStatus !== 'granted'}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="email_enabled" className="text-sm font-medium">
                    Notificações por Email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receber resumo diário por email
                  </p>
                </div>
              </div>
              <Switch
                id="email_enabled"
                checked={settings?.email_enabled ?? false}
                onCheckedChange={(checked) => handleToggle('email_enabled', checked)}
                disabled={isLoading || !settings?.enabled}
              />
            </div>
          </div>

          <Separator />

          {/* Tipos de notificações */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Tipos de Notificações</Label>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="simulado_notifications" className="text-sm font-medium">
                  Simulados
                </Label>
                <p className="text-xs text-muted-foreground">
                  Novos simulados e resultados
                </p>
              </div>
              <Switch
                id="simulado_notifications"
                checked={settings?.simulado_notifications ?? true}
                onCheckedChange={(checked) => handleToggle('simulado_notifications', checked)}
                disabled={isLoading || !settings?.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="forum_notifications" className="text-sm font-medium">
                  Fórum de Dúvidas
                </Label>
                <p className="text-xs text-muted-foreground">
                  Novas dúvidas e respostas
                </p>
              </div>
              <Switch
                id="forum_notifications"
                checked={settings?.forum_notifications ?? true}
                onCheckedChange={(checked) => handleToggle('forum_notifications', checked)}
                disabled={isLoading || !settings?.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="event_notifications" className="text-sm font-medium">
                  Eventos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Novos eventos e lembretes
                </p>
              </div>
              <Switch
                id="event_notifications"
                checked={settings?.event_notifications ?? true}
                onCheckedChange={(checked) => handleToggle('event_notifications', checked)}
                disabled={isLoading || !settings?.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="material_notifications" className="text-sm font-medium">
                  Materiais
                </Label>
                <p className="text-xs text-muted-foreground">
                  Novos materiais disponíveis
                </p>
              </div>
              <Switch
                id="material_notifications"
                checked={settings?.material_notifications ?? true}
                onCheckedChange={(checked) => handleToggle('material_notifications', checked)}
                disabled={isLoading || !settings?.enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="announcement_notifications" className="text-sm font-medium">
                  Anúncios
                </Label>
                <p className="text-xs text-muted-foreground">
                  Comunicados importantes
                </p>
              </div>
              <Switch
                id="announcement_notifications"
                checked={settings?.announcement_notifications ?? true}
                onCheckedChange={(checked) => handleToggle('announcement_notifications', checked)}
                disabled={isLoading || !settings?.enabled}
              />
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Dica:</strong> As notificações são enviadas apenas para membros do seu grupo/turma. 
              Você pode ajustar essas configurações a qualquer momento.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}