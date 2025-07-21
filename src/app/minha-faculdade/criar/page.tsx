"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { FacultyService } from '@/services/faculty.service';

export default function CriarFaculdadePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [institution, setInstitution] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  const validateForm = () => {
    const newErrors: {
      name?: string;
      description?: string;
    } = {};
    
    if (!name.trim()) {
      newErrors.name = 'O nome é obrigatório';
    } else if (name.length < 3) {
      newErrors.name = 'O nome deve ter pelo menos 3 caracteres';
    }
    
    if (!description.trim()) {
      newErrors.description = 'A descrição é obrigatória';
    } else if (description.length < 10) {
      newErrors.description = 'A descrição deve ter pelo menos 10 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para criar um ambiente');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Gerar um código único para o ambiente
      const code = uuidv4().substring(0, 8).toUpperCase();
      
      // Criar o ambiente usando o serviço
      const faculty = await FacultyService.createFaculty({
        name,
        description,
        institution,
        course,
        semester,
        is_public: isPublic,
        code,
        owner_id: user.id
      });
      
      if (!faculty) {
        throw new Error('Não foi possível criar o ambiente');
      }
      
      toast.success('Ambiente criado com sucesso!');
      router.push(`/minha-faculdade/${faculty.id}`);
    } catch (error: any) {
      console.error('Erro ao criar ambiente:', error);
      
      // Tratamento específico para o erro de recursão infinita
      if (error.message && error.message.includes('infinite recursion')) {
        toast.error('Erro de permissão no banco de dados. Por favor, contate o suporte.');
        console.error('Erro de recursão infinita na política RLS. Execute o script fix_faculty_policies.sql.');
      } else if (error.code === '42P01') {
        toast.error('As tabelas necessárias não foram criadas. Por favor, contate o suporte.');
      } else {
        toast.error('Não foi possível criar o ambiente. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <Link href="/minha-faculdade" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Link>
        
        <div className="flex items-center gap-3">
          <School className="h-8 w-8 text-emerald-500" />
          <h1 className="text-2xl font-bold text-gray-800">Criar Ambiente de Faculdade</h1>
        </div>
        <p className="mt-2 text-gray-600">
          Crie um ambiente para compartilhar recursos com sua turma
        </p>
      </header>

      <div className="bg-white rounded-xl shadow-md p-6 md:p-8 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Ambiente *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Medicina UFMG - Turma 2023"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrição *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste ambiente..."
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">
                  Instituição
                </label>
                <input
                  type="text"
                  id="institution"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ex: UFMG"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
                  Curso
                </label>
                <input
                  type="text"
                  id="course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Ex: Medicina"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
                Período/Semestre
              </label>
              <input
                type="text"
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="Ex: 5º Período"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                Tornar ambiente público (qualquer pessoa pode encontrar e solicitar acesso)
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-center transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Criando ambiente...</span>
                  </>
                ) : (
                  <span>Criar Ambiente</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 