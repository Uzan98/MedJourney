"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const BUCKET = "dashboard-carousel";

interface CarouselImage {
  id: string;
  image_url: string;
  title: string;
  description: string;
  link: string;
  created_at: string;
}

export default function DashboardCarouselAdmin() {
  const supabase = createClientComponentClient();
  const { user, checkAdminStatus, isLoading } = useAuth();
  const router = useRouter();
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    file: null as File | null,
    title: "",
    description: "",
    link: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoading) return; // Aguarda o carregamento terminar
    async function verifyAccess() {
      if (!user) {
        router.push('/dashboard');
        return;
      }
      const isAdmin = await checkAdminStatus();
      if (!isAdmin) {
        router.push('/dashboard');
      }
    }
    verifyAccess();
  }, [user, checkAdminStatus, router, isLoading]);

  // Buscar imagens cadastradas
  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    setLoading(true);
    const { data, error } = await supabase
      .from("dashboard_carousel")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setImages(data);
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file) return alert("Selecione uma imagem.");
    setLoading(true);
    const fileExt = form.file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload para o Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, form.file, { upsert: false });
    if (uploadError) {
      alert("Erro ao fazer upload: " + uploadError.message);
      setLoading(false);
      return;
    }

    // Pegar URL pública
    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const imageUrl = publicUrlData.publicUrl;

    // Salvar metadados na tabela
    const { error: insertError } = await supabase.from("dashboard_carousel").insert([
      {
        image_url: imageUrl,
        title: form.title,
        description: form.description,
        link: form.link
      }
    ]);
    if (insertError) {
      alert("Erro ao salvar metadados: " + insertError.message);
      setLoading(false);
      return;
    }

    setForm({ file: null, title: "", description: "", link: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
    await fetchImages();
    setLoading(false);
  }

  async function handleDelete(id: string, imageUrl: string) {
    if (!confirm("Tem certeza que deseja remover esta imagem?")) return;
    setLoading(true);
    // Deletar do Storage
    const path = imageUrl.split(`/${BUCKET}/`)[1];
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
    // Deletar do banco
    await supabase.from("dashboard_carousel").delete().eq("id", id);
    await fetchImages();
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Gerenciar Carrossel do Dashboard</h1>
      <form onSubmit={handleUpload} className="bg-white rounded-lg shadow p-6 mb-8 space-y-4">
        <div>
          <label className="block font-medium mb-1">Imagem</label>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Título</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="border rounded px-3 py-2 w-full"
            maxLength={100}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Descrição</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="border rounded px-3 py-2 w-full"
            maxLength={200}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Link (opcional)</label>
          <input
            type="text"
            value={form.link}
            onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
            className="border rounded px-3 py-2 w-full"
            maxLength={200}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Adicionar ao Carrossel"}
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-4">Imagens cadastradas</h2>
      {loading && <p className="mb-4">Carregando...</p>}
      <div className="space-y-6">
        {images.map(img => (
          <div key={img.id} className="flex items-center bg-white rounded shadow p-4">
            <img src={img.image_url} alt={img.title} className="w-32 h-20 object-cover rounded mr-4" />
            <div className="flex-1">
              <div className="font-bold">{img.title}</div>
              <div className="text-sm text-gray-600">{img.description}</div>
              {img.link && (
                <a href={img.link} className="text-blue-600 text-xs underline" target="_blank" rel="noopener noreferrer">{img.link}</a>
              )}
            </div>
            <button
              onClick={() => handleDelete(img.id, img.image_url)}
              className="ml-4 text-red-600 hover:underline"
              disabled={loading}
            >
              Remover
            </button>
          </div>
        ))}
        {images.length === 0 && !loading && <p>Nenhuma imagem cadastrada ainda.</p>}
      </div>
    </div>
  );
} 