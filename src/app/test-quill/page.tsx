'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Importar ReactQuill dinamicamente para evitar problemas de SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';
import '@/styles/quill-custom.css';

export default function TestQuillPage() {
  const [content, setContent] = useState('');

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ]
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Teste do ReactQuill</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Editor de Texto Completo
        </label>
        <div className="border border-gray-300 rounded-md">
          <ReactQuill
            value={content}
            onChange={setContent}
            placeholder="Digite aqui para testar todas as formatações..."
            modules={modules}
            formats={formats}
            style={{ minHeight: '200px' }}
          />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Conteúdo HTML Gerado:</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
          {content}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Visualização Renderizada:</h2>
        <div 
          className="border border-gray-300 p-4 rounded-md min-h-[100px] bg-white"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      <div className="text-sm text-gray-600">
        <p><strong>Instruções de teste:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Teste negrito, itálico, sublinhado e tachado</li>
          <li>Teste diferentes tamanhos de cabeçalho (H1-H6)</li>
          <li>Teste cores de texto e fundo</li>
          <li>Teste listas ordenadas e não ordenadas</li>
          <li>Teste alinhamento de texto</li>
          <li>Teste subscrito e sobrescrito</li>
          <li>Teste citações e blocos de código</li>
          <li>Teste links e imagens</li>
        </ul>
      </div>
    </div>
  );
}