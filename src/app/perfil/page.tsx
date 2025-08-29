"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Camera, 
  Edit2, 
  Mail, 
  BookOpen, 
  Save, 
  X, 
  Upload, 
  Trash2, 
  Loader2,
  LayoutDashboard,
  ClipboardList,
  FileQuestion,
  Users,
  LogOut,
  CreditCard,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SubscriptionTier } from '@/types/subscription';

export default function ProfilePage() {
  const { user } = useAuth();
  const { subscriptionLimits } = useSubscription();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.user_metadata?.name || '',
    bio: user?.user_metadata?.bio || 'Estudante apaixonado por aprender e compartilhar conhecimento.',
    avatar_url: user?.user_metadata?.avatar_url || ''
  });



  // Função para salvar alterações no perfil
  const handleSaveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: profileData.name,
          bio: profileData.bio
        }
      });

      if (error) throw error;
      
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer upload da imagem de perfil
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      // Gerar um nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload do arquivo para o Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter a URL pública do arquivo
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      if (data) {
        // Atualizar o avatar_url no perfil do usuário
        const { error: updateError } = await supabase.auth.updateUser({
          data: { avatar_url: data.publicUrl }
        });

        if (updateError) throw updateError;

        setProfileData({
          ...profileData,
          avatar_url: data.publicUrl
        });

        toast.success('Foto de perfil atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast.error('Erro ao atualizar foto de perfil. Tente novamente.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Função para remover a foto de perfil
  const handleRemoveProfilePicture = async () => {
    if (!user) return;

    setUploadingImage(true);
    try {
      // Atualizar o usuário com avatar_url vazio
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: '' }
      });

      if (error) throw error;

      setProfileData({
        ...profileData,
        avatar_url: ''
      });

      toast.success('Foto de perfil removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover foto de perfil:', error);
      toast.error('Erro ao remover foto de perfil. Tente novamente.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Função para obter o nome do plano
  const getPlanName = (tier?: SubscriptionTier) => {
    if (!tier) return 'Gratuito';
    
    switch (tier) {
      case SubscriptionTier.FREE:
        return 'Gratuito';
      case SubscriptionTier.PRO:
        return 'Pro';
      case SubscriptionTier.PRO_PLUS:
        return 'Pro+';
      default:
        return 'Gratuito';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Cabeçalho do Perfil */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
        {/* Banner de capa */}
        <div className="h-48 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
          {/* Botão de editar perfil */}
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 backdrop-blur-sm transition-all"
          >
            {isEditing ? <X className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
          </button>
          
          {/* Badge do plano atual */}
          <div className="absolute top-4 right-16 bg-white/20 text-white rounded-full px-3 py-1 backdrop-blur-sm">
            <span className="text-sm font-medium flex items-center">
              <CreditCard className="h-4 w-4 mr-1" />
              Plano {getPlanName(subscriptionLimits?.tier)}
            </span>
          </div>
        </div>
        
        {/* Informações do perfil */}
        <div className="relative px-6 pb-6">
          {/* Avatar */}
          <div className="absolute -top-16 left-6 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg">
            <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden relative">
              {profileData.avatar_url ? (
                <img 
                  src={profileData.avatar_url} 
                  alt="Foto de perfil" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <BookOpen className="h-10 w-10 text-blue-500" />
                  <span className="text-xs text-blue-500 mt-1">Genoma</span>
                </div>
              )}
              
              {/* Overlay para edição de foto */}
              {isEditing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                  {uploadingImage ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : (
                    <>
                      <label htmlFor="avatar-upload" className="cursor-pointer group">
                        <div className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all mb-2">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                        <input 
                          type="file" 
                          id="avatar-upload" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </label>
                      {profileData.avatar_url && (
                        <button 
                          onClick={handleRemoveProfilePicture}
                          className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-all"
                        >
                          <Trash2 className="h-5 w-5 text-white" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Informações do usuário */}
          <div className="pt-20 pb-2">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input 
                    type="text" 
                    value={profileData.name} 
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea 
                    value={profileData.bio} 
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                

                
                <div className="flex justify-end space-x-3 pt-2">
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{profileData.name}</h1>
                <p className="text-gray-600 mt-1">{profileData.bio}</p>
                
                <div className="mt-4 flex flex-wrap gap-y-3 gap-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {user?.email}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Links Rápidos */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Links Rápidos</h2>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <Link 
              href="/dashboard" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-md mr-3">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-gray-700">Dashboard</span>
            </Link>
            
            <Link 
              href="/perfil/assinatura" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="p-2 bg-emerald-100 rounded-md mr-3">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-gray-700">Minha Assinatura</span>
            </Link>
            
            <Link 
              href="/estudos" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-md mr-3">
                <BookOpen className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-gray-700">Painel de Estudos</span>
            </Link>
            
            <Link 
              href="/simulados" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-md mr-3">
                <ClipboardList className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-gray-700">Simulados</span>
            </Link>
            
            <Link 
              href="/banco-questoes" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="p-2 bg-amber-100 rounded-md mr-3">
                <FileQuestion className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-gray-700">Banco de Questões</span>
            </Link>
            
            <Link 
              href="/comunidade/grupos-estudos" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="p-2 bg-indigo-100 rounded-md mr-3">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-gray-700">Grupos de Estudo</span>
            </Link>
            
            <Link 
              href="/perfil/configuracoes" 
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="p-2 bg-gray-100 rounded-md mr-3">
                <Settings className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-gray-700">Configurações</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
