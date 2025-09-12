"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Check, X, Clock, User, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { FacultyService } from '@/services/faculty.service';
import { Faculty } from '@/types/faculty';

interface JoinRequest {
  id: string;
  user_id: string;
  faculty_id: number;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user: {
    name: string;
    email: string;
  };
  reviewer?: {
    name: string;
    email: string;
  };
}

export default function SolicitacoesFaculdadePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const facultyId = parseInt(params.id as string);
  
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    if (!user || !facultyId) return;
    
    loadData();
  }, [user, facultyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Verificar se o usuário é admin
      const isAdmin = await FacultyService.isAdmin(facultyId, user!.id);
      
      if (!isAdmin) {
        toast.error('Você não tem permissão para acessar esta página');
        router.push(`/minha-faculdade/${facultyId}`);
        return;
      }
      
      // Carregar dados da faculdade
      const facultyData = await FacultyService.getFacultyDetails(facultyId);
      setFaculty(facultyData);
      
      // Carregar solicitações
      await loadRequests();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const status = activeTab === 'pending' ? 'pending' : undefined;
      const requestsData = await FacultyService.getFacultyJoinRequests(facultyId, status);
      setRequests(requestsData);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      toast.error('Erro ao carregar solicitações');
    }
  };

  const handleReviewRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingRequest(requestId);
      
      const success = await FacultyService.reviewJoinRequest(requestId, action);
      
      if (success) {
        toast.success(
          action === 'approve' 
            ? 'Solicitação aprovada com sucesso!' 
            : 'Solicitação rejeitada'
        );
        await loadRequests();
      } else {
        toast.error('Erro ao processar solicitação');
      }
    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      toast.error('Erro ao processar solicitação');
    } finally {
      setProcessingRequest(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Rejeitada';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <Link 
          href={`/minha-faculdade/${facultyId}`} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Link>
        
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Solicitações de Entrada</h1>
            <p className="text-gray-600">{faculty?.name}</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendentes
              </div>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Todas
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Lista de Solicitações */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab === 'pending' ? 'Nenhuma solicitação pendente' : 'Nenhuma solicitação encontrada'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'pending' 
                ? 'Não há solicitações aguardando aprovação no momento.'
                : 'Ainda não foram feitas solicitações para este ambiente.'
              }
            </p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{request.user.name}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Mail className="h-4 w-4" />
                    <span>{request.user.email}</span>
                  </div>
                  
                  {request.message && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                      <MessageSquare className="h-4 w-4 mt-0.5" />
                      <span>{request.message}</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    <span>Solicitado em: {formatDate(request.requested_at)}</span>
                    {request.reviewed_at && request.reviewer && (
                      <span className="ml-4">
                        {request.status === 'approved' ? 'Aprovado' : 'Rejeitado'} por {request.reviewer.name} em {formatDate(request.reviewed_at)}
                      </span>
                    )}
                  </div>
                </div>
                
                {request.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleReviewRequest(request.id, 'approve')}
                      disabled={processingRequest === request.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <Check className="h-4 w-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleReviewRequest(request.id, 'reject')}
                      disabled={processingRequest === request.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <X className="h-4 w-4" />
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}